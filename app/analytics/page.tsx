import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ForgettingCurve } from "@/components/dashboard/forgetting-curve"
import { ActivityChart } from "@/components/dashboard/activity-chart"

export default function AnalyticsPage() {
  return (
    <DashboardShell
      title="Learning Analytics"
      description="Track your momentum, revision consistency, and retention trends over time."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ForgettingCurve />
        <ActivityChart />
      </div>
    </DashboardShell>
  )
}
