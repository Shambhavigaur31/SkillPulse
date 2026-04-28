"use client"

import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RecommendationCardProps = {
  title: string
  skill: string
  reason: string
  typeLabel: string
  meta?: string
  ctaLabel?: string
  ctaHref?: string
  className?: string
}

export function RecommendationCard({
  title,
  skill,
  reason,
  typeLabel,
  meta,
  ctaLabel,
  ctaHref,
  className,
}: RecommendationCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn("group h-full", className)}
    >
      <div className="relative h-full rounded-2xl border border-white/10 bg-white/4 p-4 shadow-lg shadow-black/10 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent bg-linear-to-r from-primary/18 via-transparent to-emerald-300/18 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
            {typeLabel}
          </span>
          <span className="text-xs text-muted-foreground">{skill}</span>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-2 max-h-9 overflow-hidden text-xs leading-relaxed text-muted-foreground transition-all duration-200 group-hover:max-h-24">
          {reason}
        </p>
        {meta ? <p className="mt-2 text-[11px] text-muted-foreground/90">{meta}</p> : null}
        {ctaLabel ? (
          ctaHref ? (
            <Button asChild size="sm" variant="secondary" className="mt-4 rounded-xl">
              <a href={ctaHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
                {ctaLabel}
                <motion.span whileHover={{ x: 2, y: -1 }} transition={{ duration: 0.16 }}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </motion.span>
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="mt-4 rounded-xl" disabled>
              {ctaLabel}
            </Button>
          )
        ) : null}
      </div>
    </motion.div>
  )
}
