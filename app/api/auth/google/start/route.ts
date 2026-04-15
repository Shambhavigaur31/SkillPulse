import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  POST_LOGIN_REDIRECT_COOKIE_NAME,
  POST_LOGIN_REDIRECT_MAX_AGE,
  GOOGLE_STATE_COOKIE_NAME,
  GOOGLE_STATE_MAX_AGE,
} from "@/lib/auth"
import { buildGoogleAuthUrl } from "@/lib/google-oauth"

function sanitizeRedirectPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith("/") || input.startsWith("//")) return null
  if (input.startsWith("/api/")) return null
  return input
}

export async function GET(request: NextRequest) {
  try {
    const state = crypto.randomBytes(16).toString("hex")
    const redirectPath = sanitizeRedirectPath(request.nextUrl.searchParams.get("redirect"))
    const authUrl = buildGoogleAuthUrl({
      origin: request.nextUrl.origin,
      state,
    })

    const response = NextResponse.redirect(authUrl)
    response.cookies.set(GOOGLE_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GOOGLE_STATE_MAX_AGE,
      path: "/",
    })

    if (redirectPath) {
      response.cookies.set(POST_LOGIN_REDIRECT_COOKIE_NAME, redirectPath, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: POST_LOGIN_REDIRECT_MAX_AGE,
        path: "/",
      })
    } else {
      response.cookies.set(POST_LOGIN_REDIRECT_COOKIE_NAME, "", {
        maxAge: 0,
        path: "/",
      })
    }

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const errorCode = message.includes("GOOGLE_CLIENT")
      ? "google_config"
      : "google_oauth"
    return NextResponse.redirect(new URL(`/login?error=${errorCode}`, request.url))
  }
}