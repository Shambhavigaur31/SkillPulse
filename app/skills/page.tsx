"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowUpDown, LayoutGrid, List, Search } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/premium/section-header"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { FilterChipGroup } from "@/components/premium/filter-chip-group"
import { EmptyState } from "@/components/premium/empty-state"
import { Tooltip as SkillTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  SkillRisk,
  buildPracticeRecommendations,
  getSkillLearningLink,
  readAnalysisSnapshot,
} from "@/lib/skillpulse-product"
import { ChartShell } from "@/components/premium/chart-shell"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { riskChartColor } from "@/components/premium/risk-theme"

type ViewMode = "cards" | "table"

function riskWeight(risk: SkillRisk["risk"]): number {
  if (risk === "SEVERE") return 5
  if (risk === "CRITICAL") return 4
  if (risk === "AT_RISK") return 3
  if (risk === "GENTLE") return 2
  return 1
}

export default function SkillsPage() {
  const router = useRouter()
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"risk" | "ars" | "alpha">("risk")
  const [riskFilter, setRiskFilter] = useState<"ALL" | SkillRisk["risk"]>("ALL")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")

  useEffect(() => {
    const snapshot = readAnalysisSnapshot()
    if (snapshot?.skills) {
      setSkills(snapshot.skills)
    }
  }, [])

  const recommendationMap = useMemo(() => {
    const recs = buildPracticeRecommendations(skills)
    return new Map(recs.map((rec) => [rec.skill, rec]))
  }, [skills])

  function openPractice(skill: string) {
    router.push(`/practice?skill=${encodeURIComponent(skill)}&source=skills`)
  }

  function openResource(skill: string) {
    const resourceUrl = getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes")
    if (resourceUrl) {
      window.open(resourceUrl, "_blank", "noopener,noreferrer")
      return
    }
  }

  function riskExplainability(skill: SkillRisk): string {
    if (skill.ars >= 85) return "Severe decay: recall is slipping fast, practice today."
    if (skill.ars >= 70) return "Critical decay: overdue for reinforcement to avoid cascade."
    if (skill.ars >= 55) return "Moderate decay: reinforce this week to stay stable."
    if (skill.ars >= 40) return "Gentle decay: short warm-up keeps retention high."
    return "Healthy retention: maintain with light practice."
  }

  const filtered = useMemo(() => {
    let next = [...skills]

    if (search.trim()) {
      const query = search.toLowerCase().trim()
      next = next.filter((skill) => skill.skill.toLowerCase().includes(query))
    }

    if (riskFilter !== "ALL") {
      next = next.filter((skill) => skill.risk === riskFilter)
    }

    if (sortBy === "risk") {
      next.sort((a, b) => riskWeight(b.risk) - riskWeight(a.risk) || b.ars - a.ars)
    }

    if (sortBy === "ars") {
      next.sort((a, b) => b.ars - a.ars)
    }

    if (sortBy === "alpha") {
      next.sort((a, b) => a.skill.localeCompare(b.skill))
    }

    return next
  }, [riskFilter, search, skills, sortBy])

  const comparisonData = useMemo(() => filtered.slice(0, 6), [filtered])

  return (
    <DashboardShell
      title="Skills Workspace"
      description="Explore every tracked skill with focused controls and rapid decision support."
      insight={filtered.length > 0 ? `${filtered.filter((s) => s.ars >= 70).length} skills currently need urgent reinforcement.` : undefined}
    >
      <div className="space-y-6">
        <section className="premium-surface p-4">
          <SectionHeader
            title="Skill Controls"
            subtitle="Search, filter, compare, and switch your preferred workspace view."
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "cards" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="mr-1.5 h-4 w-4" />
                  Cards
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setViewMode("table")}
                >
                  <List className="mr-1.5 h-4 w-4" />
                  Table
                </Button>
              </div>
            }
          />

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skill"
                className="h-10 rounded-xl border-white/15 bg-white/5 pl-9"
              />
            </div>
            <FilterChipGroup
              value={riskFilter}
              onChange={(value) => setRiskFilter(value as "ALL" | SkillRisk["risk"])}
              options={[
                { label: "All", value: "ALL" },
                { label: "Safe", value: "SAFE" },
                { label: "Gentle", value: "GENTLE" },
                { label: "At Risk", value: "AT_RISK" },
                { label: "Critical", value: "CRITICAL" },
                { label: "Severe", value: "SEVERE" },
              ]}
            />
            <FilterChipGroup
              value={sortBy}
              onChange={(value) => setSortBy(value as "risk" | "ars" | "alpha")}
              options={[
                { label: "Sort: Risk", value: "risk" },
                { label: "Sort: ARS", value: "ars" },
                { label: "Sort: A-Z", value: "alpha" },
              ]}
            />
          </div>
        </section>

        <ChartShell title="Compact Skill Comparison" subtitle="Fast comparison of currently visible top skills.">
          {comparisonData.length === 0 ? (
            <EmptyState title="Nothing to compare" description="Adjust filters or run analysis to populate this chart." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="skill" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="ars" radius={[0, 8, 8, 0]}>
                  {comparisonData.map((item) => (
                    <Cell key={item.skill} fill={riskChartColor(item.risk)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {filtered.length === 0 ? (
          <EmptyState title="No skills available" description="Analyze your handle from dashboard to build the skill workspace." />
        ) : viewMode === "cards" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((skill, index) => {
              const recommendation = recommendationMap.get(skill.skill)
              return (
                <SkillTooltip key={skill.skill}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: index * 0.02 }}
                      className="premium-surface premium-card-hover p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{skill.skill}</p>
                          <p className="mt-1 text-xs text-muted-foreground">ARS {skill.ars.toFixed(1)}</p>
                        </div>
                        <RiskBadge risk={skill.risk} />
                      </div>
                      <ArsProgress className="mt-3" value={skill.ars} risk={skill.risk} />
                      <p className="mt-3 text-xs text-muted-foreground">
                        {recommendation?.reason ?? "No urgent recommendation for this skill."}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="rounded-xl" onClick={() => openPractice(skill.skill)}>
                          Practice
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => openResource(skill.skill)}
                          disabled={!getSkillLearningLink(skill.skill, "resource") && !getSkillLearningLink(skill.skill, "notes")}
                        >
                          Resource
                        </Button>
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56">
                    {riskExplainability(skill)}
                  </TooltipContent>
                </SkillTooltip>
              )
            })}
          </section>
        ) : (
          <section className="premium-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skill</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        ARS
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((skill) => {
                    const recommendation = recommendationMap.get(skill.skill)
                    return (
                      <tr key={skill.skill} className="border-b border-white/10 hover:bg-white/3">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{skill.skill}</td>
                        <td className="px-4 py-3">
                          <div className="w-44">
                            <ArsProgress value={skill.ars} risk={skill.risk} />
                            <span className="mt-1 inline-block text-xs text-muted-foreground">{skill.ars.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><RiskBadge risk={skill.risk} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{recommendation?.action ?? "No urgent action"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" className="rounded-xl" onClick={() => openPractice(skill.skill)}>Practice</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openResource(skill.skill)}
                              disabled={!getSkillLearningLink(skill.skill, "resource") && !getSkillLearningLink(skill.skill, "notes")}
                            >
                              Resource
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  )
}
