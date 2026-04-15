import { createRemoteJWKSet, jwtVerify } from "jose"

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"])

function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured")
  return id
}

function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured")
  return secret
}

export function buildGoogleAuthUrl(params: {
  origin: string
  state: string
}): string {
  const redirectUri = `${params.origin}/api/auth/google/callback`
  const url = new URL(GOOGLE_AUTH_BASE)
  url.searchParams.set("client_id", getGoogleClientId())
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("state", params.state)
  url.searchParams.set("prompt", "select_account")
  return url.toString()
}

async function exchangeCodeForIdToken(params: {
  code: string
  origin: string
}): Promise<string> {
  const redirectUri = `${params.origin}/api/auth/google/callback`

  const body = new URLSearchParams({
    code: params.code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Google token exchange failed (HTTP ${response.status})`)
  }

  const data = await response.json()
  if (!data.id_token || typeof data.id_token !== "string") {
    throw new Error("Google response did not include id_token")
  }

  return data.id_token
}

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))

export async function verifyGoogleOAuthCode(params: {
  code: string
  origin: string
}): Promise<{ sub: string; email: string; name?: string; picture?: string }> {
  const idToken = await exchangeCodeForIdToken(params)

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: getGoogleClientId(),
  })

  const issuer = typeof payload.iss === "string" ? payload.iss : ""
  if (!GOOGLE_ISSUERS.has(issuer)) {
    throw new Error("Invalid Google token issuer")
  }

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Google token missing required user fields")
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  }
}