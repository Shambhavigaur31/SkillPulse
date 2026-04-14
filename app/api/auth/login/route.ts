import { NextResponse } from "next/server"
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth"
import { validateCodeforcesCredentials } from "@/lib/codeforces"

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

    // Sign a JWT storing handle + credentials (needed to make subsequent API calls)
    const token = await signToken({
      handle: cfUser.handle,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      firstName: cfUser.firstName,
      lastName: cfUser.lastName,
      rank: cfUser.rank,
      maxRating: cfUser.maxRating,
      avatar: cfUser.avatar,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        handle: cfUser.handle,
        firstName: cfUser.firstName,
        lastName: cfUser.lastName,
        rank: cfUser.rank,
        maxRating: cfUser.maxRating,
        avatar: cfUser.avatar,
      },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
