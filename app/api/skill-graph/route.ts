import { getSession } from "@/lib/auth"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { buildDependencyImpacts } from "@/lib/skill-graph"
import { getSkillGraphSnapshot } from "@/lib/storage"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      throw appError("UNAUTHENTICATED", "Please sign in to continue.", 401)
    }

    const snapshot = await getSkillGraphSnapshot(session.userId, session.handle)
    if (!snapshot) {
      return okJson({
        snapshot: null,
        impacts: [],
        topDependencyRisks: [],
      })
    }

    const impacts = buildDependencyImpacts(snapshot.skills)
    const topDependencyRisks = impacts.filter((row) => row.cascadeDelta > 0).slice(0, 8)

    return okJson({
      snapshot,
      impacts,
      topDependencyRisks,
    })
  } catch (error) {
    return toErrorResponse(error, "api/skill-graph")
  }
}
