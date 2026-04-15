"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { DashboardFilters } from "@/components/dashboard/filters"

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    timeRange: "7d",
    category: "all",
    sortBy: "retention"
  })

  return (
    <DashboardShell
      description="Here is your skill retention overview for this week."
      actions={<DashboardFilters filters={filters} onFilterChange={setFilters} />}
    >
      <StatsOverview />
    </DashboardShell>
  )
}
