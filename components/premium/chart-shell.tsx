"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type ChartShellProps = {
  title: string
  subtitle?: string
  insight?: string
  children: React.ReactNode
  className?: string
}

export function ChartShell({ title, subtitle, insight, children, className }: ChartShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      className={cn("rounded-2xl border border-white/10 bg-white/4 p-4 shadow-lg shadow-black/10", className)}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        {insight ? <p className="mt-2 text-[11px] font-medium text-primary/95">{insight}</p> : null}
      </div>
      <div className="h-72">{children}</div>
    </motion.div>
  )
}
