"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { userData } from "@/lib/data"

interface SessionUser {
  handle: string
  firstName?: string
  lastName?: string
}

interface DashboardShellProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function DashboardShell({ children, title, description, actions }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.handle) setSessionUser(data)
      })
      .catch(() => {
        // proxy already guarantees auth; silently ignore
      })
  }, [])

  const displayName = sessionUser
    ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || sessionUser.handle
    : userData.name

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
          userLevel={userData.level}
          xp={userData.xpToday}
          streak={userData.streak}
          totalXP={userData.totalXP}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] space-y-6 p-6">
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {title ?? `Welcome back, ${firstName}!`}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    {description ?? "Track your progress and keep your knowledge fresh."}
                  </p>
                </div>
                {actions}
              </div>
            </section>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
