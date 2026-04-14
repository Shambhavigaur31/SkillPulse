import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  return NextResponse.json({
    handle: session.handle,
    firstName: session.firstName,
    lastName: session.lastName,
    rank: session.rank,
    maxRating: session.maxRating,
    avatar: session.avatar,
  })
}
