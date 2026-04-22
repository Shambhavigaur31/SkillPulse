import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { processQueuedNotificationDeliveries } from "@/lib/storage"

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }
    const result = await processQueuedNotificationDeliveries()
    return okJson({ result })
  } catch (error) {
    return toErrorResponse(error, "api/notifications/deliver")
  }
}
