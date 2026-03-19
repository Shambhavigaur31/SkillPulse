"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { achievementsData } from "@/lib/data"
import { Award, Lock, Sparkles, ChevronRight } from "lucide-react"

const iconMap: Record<string, string> = {
  footprints: "👟",
  flame: "🔥",
  calendar: "📅",
  database: "🏗️",
  zap: "⚡",
  brain: "🧠",
  shield: "🛡️",
  timer: "⏱️",
  moon: "🌙",
  crown: "👑",
  refresh: "🔄",
  users: "👥",
}

const rarityStyles = {
  common: "from-slate-400 to-slate-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-amber-400 via-yellow-500 to-orange-500",
}

const rarityBorder = {
  common: "border-slate-300 dark:border-slate-600",
  rare: "border-blue-400 dark:border-blue-500",
  epic: "border-purple-400 dark:border-purple-500",
  legendary: "border-amber-400 dark:border-amber-500",
}

const rarityGlow = {
  common: "",
  rare: "shadow-blue-500/20",
  epic: "shadow-purple-500/20",
  legendary: "shadow-amber-500/30 animate-pulse",
}

export function Achievements() {
  const [showAll, setShowAll] = useState(false)
  const unlockedAchievements = achievementsData.filter(a => a.unlocked)
  const lockedAchievements = achievementsData.filter(a => !a.unlocked)
  const displayAchievements = showAll ? achievementsData : achievementsData.slice(0, 6)
  
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Achievements</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {unlockedAchievements.length}/{achievementsData.length} Unlocked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayAchievements.map((achievement, index) => (
            <div
              key={achievement.id}
              className={cn(
                "relative flex flex-col items-center rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer group",
                achievement.unlocked 
                  ? cn(rarityBorder[achievement.rarity], "hover:shadow-lg", rarityGlow[achievement.rarity])
                  : "border-border bg-muted/30 hover:bg-muted/50",
                "animate-in fade-in slide-in-from-bottom-2"
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              {/* Rarity indicator */}
              {achievement.unlocked && achievement.rarity !== "common" && (
                <div className="absolute -top-1 -right-1">
                  <Sparkles className={cn(
                    "h-4 w-4",
                    achievement.rarity === "rare" && "text-blue-500",
                    achievement.rarity === "epic" && "text-purple-500",
                    achievement.rarity === "legendary" && "text-amber-500 animate-pulse"
                  )} />
                </div>
              )}
              
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-transform group-hover:scale-110",
                achievement.unlocked 
                  ? `bg-gradient-to-br ${rarityStyles[achievement.rarity]} shadow-lg`
                  : "bg-muted"
              )}>
                {achievement.unlocked ? iconMap[achievement.icon] || "🏆" : <Lock className="h-6 w-6 text-muted-foreground" />}
              </div>
              
              <h4 className="mt-3 text-center text-sm font-semibold text-foreground">{achievement.name}</h4>
              <p className="mt-1 text-center text-[11px] text-muted-foreground leading-tight line-clamp-2">
                {achievement.description}
              </p>
              
              {!achievement.unlocked && (
                <div className="mt-3 w-full space-y-1">
                  <Progress 
                    value={(achievement.progress / achievement.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-center text-[10px] font-medium text-muted-foreground">
                    {achievement.progress}/{achievement.total}
                  </p>
                </div>
              )}
              
              {achievement.unlocked && (
                <Badge 
                  className={cn(
                    "mt-3 text-[10px] font-semibold capitalize border-0 text-white",
                    `bg-gradient-to-r ${rarityStyles[achievement.rarity]}`
                  )}
                >
                  {achievement.rarity}
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        {achievementsData.length > 6 && (
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `View All ${achievementsData.length} Achievements`}
            <ChevronRight className={cn("h-4 w-4 ml-1 transition-transform", showAll && "rotate-90")} />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
