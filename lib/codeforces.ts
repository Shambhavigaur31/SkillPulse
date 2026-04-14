import crypto from "crypto"

const CF_API_BASE = "https://codeforces.com/api"

/**
 * Build the HMAC-SHA512 apiSig required by every authenticated Codeforces API call.
 *
 * Signature format (as per Codeforces API docs):
 *   SHA512( rand + "/" + methodName + "?" + sortedParams + "#" + apiSecret )
 * The final apiSig value passed in the request is:  rand + hexDigest
 */
function buildApiSig(
  methodName: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string,
  time: number
): string {
  const rand = Math.floor(100000 + Math.random() * 900000).toString()

  const allParams: Record<string, string> = {
    ...params,
    apiKey,
    time: time.toString(),
  }

  const sortedQuery = Object.keys(allParams)
    .sort()
    .map((k) => `${k}=${allParams[k]}`)
    .join("&")

  const hashInput = `${rand}/${methodName}?${sortedQuery}#${apiSecret}`
  const digest = crypto.createHash("sha512").update(hashInput).digest("hex")

  return rand + digest
}

export interface CodeforcesUser {
  handle: string
  firstName?: string
  lastName?: string
  rank?: string
  maxRank?: string
  rating?: number
  maxRating?: number
  avatar?: string
  titlePhoto?: string
}

export interface CodeforcesSubmission {
  id: number
  contestId?: number
  creationTimeSeconds: number
  problem: {
    contestId?: number
    index: string
    name: string
    type: string
    tags: string[]
  }
  verdict?: string
  programmingLanguage: string
}

/**
 * Validate Codeforces API credentials by making a signed request to user.info.
 * A successful response proves the caller possesses a valid (key, secret) pair
 * that belongs to the given handle — i.e. they own the account.
 *
 * @throws Error with a human-readable message on failure.
 */
export async function validateCodeforcesCredentials(
  handle: string,
  apiKey: string,
  apiSecret: string
): Promise<CodeforcesUser> {
  const time = Math.floor(Date.now() / 1000)
  const method = "user.info"
  const params = { handles: handle }
  const apiSig = buildApiSig(method, params, apiKey, apiSecret, time)

  const url = new URL(`${CF_API_BASE}/${method}`)
  url.searchParams.set("handles", handle)
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("time", time.toString())
  url.searchParams.set("apiSig", apiSig)

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SkillPulse/1.0" },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Codeforces API responded with HTTP ${res.status}`)
  }

  const data = await res.json()

  if (data.status !== "OK") {
    // Codeforces returns "Failed to authorize" style messages in data.comment
    throw new Error(data.comment ?? "Codeforces authentication failed")
  }

  const user = data.result[0] as CodeforcesUser

  // Sanity-check: the returned handle must match what the user submitted
  if (user.handle.toLowerCase() !== handle.toLowerCase()) {
    throw new Error("Handle mismatch — unexpected API response")
  }

  return user
}

/**
 * Fetch the most recent submissions for a user.
 * Requires valid API credentials (needed for private accounts and higher rate limits).
 */
export async function fetchUserSubmissions(
  handle: string,
  apiKey: string,
  apiSecret: string,
  count = 100
): Promise<CodeforcesSubmission[]> {
  const time = Math.floor(Date.now() / 1000)
  const method = "user.status"
  const params = { handle, count: count.toString() }
  const apiSig = buildApiSig(method, params, apiKey, apiSecret, time)

  const url = new URL(`${CF_API_BASE}/${method}`)
  url.searchParams.set("handle", handle)
  url.searchParams.set("count", count.toString())
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("time", time.toString())
  url.searchParams.set("apiSig", apiSig)

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SkillPulse/1.0" },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Codeforces API responded with HTTP ${res.status}`)
  }

  const data = await res.json()

  if (data.status !== "OK") {
    throw new Error(data.comment ?? "Failed to fetch submissions")
  }

  return data.result as CodeforcesSubmission[]
}
