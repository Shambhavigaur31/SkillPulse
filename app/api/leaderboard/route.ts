import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getLeaderboard } from "@/lib/storage"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const url = new URL(request.url)
    const limitRaw = Number(url.searchParams.get("limit") || "20")
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 20

    const leaderboard = await getLeaderboard(session.userId, limit)
    return okJson({
      leaderboard,
    })
  } catch (error) {
    return toErrorResponse(error, "api/leaderboard")
  }
}
