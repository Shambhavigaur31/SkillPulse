"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
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
import {
  SkillNotification,
  NOTIFICATIONS_STORAGE_KEY,
  formatRelativeTime,
  markAllNotificationsRead,
  readNotifications,
} from "@/lib/skillpulse-product"
import { getRiskTheme } from "@/components/premium/risk-theme"
import { RiskBadge } from "@/components/premium/risk-badge"
import { AnimatedNumber } from "@/components/premium/animated-number"

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
  const [notifications, setNotifications] = useState<SkillNotification[]>([])
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set())
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  useEffect(() => {
    function loadNotifications() {
      setNotifications(readNotifications())
    }

    loadNotifications()
    window.addEventListener("storage", loadNotifications)
    window.addEventListener("skillpulse:analysis-updated", loadNotifications)
    return () => {
      window.removeEventListener("storage", loadNotifications)
      window.removeEventListener("skillpulse:analysis-updated", loadNotifications)
    }
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !hiddenNotificationIds.has(notification.id)),
    [hiddenNotificationIds, notifications]
  )

  function handleMarkRead(notificationId: string) {
    const next = readNotifications().map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification
    )

    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event("skillpulse:analysis-updated"))
    setNotifications(next)
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

    window.setTimeout(() => {
      markAllNotificationsRead()
      setNotifications(readNotifications())
      setHiddenNotificationIds(new Set())
      setIsMarkingAll(false)
    }, unread.length * 65 + 220)
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }
  
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
            className="w-96 rounded-2xl border border-white/10 bg-background/95 p-1 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
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
                      className={`mx-1 my-1 rounded-xl border border-white/10 p-3 transition-all duration-200 hover:-translate-y-0.5 ${n.read ? "bg-white/4" : "bg-white/8"}`}
                      style={{ borderLeftWidth: 3, borderLeftColor: theme.chartColor }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${theme.badgeClass.split(" ")[0]}`} />
                          <p className="text-sm font-medium text-foreground">{n.skill} needs attention</p>
                        </div>
                        <RiskBadge risk={n.risk} />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{n.cadence}</span>
                        <div className="flex items-center gap-3">
                          {!n.read ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleMarkRead(n.id)
                              }}
                              className="interactive-focus text-[10px] font-medium text-primary"
                            >
                              Mark read
                            </button>
                          ) : null}
                          <span>{formatRelativeTime(n.createdAt)}</span>
                        </div>
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
