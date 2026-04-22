import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getGamificationProfile, syncAchievements } from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const profile = await getGamificationProfile(session.userId)
    const achievements = await syncAchievements(session.userId)

    return okJson({
      profile,
      summary: {
        unlocked: achievements.filter((a) => a.unlocked).length,
        total: achievements.length,
      },
    })
  } catch (error) {
    return toErrorResponse(error, "api/gamification/me")
  }
}
