/**
 * TypeScript wrapper for the SkillPulse inference pipeline.
 * Provides integration with Next.js API routes and utility functions.
 */

import { execSync } from "child_process"
import fs from "fs"
import path from "path"

export interface InferenceResult {
  handle: string
  skill: string
  ars: number
  risk: "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE"
}

export interface ModelConfig {
  modelsDir: string
  referenceDate: Date
  lookbackWeeks: number
}

/**
 * Risk levels and their ARS thresholds
 */
export const RISK_THRESHOLDS = {
  SAFE: { min: 0, max: 40 },
  GENTLE: { min: 40, max: 55 },
  AT_RISK: { min: 55, max: 70 },
  CRITICAL: { min: 70, max: 85 },
  SEVERE: { min: 85, max: 100 },
} as const

/**
 * Utility: Classify risk level based on ARS score
 */
export function classifyRisk(
  ars: number
): "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE" {
  if (ars < 40) return "SAFE"
  if (ars < 55) return "GENTLE"
  if (ars < 70) return "AT_RISK"
  if (ars < 85) return "CRITICAL"
  return "SEVERE"
}

/**
 * Validate that all required model files exist
 */
export function validateModelsExist(modelsDir: string): void {
  const requiredFiles = [
    "lstm_model.h5",
    "lstm_model.keras",
    "feature_scalers.pkl",
    "skill_mapping.json",
    "reference_date.txt",
  ]

  const kerasExists = fs.existsSync(path.join(modelsDir, "lstm_model.keras"))
  const h5Exists = fs.existsSync(path.join(modelsDir, "lstm_model.h5"))

  if (!kerasExists && !h5Exists) {
    throw new Error(
      `LSTM model not found at ${modelsDir}. Expected lstm_model.keras or lstm_model.h5`
    )
  }

  const otherFiles = [
    "feature_scalers.pkl",
    "skill_mapping.json",
    "reference_date.txt",
  ]
  for (const file of otherFiles) {
    const filePath = path.join(modelsDir, file)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file not found: ${filePath}`)
    }
  }
}

/**
 * Load reference date from file
 */
export function loadReferenceDate(modelsDir: string): Date {
  const dateFile = path.join(modelsDir, "reference_date.txt")
  const dateStr = fs.readFileSync(dateFile, "utf-8").trim()
  return new Date(dateStr)
}

/**
 * Load skill mapping from JSON file
 */
export function loadSkillMapping(modelsDir: string): Record<string, number> {
  const skillFile = path.join(modelsDir, "skill_mapping.json")
  const content = fs.readFileSync(skillFile, "utf-8")
  return JSON.parse(content)
}

/**
 * Call Python inference via subprocess
 * Returns JSON output from the Python script
 */
export function runPythonInference(
  handle: string,
  pythonPath: string,
  modelsDir: string = "models"
): InferenceResult[] {
  try {
    const pythonScript = path.join(__dirname, "inference.py")

    // Simple approach: use Python script directly
    // More robust: use a subprocess to call Python

    const pythonCommand = `"${pythonPath}" "${pythonScript}" --handle "${handle}" --models-dir "${modelsDir}"`

    const output = execSync(pythonCommand, {
      encoding: "utf-8",
      cwd: path.dirname(pythonScript),
    })

    // Extract JSON from output (Python script should output JSON at the end)
    const jsonMatch = output.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Failed to parse Python output as JSON")
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    throw new Error(`Python inference failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Main inference function (Node.js compatible)
 * Can be called directly if Python dependencies are available
 */
export async function predictCodeforcesUser(
  handle: string,
  modelsDir: string = "models"
): Promise<InferenceResult[]> {
  // Validate models exist
  validateModelsExist(modelsDir)

  // For Node.js, we have two options:
  // 1. Call Python subprocess (current implementation)
  // 2. Rewrite inference in pure TypeScript/Node.js

  // Option 1: Python subprocess
  // This requires Python to be installed with tensorflow, scikit-learn, etc.

  try {
    // Try to find Python executable
    let pythonPath = "python3"
    try {
      execSync(`${pythonPath} --version`, { stdio: "ignore" })
    } catch {
      pythonPath = "python"
      try {
        execSync(`${pythonPath} --version`, { stdio: "ignore" })
      } catch {
        throw new Error("Python not found in PATH. Install Python 3 to use this feature.")
      }
    }

    return runPythonInference(handle, pythonPath, modelsDir)
  } catch (error) {
    throw new Error(
      `Inference failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Format results for API response
 */
function safeNowIso(): string {
  const now = new Date()
  return Number.isNaN(now.getTime()) ? new Date(0).toISOString() : now.toISOString()
}

export function formatInferenceResponse(results: InferenceResult[]) {
  return {
    success: true,
    data: results,
    timestamp: safeNowIso(),
    count: results.length,
  }
}

/**
 * Format error response
 */
export function formatErrorResponse(error: Error | string) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    timestamp: safeNowIso(),
  }
}

export default {
  classifyRisk,
  validateModelsExist,
  loadReferenceDate,
  loadSkillMapping,
  predictCodeforcesUser,
  formatInferenceResponse,
  formatErrorResponse,
  runPythonInference,
}
