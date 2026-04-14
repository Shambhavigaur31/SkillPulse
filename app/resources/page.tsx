import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function ResourcesPage() {
  return (
    <DashboardShell
      title="Resources"
      description="Learning resources are being organized into topic-wise collections."
    >
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Resource collections are coming soon. For now, check the Courses page for curated picks.
      </div>
    </DashboardShell>
  )
}
