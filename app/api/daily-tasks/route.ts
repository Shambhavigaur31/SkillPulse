import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { generateDailyTasks } from "@/lib/storage"

function safeDateOnlyIso(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const tasks = await generateDailyTasks(session.userId, session.handle)
    return okJson({
      date: safeDateOnlyIso(new Date()),
      tasks,
    })
  } catch (error) {
    return toErrorResponse(error, "api/daily-tasks")
  }
}
