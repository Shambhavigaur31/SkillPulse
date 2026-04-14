"use client"

import { useRouter } from "next/navigation"
import { Bell, Search, Sparkles, Flame, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  userName: string
  userLevel: number
  xp: number
  streak: number
  totalXP: number
}

export function Header({ userName, userLevel, xp, streak, totalXP }: HeaderProps) {
  const router = useRouter()
  const xpForNextLevel = userLevel * 1000
  const progress = (totalXP % 1000) / 10

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }
  
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-foreground">SkillPulse</span>
            <span className="text-[10px] text-muted-foreground -mt-1">AI Skill Decay Detection</span>
          </div>
        </div>
        
        <div className="ml-8 hidden items-center gap-2 rounded-xl bg-secondary/50 border border-border px-4 py-2.5 lg:flex transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search skills, topics, courses..." 
            className="w-72 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden xl:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Stats Pills */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 px-3 py-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">{streak}</span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
          
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-3 py-1.5">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">+{xp}</span>
            <span className="text-xs text-muted-foreground">XP today</span>
          </div>
        </div>
        
        <div className="h-6 w-px bg-border hidden md:block" />
        
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-destructive">Skill Decay Alert</span>
              <span className="text-xs text-muted-foreground">Dynamic Programming retention dropped to 38%</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-primary">New Achievement</span>
              <span className="text-xs text-muted-foreground">You unlocked &quot;7-Day Warrior&quot; badge!</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium">Practice Reminder</span>
              <span className="text-xs text-muted-foreground">Review Graph Theory before it decays further</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-secondary">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-primary/30">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} />
                  <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-card">
                  {userLevel}
                </div>
              </div>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium text-foreground">{userName}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{totalXP.toLocaleString()} XP</span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Learning History</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
