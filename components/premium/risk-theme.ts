import type { RiskLabel } from "@/lib/skillpulse-product"

export type RiskTheme = {
  label: string
  badgeClass: string
  ringClass: string
  glowClass: string
  chartColor: string
  progressClass: string
}

const RISK_THEME: Record<RiskLabel, RiskTheme> = {
  SAFE: {
    label: "Safe",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
    ringClass: "ring-emerald-500/35",
    glowClass: "shadow-emerald-500/20",
    chartColor: "#34d399",
    progressClass: "from-emerald-400 to-emerald-500",
  },
  GENTLE: {
    label: "Gentle",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/35",
    ringClass: "ring-amber-500/35",
    glowClass: "shadow-amber-500/20",
    chartColor: "#f59e0b",
    progressClass: "from-amber-400 to-amber-500",
  },
  AT_RISK: {
    label: "At Risk",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/35",
    ringClass: "ring-orange-500/35",
    glowClass: "shadow-orange-500/20",
    chartColor: "#f97316",
    progressClass: "from-orange-400 to-orange-500",
  },
  CRITICAL: {
    label: "Critical",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/40",
    ringClass: "ring-red-500/35",
    glowClass: "shadow-red-500/20",
    chartColor: "#ef4444",
    progressClass: "from-red-400 to-red-500",
  },
  SEVERE: {
    label: "Severe",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
    ringClass: "ring-fuchsia-500/35",
    glowClass: "shadow-fuchsia-500/20",
    chartColor: "#d946ef",
    progressClass: "from-red-500 to-fuchsia-500",
  },
}

export function getRiskTheme(risk: RiskLabel): RiskTheme {
  return RISK_THEME[risk]
}

export function riskChartColor(risk: RiskLabel): string {
  return getRiskTheme(risk).chartColor
}
