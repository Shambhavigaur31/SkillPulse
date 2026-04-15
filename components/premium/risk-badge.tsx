import type { RiskLabel } from "@/lib/skillpulse-product"
import { cn } from "@/lib/utils"
import { getRiskTheme } from "@/components/premium/risk-theme"

type RiskBadgeProps = {
  risk: RiskLabel
  className?: string
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const theme = getRiskTheme(risk)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
        theme.badgeClass,
        className
      )}
    >
      {theme.label}
    </span>
  )
}
