"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

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
  const [processingQueue, setProcessingQueue] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    async function loadPrefs() {
      try {
        const response = await fetch("/api/notifications/channels", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!mounted || !response.ok || !data?.prefs) return
        setPrefs(data.prefs as ChannelPrefs)
      } catch {
        toast({
          title: "Unable to load preferences",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        })
      }
    }
    void loadPrefs()
    return () => {
      mounted = false
    }
  }, [])

  async function savePrefs(next: ChannelPrefs) {
    const previous = prefs
    setSaving(true)
    setPrefs(next)
    try {
      const response = await fetch("/api/notifications/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (!response.ok) {
        setPrefs(previous)
        throw new Error("Failed to save")
      }
      toast({ title: "Preferences saved", description: "Notification settings updated." })
    } catch {
      toast({
        title: "Unable to save",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function runDeliveryQueue() {
    if (processingQueue) return
    setProcessingQueue(true)
    setDeliveryResult("")
    try {
      const response = await fetch("/api/notifications/deliver", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error("Delivery failed")
      }
      const result = data?.result
      if (result) {
        setDeliveryResult(`Processed ${result.processed}, sent ${result.sent}, failed ${result.failed}`)
        toast({
          title: "Delivery processed",
          description: `Processed ${result.processed}, sent ${result.sent}, failed ${result.failed}.`,
        })
      }
    } catch {
      toast({
        title: "Unable to process queue",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingQueue(false)
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
                <div>
                  <p className="text-sm text-foreground">{label}</p>
                  {key === "emailEnabled" ? (
                    <p className="text-xs text-muted-foreground">Email delivery queued (requires SMTP setup).</p>
                  ) : null}
                  {key === "pushEnabled" ? (
                    <p className="text-xs text-muted-foreground">Push delivery scaffold enabled.</p>
                  ) : null}
                </div>
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
            <Button onClick={() => void runDeliveryQueue()} className="rounded-xl" disabled={processingQueue}>
              {processingQueue ? "Processing..." : "Process queued notifications"}
            </Button>
            {deliveryResult ? <p className="mt-2 text-xs text-muted-foreground">{deliveryResult}</p> : null}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
