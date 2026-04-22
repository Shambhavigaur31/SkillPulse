import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { addGamificationEvent, syncAchievements } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })

    const eventType =
      typeof body?.eventType === "string" && body.eventType.trim()
        ? body.eventType.trim()
        : "manual_event"
    const xpDeltaRaw = Number(body?.xpDelta ?? 0)
    const xpDelta = Number.isFinite(xpDeltaRaw)
      ? Math.max(-5000, Math.min(5000, Math.trunc(xpDeltaRaw)))
      : 0

    const profile = await addGamificationEvent({
      userId: session.userId,
      eventType,
      xpDelta,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    })
    const achievements = await syncAchievements(session.userId)
    const newlyUnlocked = achievements.filter((a) => a.unlocked).map((a) => a.key)

    return okJson({
      profile,
      newlyUnlocked,
    })
  } catch (error) {
    return toErrorResponse(error, "api/gamification/event")
  }
}
