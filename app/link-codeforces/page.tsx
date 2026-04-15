"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { getApiErrorCode, getApiErrorMessage, toProductMessage } from "@/lib/api-client"

export default function LinkCodeorcesPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [handle, setHandle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage(null)
    setError(null)

    const normalizedHandle = handle.trim()
    if (!normalizedHandle) {
      setError("Please enter your Codeforces handle.")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: normalizedHandle }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          const code = getApiErrorCode(data)
          const message = getApiErrorMessage(data, "Could not link Codeforces. Please try again.")
          setError(toProductMessage(code, message))
          return
        }

        setSuccessMessage("Codeforces handle linked successfully.")

        const target = typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : "/"

        window.setTimeout(() => {
          router.push(target)
          router.refresh()
        }, 450)
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
            <h2 className="text-lg font-semibold text-foreground">Link your Codeforces account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One-time setup using only your public handle.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
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
                placeholder="Enter your Codeforces handle (e.g., tourist)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground
                           outline-none ring-0 transition-all
                           focus:border-primary/60 focus:ring-2 focus:ring-primary/20
                           disabled:opacity-50"
                disabled={isPending}
              />
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
                "Continue"
              )}
            </button>
          </form>

          {/* Info text */}
          <div className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p>Enter your Codeforces handle to continue. No API key or secret required.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
