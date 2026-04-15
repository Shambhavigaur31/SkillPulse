type ApiErrorPayload = {
  ok?: false
  error?: {
    code?: string
    message?: string
  }
}

export function getApiErrorCode(payload: unknown): string | null {
  const candidate = payload as ApiErrorPayload
  return typeof candidate?.error?.code === "string" ? candidate.error.code : null
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  const candidate = payload as ApiErrorPayload
  if (typeof candidate?.error?.message === "string" && candidate.error.message.trim()) {
    return candidate.error.message
  }
  return fallback
}

export function toProductMessage(code: string | null, fallback: string): string {
  if (code === "MISSING_HANDLE") {
    return "Please enter your Codeforces handle."
  }
  if (code === "INVALID_HANDLE") {
    return "We couldn't find that Codeforces handle. Check the spelling and try again."
  }
  if (code === "CODEFORCES_UNAVAILABLE" || code === "CODEFORCES_TIMEOUT") {
    return "Codeforces is temporarily unavailable. Please try again in a moment."
  }
  if (code === "NO_SKILLS_FOUND") {
    return "We found your account, but there isn't enough recent activity to analyze yet."
  }
  if (code === "INFERENCE_FAILED" || code === "INVALID_INFERENCE_RESPONSE") {
    return "We couldn't analyze your skills right now. Please try again."
  }
  if (code === "UNAUTHENTICATED") {
    return "Link your Codeforces account to start your skill analysis."
  }
  return fallback
}
