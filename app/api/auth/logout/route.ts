import { COOKIE_NAME, GOOGLE_PENDING_COOKIE_NAME } from "@/lib/auth"
import { okJson, toErrorResponse } from "@/lib/api-errors"

export async function POST() {
  try {
    const response = okJson({ message: "Signed out successfully" })

    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    })

    response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    return toErrorResponse(error, "api/auth/logout")
  }
}
