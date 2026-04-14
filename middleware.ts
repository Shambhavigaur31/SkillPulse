import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { COOKIE_NAME } from "@/lib/auth"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "skillpulse-dev-secret-change-in-production"
)

/** Routes that are always publicly accessible (no JWT required). */
const PUBLIC_PATHS = ["/login", "/api/auth/login"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes should return JSON errors from route handlers, not browser redirects.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow public routes through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Token invalid or expired — clear it and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" })
    return response
  }
}

export const config = {
  /**
   * Run middleware on every route EXCEPT:
   *  - Next.js internals (_next/static, _next/image)
   *  - favicon
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
