"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { skillsData, categories } from "@/lib/data"
import { TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, Play, ChevronRight } from "lucide-react"

const getRetentionColor = (retention: number) => {
  if (retention >= 85) return "bg-green-500 hover:bg-green-600"
  if (retention >= 70) return "bg-yellow-500 hover:bg-yellow-600"
  if (retention >= 50) return "bg-orange-500 hover:bg-orange-600"
  return "bg-red-500 hover:bg-red-600"
}

const getRetentionBg = (retention: number) => {
  if (retention >= 85) return "bg-green-500/10 border-green-500/20"
  if (retention >= 70) return "bg-yellow-500/10 border-yellow-500/20"
  if (retention >= 50) return "bg-orange-500/10 border-orange-500/20"
  return "bg-red-500/10 border-red-500/20"
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "improving": return <TrendingUp className="h-3 w-3 text-green-500" />
    case "decaying": return <TrendingDown className="h-3 w-3 text-red-500" />
    default: return <Minus className="h-3 w-3 text-muted-foreground" />
  }
}

export function SkillHeatmap() {
  const [selectedSkill, setSelectedSkill] = useState<typeof skillsData[0] | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Skill Retention Heatmap</CardTitle>
            <CardDescription>Click on any skill to see detailed analytics</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Retention:</span>
              <div className="flex items-center gap-1">
                <div className="h-3 w-6 rounded-sm bg-red-500/70" title="Critical (<50%)" />
                <div className="h-3 w-6 rounded-sm bg-orange-500/70" title="Low (50-69%)" />
                <div className="h-3 w-6 rounded-sm bg-yellow-500/70" title="Medium (70-84%)" />
                <div className="h-3 w-6 rounded-sm bg-green-500/70" title="High (85%+)" />
              </div>
            </div>
            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "grid" ? (
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                  <Badge variant="outline" className="text-xs">
                    {skillsData.filter(s => s.category === category).length} skills
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {skillsData
                    .filter(s => s.category === category)
                    .sort((a, b) => a.retention - b.retention)
                    .map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                        className={cn(
                          "relative flex flex-col items-start rounded-xl p-3 transition-all duration-200 text-left border",
                          getRetentionBg(skill.retention),
                          selectedSkill?.id === skill.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          "hover:scale-[1.02] hover:shadow-md"
                        )}
                      >
                        {skill.retention < 50 && (
                          <div className="absolute -top-1 -right-1">
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          {getTrendIcon(skill.trend)}
                          <span className="text-sm font-medium text-foreground truncate max-w-[100px]">
                            {skill.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", getRetentionColor(skill.retention))}
                              style={{ width: `${skill.retention}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground min-w-[32px] text-right">
                            {skill.retention}%
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {skillsData
              .sort((a, b) => a.retention - b.retention)
              .map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                  className={cn(
                    "flex items-center gap-4 w-full rounded-lg p-3 transition-all border",
                    getRetentionBg(skill.retention),
                    selectedSkill?.id === skill.id && "ring-2 ring-primary",
                    "hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getTrendIcon(skill.trend)}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-foreground truncate">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {skill.lastPracticed}
                    </div>
                    <div className="w-24">
                      <Progress value={skill.retention} className="h-2" />
                    </div>
                    <span className="text-sm font-semibold min-w-[40px] text-right text-foreground">
                      {skill.retention}%
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
          </div>
        )}
        
        {selectedSkill && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-foreground">{selectedSkill.name}</h4>
                  <Badge 
                    variant={selectedSkill.trend === "improving" ? "default" : selectedSkill.trend === "stable" ? "secondary" : "destructive"}
                    className="capitalize"
                  >
                    {getTrendIcon(selectedSkill.trend)}
                    <span className="ml-1">{selectedSkill.trend}</span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{selectedSkill.category}</p>
              </div>
              <Button size="sm" className="gap-2">
                <Play className="h-4 w-4" />
                Practice Now
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  selectedSkill.retention >= 70 ? "text-foreground" : "text-destructive"
                )}>
                  {selectedSkill.retention}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Retention</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{selectedSkill.solveCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Problems Solved</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{selectedSkill.daysSinceLastPractice}d</p>
                <p className="text-xs text-muted-foreground mt-1">Since Practice</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  selectedSkill.cri >= 40 ? "text-destructive" : selectedSkill.cri >= 20 ? "text-orange-500" : "text-green-500"
                )}>
                  {selectedSkill.cri}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cascade Risk</p>
              </div>
            </div>
            
            {selectedSkill.retention < 70 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  This skill is below optimal retention. Practice recommended within the next{" "}
                  {selectedSkill.retention < 50 ? "24 hours" : "3 days"} to prevent further decay.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
