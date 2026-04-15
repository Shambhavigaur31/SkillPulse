import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { fetchUserSubmissions } from "@/lib/codeforces"
import { saveSubmissions } from "@/lib/storage"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"

const DEFAULT_COUNT = 100
const MAX_COUNT = 1000

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const countParam = request.nextUrl.searchParams.get("count")
    const parsedCount = Number.parseInt(countParam ?? `${DEFAULT_COUNT}`, 10)
    const count = Number.isFinite(parsedCount)
      ? Math.max(1, Math.min(parsedCount, MAX_COUNT))
      : DEFAULT_COUNT

    const submissions = await fetchUserSubmissions(session.handle, count)

    const insertedCount = await saveSubmissions(
      session.userId,
      session.handle,
      submissions
    )

    return okJson({
      handle: session.handle,
      count: submissions.length,
      insertedCount,
      submissions,
    })
  } catch (error) {
    return toErrorResponse(error, "api/codeforces/submissions")
  }
}
