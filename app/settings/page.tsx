"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

type ChannelPrefs = {
  emailEnabled: boolean
  pushEnabled: boolean
  reminderEnabled: boolean
  escalationEnabled: boolean
  recoveryEnabled: boolean
}

const defaultPrefs: ChannelPrefs = {
  emailEnabled: true,
  pushEnabled: false,
  reminderEnabled: true,
  escalationEnabled: true,
  recoveryEnabled: true,
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<ChannelPrefs>(defaultPrefs)
  const [saving, setSaving] = useState(false)
  const [deliveryResult, setDeliveryResult] = useState<string>("")

  useEffect(() => {
    let mounted = true
    async function loadPrefs() {
      const response = await fetch("/api/notifications/channels", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!mounted || !response.ok || !data?.prefs) return
      setPrefs(data.prefs as ChannelPrefs)
    }
    void loadPrefs()
    return () => {
      mounted = false
    }
  }, [])

  async function savePrefs(next: ChannelPrefs) {
    setSaving(true)
    setPrefs(next)
    try {
      await fetch("/api/notifications/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
    } finally {
      setSaving(false)
    }
  }

  async function runDeliveryQueue() {
    const response = await fetch("/api/notifications/deliver", { method: "POST" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return
    const result = data?.result
    if (result) {
      setDeliveryResult(`Processed ${result.processed}, sent ${result.sent}, skipped ${result.failed}`)
    }
  }

  return (
    <DashboardShell title="Settings" description="Configure notification delivery channels and trigger processing.">
      <div className="space-y-4">
        <Card className="premium-surface">
          <CardHeader>
            <CardTitle className="text-base">Notification Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["Email alerts", "emailEnabled"],
                ["Push alerts", "pushEnabled"],
                ["Reminder notifications", "reminderEnabled"],
                ["Escalation notifications", "escalationEnabled"],
                ["Recovery nudges", "recoveryEnabled"],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <p className="text-sm text-foreground">{label}</p>
                <Switch
                  checked={prefs[key]}
                  disabled={saving}
                  onCheckedChange={(checked) => {
                    const next = { ...prefs, [key]: checked }
                    void savePrefs(next)
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="premium-surface">
          <CardHeader>
            <CardTitle className="text-base">Delivery Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void runDeliveryQueue()} className="rounded-xl">
              Process queued notifications
            </Button>
            {deliveryResult ? <p className="mt-2 text-xs text-muted-foreground">{deliveryResult}</p> : null}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
