"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SectionHeader } from "@/components/premium/section-header"
import { EmptyState } from "@/components/premium/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type GraphSkill = {
  skill: string
  baseArs: number
  cascadedArs: number
  cascadeDelta: number
  ars: number
  risk: "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE"
}

type ImpactRow = {
  sourceSkill: string
  targetSkill: string
  sourceArs: number
  targetBaseArs: number
  targetCascadedArs: number
  cascadeDelta: number
  explanation: string
}

export default function SkillGraphPage() {
  const [skills, setSkills] = useState<GraphSkill[]>([])
  const [impacts, setImpacts] = useState<ImpactRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      setLoading(true)
      try {
        const response = await fetch("/api/skill-graph", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!mounted || !response.ok) return
        const nextSkills = Array.isArray(data?.snapshot?.skills) ? (data.snapshot.skills as GraphSkill[]) : []
        const nextImpacts = Array.isArray(data?.impacts) ? (data.impacts as ImpactRow[]) : []
        setSkills(nextSkills)
        setImpacts(nextImpacts)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void hydrate()
    return () => {
      mounted = false
    }
  }, [])

  const topDependencyRisks = useMemo(
    () => impacts.filter((row) => row.cascadeDelta > 0).slice(0, 6),
    [impacts]
  )

  const chartRows = useMemo(
    () =>
      skills
        .slice()
        .sort((a, b) => b.cascadeDelta - a.cascadeDelta)
        .slice(0, 8)
        .map((row) => ({
          skill: row.skill,
          baseArs: Number(row.baseArs.toFixed(1)),
          cascadedArs: Number(row.cascadedArs.toFixed(1)),
          cascadeDelta: Number(row.cascadeDelta.toFixed(1)),
        })),
    [skills]
  )

  const insight = topDependencyRisks[0]
    ? topDependencyRisks[0].explanation
    : "Dependency deltas will appear after an analysis run with cascade outputs."

  return (
    <DashboardShell
      title="Skill Dependency Graph"
      description="Live dependency and cascade impact analysis from persisted inference data."
      insight={insight}
    >
      <div className="space-y-6">
        <SectionHeader
          title="Dependency Impact View"
          subtitle="Trace prerequisite influence and compare base vs cascaded risk values."
        />

        {loading ? (
          <Card className="premium-surface">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading dependency graph...</CardContent>
          </Card>
        ) : skills.length === 0 ? (
          <EmptyState
            title="No dependency data yet"
            description="Run skill analysis first to unlock cascade and prerequisite impact views."
          />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="premium-surface">
                <CardHeader>
                  <CardTitle className="text-base">Base vs Cascaded ARS</CardTitle>
                </CardHeader>
                <CardContent className="h-90">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="skill" hide />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="baseArs" fill="#60a5fa" name="Base ARS" />
                      <Bar dataKey="cascadedArs" fill="#f97316" name="Cascaded ARS" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="premium-surface">
                <CardHeader>
                  <CardTitle className="text-base">Top Dependency-Driven Risks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topDependencyRisks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No positive cascade deltas found in latest run.</p>
                  ) : (
                    topDependencyRisks.map((impact) => (
                      <div key={`${impact.sourceSkill}-${impact.targetSkill}`} className="rounded-xl border border-white/10 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {impact.sourceSkill} {"->"} {impact.targetSkill}
                          </p>
                          <span className="text-xs text-amber-200">+{impact.cascadeDelta.toFixed(1)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{impact.explanation}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="premium-surface">
              <CardHeader>
                <CardTitle className="text-base">Skill Nodes and Cascade Deltas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {skills
                  .slice()
                  .sort((a, b) => b.cascadeDelta - a.cascadeDelta || b.ars - a.ars)
                  .map((skill) => (
                    <div key={skill.skill} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{skill.skill}</p>
                        <RiskBadge risk={skill.risk} />
                      </div>
                      <div className="mt-2">
                        <ArsProgress value={skill.ars} risk={skill.risk} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div>
                          <p>Base</p>
                          <p className="font-medium text-foreground">{skill.baseArs.toFixed(1)}</p>
                        </div>
                        <div>
                          <p>Cascaded</p>
                          <p className="font-medium text-foreground">{skill.cascadedArs.toFixed(1)}</p>
                        </div>
                        <div>
                          <p>Delta</p>
                          <p className={`font-medium ${skill.cascadeDelta > 0 ? "text-amber-200" : "text-emerald-300"}`}>
                            {skill.cascadeDelta > 0 ? "+" : ""}
                            {skill.cascadeDelta.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
