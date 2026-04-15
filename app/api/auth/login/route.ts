import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  signToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  GOOGLE_PENDING_COOKIE_NAME,
  POST_LOGIN_REDIRECT_COOKIE_NAME,
  verifyPendingGoogleToken,
} from "@/lib/auth"
import { validateCodeforcesCredentials } from "@/lib/codeforces"
import { linkGoogleAccountToUser, upsertUserAndCredentials } from "@/lib/storage"

function sanitizeRedirectPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith("/") || input.startsWith("//")) return null
  if (input.startsWith("/api/")) return null
  return input
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { handle, apiKey, apiSecret } = body

    if (
      typeof handle !== "string" ||
      typeof apiKey !== "string" ||
      typeof apiSecret !== "string" ||
      !handle.trim() ||
      !apiKey.trim() ||
      !apiSecret.trim()
    ) {
      return NextResponse.json(
        { error: "handle, apiKey, and apiSecret are required" },
        { status: 400 }
      )
    }

    // Verify credentials against Codeforces — throws if invalid
    const cfUser = await validateCodeforcesCredentials(
      handle.trim(),
      apiKey.trim(),
      apiSecret.trim()
    )

    const userId = await upsertUserAndCredentials({
      handle: cfUser.handle,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
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
      sanitizeRedirectPath(cookieStore.get(POST_LOGIN_REDIRECT_COOKIE_NAME)?.value) ?? "/"

    const response = NextResponse.json({
      success: true,
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
    const message =
      error instanceof Error ? error.message : "Authentication failed"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
