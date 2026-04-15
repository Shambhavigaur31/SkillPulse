"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ExternalLink, Sparkles, AlertCircle, Loader2 } from "lucide-react"

export default function LinkCodeorcesPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [handle, setHandle] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, apiKey, apiSecret }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? "Could not link Codeforces. Please check your credentials.")
          return
        }

        const target = typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : "/"
        router.push(target)
        router.refresh()
      } catch {
        setError("Unable to reach the server. Please try again.")
      }
    })
  }

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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
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
            <h2 className="text-lg font-semibold text-foreground">Link your Codeforces account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One-time setup. Your credentials are encrypted and stored — you won&apos;t need to
              enter them again.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Handle */}
            <div className="space-y-1.5">
              <label htmlFor="handle" className="block text-sm font-medium text-foreground">
                Codeforces Handle
              </label>
              <input
                id="handle"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="e.g. tourist"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground
                           outline-none ring-0 transition-all
                           focus:border-primary/60 focus:ring-2 focus:ring-primary/20
                           disabled:opacity-50"
                disabled={isPending}
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label htmlFor="apiKey" className="block text-sm font-medium text-foreground">
                API Key
              </label>
              <input
                id="apiKey"
                type="text"
                autoComplete="off"
                required
                placeholder="64-character hex string"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground placeholder:font-sans
                           outline-none ring-0 transition-all
                           focus:border-primary/60 focus:ring-2 focus:ring-primary/20
                           disabled:opacity-50"
                disabled={isPending}
              />
            </div>

            {/* API Secret */}
            <div className="space-y-1.5">
              <label htmlFor="apiSecret" className="block text-sm font-medium text-foreground">
                API Secret
              </label>
              <div className="relative">
                <input
                  id="apiSecret"
                  type={showSecret ? "text" : "password"}
                  autoComplete="off"
                  required
                  placeholder="64-character hex string"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground placeholder:font-sans
                             outline-none ring-0 transition-all
                             focus:border-primary/60 focus:ring-2 focus:ring-primary/20
                             disabled:opacity-50"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground
                         shadow-md shadow-primary/25 transition-all
                         hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30
                         focus:outline-none focus:ring-2 focus:ring-primary/40
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Linking…
                </>
              ) : (
                "Link Codeforces & Continue"
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground/70">How to get your API credentials</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Log in to Codeforces in your browser</li>
              <li>
                Go to{" "}
                <a
                  href="https://codeforces.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  codeforces.com/settings/api
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Click <strong>Add API key</strong> and copy the key + secret
              </li>
            </ol>
            <p className="pt-1 text-[11px]">
              Your Codeforces credentials are encrypted at rest. Session cookies are httpOnly and
              contain only app session identity data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
