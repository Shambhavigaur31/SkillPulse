import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { generateDailyTasks } from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const tasks = await generateDailyTasks(session.userId, session.handle)
    return okJson({
      date: new Date().toISOString().slice(0, 10),
      tasks,
    })
  } catch (error) {
    return toErrorResponse(error, "api/daily-tasks")
  }
}
