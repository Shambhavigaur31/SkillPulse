import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Leaderboard } from "@/components/dashboard/leaderboard"

export default function LeaderboardPage() {
  return (
    <DashboardShell
      title="Leaderboard"
      description="See how your consistency and skill health compare with your peers."
    >
      <Leaderboard />
    </DashboardShell>
  )
}
