"use client"

import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/premium/animated-number"

type MetricCardProps = {
  label: string
  value: number
  valueSuffix?: string
  subtitle?: string
  icon: React.ReactNode
  tone?: "neutral" | "success" | "warning" | "danger"
  className?: string
}

const toneStyles = {
  neutral: "from-white/10 to-white/5 border-white/15",
  success: "from-emerald-500/15 to-emerald-400/5 border-emerald-400/30",
  warning: "from-amber-500/15 to-orange-400/5 border-amber-400/30",
  danger: "from-red-500/15 to-fuchsia-500/5 border-red-400/30",
}

export function MetricCard({
  label,
  value,
  valueSuffix,
  subtitle,
  icon,
  tone = "neutral",
  className,
}: MetricCardProps) {
  const isCriticalTone = tone === "danger"

  return (
    <motion.div whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
      <Card
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-linear-to-br shadow-xl shadow-black/10",
          toneStyles[tone],
          className
        )}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/12 to-transparent"
          initial={{ x: "-140%" }}
          animate={{ x: ["-140%", "330%"] }}
          transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.6 }}
        />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <AnimatedNumber
                value={value}
                suffix={valueSuffix}
                className="mt-2 block text-3xl font-semibold tracking-tight text-foreground"
              />
              {subtitle ? (
                <motion.p
                  className="mt-1 text-xs text-muted-foreground"
                  initial={{ opacity: 0.4, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
                >
                  {subtitle}
                </motion.p>
              ) : null}
            </div>
            <motion.div
              className={cn(
                "rounded-xl border border-white/15 bg-white/10 p-2 text-muted-foreground transition-colors group-hover:text-foreground",
                isCriticalTone ? "critical-pulse" : ""
              )}
              animate={isCriticalTone ? { scale: [1, 1.04, 1] } : undefined}
              transition={isCriticalTone ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
            >
              {icon}
            </motion.div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Live from latest analysis
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
