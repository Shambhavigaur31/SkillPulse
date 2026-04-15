import { appError } from "@/lib/api-errors"

const CF_API_BASE = "https://codeforces.com/api"

async function callCodeforcesApi<T>(
  methodName: string,
  params: Record<string, string>,
  timeoutMs = 10_000
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = new URL(`${CF_API_BASE}/${methodName}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "SkillPulse/1.0" },
    })

    if (!res.ok) {
      throw appError(
        "CODEFORCES_UNAVAILABLE",
        "Codeforces is temporarily unavailable. Please try again in a moment.",
        503
      )
    }

    let data: unknown
    try {
      data = await res.json()
    } catch {
      throw appError(
        "CODEFORCES_UNAVAILABLE",
        "Codeforces is temporarily unavailable. Please try again in a moment.",
        503
      )
    }

    const payload = data as { status?: string; comment?: string; result?: unknown }
    if (payload.status !== "OK") {
      const comment = (payload.comment || "").toLowerCase()
      if (comment.includes("not found") || comment.includes("handles")) {
        throw appError(
          "INVALID_HANDLE",
          "We couldn't find that Codeforces handle. Check the spelling and try again.",
          404
        )
      }

      throw appError(
        "CODEFORCES_UNAVAILABLE",
        "Codeforces is temporarily unavailable. Please try again in a moment.",
        503
      )
    }

    return payload.result as T
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw appError(
        "CODEFORCES_TIMEOUT",
        "Codeforces is taking too long to respond. Please try again.",
        504
      )
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
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

export async function validateCodeforcesHandle(
  handle: string
): Promise<CodeforcesUser> {
  const result = await callCodeforcesApi<CodeforcesUser[]>("user.info", {
    handles: handle,
  })

  if (!Array.isArray(result) || !result[0]) {
    throw appError(
      "INVALID_HANDLE",
      "We couldn't find that Codeforces handle. Check the spelling and try again.",
      404
    )
  }

  return result[0]
}

export async function fetchUserSubmissions(
  handle: string,
  count = 100
): Promise<CodeforcesSubmission[]> {
  const result = await callCodeforcesApi<CodeforcesSubmission[]>("user.status", {
    handle,
    count: `${count}`,
  })
  if (!Array.isArray(result)) {
    throw appError(
      "CODEFORCES_UNAVAILABLE",
      "Codeforces is temporarily unavailable. Please try again in a moment.",
      503
    )
  }
  return result
}
