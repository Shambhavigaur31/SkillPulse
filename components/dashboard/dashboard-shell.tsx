"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Header } from "@/components/dashboard/header"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { Badge } from "@/components/ui/badge"

interface SessionUser {
  handle: string
  firstName?: string
  lastName?: string
}

interface GamificationProfile {
  xpTotal: number
  xpToday: number
  streak: number
}

interface DashboardShellProps {
  children: React.ReactNode
  title?: string
  description?: string
  insight?: string
  statusChip?: string
  actions?: React.ReactNode
}

export function DashboardShell({ children, title, description, insight, statusChip, actions }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [gamification, setGamification] = useState<GamificationProfile>({
    xpTotal: 0,
    xpToday: 0,
    streak: 0,
  })
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const user = data?.user ?? data
        if (user?.handle) setSessionUser(user)
      })
      .catch(() => {
        // proxy already guarantees auth; silently ignore
      })

    fetch("/api/gamification/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile) {
          setGamification({
            xpTotal: Number(data.profile.xpTotal ?? 0),
            xpToday: Number(data.profile.xpToday ?? 0),
            streak: Number(data.profile.streak ?? 0),
          })
        }
      })
      .catch(() => {
        // keep defaults if gamification data is unavailable
      })
  }, [])

  const displayName = sessionUser
    ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || sessionUser.handle
    : "Coder"

  const firstName = sessionUser?.firstName ?? displayName.split(" ")[0]

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={displayName}
          userLevel={Math.max(1, Math.floor(gamification.xpTotal / 500) + 1)}
          xp={gamification.xpToday}
          streak={gamification.streak}
          totalXP={gamification.xpTotal}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-400 space-y-6 p-6">
            <section className="space-y-4 section-fade-in">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {title ?? `Welcome back, ${firstName}!`}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    {description ?? "Track your progress and keep your knowledge fresh."}
                  </p>
                  {insight ? (
                    <motion.p
                      className="mt-2 text-sm font-medium text-primary/95"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.34, ease: "easeOut", delay: 0.14 }}
                    >
                      {insight}
                    </motion.p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {statusChip ? <Badge variant="secondary" className="rounded-full border border-white/15 bg-white/10">{statusChip}</Badge> : null}
                  {actions}
                </div>
              </div>
            </section>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.34, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
