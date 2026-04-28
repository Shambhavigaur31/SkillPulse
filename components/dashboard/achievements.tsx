"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Award, Lock, ChevronRight, Sparkles, Target } from "lucide-react"

type Achievement = {
  key: string
  name: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  total: number
  progress: number
  unlocked: boolean
  unlockedAt: string | null
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

export function Achievements() {
  const [showAll, setShowAll] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      const response = await fetch("/api/achievements", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!mounted || !response.ok || !Array.isArray(data?.achievements)) return
      setAchievements(data.achievements as Achievement[])
    }
    void hydrate()
    return () => {
      mounted = false
    }
  }, [])

  const unlockedCount = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked).length,
    [achievements]
  )
  const nextAchievement = useMemo(() => {
    return achievements
      .filter((achievement) => !achievement.unlocked)
      .sort((a, b) => a.total - a.progress - (b.total - b.progress))[0]
  }, [achievements])
  const displayAchievements = showAll ? achievements : achievements.slice(0, 6)

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Achievements</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {unlockedCount}/{achievements.length} Unlocked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Progress snapshot
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{unlockedCount} unlocked</p>
            <p className="text-xs text-muted-foreground">Keep streaks and recovery sessions steady.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Next milestone
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {nextAchievement ? nextAchievement.name : "All badges unlocked"}
            </p>
            <p className="text-xs text-muted-foreground">
              {nextAchievement
                ? `${nextAchievement.progress}/${nextAchievement.total} toward this badge`
                : "You cleared every achievement tier."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayAchievements.map((achievement) => (
            <div
              key={achievement.key}
              className={cn(
                "relative flex flex-col items-center rounded-xl border-2 p-4 transition-all duration-300",
                achievement.unlocked
                  ? cn(rarityBorder[achievement.rarity], "hover:shadow-lg")
                  : "border-border bg-muted/30 hover:bg-muted/50"
              )}
            >
              {!achievement.unlocked ? (
                <div className="absolute right-2 top-2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                  Locked
                </div>
              ) : null}
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-2xl",
                  achievement.unlocked
                    ? `bg-linear-to-br ${rarityStyles[achievement.rarity]} shadow-lg`
                    : "bg-muted"
                )}
              >
                {achievement.unlocked ? "🏆" : <Lock className="h-6 w-6 text-muted-foreground" />}
              </div>

              <h4 className="mt-3 text-center text-sm font-semibold text-foreground">{achievement.name}</h4>
              <p className="mt-1 text-center text-[11px] text-muted-foreground leading-tight line-clamp-2">
                {achievement.description}
              </p>

              {!achievement.unlocked ? (
                <div className="mt-3 w-full space-y-1">
                  <Progress value={(achievement.progress / achievement.total) * 100} className="h-2" />
                  <p className="text-center text-[10px] font-medium text-muted-foreground">
                    {achievement.progress}/{achievement.total}
                  </p>
                </div>
              ) : (
                <Badge className={cn("mt-3 text-[10px] font-semibold capitalize border-0 text-white", `bg-linear-to-r ${rarityStyles[achievement.rarity]}`)}>
                  {achievement.rarity}
                </Badge>
              )}
              <p className="mt-3 text-[10px] text-muted-foreground">
                {achievement.unlocked
                  ? `Unlocked ${achievement.unlockedAt ?? "recently"}`
                  : `Complete ${achievement.total - achievement.progress} more to unlock.`}
              </p>
            </div>
          ))}
        </div>

        {achievements.length > 6 ? (
          <Button variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-foreground" onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? "Show Less" : `View All ${achievements.length} Achievements`}
            <ChevronRight className={cn("h-4 w-4 ml-1 transition-transform", showAll && "rotate-90")} />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
