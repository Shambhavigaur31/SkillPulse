"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SectionHeader } from "@/components/premium/section-header"
import { EmptyState } from "@/components/premium/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillForceGraph } from "@/components/dashboard/skill-force-graph"

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
            <Card className="premium-surface">
              <CardHeader>
                <CardTitle className="text-base">Interactive Dependency Force Graph</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillForceGraph
                  skills={skills.map((skill) => ({
                    skill: skill.skill,
                    ars: skill.ars,
                    cascadeDelta: skill.cascadeDelta,
                    risk: skill.risk,
                  }))}
                  impacts={impacts.map((impact) => ({
                    sourceSkill: impact.sourceSkill,
                    targetSkill: impact.targetSkill,
                    cascadeDelta: impact.cascadeDelta,
                    explanation: impact.explanation,
                  }))}
                />
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
          </>
        )}
      </div>
    </DashboardShell>
  )
}
