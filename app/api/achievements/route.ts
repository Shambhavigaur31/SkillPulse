import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { syncAchievements } from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const achievements = await syncAchievements(session.userId)
    return okJson({
      achievements,
      unlockedCount: achievements.filter((a) => a.unlocked).length,
    })
  } catch (error) {
    return toErrorResponse(error, "api/achievements")
  }
}
