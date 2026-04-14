import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { RecommendedPractice } from "@/components/dashboard/recommended-practice"

export default function PracticePage() {
  return (
    <DashboardShell
      title="Practice Queue"
      description="Focus on the highest-impact revision tasks before decay accelerates."
    >
      <RecommendedPractice />
    </DashboardShell>
  )
}
