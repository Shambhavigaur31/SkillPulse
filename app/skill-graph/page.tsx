import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SkillGraphPage() {
  return (
    <DashboardShell
      title="Skill Graph"
      description="Dependency visualization is planned for a future release."
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Skill Graph</CardTitle>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We are currently focusing on ARS-based recommendations and action planning. Dependency and cascade views will return in a later milestone.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
