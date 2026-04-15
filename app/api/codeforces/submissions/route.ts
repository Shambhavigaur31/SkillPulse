import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { fetchUserSubmissions } from "@/lib/codeforces"
import { getDecryptedCredentialsByUserId, saveSubmissions } from "@/lib/storage"

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
    const credentials = await getDecryptedCredentialsByUserId(session.userId)
    if (!credentials) {
      return NextResponse.json(
        { error: "No linked Codeforces credentials found for this user" },
        { status: 404 }
      )
    }

    const submissions = await fetchUserSubmissions(
      session.handle,
      credentials.apiKey,
      credentials.apiSecret,
      count
    )

    const insertedCount = await saveSubmissions(
      session.userId,
      session.handle,
      submissions
    )

    return NextResponse.json({
      handle: session.handle,
      count: submissions.length,
      insertedCount,
      submissions,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch submissions"

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
