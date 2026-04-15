import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    return okJson({
      user: {
        handle: session.handle,
        firstName: session.firstName,
        lastName: session.lastName,
        rank: session.rank,
        maxRating: session.maxRating,
        avatar: session.avatar,
      },
    })
  } catch (error) {
    return toErrorResponse(error, "api/auth/me")
  }
}
