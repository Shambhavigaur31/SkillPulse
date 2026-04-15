import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

if (!process.env.JWT_SECRET) {
  console.warn(
    "[SkillPulse] JWT_SECRET env var is not set. " +
      "Using an insecure default — set it in .env.local before deploying."
  )
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "skillpulse-dev-secret-change-in-production"
)

export const COOKIE_NAME = "sp_token"
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds
export const GOOGLE_PENDING_COOKIE_NAME = "sp_google_pending"
export const GOOGLE_PENDING_MAX_AGE = 10 * 60 // 10 minutes
export const GOOGLE_STATE_COOKIE_NAME = "sp_google_state"
export const GOOGLE_STATE_MAX_AGE = 10 * 60 // 10 minutes
export const POST_LOGIN_REDIRECT_COOKIE_NAME = "sp_post_login_redirect"
export const POST_LOGIN_REDIRECT_MAX_AGE = 10 * 60 // 10 minutes

export interface SessionPayload {
  userId: number
  handle: string
  firstName?: string
  lastName?: string
  rank?: string
  maxRating?: number
  avatar?: string
}

interface PendingGooglePayload {
  sub: string
  email: string
  name?: string
  picture?: string
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/** Read and validate the JWT from the request cookies (Server Component / Route Handler). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function signPendingGoogleToken(
  payload: PendingGooglePayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(JWT_SECRET)
}

export async function verifyPendingGoogleToken(
  token: string
): Promise<PendingGooglePayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as PendingGooglePayload
  } catch {
    return null
  }
}
