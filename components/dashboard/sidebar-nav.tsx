"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Brain, 
  Target, 
  Trophy, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  BarChart3,
  Users,
  GraduationCap,
  GitBranch
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  badge?: string
}

const mainNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/" },
  { icon: <Brain className="h-5 w-5" />, label: "My Skills", href: "/skills" },
  { icon: <GitBranch className="h-5 w-5" />, label: "Skill Graph", href: "/skill-graph", badge: "Soon" },
  { icon: <Target className="h-5 w-5" />, label: "Practice", href: "/practice", badge: "5" },
  { icon: <BarChart3 className="h-5 w-5" />, label: "Analytics", href: "/analytics" },
  { icon: <Trophy className="h-5 w-5" />, label: "Achievements", href: "/achievements" },
  { icon: <Users className="h-5 w-5" />, label: "Leaderboard", href: "/leaderboard" },
  { icon: <GraduationCap className="h-5 w-5" />, label: "Learning Hub", href: "/courses" },
]

const bottomNavItems: NavItem[] = [
  { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/settings" },
  { icon: <HelpCircle className="h-5 w-5" />, label: "Help", href: "/help" },
]

interface SidebarNavProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/'
    return pathname.startsWith(item.href)
  }
  
  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-18" : "w-65"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Navigation</span>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onToggle}
            className={cn("h-8 w-8 hover:bg-secondary", collapsed && "mx-auto")}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )} />
          </Button>
        </div>
        
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {mainNavItems.map((item) => {
            const active = isActive(item)
            const NavButton = (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn(active && "drop-shadow-sm")}>{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                        active 
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-destructive text-destructive-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    {NavButton}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavButton
          })}
        </nav>
        
        <div className="border-t border-border p-3 space-y-1">
          {bottomNavItems.map((item) => {
            const active = pathname === item.href
            const NavButton = (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    {NavButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavButton
          })}
        </div>
      </aside>
    </TooltipProvider>
  )
}
