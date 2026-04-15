"use client"

import { motion } from "framer-motion"
import type { RiskLabel } from "@/lib/skillpulse-product"
import { cn } from "@/lib/utils"
import { getRiskTheme } from "@/components/premium/risk-theme"

type ArsProgressProps = {
  value: number
  risk: RiskLabel
  className?: string
}

export function ArsProgress({ value, risk, className }: ArsProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const theme = getRiskTheme(risk)

  return (
    <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <motion.div
        className={cn("h-full bg-linear-to-r", theme.progressClass)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {(risk === "CRITICAL" || risk === "SEVERE") && (
        <motion.div
          className={cn("absolute inset-y-0 right-0 w-10 bg-linear-to-l from-white/35 to-transparent", theme.glowClass)}
          animate={{ opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  )
}
