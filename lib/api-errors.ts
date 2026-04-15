import { NextResponse } from "next/server"

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "MISSING_HANDLE"
  | "UNAUTHENTICATED"
  | "INVALID_HANDLE"
  | "CODEFORCES_UNAVAILABLE"
  | "CODEFORCES_TIMEOUT"
  | "INFERENCE_FAILED"
  | "INVALID_INFERENCE_RESPONSE"
  | "NO_SKILLS_FOUND"
  | "PERSISTENCE_FAILED"
  | "INTERNAL_SERVER_ERROR"

export class AppError extends Error {
  code: ApiErrorCode
  status: number

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
  }
}

type ErrorBody = {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
  }
}

export function okJson<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status })
}

export function appError(code: ApiErrorCode, message: string, status: number) {
  return new AppError(code, message, status)
}

export function toErrorResponse(error: unknown, context: string) {
  if (error instanceof AppError) {
    const body: ErrorBody = {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    }
    return NextResponse.json(body, { status: error.status })
  }

  console.error(`[${context}] unexpected error:`, error)

  const body: ErrorBody = {
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  }
  return NextResponse.json(body, { status: 500 })
}
