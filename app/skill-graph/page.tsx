import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SkillDependencyGraph } from "@/components/dashboard/skill-dependency-graph"

export default function SkillGraphPage() {
  return (
    <DashboardShell
      title="Skill Graph"
      description="Understand how weak foundations can cascade across connected topics."
    >
      <SkillDependencyGraph />
    </DashboardShell>
  )
}
