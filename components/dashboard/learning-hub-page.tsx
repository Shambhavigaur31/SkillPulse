"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenText, ExternalLink, Filter, GraduationCap, Layers3, MonitorPlay } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EmptyState } from "@/components/premium/empty-state"
import { FilterChipGroup } from "@/components/premium/filter-chip-group"
import { RiskBadge } from "@/components/premium/risk-badge"
import { SectionHeader } from "@/components/premium/section-header"
import { Button } from "@/components/ui/button"
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
  url: string
}

export function LearningHubPage() {
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [contentFilter, setContentFilter] = useState<"ALL" | "COURSE" | "RESOURCE">("ALL")
  const [riskFilter, setRiskFilter] = useState<"ALL" | SkillRisk["risk"]>("ALL")

  useEffect(() => {
    const snapshot = readAnalysisSnapshot()
    if (snapshot?.skills) {
      setSkills(snapshot.skills)
    }
  }, [])

  const items = useMemo<LearningItem[]>(() => {
    const courses = buildCourseRecommendations(skills).map((course) => ({
      id: `course-${course.skill}-${course.url}`,
      kind: "COURSE" as const,
      title: course.title,
      skill: course.skill,
      risk: course.risk,
      detail: `${course.platform} • ${course.level} • ${course.duration}`,
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
      return kindOk && riskOk
    })
  }, [contentFilter, items, riskFilter])

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

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Type</p>
                    <p className="mt-1 font-medium text-foreground">{item.kind === "COURSE" ? "Course" : "Resource"}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                    <p className="text-muted-foreground">Target skill</p>
                    <p className="mt-1 font-medium text-foreground">{item.skill}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="rounded-xl">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.kind === "COURSE" ? (
                        <MonitorPlay className="mr-1.5 h-4 w-4" />
                      ) : (
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                      )}
                      {item.cta}
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl">
                    {item.kind === "COURSE" ? <Layers3 className="mr-1.5 h-4 w-4" /> : <BookOpenText className="mr-1.5 h-4 w-4" />}
                    Save
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
