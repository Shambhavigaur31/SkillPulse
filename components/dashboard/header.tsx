"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Search, Sparkles, Flame, Zap, LayoutGrid, Target, BookOpen, Network } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SkillNotification,
  formatRelativeTime,
} from "@/lib/skillpulse-product"
import { getRiskTheme } from "@/components/premium/risk-theme"
import { RiskBadge } from "@/components/premium/risk-badge"
import { AnimatedNumber } from "@/components/premium/animated-number"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface HeaderProps {
  userName: string
  userLevel: number
  xp: number
  streak: number
  totalXP: number
}

export function Header({ userName, userLevel, xp, streak, totalXP }: HeaderProps) {
  const router = useRouter()
  const progress = (totalXP % 1000) / 10
  const ringProgress = Math.max(0, Math.min(100, progress))
  const ringRadius = 18
  const ringCircumference = 2 * Math.PI * ringRadius
  const [notifications, setNotifications] = useState<SkillNotification[]>([])
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set())
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications?limit=50", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !mounted) return
        if (Array.isArray(data?.notifications)) {
          setNotifications(data.notifications as SkillNotification[])
        }
      } catch {
        // ignore notification polling failure
      }
    }

    void loadNotifications()
    const interval = window.setInterval(() => {
      void loadNotifications()
    }, 30_000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !hiddenNotificationIds.has(notification.id)),
    [hiddenNotificationIds, notifications]
  )

  async function handleMarkRead(notificationId: string) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      })
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      )
      toast({ title: "Marked as read", description: "Notification updated." })
    } catch {
      toast({ title: "Unable to mark read", description: "Please try again.", variant: "destructive" })
    }
  }

  async function handleMarkAllRead() {
    if (isMarkingAll) return

    const unread = notifications.filter((notification) => !notification.read)
    if (!unread.length) return

    setIsMarkingAll(true)
    unread.forEach((notification, index) => {
      window.setTimeout(() => {
        setHiddenNotificationIds((prev) => {
          const next = new Set(prev)
          next.add(notification.id)
          return next
        })
      }, index * 65)
    })

    window.setTimeout(async () => {
      try {
        await fetch("/api/notifications/read-all", { method: "POST" })
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        toast({ title: "All read", description: "Notifications cleared." })
      } catch {
        toast({ title: "Unable to mark all", description: "Please try again.", variant: "destructive" })
      } finally {
        setHiddenNotificationIds(new Set())
        setIsMarkingAll(false)
      }
    }, unread.length * 65 + 220)
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    router.replace("/login")
    router.refresh()
  }

  function runCommand(action: () => void) {
    setCommandOpen(false)
    action()
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      if (isCmdK) {
        event.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
  
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-foreground">SkillPulse</span>
            <span className="text-[10px] text-muted-foreground -mt-1">AI Skill Decay Detection</span>
          </div>
        </div>
        
        <div className="ml-8 hidden items-center gap-2 rounded-xl bg-secondary/50 border border-border px-4 py-2.5 lg:flex transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="w-72 text-left text-sm text-muted-foreground"
          >
            Search skills, topics, courses...
          </button>
          <kbd className="hidden xl:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Stats Pills */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-linear-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 px-3 py-1.5">
            <motion.span
              className="text-orange-500"
              animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame className="h-4 w-4" />
            </motion.span>
            <AnimatedNumber value={streak} className="text-sm font-semibold text-foreground" />
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
          
          <div className="flex items-center gap-2 rounded-full bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 px-3 py-1.5">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">+<AnimatedNumber value={xp} /></span>
            <span className="text-xs text-muted-foreground">XP today</span>
          </div>
        </div>
        
        <div className="h-6 w-px bg-border hidden md:block" />
        
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-105 rounded-2xl border border-white/10 bg-background/95 p-2 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {visibleNotifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleMarkAllRead}>
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleNotifications.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet. Run analysis to generate ARS alerts.</div>
            )}
            <AnimatePresence initial={false}>
              {visibleNotifications.map((n, index) => {
                const theme = getRiskTheme(n.risk)
                return (
                  <DropdownMenuItem key={n.id} asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.02 }}
                      className={`mx-1 my-1 rounded-xl border border-white/10 p-4 transition-all duration-200 hover:-translate-y-0.5 ${n.read ? "bg-white/4" : "bg-white/8"}`}
                      style={{ borderLeftWidth: 3, borderLeftColor: theme.chartColor }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${theme.badgeClass.split(" ")[0]}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{n.skill} needs attention</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                        <RiskBadge risk={n.risk} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatRelativeTime(n.createdAt)}</span>
                        <span className="text-[10px]">{n.cadence}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {!n.read ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleMarkRead(n.id)
                            }}
                          >
                            Mark read
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-lg px-2 text-[11px]"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(`/practice?skill=${encodeURIComponent(n.skill)}&source=notifications`)
                          }}
                        >
                          Open skill
                        </Button>
                      </div>
                    </motion.div>
                  </DropdownMenuItem>
                )
              })}
            </AnimatePresence>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-secondary">
              <div className="relative">
                <svg className="absolute -inset-1" width={50} height={50}>
                  <circle
                    cx={25}
                    cy={25}
                    r={ringRadius}
                    stroke="rgba(148,163,184,0.25)"
                    strokeWidth={3}
                    fill="transparent"
                  />
                  <circle
                    cx={25}
                    cy={25}
                    r={ringRadius}
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fill="transparent"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference - (ringProgress / 100) * ringCircumference}
                    strokeLinecap="round"
                  />
                </svg>
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
            <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search actions, skills, or pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => runCommand(() => router.push("/"))}> 
              <LayoutGrid className="h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/practice"))}> 
              <Target className="h-4 w-4" />
              Practice board
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/courses"))}> 
              <BookOpen className="h-4 w-4" />
              Learning hub
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/skill-graph"))}> 
              <Network className="h-4 w-4" />
              Skill graph
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => router.push("/practice?session=priority"))}> 
              <Target className="h-4 w-4" />
              Start priority session
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/?refresh=1"))}> 
              <Sparkles className="h-4 w-4" />
              Refresh skill health
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  )
}
