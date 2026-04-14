import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Achievements } from "@/components/dashboard/achievements"

export default function AchievementsPage() {
  return (
    <DashboardShell
      title="Achievements"
      description="Track milestones and unlock badges as your consistency improves."
    >
      <Achievements />
    </DashboardShell>
  )
}
