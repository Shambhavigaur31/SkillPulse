import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getLatestInferenceSnapshot } from "@/lib/storage"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const url = new URL(request.url)
    const requestedHandle = (url.searchParams.get("handle") || "").trim()
    const handle = requestedHandle || session.handle

    // Prevent reading another user's persisted runs.
    if (handle.toLowerCase() !== session.handle.toLowerCase()) {
      throw appError("FORBIDDEN", "You can only access your own inference history.", 403)
    }

    const snapshot = await getLatestInferenceSnapshot(session.userId, handle)

    return okJson({
      snapshot,
      message: snapshot ? undefined : "No persisted inference snapshot found yet.",
    })
  } catch (error) {
    return toErrorResponse(error, "api/predict-risk/latest")
  }
}
