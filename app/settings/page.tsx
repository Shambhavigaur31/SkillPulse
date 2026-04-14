import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function SettingsPage() {
  return (
    <DashboardShell
      title="Settings"
      description="Configure account and learning preferences."
    >
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Settings controls will be added here next.
      </div>
    </DashboardShell>
  )
}
