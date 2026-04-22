import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getNotifications } from "@/lib/storage"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const url = new URL(request.url)
    const limitRaw = Number(url.searchParams.get("limit") || "30")
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(200, Math.trunc(limitRaw)))
      : 30

    const notifications = await getNotifications(session.userId, limit)
    return okJson({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    })
  } catch (error) {
    return toErrorResponse(error, "api/notifications")
  }
}
