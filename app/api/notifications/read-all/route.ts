import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { markAllNotificationsRead } from "@/lib/storage"

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    await markAllNotificationsRead(session.userId)
    return okJson({ success: true })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/read-all")
  }
}
