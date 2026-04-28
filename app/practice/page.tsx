"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Clock3, Goal, ListTodo } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/premium/section-header"
import { EmptyState } from "@/components/premium/empty-state"
import { RiskBadge } from "@/components/premium/risk-badge"
import { ArsProgress } from "@/components/premium/ars-progress"
import { useToast } from "@/hooks/use-toast"
import { getSkillLearningLink, riskFromArs, type RiskLabel } from "@/lib/skillpulse-product"

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

function PracticePageContent() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null)
  const [focusedSkill, setFocusedSkill] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<boolean>(false)
  const [refreshingPlan, setRefreshingPlan] = useState(false)
  const { toast } = useToast()

  async function loadTasks() {
    const response = await fetch("/api/daily-tasks", { cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(data?.tasks)) {
      throw new Error("Failed to load tasks")
    }
    setTasks(data.tasks as DailyTask[])
  }

  useEffect(() => {
    loadTasks().catch(() => {
      toast({
        title: "Unable to load tasks",
        description: "Please refresh the page.",
        variant: "destructive",
      })
    })
  }, [])

  useEffect(() => {
    const skill = searchParams.get("skill")
    const session = searchParams.get("session")
    setFocusedSkill(skill)
    if (session === "priority") {
      setActiveSession(true)
    }
  }, [searchParams])

  const priorityQueue = useMemo(() => tasks.slice(0, 3), [tasks])
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks])
  const topPendingTask = pendingTasks[0]

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
      if (!response.ok) {
        toast({
          title: "Unable to update task",
          description: "Please try again.",
          variant: "destructive",
        })
        return
      }
      await loadTasks()
      toast({
        title: completed ? "Review captured" : "Task rescheduled",
        description: completed
          ? `Nice work on ${task.skill}. XP awarded and next review scheduled.`
          : `${task.skill} moved to a later review window.`,
      })
    } catch {
      toast({
        title: "Unable to update task",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingTaskId(null)
    }
  }

  async function refreshPlan() {
    if (refreshingPlan) return
    setRefreshingPlan(true)
    try {
      await loadTasks()
      toast({
        title: "Plan refreshed",
        description: "Plan refreshed from latest ARS and scheduler state.",
      })
    } catch {
      toast({
        title: "Unable to refresh",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setRefreshingPlan(false)
    }
  }

  function openResource(skill: string) {
    const resourceUrl = getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes")
    if (!resourceUrl) return
    window.open(resourceUrl, "_blank", "noopener,noreferrer")
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
        {focusedSkill ? (
          <div className="premium-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Focused recovery session</p>
                <p className="text-xs text-muted-foreground">You&apos;re opening practice for {focusedSkill}.</p>
              </div>
              <Button size="sm" className="rounded-xl" onClick={() => setActiveSession(true)}>
                Start guided session
              </Button>
            </div>
          </div>
        ) : null}

        {activeSession && topPendingTask ? (
          <div className="premium-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Priority session in progress</p>
                <p className="text-xs text-muted-foreground">Complete tasks in order to stabilize the highest-risk skills.</p>
              </div>
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setActiveSession(false)}>
                End session
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{topPendingTask.skill}</span>
                  <RiskBadge risk={riskForTask(topPendingTask)} />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{topPendingTask.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{topPendingTask.reason}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {topPendingTask.durationMinutes} min • {difficultyLabel(topPendingTask.difficulty)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-xl" disabled={submittingTaskId === topPendingTask.id} onClick={() => void submitFeedback(topPendingTask, 4, true)}>
                    Complete
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl" disabled={submittingTaskId === topPendingTask.id} onClick={() => void submitFeedback(topPendingTask, 2, false)}>
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => openResource(topPendingTask.skill)}
                    disabled={!getSkillLearningLink(topPendingTask.skill, "resource") && !getSkillLearningLink(topPendingTask.skill, "notes")}
                  >
                    Open resource
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                <p className="text-xs font-semibold text-foreground">Upcoming tasks</p>
                <div className="mt-3 space-y-2">
                  {priorityQueue.map((task) => (
                    <div key={`session-${task.id}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                      <span className="text-[11px] text-foreground">{task.skill}</span>
                      <span className="text-[11px] text-muted-foreground">{task.durationMinutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="space-y-3" id="priority-queue">
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
                  className={`premium-surface premium-card-hover p-4 ${focusedSkill === task.skill ? "ring-1 ring-primary/40" : ""}`}
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
                <div key={task.id} className={`premium-surface p-4 ${focusedSkill === task.skill ? "ring-1 ring-primary/40" : ""}`}>
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
              <Button
                className="mt-4 w-full rounded-xl"
                disabled={!priorityQueue.length}
                onClick={() => {
                  setActiveSession(true)
                  setFocusedSkill(priorityQueue[0]?.skill ?? null)
                  toast({
                    title: "Priority session started",
                    description: "Guided recovery session opened for your top task.",
                  })
                  const element = document.getElementById("priority-queue")
                  if (element) element.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              >
                Launch
              </Button>
            </div>
            <div className="premium-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListTodo className="h-4 w-4" />
                Refresh Plan
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Regenerate today&apos;s plan from latest model and scheduler state.</p>
              <Button
                className="mt-4 w-full rounded-xl"
                variant="secondary"
                onClick={() => void refreshPlan()}
                disabled={refreshingPlan}
              >
                {refreshingPlan ? "Refreshing..." : "Refresh"}
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
                  if (topPendingTask) {
                    void submitFeedback(topPendingTask, 4, true)
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

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading practice board...</div>}>
      <PracticePageContent />
    </Suspense>
  )
}
