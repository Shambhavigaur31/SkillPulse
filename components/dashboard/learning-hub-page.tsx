"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpenText, ExternalLink, Filter, GraduationCap, Layers3, MonitorPlay } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EmptyState } from "@/components/premium/empty-state"
import { FilterChipGroup } from "@/components/premium/filter-chip-group"
import { RiskBadge } from "@/components/premium/risk-badge"
import { SectionHeader } from "@/components/premium/section-header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  SkillRisk,
  buildCourseRecommendations,
  buildResourceRecommendations,
  readAnalysisSnapshot,
} from "@/lib/skillpulse-product"

type LearningItem = {
  id: string
  kind: "COURSE" | "RESOURCE"
  title: string
  skill: string
  risk: SkillRisk["risk"]
  detail: string
  insight: string
  cta: string
  url: string | null
  source: string
}

export function LearningHubPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [contentFilter, setContentFilter] = useState<"ALL" | "COURSE" | "RESOURCE">("ALL")
  const [riskFilter, setRiskFilter] = useState<"ALL" | SkillRisk["risk"]>("ALL")
  const [skillFilter, setSkillFilter] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    const snapshot = readAnalysisSnapshot()
    if (snapshot?.skills) {
      setSkills(snapshot.skills)
    }
  }, [])

  useEffect(() => {
    const skill = searchParams.get("skill")
    const type = searchParams.get("type")
    setSkillFilter(skill)
    if (type === "resource" || type === "course") {
      setContentFilter(type === "resource" ? "RESOURCE" : "COURSE")
    }
  }, [searchParams])

  const items = useMemo<LearningItem[]>(() => {
    const courses = buildCourseRecommendations(skills).map((course) => ({
      id: `course-${course.skill}-${course.url}`,
      kind: "COURSE" as const,
      title: course.title,
      skill: course.skill,
      risk: course.risk,
      detail: `${course.platform} • ${course.level} • ${course.duration}`,
      source: course.source,
      insight: course.reason,
      cta: "View course",
      url: course.url,
    }))

    const resources = buildResourceRecommendations(skills).map((resource) => ({
      id: `resource-${resource.skill}-${resource.url}`,
      kind: "RESOURCE" as const,
      title: resource.title,
      skill: resource.skill,
      risk: resource.risk,
      detail: `${resource.type.toUpperCase()} • ${resource.difficulty}`,
      source: resource.source,
      insight: resource.why,
      cta: "Open resource",
      url: resource.url,
    }))

    return [...courses, ...resources]
  }, [skills])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const kindOk = contentFilter === "ALL" || item.kind === contentFilter
      const riskOk = riskFilter === "ALL" || item.risk === riskFilter
      const skillOk = !skillFilter || item.skill.toLowerCase() === skillFilter.toLowerCase()
      return kindOk && riskOk && skillOk
    })
  }, [contentFilter, items, riskFilter, skillFilter])

  function handleOpen(item: LearningItem) {
    if (!item.url) return
    if (item.url.startsWith("/")) {
      router.push(item.url)
      return
    }
    window.open(item.url, "_blank", "noopener,noreferrer")
  }

  function handleSave(item: LearningItem) {
    setSavedItems((prev) => {
      const next = new Set(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
        toast({ title: "Removed from saved", description: `${item.title} removed from your list.` })
      } else {
        next.add(item.id)
        toast({ title: "Saved", description: `${item.title} added to your saved list.` })
      }
      return next
    })
  }

  return (
    <DashboardShell
      title="Learning Hub"
      description="Unified learning feed with both course pathways and quick resources."
      insight={
        filtered.length
          ? `${filtered.length} learning cards matched to your current retention profile.`
          : "Run analysis to unlock tailored courses and resources."
      }
    >
      <div className="space-y-6">
        <section className="premium-surface p-4">
          <SectionHeader
            title="Learning Filters"
            subtitle="Switch between courses, resources, or both from one page."
            action={<Filter className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <FilterChipGroup
              value={contentFilter}
              onChange={(value) => setContentFilter(value as "ALL" | "COURSE" | "RESOURCE")}
              options={[
                { label: "All learning", value: "ALL" },
                { label: "Courses", value: "COURSE" },
                { label: "Resources", value: "RESOURCE" },
              ]}
            />
            <FilterChipGroup
              value={riskFilter}
              onChange={(value) =>
                setRiskFilter(value as "ALL" | "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE")
              }
              options={[
                { label: "All risk levels", value: "ALL" },
                { label: "Safe", value: "SAFE" },
                { label: "Gentle", value: "GENTLE" },
                { label: "At risk", value: "AT_RISK" },
                { label: "Critical", value: "CRITICAL" },
                { label: "Severe", value: "SEVERE" },
              ]}
            />
          </div>
          {skillFilter ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Filtered to skill: <span className="font-semibold text-foreground">{skillFilter}</span></span>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSkillFilter(null)}>
                Clear
              </Button>
            </div>
          ) : null}
        </section>

        {filtered.length === 0 ? (
          <EmptyState
            title="No learning cards found"
            description="Try broader filters or run analysis to generate personalized recommendations."
          />
        ) : (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="premium-surface premium-card-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {item.kind === "COURSE" ? (
                        <GraduationCap className="h-3.5 w-3.5" />
                      ) : (
                        <BookOpenText className="h-3.5 w-3.5" />
                      )}
                      {item.detail}
                    </p>
                  </div>
                  <RiskBadge risk={item.risk} />
                </div>

                <p className="mt-3 text-xs text-muted-foreground">{item.insight}</p>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-muted-foreground">
                  <p className="text-xs font-semibold text-foreground">Why recommended</p>
                  <p className="mt-1">{item.skill} is {item.risk.replace("_", " ").toLowerCase()} risk. {item.insight}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Type</p>
                    <p className="mt-1 font-medium text-foreground">{item.kind === "COURSE" ? "Course" : "Resource"}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Target skill</p>
                    <p className="mt-1 font-medium text-foreground">{item.skill}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Source</p>
                    <p className="mt-1 font-medium text-foreground">{item.source}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Risk</p>
                    <p className="mt-1 font-medium text-foreground">{item.risk.replace("_", " ")}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="rounded-xl" onClick={() => handleOpen(item)} disabled={!item.url}>
                    {item.kind === "COURSE" ? (
                      <MonitorPlay className="mr-1.5 h-4 w-4" />
                    ) : (
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                    )}
                    {item.cta}
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => handleSave(item)}>
                    {item.kind === "COURSE" ? <Layers3 className="mr-1.5 h-4 w-4" /> : <BookOpenText className="mr-1.5 h-4 w-4" />}
                    {savedItems.has(item.id) ? "Saved" : "Save"}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardShell>
  )
}
