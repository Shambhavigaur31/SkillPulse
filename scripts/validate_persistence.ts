import fs from "node:fs"
import path from "node:path"

function loadEnvFromDotEnvLocal() {
  if (process.env.DATABASE_URL) return

  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx)
    const value = trimmed.slice(idx + 1)
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

async function main() {
  loadEnvFromDotEnvLocal()

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Cannot validate persistence.")
  }

  const { upsertUser, saveInferenceRun, getLatestInferenceSnapshot } = await import("../lib/storage")

  const userId = await upsertUser({ handle: "aayushmaanmittal" })
  const modelVersion = `phase1-lstm-v1-validation-${Date.now()}`

  const summary = {
    skillsTracked: 2,
    critical: 1,
    atRisk: 1,
    overallHealth: 42,
  }

  const skills = [
    {
      skill: "dp",
      baseArs: 78.2,
      cascadedArs: 83.1,
      cascadeDelta: 4.9,
      risk: "CRITICAL",
    },
    {
      skill: "graphs",
      baseArs: 61.4,
      cascadedArs: 66.2,
      cascadeDelta: 4.8,
      risk: "AT_RISK",
    },
  ]

  const first = await saveInferenceRun(userId, "shambhavi31", modelVersion, skills, summary)
  const second = await saveInferenceRun(userId, "shambhavi31", modelVersion, skills, summary)
  const latest = await getLatestInferenceSnapshot(userId, "shambhavi31")

  console.log("save #1:", first)
  console.log("save #2:", second)
  console.log(
    "latest snapshot:",
    latest
      ? {
          runId: latest.runId,
          handle: latest.handle,
          modelVersion: latest.modelVersion,
          createdAt: latest.createdAt,
          summary: latest.summary,
          skills: latest.skills,
        }
      : null
  )

  const checks = {
    firstInsertOk: first.runId > 0 && first.insertedSkills === 2 && !first.deduped,
    secondDedupOk: second.runId > 0 && second.deduped,
    latestReadOk: !!latest && latest.skills.length >= 2,
    skillFieldsOk:
      !!latest &&
      latest.skills.every(
        (s) =>
          typeof s.skill === "string" &&
          Number.isFinite(s.baseArs) &&
          Number.isFinite(s.cascadedArs) &&
          Number.isFinite(s.cascadeDelta) &&
          typeof s.risk === "string"
      ),
  }

  console.log("checks:", checks)

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name)

  if (failed.length > 0) {
    throw new Error(`Persistence checks failed: ${failed.join(", ")}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
