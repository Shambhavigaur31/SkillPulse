"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SectionHeader } from "@/components/premium/section-header"
import { ChartShell } from "@/components/premium/chart-shell"
import { EmptyState } from "@/components/premium/empty-state"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { SkillRisk, bucketCounts } from "@/lib/skillpulse-product"
import { riskChartColor } from "@/components/premium/risk-theme"

type TrendRow = {
  skill: string
  latestArs: number
  previousArs: number | null
  delta: number
  trend: "improving" | "stable" | "declining"
}

type TimelineRow = {
  runId: number
  createdAt: string
  overallHealth: number
  skillsTracked: number
  critical: number
  atRisk: number
}

type HistoryPayload = {
  latestSkills: Array<{ skill: string; ars: number; risk: SkillRisk["risk"] }>
  trends: TrendRow[]
  timeline: TimelineRow[]
  insight: string
}

export default function AnalyticsPage() {
  const [history, setHistory] = useState<HistoryPayload>({
    latestSkills: [],
    trends: [],
    timeline: [],
    insight: "",
  })
  const [activeDistribution, setActiveDistribution] = useState<string | null>(null)
  const [activeTopRisk, setActiveTopRisk] = useState<string | null>(null)
  const [activeHealthSlice, setActiveHealthSlice] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      const response = await fetch("/api/analytics/history", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!mounted || !response.ok || !data?.history) return
      setHistory(data.history as HistoryPayload)
    }
    void hydrate()
    return () => {
      mounted = false
    }
  }, [])

  const skills = useMemo<SkillRisk[]>(
    () =>
      history.latestSkills.map((row) => ({
        skill: row.skill,
        ars: row.ars,
        risk: row.risk,
      })),
    [history.latestSkills]
  )

  const distribution = useMemo(() => bucketCounts(skills), [skills])
  const topRisk = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 8), [skills])
  const radarData = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 6), [skills])

  const trendData = useMemo(
    () =>
      history.timeline.map((row) => ({
        at: new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        health: row.overallHealth,
        critical: row.critical,
      })),
    [history.timeline]
  )

  const healthPie = useMemo(() => {
    const avgArs = skills.length ? skills.reduce((acc, s) => acc + s.ars, 0) / skills.length : 0
    const risk = Math.min(100, Math.round(avgArs))
    return [
      { name: "Healthy", value: 100 - risk, fill: "#34d399" },
      { name: "Risk", value: risk, fill: "#ef4444" },
    ]
  }, [skills])

  const trendLabelCounts = useMemo(
    () => {
      // Trend posture is only valid when we have at least two persisted snapshots.
      if (history.timeline.length < 2) return []

      const trendRows = history.trends.filter(
        (row) =>
          typeof row.latestArs === "number" &&
          typeof row.previousArs === "number"
      )

      let improving = 0
      let stable = 0
      let declining = 0

      for (const row of trendRows) {
        const delta = row.latestArs - row.previousArs
        if (delta < -3) improving += 1
        else if (delta > 3) declining += 1
        else stable += 1
      }

      return [
        { name: "Improving", value: improving },
        { name: "Stable", value: stable },
        { name: "Declining", value: declining },
      ]
    },
    [history.timeline.length, history.trends]
  )

  return (
    <DashboardShell
      title="Analytics Studio"
      description="Historical retention analytics from persisted inference runs."
      insight={history.insight || "Run analyses over time to unlock trend intelligence."}
    >
      <div className="space-y-6">
        <SectionHeader
          title="Visual Intelligence Grid"
          subtitle="Distribution, hotspots, and trend movement from your persisted run history."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartShell
            title="Risk Distribution"
            subtitle="Count of skills in each risk bucket."
            insight={distribution.length ? `${distribution[0]?.bucket ?? "Safe"} bucket has the highest concentration.` : undefined}
          >
            {skills.length === 0 ? (
              <EmptyState title="No data" description="Run analysis to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distribution.map((item) => (
                      <Cell
                        key={item.bucket}
                        fill={riskChartColor(item.bucket)}
                        opacity={activeDistribution && activeDistribution !== item.bucket ? 0.35 : 1}
                        onMouseEnter={() => setActiveDistribution(item.bucket)}
                        onMouseLeave={() => setActiveDistribution(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell title="Overall Health" subtitle="Healthy vs risky posture from latest persisted run.">
            {skills.length === 0 ? (
              <EmptyState title="No data" description="Run analysis to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={healthPie} dataKey="value" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {healthPie.map((slice) => (
                      <Cell
                        key={slice.name}
                        fill={slice.fill}
                        opacity={activeHealthSlice && activeHealthSlice !== slice.name ? 0.4 : 1}
                        onMouseEnter={() => setActiveHealthSlice(slice.name)}
                        onMouseLeave={() => setActiveHealthSlice(null)}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name) => [`${value}%`, `${name} posture`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell
            title="Top Risk Hotspots"
            subtitle="Most urgent skills by latest ARS intensity."
            insight={topRisk.length ? `Most risk concentrated in ${topRisk[0].skill}.` : undefined}
          >
            {topRisk.length === 0 ? (
              <EmptyState title="No data" description="Run analysis to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRisk} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="skill" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)} ARS`, "Current intensity"]} />
                  <Bar dataKey="ars" radius={[0, 8, 8, 0]}>
                    {topRisk.map((item) => (
                      <Cell
                        key={item.skill}
                        fill={riskChartColor(item.risk)}
                        opacity={activeTopRisk && activeTopRisk !== item.skill ? 0.35 : 1}
                        onMouseEnter={() => setActiveTopRisk(item.skill)}
                        onMouseLeave={() => setActiveTopRisk(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell title="Trend Posture Radar" subtitle="Improving/stable/declining counts computed from real persisted ARS deltas.">
            {history.timeline.length < 2 ? (
              <EmptyState
                title="Insufficient history"
                description="Trend posture will appear after at least two saved analyses."
              />
            ) : trendLabelCounts.length === 0 ? (
              <EmptyState
                title="No comparable trends"
                description="No skill deltas could be computed from persisted history yet."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={trendLabelCounts} outerRadius={90}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Radar dataKey="value" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.28} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell
            title="Historical Health Trend"
            subtitle="Overall health trajectory from persisted inference runs."
            insight="This chart is generated only from stored run history."
          >
            {trendData.length === 0 ? (
              <EmptyState title="No data" description="Run analysis to build historical trend data." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="at" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Health"]} />
                  <Area type="monotone" dataKey="health" stroke="#22d3ee" strokeWidth={2} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartShell>
        </div>
      </div>
    </DashboardShell>
  )
}
