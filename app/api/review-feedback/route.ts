import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { submitReviewFeedback, syncAchievements } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })

    const skill = typeof body?.skill === "string" ? body.skill.trim() : ""
    const qualityRaw = Number(body?.quality)
    const quality = Number.isFinite(qualityRaw) ? Math.trunc(qualityRaw) : -1
    if (!skill) {
      throw appError("BAD_REQUEST", "Skill is required.", 400)
    }
    if (quality < 0 || quality > 5) {
      throw appError("BAD_REQUEST", "Quality must be an integer from 0 to 5.", 400)
    }

    const feedback = await submitReviewFeedback({
      userId: session.userId,
      taskId: typeof body?.taskId === "string" ? body.taskId : undefined,
      skill,
      quality,
      completed: body?.completed !== false,
    })
    const achievements = await syncAchievements(session.userId)

    return okJson({
      feedback,
      unlockedAchievements: achievements.filter((a) => a.unlocked).map((a) => a.key),
    })
  } catch (error) {
    return toErrorResponse(error, "api/review-feedback")
  }
}
