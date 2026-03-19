"use client"

import { Clock, Zap, AlertTriangle, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface PracticeItem {
  id: string
  skill: string
  reason: string
  priority: "urgent" | "recommended" | "optional"
  estimatedTime: number
  xpReward: number
  retention: number
}

const practiceItems: PracticeItem[] = [
  {
    id: "1",
    skill: "Dynamic Programming",
    reason: "Critical decay detected - 21 days since last practice",
    priority: "urgent",
    estimatedTime: 25,
    xpReward: 150,
    retention: 38
  },
  {
    id: "2",
    skill: "Graphs",
    reason: "Below threshold - affects 4 dependent skills",
    priority: "urgent",
    estimatedTime: 20,
    xpReward: 120,
    retention: 45
  },
  {
    id: "3",
    skill: "SQL Queries",
    reason: "Approaching decay threshold",
    priority: "recommended",
    estimatedTime: 15,
    xpReward: 80,
    retention: 55
  },
  {
    id: "4",
    skill: "OOP Concepts",
    reason: "Scheduled review based on spaced repetition",
    priority: "recommended",
    estimatedTime: 10,
    xpReward: 60,
    retention: 68
  },
  {
    id: "5",
    skill: "Sorting Algorithms",
    reason: "Maintain current level",
    priority: "optional",
    estimatedTime: 12,
    xpReward: 50,
    retention: 72
  },
]

const priorityStyles = {
  urgent: {
    badge: "bg-danger text-danger-foreground",
    border: "border-l-danger",
    icon: <AlertTriangle className="h-4 w-4 text-danger" />
  },
  recommended: {
    badge: "bg-warning text-warning-foreground",
    border: "border-l-warning",
    icon: <Clock className="h-4 w-4 text-warning" />
  },
  optional: {
    badge: "bg-info text-info-foreground",
    border: "border-l-info",
    icon: <Zap className="h-4 w-4 text-info" />
  }
}

export function RecommendedPractice() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">AI-Recommended Practice</CardTitle>
            <CardDescription>Personalized based on your forgetting curves</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            5 Sessions Queued
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {practiceItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center gap-4 rounded-lg border-l-4 bg-secondary/30 p-4 transition-all hover:bg-secondary/50",
              priorityStyles[item.priority].border
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {priorityStyles[item.priority].icon}
                <h4 className="font-semibold text-foreground">{item.skill}</h4>
                <Badge className={cn("text-xs capitalize", priorityStyles[item.priority].badge)}>
                  {item.priority}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
              
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{item.estimatedTime} min</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Zap className="h-3 w-3" />
                  <span>+{item.xpReward} XP</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Current retention</span>
                    <span className="font-medium text-foreground">{item.retention}%</span>
                  </div>
                  <Progress value={item.retention} className="mt-1 h-1.5" />
                </div>
              </div>
            </div>
            
            <Button 
              size="sm" 
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              Start
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button variant="outline" className="w-full mt-4">
          View All Practice Sessions
        </Button>
      </CardContent>
    </Card>
  )
}
