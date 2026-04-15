"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock3, Goal, ListTodo } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/premium/section-header"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { EmptyState } from "@/components/premium/empty-state"
import {
  ANALYSIS_STORAGE_KEY,
  SkillRisk,
  buildPracticeRecommendations,
  buildResourceRecommendations,
} from "@/lib/skillpulse-product"

type TaskState = "none" | "planned" | "done"

export default function PracticePage() {
  const [skills, setSkills] = useState<SkillRisk[]>([])
  const [taskState, setTaskState] = useState<Record<string, TaskState>>({})

  useEffect(() => {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as { skills?: SkillRisk[] }
      if (Array.isArray(parsed.skills)) setSkills(parsed.skills)
    } catch {
      // Ignore malformed cache
    }
  }, [])

  const tasks = useMemo(() => buildPracticeRecommendations(skills), [skills])
  const priorityQueue = useMemo(() => tasks.slice(0, 3), [tasks])
  const quickResources = useMemo(() => buildResourceRecommendations(skills), [skills])

  function markState(skill: string, state: TaskState) {
    setTaskState((prev) => ({ ...prev, [skill]: state }))
  }

  return (
    <DashboardShell
      title="Practice Execution Board"
      description="Turn skill-risk insight into focused daily execution."
      insight={priorityQueue.length ? `${priorityQueue.length} high-priority tasks are ready for today.` : undefined}
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <SectionHeader
            title="Today’s Priority Queue"
            subtitle="Highest urgency practice tasks with clear effort and impact guidance."
          />
          {priorityQueue.length === 0 ? (
            <EmptyState
              title="No urgent tasks yet"
              description="Analyze your handle to generate today’s risk-prioritized queue."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {priorityQueue.map((task, index) => {
                const state = taskState[task.skill] ?? "none"
                return (
                  <motion.div
                    key={task.skill}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.03 }}
                    className="premium-surface premium-card-hover p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{task.skill}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{task.action}</p>
                      </div>
                      <RiskBadge risk={task.risk} />
                    </div>
                    <ArsProgress className="mt-3" value={task.ars} risk={task.risk} />
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Estimated effort: {task.effort}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Why this matters: {task.reason}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" className="rounded-xl">Start now</Button>
                      <Button size="sm" variant="secondary" className="rounded-xl">View resource</Button>
                      <Button
                        size="sm"
                        variant={state === "planned" ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => markState(task.skill, "planned")}
                      >
                        Plan later
                      </Button>
                      <Button
                        size="sm"
                        variant={state === "done" ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => markState(task.skill, "done")}
                      >
                        Mark done
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="All Recommended Tasks"
            subtitle="Complete queue generated from current ARS and risk profile."
          />
          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks generated"
              description="You will see complete recommendations after running analysis."
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={`task-${task.skill}`} className="premium-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.skill}</p>
                      <p className="text-xs text-muted-foreground">{task.action}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                        {task.effort}
                      </span>
                      <RiskBadge risk={task.risk} />
                    </div>
                  </div>
                  <ArsProgress className="mt-3" value={task.ars} risk={task.risk} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Quick Action Launchpad"
            subtitle="Fast actions to keep momentum without context switching."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Goal className="h-4 w-4" />
                Start Priority Session
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Jump into your top-risk practice block instantly.</p>
              <Button className="mt-4 w-full rounded-xl" disabled={!priorityQueue.length}>Launch</Button>
            </div>
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListTodo className="h-4 w-4" />
                Open Resource
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Best supporting material for your riskiest skill.</p>
              <Button
                className="mt-4 w-full rounded-xl"
                variant="secondary"
                disabled={!quickResources.length}
                onClick={() => {
                  if (quickResources.length) {
                    window.open(quickResources[0].url, "_blank", "noopener,noreferrer")
                  }
                }}
              >
                Open
              </Button>
            </div>
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Mark All Planned
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Batch-plan tasks to shape your next study block.</p>
              <Button
                className="mt-4 w-full rounded-xl"
                variant="outline"
                disabled={!tasks.length}
                onClick={() => {
                  const allPlanned = tasks.reduce<Record<string, TaskState>>((acc, task) => {
                    acc[task.skill] = "planned"
                    return acc
                  }, {})
                  setTaskState((prev) => ({ ...prev, ...allPlanned }))
                }}
              >
                Plan Queue
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
