import { NextRequest, NextResponse } from "next/server"
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  GOOGLE_PENDING_COOKIE_NAME,
  GOOGLE_PENDING_MAX_AGE,
  GOOGLE_STATE_COOKIE_NAME,
  POST_LOGIN_REDIRECT_COOKIE_NAME,
  signPendingGoogleToken,
  signToken,
} from "@/lib/auth"
import { verifyGoogleOAuthCode } from "@/lib/google-oauth"
import {
  getLinkedUserByGoogleSub,
  upsertGoogleAccount,
} from "@/lib/storage"

function sanitizeRedirectPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith("/") || input.startsWith("//")) return null
  if (input.startsWith("/api/")) return null
  return input
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")
    const state = request.nextUrl.searchParams.get("state")
    const storedState = request.cookies.get(GOOGLE_STATE_COOKIE_NAME)?.value

    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL("/login?error=google_state", request.url))
    }

    const googleUser = await verifyGoogleOAuthCode({
      code,
      origin: request.nextUrl.origin,
    })

    await upsertGoogleAccount({
      googleSub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
    })

    const linkedUser = await getLinkedUserByGoogleSub(googleUser.sub)
    const redirectPath =
      sanitizeRedirectPath(request.cookies.get(POST_LOGIN_REDIRECT_COOKIE_NAME)?.value) ?? "/"

    if (linkedUser) {
      const sessionToken = await signToken({
        userId: linkedUser.id,
        handle: linkedUser.handle,
        firstName: linkedUser.firstName ?? undefined,
        lastName: linkedUser.lastName ?? undefined,
        rank: linkedUser.rank ?? undefined,
        maxRating: linkedUser.maxRating ?? undefined,
        avatar: linkedUser.avatar ?? undefined,
      })

      const response = NextResponse.redirect(new URL(redirectPath, request.url))
      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })
      response.cookies.set(GOOGLE_STATE_COOKIE_NAME, "", { maxAge: 0, path: "/" })
      response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, "", { maxAge: 0, path: "/" })
      response.cookies.set(POST_LOGIN_REDIRECT_COOKIE_NAME, "", { maxAge: 0, path: "/" })
      return response
    }

    const pendingToken = await signPendingGoogleToken({
      sub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    })

    const response = NextResponse.redirect(new URL("/link-codeforces", request.url))
    response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GOOGLE_PENDING_MAX_AGE,
      path: "/",
    })
    response.cookies.set(GOOGLE_STATE_COOKIE_NAME, "", { maxAge: 0, path: "/" })
    return response
  } catch (err) {
    console.error("[google/callback] error:", err)
    return NextResponse.redirect(new URL("/login?error=google_oauth", request.url))
  }
}