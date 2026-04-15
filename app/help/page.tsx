import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function HelpPage() {
  return (
    <DashboardShell
      title="Help"
      description="Find guidance for alerts, metrics, and recommended actions."
    >
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Help documentation is being prepared. Reach out to support if you need immediate assistance.
      </div>
    </DashboardShell>
  )
}
