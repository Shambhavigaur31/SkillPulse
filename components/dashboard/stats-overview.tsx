"use client"

import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { currentUser, skillsData } from "@/lib/data"

export function StatsOverview() {
  const criticalSkills = skillsData.filter(s => s.retention < 50).length
  const atRiskSkills = skillsData.filter(s => s.retention >= 50 && s.retention < 70).length
  const healthySkills = skillsData.filter(s => s.retention >= 70).length
  const improvingSkills = skillsData.filter(s => s.trend === "improving").length

  const stats = [
    {
      label: "Overall Retention",
      value: `${currentUser.overallRetention}%`,
      change: "+3.2%",
      trend: "up" as const,
      icon: <Brain className="h-5 w-5" />,
      color: "bg-primary/10 text-primary",
      progress: currentUser.overallRetention,
      progressColor: "bg-primary"
    },
    {
      label: "Skills Improving",
      value: improvingSkills.toString(),
      change: "+4 this week",
      trend: "up" as const,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      detail: `${healthySkills} above 70%`
    },
    {
      label: "At-Risk Skills",
      value: (criticalSkills + atRiskSkills).toString(),
      change: "-2 from last week",
      trend: "down" as const,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      detail: `${criticalSkills} critical`
    },
    {
      label: "Practice Sessions",
      value: "24",
      change: "This month",
      trend: "neutral" as const,
      icon: <Target className="h-5 w-5" />,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      detail: "Avg. 15 min/session"
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          className={cn(
            "overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group",
            "animate-in fade-in slide-in-from-bottom-4",
          )}
          style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</span>
                  <span className={cn(
                    "flex items-center text-xs font-medium",
                    stat.trend === "up" ? "text-green-600 dark:text-green-400" : 
                    stat.trend === "down" ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                  )}>
                    {stat.trend === "up" && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                    {stat.trend === "down" && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    {stat.change}
                  </span>
                </div>
                {stat.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={stat.progress} className="h-1.5" />
                  </div>
                )}
                {stat.detail && (
                  <span className="text-xs text-muted-foreground mt-1">{stat.detail}</span>
                )}
              </div>
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                stat.color
              )}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
