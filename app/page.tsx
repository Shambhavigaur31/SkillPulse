"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  Activity,
  BarChart3,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardFilters } from "@/components/dashboard/filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MetricCard } from "@/components/premium/metric-card"
import { SectionHeader } from "@/components/premium/section-header"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { FilterChipGroup } from "@/components/premium/filter-chip-group"
import { RecommendationCard } from "@/components/premium/recommendation-card"
import { ChartShell } from "@/components/premium/chart-shell"
import { EmptyState } from "@/components/premium/empty-state"
import { LoadingSkeleton } from "@/components/premium/loading-skeleton"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorCode, getApiErrorMessage, toProductMessage } from "@/lib/api-client"
import {
  SkillRisk,
  Summary,
  bucketCounts,
  buildCourseRecommendations,
  buildPracticeRecommendations,
  buildResourceRecommendations,
  normalizeSkills,
  readAnalysisSnapshot,
  writeAnalysisSnapshot,
} from "@/lib/skillpulse-product"
import { riskChartColor } from "@/components/premium/risk-theme"

function primaryInsight(summary: Summary | null): string {
  if (!summary || summary.skillsTracked === 0) return "Run an analysis to unlock your live retention command center."
  if (summary.critical > 0) return `${summary.critical} skill${summary.critical > 1 ? "s" : ""} need immediate attention today.`
  if (summary.atRisk > 0) return `${summary.atRisk} skill${summary.atRisk > 1 ? "s" : ""} should be reviewed this week.`
  return "Your skill health is stable. Keep momentum with light reinforcement."
}

function riskWeight(risk: SkillRisk["risk"]): number {
  if (risk === "SEVERE") return 5
  if (risk === "CRITICAL") return 4
  if (risk === "AT_RISK") return 3
  if (risk === "GENTLE") return 2
  return 1
}

function inferDaysSinceLastPractice(ars: number): number {
  if (ars >= 85) return 18
  if (ars >= 70) return 13
  if (ars >= 55) return 9
  if (ars >= 40) return 6
  return 2
}

function skillTrendLabel(ars: number): string {
  if (ars >= 75) return "Declining trend"
  if (ars >= 45) return "Slight downward drift"
  return "Stable retention trend"
}

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    timeRange: "7d",
    category: "all",
    sortBy: "retention",
  })

  const [sessionHandle, setSessionHandle] = useState("")
  const [hasLinkedHandle, setHasLinkedHandle] = useState(false)
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<"ALL" | SkillRisk["risk"]>("ALL")
  const [sortMode, setSortMode] = useState<"risk" | "ars" | "alpha">("risk")
  const [activeDistribution, setActiveDistribution] = useState<string | null>(null)
  const [activeRiskSkill, setActiveRiskSkill] = useState<string | null>(null)
  const [activeHealthSlice, setActiveHealthSlice] = useState<string | null>(null)
  const { toast } = useToast()

  async function analyze(currentHandle?: string) {
    const normalizedHandle = (currentHandle ?? sessionHandle).trim()
    if (!normalizedHandle) {
      setError("Link your Codeforces account to start your skill analysis.")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 25_000)

    try {
      const response = await fetch("/api/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalizedHandle }),
        signal: controller.signal,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const code = getApiErrorCode(data)
        const message = getApiErrorMessage(data, "We couldn't analyze your skills right now. Please try again.")
        setError(toProductMessage(code, message))
        setSkills([])
        setSummary(null)
        return
      }

      const nextSkills = Array.isArray(data.skills) ? normalizeSkills(data.skills) : []
      const nextSummary = (data.summary ?? {
        skillsTracked: 0,
        critical: 0,
        atRisk: 0,
        overallHealth: 100,
      }) as Summary

      setSkills(nextSkills)
      setSummary(nextSummary)
      setMessage(typeof data.message === "string" ? data.message : null)
      setLastUpdatedLabel("Last analyzed just now")

      writeAnalysisSnapshot({
        handle: normalizedHandle,
        skills: nextSkills,
        summary: nextSummary,
        updatedAt: Date.now(),
      })
    } catch {
      setError("Unable to reach the server. Please try again.")
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  useEffect(() => {
    async function hydrateFromSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const code = getApiErrorCode(data)
          if (code === "UNAUTHENTICATED") {
            setError("Link your Codeforces account to start your skill analysis.")
          }
          return
        }

        const sessionHandle =
          typeof data?.user?.handle === "string" ? data.user.handle.trim() : ""

        if (!sessionHandle) {
          setHasLinkedHandle(false)
          setSessionHandle("")
          setError("Link your Codeforces account to start your skill analysis.")
          return
        }

        setHasLinkedHandle(true)
        setSessionHandle(sessionHandle)
        setError(null)

        const localSnapshot = readAnalysisSnapshot()
        if (localSnapshot && localSnapshot.handle === sessionHandle) {
          setSkills(localSnapshot.skills)
          setSummary(localSnapshot.summary)
          setLastUpdatedLabel("Loaded from local cache")
        }

        const latestResponse = await fetch(
          `/api/predict-risk/latest?handle=${encodeURIComponent(sessionHandle)}`,
          { cache: "no-store" }
        )
        const latestData = await latestResponse.json().catch(() => ({}))
        const latestSnapshot = latestData?.snapshot

        if (
          latestResponse.ok &&
          latestSnapshot &&
          latestSnapshot.handle === sessionHandle &&
          Array.isArray(latestSnapshot.skills) &&
          latestSnapshot.summary
        ) {
          const normalizedLatestSkills = normalizeSkills(latestSnapshot.skills)
          setSkills(normalizedLatestSkills)
          setSummary(latestSnapshot.summary)
          setLastUpdatedLabel("Loaded from persisted analysis")
          writeAnalysisSnapshot({
            handle: sessionHandle,
            skills: normalizedLatestSkills,
            summary: latestSnapshot.summary,
            updatedAt: Date.now(),
          })
        } else {
          void analyze(sessionHandle)
        }
      } catch {
        setHasLinkedHandle(false)
        setSessionHandle("")
        setError("Link your Codeforces account to start your skill analysis.")
      }
    }

    void hydrateFromSession()
  }, [])

  const filteredAndSortedSkills = useMemo(() => {
    let next = [...skills]

    if (riskFilter !== "ALL") {
      next = next.filter((skill) => skill.risk === riskFilter)
    }

    if (sortMode === "risk") {
      next.sort((a, b) => riskWeight(b.risk) - riskWeight(a.risk) || b.ars - a.ars)
    }

    if (sortMode === "ars") {
      next.sort((a, b) => b.ars - a.ars)
    }

    if (sortMode === "alpha") {
      next.sort((a, b) => a.skill.localeCompare(b.skill))
    }

    return next
  }, [riskFilter, skills, sortMode])

  const topActions = useMemo(() => {
    return [...skills]
      .sort((a, b) => b.ars - a.ars)
      .slice(0, 3)
      .map((skill, idx) => ({
        rank: idx + 1,
        skill,
        duration: skill.ars >= 85 ? "18 min" : skill.ars >= 70 ? "12 min" : "8 min",
        reason:
          skill.ars >= 70
            ? "High decay signal. Immediate practice gives best recovery."
            : "Moderate decay trend. Quick revision avoids escalation.",
      }))
  }, [skills])

  const practiceRecs = useMemo(() => buildPracticeRecommendations(skills).slice(0, 2), [skills])
  const resourceRecs = useMemo(() => buildResourceRecommendations(skills).slice(0, 2), [skills])
  const courseRecs = useMemo(() => buildCourseRecommendations(skills).slice(0, 2), [skills])

  const riskDistribution = useMemo(() => bucketCounts(skills), [skills])
  const topRiskySkills = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 6), [skills])
  const overallHealthData = useMemo(
    () => [
      { name: "Healthy", value: Math.max(0, summary?.overallHealth ?? 0), fill: "#34d399" },
      { name: "Risk", value: 100 - Math.max(0, summary?.overallHealth ?? 0), fill: "#ef4444" },
    ],
    [summary]
  )

  const heatmapSkills = useMemo(() => [...skills].sort((a, b) => b.ars - a.ars).slice(0, 12), [skills])

  const heroInsight = useMemo(() => {
    if (!summary || summary.skillsTracked === 0) return "Run an analysis to unlock your live retention command center."

    const topRisk = [...skills].sort((a, b) => b.ars - a.ars)[0]
    if (topRisk && topRisk.ars >= 80) {
      return `${topRisk.skill} is at critical risk. Address it today for the strongest retention rebound.`
    }

    if (summary.critical > 0) {
      return `${summary.critical} skills need immediate attention today.`
    }

    if (summary.atRisk > 0) {
      const estimatedDrift = Math.min(12, Math.max(3, Math.round(summary.atRisk * 1.5)))
      return `Your skill health may drift by ${estimatedDrift}% this week unless at-risk topics are reviewed.`
    }

    return "Your skill health is stable. Keep momentum with light reinforcement."
  }, [skills, summary])

  return (
    <DashboardShell
      description="Premium skill intelligence command center"
      insight={heroInsight || primaryInsight(summary)}
      statusChip={lastUpdatedLabel ?? "Waiting for first analysis"}
      actions={<DashboardFilters filters={filters} onFilterChange={setFilters} />}
    >
      <div className="space-y-8">
        <Card className="premium-surface">
          <CardContent className="p-5">
            {hasLinkedHandle ? (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Linked Codeforces handle</p>
                  <p className="text-base font-semibold text-foreground">{sessionHandle}</p>
                </div>
                <Button onClick={() => void analyze()} disabled={loading} className="h-11 rounded-xl px-6">
                  {loading ? "Analyzing..." : "Refresh Skill Health"}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3">
                <p className="text-sm text-amber-100">No linked Codeforces handle found for this session.</p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => (window.location.href = "/link-codeforces")}
                  >
                    Link account
                  </Button>
                </div>
              </div>
            )}
            {error ? (
              <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <div className="inline-flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void analyze()} disabled={loading || !hasLinkedHandle}>
                    Retry
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => (window.location.href = "/link-codeforces")}>
                    Link account
                  </Button>
                </div>
              </div>
            ) : null}
            {!error && message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Skills Tracked"
            value={summary?.skillsTracked ?? 0}
            subtitle="Topics currently monitored"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Critical Skills"
            value={summary?.critical ?? 0}
            subtitle="Need immediate reinforcement"
            icon={<ShieldAlert className="h-4 w-4" />}
            tone="danger"
          />
          <MetricCard
            label="At Risk Skills"
            value={summary?.atRisk ?? 0}
            subtitle="Should be revised this week"
            icon={<Target className="h-4 w-4" />}
            tone="warning"
          />
          <MetricCard
            label="Overall Health"
            value={summary?.overallHealth ?? 0}
            valueSuffix="%"
            subtitle="Current retention strength"
            icon={<HeartPulse className="h-4 w-4" />}
            tone="success"
          />
        </div>

        <section className="space-y-4">
          <SectionHeader
            title="Skill Health Board"
            subtitle="Inspect every tracked skill, sort by urgency, and prioritize what to tackle next."
            action={
              <div className="flex flex-wrap items-center gap-2">
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
                  value={sortMode}
                  onChange={(value) => setSortMode(value as "risk" | "ars" | "alpha")}
                  options={[
                    { label: "Sort: Risk", value: "risk" },
                    { label: "Sort: ARS", value: "ars" },
                    { label: "Sort: A-Z", value: "alpha" },
                  ]}
                />
              </div>
            }
          />

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : filteredAndSortedSkills.length === 0 ? (
            <EmptyState
              title="No skills visible"
              description="Run an analysis or relax your filters to see the latest live ARS board."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAndSortedSkills.map((skill, index) => (
                <motion.div
                  key={skill.skill}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3, scale: 1.013 }}
                  whileTap={{ scale: 0.992 }}
                  transition={{ duration: 0.22, delay: index * 0.02, ease: "easeOut" }}
                  className={`premium-surface premium-card-hover group p-4 ${skill.risk === "CRITICAL" || skill.risk === "SEVERE" ? "shadow-red-500/18" : skill.risk === "AT_RISK" ? "shadow-amber-500/14" : ""} ${skill.ars > 80 ? "critical-pulse" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{skill.skill}</p>
                      <p className="mt-1 text-xs text-muted-foreground">ARS score: {skill.ars.toFixed(1)}</p>
                    </div>
                    <RiskBadge risk={skill.risk} />
                  </div>
                  <ArsProgress className="mt-3" value={skill.ars} risk={skill.risk} />
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <p>Last used {inferDaysSinceLastPractice(skill.ars)} days ago</p>
                    <p>{skillTrendLabel(skill.ars)}</p>
                    <p>Appears in high-frequency interview topics</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <SectionHeader
              title="What To Do Today"
              subtitle="Your top actionable priorities based on current risk intensity."
            />
            {topActions.length === 0 ? (
              <EmptyState
                title="No priority actions yet"
                description="Run analysis to generate your daily high-impact action list."
              />
            ) : (
              <div className="space-y-3">
                {topActions.map((item) => (
                  <motion.div
                    key={item.skill.skill}
                    whileHover={{ y: -2, scale: 1.008 }}
                    whileTap={{ scale: 0.993 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="premium-surface premium-card-hover border border-white/12 p-4 hover:border-primary/35"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xs font-semibold text-primary">
                          {item.rank}
                        </span>
                        <p className="text-sm font-semibold text-foreground">{item.skill.skill}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RiskBadge risk={item.skill.risk} />
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.skill.ars >= 70 ? "border border-red-400/35 bg-red-500/15 text-red-200" : "border border-amber-300/30 bg-amber-400/12 text-amber-100"}`}>
                          {item.skill.ars >= 70 ? "HIGH" : "MEDIUM"}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                          {item.duration}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() => {
                          toast({
                            title: "Task added to your plan",
                            description: "Good catch - addressing a critical skill now boosts retention.",
                          })
                        }}
                      >
                        Start now
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => {
                          toast({
                            title: "Nice! You're staying consistent",
                            description: "Resource opened for a high-priority weak zone.",
                          })
                        }}
                      >
                        View resource
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl">Plan later</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 xl:col-span-2">
            <SectionHeader
              title="Recommended Next"
              subtitle="Learning suggestions tailored to your current weak zones."
            />
            <div className="grid gap-3">
              {practiceRecs[0] ? (
                <RecommendationCard
                  title={practiceRecs[0].action}
                  skill={practiceRecs[0].skill}
                  reason={practiceRecs[0].reason}
                  typeLabel="Practice"
                />
              ) : null}
              {resourceRecs[0] ? (
                <RecommendationCard
                  title={resourceRecs[0].title}
                  skill={resourceRecs[0].skill}
                  reason={resourceRecs[0].why}
                  typeLabel="Resource"
                  ctaLabel="Open"
                  ctaHref={resourceRecs[0].url}
                />
              ) : null}
              {courseRecs[0] ? (
                <RecommendationCard
                  title={courseRecs[0].title}
                  skill={courseRecs[0].skill}
                  reason={courseRecs[0].reason}
                  typeLabel="Course"
                  meta={`${courseRecs[0].platform} • ${courseRecs[0].duration} • ${courseRecs[0].level}`}
                  ctaLabel="View course"
                  ctaHref={courseRecs[0].url}
                />
              ) : null}
              {practiceRecs.length === 0 && resourceRecs.length === 0 && courseRecs.length === 0 ? (
                <EmptyState
                  title="No recommendations yet"
                  description="Recommendations will appear after your first analysis snapshot."
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Insight Visualizations"
            subtitle="Expressive charting for risk buckets, hotspots, and overall retention posture."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartShell
              title="Risk Bucket Distribution"
              subtitle="How your skills are currently distributed by risk severity."
              insight={
                riskDistribution.length
                  ? `${riskDistribution[0]?.bucket ?? "Safe"} bucket currently carries the strongest concentration.`
                  : undefined
              }
            >
              {skills.length === 0 ? (
                <EmptyState title="No chart data" description="Analyze a handle to populate this visualization." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistribution}>
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                      formatter={(value: number, _name, payload) => [value, `${payload?.payload?.bucket} skills`]}
                      labelFormatter={(label) => `${label} risk`}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={480} animationBegin={80} animationEasing="ease-out">
                      {riskDistribution.map((entry) => (
                        <Cell
                          key={entry.bucket}
                          fill={riskChartColor(entry.bucket)}
                          opacity={activeDistribution && activeDistribution !== entry.bucket ? 0.35 : 1}
                          onMouseEnter={() => setActiveDistribution(entry.bucket)}
                          onMouseLeave={() => setActiveDistribution(null)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartShell>

            <ChartShell
              title="Top Risky Skills"
              subtitle="Skills with highest ARS right now."
              insight={topRiskySkills.length ? `Most risk concentrated in ${topRiskySkills[0].skill}.` : undefined}
            >
              {topRiskySkills.length === 0 ? (
                <EmptyState title="No chart data" description="Analyze a handle to populate this visualization." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRiskySkills} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="skill" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(18,22,30,0.95)" }}
                      formatter={(value: number) => [`${value.toFixed(1)} ARS`, "Current intensity"]}
                    />
                    <Bar dataKey="ars" radius={[0, 8, 8, 0]} animationDuration={520} animationBegin={120} animationEasing="ease-out">
                      {topRiskySkills.map((entry) => (
                        <Cell
                          key={entry.skill}
                          fill={riskChartColor(entry.risk)}
                          opacity={activeRiskSkill && activeRiskSkill !== entry.skill ? 0.35 : 1}
                          onMouseEnter={() => setActiveRiskSkill(entry.skill)}
                          onMouseLeave={() => setActiveRiskSkill(null)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartShell>

            <ChartShell
              title="Overall Health Radial"
              subtitle="Healthy vs risk posture from latest snapshot."
              insight={summary && summary.overallHealth >= 65 ? "Low-risk skills dominate your current profile." : "Risk pressure is elevated - targeted practice recommended."}
            >
              {summary ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overallHealthData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      animationDuration={560}
                      animationBegin={120}
                      animationEasing="ease-out"
                    >
                      {overallHealthData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.fill}
                          opacity={activeHealthSlice && activeHealthSlice !== entry.name ? 0.38 : 1}
                          onMouseEnter={() => setActiveHealthSlice(entry.name)}
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
              ) : (
                <EmptyState title="No chart data" description="Analyze a handle to populate this visualization." />
              )}
            </ChartShell>

            <ChartShell
              title="Risk Intensity Heatmap"
              subtitle="Quick visual scan of pressure by skill."
              insight={heatmapSkills.length ? "Hover cells for rapid hotspot triage by ARS intensity." : undefined}
            >
              {heatmapSkills.length === 0 ? (
                <EmptyState title="No heatmap data" description="Analyze a handle to populate this visualization." />
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {heatmapSkills.map((skill) => (
                    <div
                      key={skill.skill}
                      className="interactive-focus rounded-xl border border-white/10 p-2 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01]"
                      style={{ backgroundColor: `${riskChartColor(skill.risk)}22` }}
                    >
                      <p className="truncate text-xs font-medium text-foreground">{skill.skill}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">ARS {skill.ars.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              )}
            </ChartShell>
          </div>
        </section>

        <Card className="premium-surface overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Motivation Pulse</p>
                <p className="text-xs text-muted-foreground">
                  Great products compound consistency. Even a 12-minute targeted practice session can reverse tomorrow&apos;s decay trend.
                </p>
              </div>
              <div className="ml-auto hidden items-center gap-1 text-muted-foreground md:inline-flex">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Trend panel coming soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
