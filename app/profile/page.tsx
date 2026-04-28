"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent } from "@/components/ui/card"

type ProfileState = {
  handle: string
  firstName: string | null
  lastName: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.user) return
      setProfile({
        handle: data.user.handle ?? "",
        firstName: data.user.firstName ?? null,
        lastName: data.user.lastName ?? null,
      })
    }
    void load()
  }, [])

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || profile?.handle || "Your account"

  return (
    <DashboardShell
      title="Profile"
      description="Account overview and linked handle details."
      insight="Manage delivery preferences in Settings."
    >
      <Card className="premium-surface">
        <CardContent className="space-y-3 p-5 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Display name</p>
            <p className="font-semibold text-foreground">{displayName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Codeforces handle</p>
            <p className="font-semibold text-foreground">{profile?.handle || "Not linked"}</p>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}

