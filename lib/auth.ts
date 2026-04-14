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

export interface SessionPayload {
  handle: string
  /** Codeforces API key — stored so we can make signed requests later */
  apiKey: string
  /** Codeforces API secret — stored encrypted inside the signed JWT (httpOnly cookie) */
  apiSecret: string
  firstName?: string
  lastName?: string
  rank?: string
  maxRating?: number
  avatar?: string
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
