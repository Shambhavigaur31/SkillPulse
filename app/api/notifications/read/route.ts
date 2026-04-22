import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { markNotificationRead } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })
    const id = typeof body?.id === "string" ? body.id.trim() : ""
    if (!id) {
      throw appError("BAD_REQUEST", "Notification id is required.", 400)
    }

    await markNotificationRead(session.userId, id)
    return okJson({ success: true })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/read")
  }
}
