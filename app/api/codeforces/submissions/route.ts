import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { fetchUserSubmissions } from "@/lib/codeforces"

const DEFAULT_COUNT = 100
const MAX_COUNT = 1000

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const countParam = request.nextUrl.searchParams.get("count")
  const parsedCount = Number.parseInt(countParam ?? `${DEFAULT_COUNT}`, 10)
  const count = Number.isFinite(parsedCount)
    ? Math.max(1, Math.min(parsedCount, MAX_COUNT))
    : DEFAULT_COUNT

  try {
    const submissions = await fetchUserSubmissions(
      session.handle,
      session.apiKey,
      session.apiSecret,
      count
    )

    return NextResponse.json({
      handle: session.handle,
      count: submissions.length,
      submissions,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch submissions"

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
