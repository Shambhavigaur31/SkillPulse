import { cookies } from "next/headers"
import {
  signToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  GOOGLE_PENDING_COOKIE_NAME,
  POST_LOGIN_REDIRECT_COOKIE_NAME,
  verifyPendingGoogleToken,
} from "@/lib/auth"
import { validateCodeforcesHandle } from "@/lib/codeforces"
import { linkGoogleAccountToUser, upsertUser } from "@/lib/storage"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"

function sanitizeRedirectPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith("/") || input.startsWith("//")) return null
  if (input.startsWith("/api/")) return null
  return input
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })

    const handle = typeof body?.handle === "string" ? body.handle.trim() : ""
    if (!handle) {
      throw appError("MISSING_HANDLE", "Please enter your Codeforces handle.", 400)
    }

    const cfUser = await validateCodeforcesHandle(handle)

    const userId = await upsertUser({
      handle: cfUser.handle,
      firstName: cfUser.firstName,
      lastName: cfUser.lastName,
      rank: cfUser.rank,
      maxRating: cfUser.maxRating,
      avatar: cfUser.avatar,
    })

    // Sign a JWT storing only user identity data.
    const token = await signToken({
      userId,
      handle: cfUser.handle,
      firstName: cfUser.firstName,
      lastName: cfUser.lastName,
      rank: cfUser.rank,
      maxRating: cfUser.maxRating,
      avatar: cfUser.avatar,
    })

    const cookieStore = await cookies()
    const pendingGoogleToken = cookieStore.get(GOOGLE_PENDING_COOKIE_NAME)?.value
    const redirectTo =
      sanitizeRedirectPath(cookieStore.get(POST_LOGIN_REDIRECT_COOKIE_NAME)?.value ?? null) ?? "/"

    const response = okJson({
      message: "Codeforces handle linked successfully",
      handle: cfUser.handle,
      redirectTo,
      user: {
        handle: cfUser.handle,
        firstName: cfUser.firstName,
        lastName: cfUser.lastName,
        rank: cfUser.rank,
        maxRating: cfUser.maxRating,
        avatar: cfUser.avatar,
      },
    })

    response.cookies.set(POST_LOGIN_REDIRECT_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    if (pendingGoogleToken) {
      const pendingGoogle = await verifyPendingGoogleToken(pendingGoogleToken)
      if (pendingGoogle?.sub) {
        await linkGoogleAccountToUser(pendingGoogle.sub, userId)
      }
      response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      })
    }

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })

    return response
  } catch (error) {
    return toErrorResponse(error, "api/auth/login")
  }
}
