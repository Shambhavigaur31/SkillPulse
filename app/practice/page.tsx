"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock3, Goal, ListTodo } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/premium/section-header"
import { EmptyState } from "@/components/premium/empty-state"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { riskFromArs, type RiskLabel } from "@/lib/skillpulse-product"

type TaskState = "pending" | "planned" | "completed" | "skipped"
type Difficulty = "easy" | "medium" | "hard"

type DailyTask = {
  id: string
  skill: string
  title: string
  durationMinutes: number
  difficulty: Difficulty
  reason: string
  status: TaskState
  source: string
  arsSnapshot: number
  nextReviewDate: string | null
}

export default function PracticePage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null)

  async function loadTasks() {
    const response = await fetch("/api/daily-tasks", { cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(data?.tasks)) return
    setTasks(data.tasks as DailyTask[])
  }

  useEffect(() => {
    void loadTasks()
  }, [])

  const priorityQueue = useMemo(() => tasks.slice(0, 3), [tasks])
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks])

  async function submitFeedback(task: DailyTask, quality: number, completed = true) {
    if (submittingTaskId) return
    setSubmittingTaskId(task.id)
    try {
      const response = await fetch("/api/review-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          skill: task.skill,
          quality,
          completed,
        }),
      })
      if (!response.ok) return
      await loadTasks()
    } finally {
      setSubmittingTaskId(null)
    }
  }

  function difficultyLabel(difficulty: Difficulty) {
    if (difficulty === "hard") return "Hard"
    if (difficulty === "medium") return "Medium"
    return "Easy"
  }

  function riskForTask(task: DailyTask): RiskLabel {
    return riskFromArs(task.arsSnapshot)
  }

  return (
    <DashboardShell
      title="Practice Execution Board"
      description="Daily scheduler-backed recovery plan using SM-2 review progression."
      insight={priorityQueue.length ? `${priorityQueue.length} priority tasks are due today.` : "No pending tasks for today."}
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <SectionHeader
            title="Today's Priority Queue"
            subtitle="Top risk + due-date tasks generated from latest ARS and SM-2 scheduler state."
          />
          {priorityQueue.length === 0 ? (
            <EmptyState title="No urgent tasks yet" description="Run analysis to generate scheduler tasks for today." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {priorityQueue.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.03 }}
                  className="premium-surface premium-card-hover p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.skill}</p>
                    </div>
                    <RiskBadge risk={riskForTask(task)} />
                  </div>
                  <ArsProgress className="mt-3" value={task.arsSnapshot} risk={riskForTask(task)} />
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {task.durationMinutes} min • {difficultyLabel(task.difficulty)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{task.reason}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={submittingTaskId === task.id}
                      onClick={() => void submitFeedback(task, 4, true)}
                    >
                      Mark done
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={submittingTaskId === task.id}
                      onClick={() => void submitFeedback(task, 2, false)}
                    >
                      Plan later
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="All Daily Tasks"
            subtitle="Submit review quality to evolve next review date with SM-2 progression."
          />
          {tasks.length === 0 ? (
            <EmptyState title="No tasks generated" description="No scheduler tasks available for today yet." />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="premium-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.skill}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                        {task.durationMinutes} min
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-muted-foreground capitalize">
                        {task.status}
                      </span>
                      <RiskBadge risk={riskForTask(task)} />
                    </div>
                  </div>
                  <ArsProgress className="mt-3" value={task.arsSnapshot} risk={riskForTask(task)} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Next review: {task.nextReviewDate ?? "After first feedback"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl" disabled={submittingTaskId === task.id} onClick={() => void submitFeedback(task, 5, true)}>
                      Easy (5)
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" disabled={submittingTaskId === task.id} onClick={() => void submitFeedback(task, 4, true)}>
                      Good (4)
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" disabled={submittingTaskId === task.id} onClick={() => void submitFeedback(task, 3, true)}>
                      Hard (3)
                    </Button>
                    <Button size="sm" variant="secondary" className="rounded-xl" disabled={submittingTaskId === task.id} onClick={() => void submitFeedback(task, 2, false)}>
                      Forgot (&lt;3)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader title="Quick Actions" subtitle="Fast plan interactions for today's queue." />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Goal className="h-4 w-4" />
                Start Priority Session
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Jump into the highest ARS tasks due today.</p>
              <Button className="mt-4 w-full rounded-xl" disabled={!priorityQueue.length}>Launch</Button>
            </div>
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListTodo className="h-4 w-4" />
                Refresh Plan
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Regenerate today&apos;s plan from latest model and scheduler state.</p>
              <Button className="mt-4 w-full rounded-xl" variant="secondary" onClick={() => void loadTasks()}>
                Refresh
              </Button>
            </div>
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Complete Top Task
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Award XP and advance spacing for the current top task.</p>
              <Button
                className="mt-4 w-full rounded-xl"
                variant="outline"
                disabled={!pendingTasks.length || !!submittingTaskId}
                onClick={() => {
                  if (pendingTasks.length) {
                    void submitFeedback(pendingTasks[0], 4, true)
                  }
                }}
              >
                Complete
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
