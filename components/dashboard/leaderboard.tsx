"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Trophy, Flame, Medal, Crown, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react"

type LeaderboardUser = {
  rank: number
  handle: string
  xpTotal: number
  streak: number
  bestStreak: number
  isCurrentUser: boolean
}

function recoveryScore(user: LeaderboardUser): number {
  const streakWeight = Math.min(50, user.streak * 1.5)
  const xpWeight = Math.min(50, Math.round(user.xpTotal / 300))
  return Math.min(100, Math.round(streakWeight + xpWeight))
}

function stabilizedSkills(score: number): number {
  return Math.max(4, Math.round(score / 6))
}

function weeklyMovement(user: LeaderboardUser): number {
  const swing = Math.round((user.streak - user.bestStreak / 2) / 3)
  return Math.max(-6, Math.min(6, swing))
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-lg shadow-amber-500/30"
    case 2:
      return "bg-gradient-to-r from-slate-300 to-gray-400 text-slate-800 shadow-lg shadow-slate-400/30"
    case 3:
      return "bg-gradient-to-r from-amber-600 to-orange-700 text-amber-100 shadow-lg shadow-orange-600/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-3 w-3" />
    case 2:
      return <Medal className="h-3 w-3" />
    case 3:
      return <Trophy className="h-3 w-3" />
    default:
      return null
  }
}

export function Leaderboard() {
  const [timeframe, setTimeframe] = useState("alltime")
  const [displayData, setDisplayData] = useState<LeaderboardUser[]>([])

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      const response = await fetch("/api/leaderboard?limit=20", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!mounted || !response.ok || !Array.isArray(data?.leaderboard)) return
      setDisplayData(data.leaderboard as LeaderboardUser[])
    }
    void hydrate()
    return () => {
      mounted = false
    }
  }, [timeframe])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Leaderboard</CardTitle>
          </div>
          <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="weekly" className="text-xs px-3 h-7">
                Week
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-3 h-7">
                Month
              </TabsTrigger>
              <TabsTrigger value="alltime" className="text-xs px-3 h-7">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Recovery score focus</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Consistency + recovery velocity</p>
          </div>
          <div>
            <p className="text-muted-foreground">Skills stabilized</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Derived from XP & streaks</p>
          </div>
          <div>
            <p className="text-muted-foreground">Weekly movement</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Rank momentum this period</p>
          </div>
        </div>
        {displayData.map((user) => (
          <div
            key={`${user.rank}-${user.handle}`}
            className={cn(
              "flex items-center gap-3 rounded-xl p-3 transition-all duration-200",
              user.isCurrentUser
                ? "bg-primary/10 ring-1 ring-primary/30 shadow-sm"
                : "hover:bg-secondary/50"
            )}
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold", getRankStyle(user.rank))}>
              {getRankIcon(user.rank) || user.rank}
            </div>

            <Avatar className={cn("h-10 w-10 border-2", user.rank <= 3 ? "border-primary/50" : "border-border")}>
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.handle}`} />
              <AvatarFallback>{user.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">{user.handle}</span>
                {user.isCurrentUser ? (
                  <Badge variant="outline" className="text-xs shrink-0">
                    You
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Level {Math.max(1, Math.floor(user.xpTotal / 500) + 1)}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {user.streak}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  {stabilizedSkills(recoveryScore(user))} stabilized
                </span>
                <span className="flex items-center gap-1">
                  {weeklyMovement(user) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-amber-400" />
                  )}
                  {weeklyMovement(user) >= 0 ? "+" : ""}{weeklyMovement(user)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-foreground">{user.xpTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP • {recoveryScore(user)} recovery</p>
              <p className="text-[10px] text-muted-foreground">
                Top {Math.max(1, Math.round((user.rank / Math.max(1, displayData.length)) * 100))}%
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
