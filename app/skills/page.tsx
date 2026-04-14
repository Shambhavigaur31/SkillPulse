import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SkillHeatmap } from "@/components/dashboard/skill-heatmap"
import { SkillDependencyGraph } from "@/components/dashboard/skill-dependency-graph"

export default function SkillsPage() {
  return (
    <DashboardShell
      title="My Skills"
      description="Visualize retention health and identify weak links in your skill network."
    >
      <div className="space-y-6">
        <SkillHeatmap />
        <SkillDependencyGraph />
      </div>
    </DashboardShell>
  )
}
