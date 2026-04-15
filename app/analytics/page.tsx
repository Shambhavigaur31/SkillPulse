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
import { ANALYSIS_STORAGE_KEY, SkillRisk, bucketCounts } from "@/lib/skillpulse-product"
import { riskChartColor } from "@/components/premium/risk-theme"

export default function AnalyticsPage() {
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [activeDistribution, setActiveDistribution] = useState<string | null>(null)
  const [activeTopRisk, setActiveTopRisk] = useState<string | null>(null)
  const [activeHealthSlice, setActiveHealthSlice] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { skills?: SkillRisk[] }
      if (Array.isArray(parsed.skills)) setSkills(parsed.skills)
    } catch {
      // Ignore malformed local snapshot
    }
  }, [])

  const distribution = useMemo(() => bucketCounts(skills), [skills])
  const topRisk = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 8), [skills])
  const radarData = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 6), [skills])

  const trendData = useMemo(
    () =>
      [
        { day: "Mon", score: 52 },
        { day: "Tue", score: 55 },
        { day: "Wed", score: 58 },
        { day: "Thu", score: 54 },
        { day: "Fri", score: 61 },
        { day: "Sat", score: 63 },
        { day: "Sun", score: 66 },
      ].map((item) => ({
        ...item,
        adjusted: skills.length ? Math.min(100, Math.max(20, item.score + Math.round((skills.length - 10) / 2))) : item.score,
      })),
    [skills.length]
  )

  const healthPie = useMemo(() => {
    const avgArs = skills.length ? skills.reduce((acc, s) => acc + s.ars, 0) / skills.length : 0
    const risk = Math.min(100, Math.round(avgArs))
    return [
      { name: "Healthy", value: 100 - risk, fill: "#34d399" },
      { name: "Risk", value: risk, fill: "#ef4444" },
    ]
  }, [skills])

  return (
    <DashboardShell
      title="Analytics Studio"
      description="Multi-angle visualization for retention risk, concentration, and trend posture."
      insight={skills.length ? `Tracking ${skills.length} skills with live risk analytics.` : "Run analysis to unlock advanced charts."}
    >
      <div className="space-y-6">
        <SectionHeader
          title="Visual Intelligence Grid"
          subtitle="Dive into distribution, hotspots, and trend movements from one premium analytics surface."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartShell
            title="Risk Distribution"
            subtitle="Count of skills in each risk bucket."
            insight={distribution.length ? `${distribution[0]?.bucket ?? "Safe"} bucket has the highest concentration.` : undefined}
          >
            {skills.length === 0 ? (
              <EmptyState title="No data" description="Analyze a handle to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                    formatter={(value: number, _name, payload) => [value, `${payload?.payload?.bucket} skills`]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={480} animationBegin={80} animationEasing="ease-out">
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

          <ChartShell
            title="Overall Health"
            subtitle="Snapshot of healthy vs risky posture."
            insight={skills.length ? (healthPie[0].value >= 60 ? "Low-risk skills dominate your profile." : "Risk pressure currently outweighs healthy segments.") : undefined}
          >
            {skills.length === 0 ? (
              <EmptyState title="No data" description="Analyze a handle to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthPie}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    animationDuration={560}
                    animationBegin={110}
                    animationEasing="ease-out"
                  >
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
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                    formatter={(value: number, name) => [`${value}%`, `${name} posture`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell
            title="Top Risk Hotspots"
            subtitle="Most urgent skills by ARS intensity."
            insight={topRisk.length ? `Most risk concentrated in ${topRisk[0].skill}.` : undefined}
          >
            {topRisk.length === 0 ? (
              <EmptyState title="No data" description="Analyze a handle to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRisk} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="skill" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                    formatter={(value: number) => [`${value.toFixed(1)} ARS`, "Current intensity"]}
                  />
                  <Bar dataKey="ars" radius={[0, 8, 8, 0]} animationDuration={520} animationBegin={120} animationEasing="ease-out">
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

          <ChartShell title="Stability Radar" subtitle="Relative pressure profile across top-risk skills." insight="Longer spikes represent disproportionately fragile topics.">
            {radarData.length === 0 ? (
              <EmptyState title="No data" description="Analyze a handle to populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius={90}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Radar dataKey="ars" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.28} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell
            title="Weekly Retention Trend"
            subtitle="Synthetic progression track tuned by current tracked scope."
            insight="Trend slope indicates whether your reinforcement cadence is improving."
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                  formatter={(value: number) => [`${value}%`, "Retention score"]}
                />
                <Area
                  type="monotone"
                  dataKey="adjusted"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  animationDuration={620}
                  animationBegin={120}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>
      </div>
    </DashboardShell>
  )
}
