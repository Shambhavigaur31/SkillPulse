import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getSession } from "@/lib/auth"
import {
  addGamificationEvent,
  saveInferenceRun,
  syncAchievements,
  syncNotificationsFromSkills,
} from "@/lib/storage"

const execFileAsync = promisify(execFile)
const INFERENCE_MODEL_VERSION = "phase1-lstm-v1"

type ExtendedPrediction = {
  skill: string
  baseArs: number
  cascadedArs: number
}

type SkillRisk = {
  skill: string
  ars: number
  baseArs: number
  cascadedArs: number
  cascadeDelta: number
  risk: "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE"
}

function mapRisk(ars: number): SkillRisk["risk"] {
  if (ars < 40) return "SAFE"
  if (ars < 55) return "GENTLE"
  if (ars < 70) return "AT_RISK"
  if (ars < 85) return "CRITICAL"
  return "SEVERE"
}

function normalizeHandle(input: unknown): string {
  if (typeof input !== "string") return ""
  return input.trim()
}

function parsePredictions(stdout: string): ExtendedPrediction[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout) as unknown
  } catch {
    throw appError(
      "INVALID_INFERENCE_RESPONSE",
      "We couldn't analyze your skills right now. Please try again.",
      502
    )
  }

  const container =
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as { skills?: unknown }).skills)
      ? (parsed as { skills: unknown[] }).skills
      : parsed

  if (!Array.isArray(container)) {
    throw appError(
      "INVALID_INFERENCE_RESPONSE",
      "We couldn't analyze your skills right now. Please try again.",
      502
    )
  }

  return container
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const skill = typeof item.skill === "string" ? item.skill : ""
      const legacyArs = typeof item.ars === "number" && Number.isFinite(item.ars) ? item.ars : null
      const baseArs =
        typeof item.baseArs === "number" && Number.isFinite(item.baseArs)
          ? item.baseArs
          : legacyArs
      const cascadedArs =
        typeof item.cascadedArs === "number" && Number.isFinite(item.cascadedArs)
          ? item.cascadedArs
          : legacyArs

      if (!skill || baseArs === null || cascadedArs === null) {
        return null
      }

      return {
        skill,
        baseArs: Math.max(0, Math.min(100, baseArs)),
        cascadedArs: Math.max(0, Math.min(100, cascadedArs)),
      }
    })
    .filter((item): item is ExtendedPrediction => item !== null)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => {
      throw appError("BAD_REQUEST", "Request body must be valid JSON.", 400)
    })
    const handle = normalizeHandle(body?.handle)

    if (!handle) {
      throw appError("MISSING_HANDLE", "Please enter your Codeforces handle.", 400)
    }

    const pythonBin = process.env.PYTHON_BIN || "python"
    const scriptPath = "lib/inference.py"

    try {
      const { stdout } = await execFileAsync(
        pythonBin,
        [scriptPath, "--handle", handle, "--json"],
        {
          cwd: process.cwd(),
          timeout: 120_000,
          maxBuffer: 2 * 1024 * 1024,
        }
      )

      const rawSkills = parsePredictions((stdout || "").trim())
      const skills: SkillRisk[] = rawSkills.map((s) => ({
        skill: s.skill,
        ars: s.cascadedArs,
        baseArs: s.baseArs,
        cascadedArs: s.cascadedArs,
        cascadeDelta: Math.max(-100, Math.min(100, s.cascadedArs - s.baseArs)),
        risk: mapRisk(s.cascadedArs),
      }))

      const critical = skills.filter((s) => s.ars >= 70).length
      const atRisk = skills.filter((s) => s.ars >= 40 && s.ars < 70).length
      const meanArs =
        skills.length > 0 ? skills.reduce((sum, s) => sum + s.ars, 0) / skills.length : 0

      const summary = {
        skillsTracked: skills.length,
        critical,
        atRisk,
        overallHealth: Math.round(100 - meanArs),
      }

      try {
        const session = await getSession()
        if (session && session.handle.toLowerCase() === handle.toLowerCase()) {
          if (process.env.SKILLPULSE_FORCE_PERSIST_FAIL === "1") {
            throw new Error("Forced persistence failure (SKILLPULSE_FORCE_PERSIST_FAIL=1)")
          }
          const persisted = await saveInferenceRun(
            session.userId,
            session.handle,
            INFERENCE_MODEL_VERSION,
            skills.map((s) => ({
              skill: s.skill,
              baseArs: s.baseArs,
              cascadedArs: s.cascadedArs,
              cascadeDelta: s.cascadeDelta,
              risk: s.risk,
            })),
            summary
          )
          if (persisted.deduped) {
            console.info("[api/predict-risk] Reused recent inference run", {
              runId: persisted.runId,
              handle: session.handle,
            })
          } else {
            await addGamificationEvent({
              userId: session.userId,
              eventType: "analysis_run",
              xpDelta: 25,
              metadata: {
                runId: persisted.runId,
                source: "predict-risk",
              },
            })
            await syncAchievements(session.userId)
            await syncNotificationsFromSkills(
              session.userId,
              persisted.runId,
              skills.map((s) => ({
                skill: s.skill,
                risk: s.risk,
                ars: s.ars,
              }))
            )
          }
        }
      } catch (persistError) {
        console.warn("[api/predict-risk] Persist inference run failed", {
          handle,
          error: persistError instanceof Error ? persistError.message : String(persistError),
        })
      }

      if (skills.length === 0) {
        return okJson({
          skills: [],
          summary,
          message: "We found your account, but there isn't enough recent activity to analyze yet.",
        })
      }

      return okJson({ skills, summary })
    } catch (err) {
      const e = err as { stderr?: string; message?: string }
      const stderr = (e.stderr || "").toLowerCase()

      if (
        stderr.includes("not found") ||
        stderr.includes("invalid handle") ||
        stderr.includes("failed for")
      ) {
        throw appError(
          "INVALID_HANDLE",
          "We couldn't find that Codeforces handle. Check the spelling and try again.",
          404
        )
      }

      if (stderr.includes("no submissions")) {
        return okJson({
          skills: [],
          summary: {
            skillsTracked: 0,
            critical: 0,
            atRisk: 0,
            overallHealth: 100,
          },
          message: "We found your account, but there isn't enough recent activity to analyze yet.",
        })
      }

      if (stderr.includes("timed out") || stderr.includes("timeout")) {
        throw appError(
          "INFERENCE_FAILED",
          "We couldn't analyze your skills right now. Please try again.",
          504
        )
      }

      throw appError(
        "INFERENCE_FAILED",
        "We couldn't analyze your skills right now. Please try again.",
        500
      )
    }
  } catch (error) {
    return toErrorResponse(error, "api/predict-risk")
  }
}
