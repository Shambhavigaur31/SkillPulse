import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getInferenceHistory } from "@/lib/storage"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const url = new URL(request.url)
    const requestedHandle = (url.searchParams.get("handle") || "").trim()
    const handle = requestedHandle || session.handle
    if (!handle) {
      throw appError("MISSING_HANDLE", "Link your Codeforces account first.", 400)
    }
    if (handle.toLowerCase() !== session.handle.toLowerCase()) {
      throw appError("FORBIDDEN", "You can only access your own analytics history.", 403)
    }

    const history = await getInferenceHistory(session.userId, handle)
    return okJson({ handle, history })
  } catch (error) {
    return toErrorResponse(error, "api/analytics/history")
  }
}
