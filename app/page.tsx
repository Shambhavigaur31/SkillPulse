"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { ForgettingCurve } from "@/components/dashboard/forgetting-curve"
import { SkillHeatmap } from "@/components/dashboard/skill-heatmap"
import { SkillDependencyGraph } from "@/components/dashboard/skill-dependency-graph"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import { Achievements } from "@/components/dashboard/achievements"
import { RecommendedPractice } from "@/components/dashboard/recommended-practice"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { CourseRecommendations } from "@/components/dashboard/course-recommendations"
import { DashboardFilters } from "@/components/dashboard/filters"
import { userData } from "@/lib/data"

interface SessionUser {
  handle: string
  firstName?: string
  lastName?: string
  rank?: string
  maxRating?: number
  avatar?: string
}

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filters, setFilters] = useState({
    timeRange: "7d",
    category: "all",
    sortBy: "retention"
  })
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.handle) setSessionUser(data)
      })
      .catch(() => { /* middleware already guarantees auth; silently ignore */ })
  }, [])

  const displayName = sessionUser
    ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || sessionUser.handle
    : userData.name

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
        
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
            {/* Overview Section */}
            <section id="overview" className="scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome back, {(sessionUser?.firstName ?? displayName.split(" ")[0])}!
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Here&apos;s your skill retention overview for this week
                  </p>
                </div>
                <DashboardFilters filters={filters} onFilterChange={setFilters} />
              </div>
              
              <StatsOverview />
            </section>
            
            {/* Analytics Row */}
            <section id="analytics" className="scroll-mt-20 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Learning Analytics</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <ForgettingCurve />
                <ActivityChart />
              </div>
            </section>
            
            {/* Skills Section */}
            <section id="skills" className="scroll-mt-20 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Skill Retention Map</h2>
              <SkillHeatmap />
            </section>
            
            {/* Dependency Graph */}
            <section id="dependency-graph" className="scroll-mt-20 space-y-4">
              <SkillDependencyGraph />
            </section>
            
            {/* Practice Section */}
            <section id="practice" className="scroll-mt-20 space-y-4">
              <RecommendedPractice />
            </section>
            
            {/* Courses & Resources */}
            <section id="courses" className="scroll-mt-20 space-y-4">
              <CourseRecommendations />
            </section>
            
            {/* Gamification Row */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div id="achievements" className="scroll-mt-20">
                <Achievements />
              </div>
              <div id="leaderboard" className="scroll-mt-20">
                <Leaderboard />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
