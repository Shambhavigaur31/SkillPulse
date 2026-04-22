import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { COOKIE_NAME } from "@/lib/auth"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "skillpulse-dev-secret-change-in-production"
)

const PUBLIC_PATHS = [
  "/login",
  "/link-codeforces",
  "/api/auth/login",
  "/api/auth/google/start",
  "/api/auth/google/callback",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    const redirectPath = `${pathname}${request.nextUrl.search}`
    if (redirectPath !== "/") {
      loginUrl.searchParams.set("redirect", redirectPath)
    }
    return NextResponse.redirect(loginUrl)
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const loginUrl = new URL("/login", request.url)
    const redirectPath = `${pathname}${request.nextUrl.search}`
    if (redirectPath !== "/") {
      loginUrl.searchParams.set("redirect", redirectPath)
    }
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" })
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
