import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import {
  getNotificationChannelPrefs,
  updateNotificationChannelPrefs,
} from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }
    const prefs = await getNotificationChannelPrefs(session.userId)
    return okJson({ prefs })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/channels")
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })
    const patch = {
      emailEnabled: typeof body?.emailEnabled === "boolean" ? body.emailEnabled : undefined,
      pushEnabled: typeof body?.pushEnabled === "boolean" ? body.pushEnabled : undefined,
      reminderEnabled:
        typeof body?.reminderEnabled === "boolean" ? body.reminderEnabled : undefined,
      escalationEnabled:
        typeof body?.escalationEnabled === "boolean" ? body.escalationEnabled : undefined,
      recoveryEnabled:
        typeof body?.recoveryEnabled === "boolean" ? body.recoveryEnabled : undefined,
    }

    const prefs = await updateNotificationChannelPrefs(session.userId, patch)
    return okJson({ prefs })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/channels")
  }
}
