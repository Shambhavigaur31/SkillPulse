import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { appError, okJson, toErrorResponse } from "@/lib/api-errors"
import { getSession } from "@/lib/auth"
import { saveInferenceOutputToSubmissions } from "@/lib/storage"

const execFileAsync = promisify(execFile)

type RawPrediction = {
  skill: string
  ars: number
}

type SkillRisk = RawPrediction & {
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

function parsePredictions(stdout: string): RawPrediction[] {
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

  if (!Array.isArray(parsed)) {
    throw appError(
      "INVALID_INFERENCE_RESPONSE",
      "We couldn't analyze your skills right now. Please try again.",
      502
    )
  }

  return parsed
    .filter((item): item is RawPrediction => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { skill?: unknown }).skill === "string" &&
        typeof (item as { ars?: unknown }).ars === "number" &&
        Number.isFinite((item as { ars: number }).ars)
      )
    })
    .map((item) => ({
      skill: item.skill,
      ars: Math.max(0, Math.min(100, item.ars)),
    }))
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
        ...s,
        risk: mapRisk(s.ars),
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
          await saveInferenceOutputToSubmissions(session.userId, session.handle, skills, summary)
        }
      } catch (persistError) {
        console.warn("[api/predict-risk] Failed to persist inference output", persistError)
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
