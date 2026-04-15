"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sparkles, AlertCircle, Mail } from "lucide-react"

function LoginCard({ googleStartHref, oauthErrorMessage }: { googleStartHref: string; oauthErrorMessage: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Subtle gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">SkillPulse</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                AI Skill Decay Detection for Developers
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">Sign in to SkillPulse</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your Google account to get started.
            </p>
          </div>

          {oauthErrorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{oauthErrorMessage}</span>
            </div>
          )}

          <a
            href={googleStartHref}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground
                       transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Mail className="h-4 w-4" />
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect")
  const googleStartHref = redirectPath?.startsWith("/")
    ? `/api/auth/google/start?redirect=${encodeURIComponent(redirectPath)}`
    : "/api/auth/google/start"

  const oauthError = searchParams.get("error")
  const oauthErrorMessage =
    oauthError === "google_config"
      ? "Google login is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local, then restart the server."
      : oauthError
      ? "Google login failed. Please try again."
      : null

  return <LoginCard googleStartHref={googleStartHref} oauthErrorMessage={oauthErrorMessage} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginCard googleStartHref="/api/auth/google/start" oauthErrorMessage={null} />}>
      <LoginContent />
    </Suspense>
  )
}
