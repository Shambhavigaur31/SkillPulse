import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { registerPushSubscription } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : ""
    if (!endpoint) {
      throw appError("BAD_REQUEST", "Push endpoint is required.", 400)
    }

    await registerPushSubscription({
      userId: session.userId,
      endpoint,
      p256dh: typeof body?.p256dh === "string" ? body.p256dh : undefined,
      auth: typeof body?.auth === "string" ? body.auth : undefined,
    })
    return okJson({ success: true })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/push-subscription")
  }
}
