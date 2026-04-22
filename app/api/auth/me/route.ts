import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getUserById } from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const dbUser = await getUserById(session.userId)
    const linkedHandle = dbUser?.handle?.trim() ?? session.handle?.trim() ?? ""

    if (!linkedHandle) {
      return okJson({
        linked: false,
        user: null,
      })
    }

    return okJson({
      linked: true,
      user: {
        handle: linkedHandle,
        firstName: dbUser?.firstName ?? session.firstName,
        lastName: dbUser?.lastName ?? session.lastName,
        rank: dbUser?.rank ?? session.rank,
        maxRating: dbUser?.maxRating ?? session.maxRating,
        avatar: dbUser?.avatar ?? session.avatar,
      },
    })
  } catch (error) {
    return toErrorResponse(error, "api/auth/me")
  }
}
