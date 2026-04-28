import { resolveSkillResourceUrl } from "@/lib/resource-catalog"

export type RiskLabel = "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE"

export type SkillRisk = {
  skill: string
  ars: number
  risk: RiskLabel
}

export type SkillRiskInput = {
  skill: string
  ars?: number
  baseArs?: number
  cascadedArs?: number
  cascadeDelta?: number
  risk?: RiskLabel
}

export type Summary = {
  skillsTracked: number
  critical: number
  atRisk: number
  overallHealth: number
}

export type AnalysisSnapshot = {
  handle: string
  skills: SkillRisk[]
  summary: Summary
  updatedAt: number
}

export type PracticeRecommendation = {
  skill: string
  ars: number
  risk: RiskLabel
  action: string
  effort: string
  recommendationType: "revise" | "practice" | "strengthen"
  reason: string
}

export type ResourceRecommendation = {
  skill: string
  ars: number
  risk: RiskLabel
  title: string
  type: "article" | "sheet" | "video" | "playlist" | "notes"
  url: string | null
  source: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  why: string
}

export type CourseRecommendation = {
  skill: string
  ars: number
  risk: RiskLabel
  title: string
  platform: string
  source: string
  duration: string
  level: "Beginner" | "Intermediate" | "Advanced"
  reason: string
  url: string | null
}

export type SkillNotification = {
  id: string
  skill: string
  ars: number
  risk: RiskLabel
  message: string
  cadence: string
  createdAt: number
  read: boolean
}

export const ANALYSIS_STORAGE_KEY = "skillpulse-analysis"
export const HANDLE_STORAGE_KEY = "skillpulse-handle"
export const NOTIFICATIONS_STORAGE_KEY = "skillpulse-notifications"

export function riskFromArs(ars: number): RiskLabel {
  if (ars < 40) return "SAFE"
  if (ars < 55) return "GENTLE"
  if (ars < 70) return "AT_RISK"
  if (ars < 85) return "CRITICAL"
  return "SEVERE"
}

function resolveArsValue(skill: SkillRiskInput): number {
  const resolved = skill.ars ?? skill.cascadedArs ?? skill.baseArs
  if (Number.isFinite(resolved)) {
    return Number(resolved)
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[skillpulse] Skill missing ars/cascadedArs/baseArs; defaulting to 0", {
      skill: skill.skill,
    })
  }
  return 0
}

export function normalizeSkills(skills: SkillRiskInput[]): SkillRisk[] {
  return skills
    .filter((s) => typeof s.skill === "string" && s.skill.trim().length > 0)
    .map((s) => {
      const ars = Math.max(0, Math.min(100, resolveArsValue(s)))
      return {
        skill: s.skill,
        ars,
        risk: s.risk ?? riskFromArs(ars),
      }
    })
    .sort((a, b) => b.ars - a.ars)
}

export function readAnalysisSnapshot(): AnalysisSnapshot | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(ANALYSIS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AnalysisSnapshot
    if (!parsed || !Array.isArray(parsed.skills) || !parsed.summary || !parsed.handle) return null
    return {
      ...parsed,
      skills: normalizeSkills(parsed.skills),
    }
  } catch {
    return null
  }
}

export function writeAnalysisSnapshot(snapshot: AnalysisSnapshot): void {
  if (typeof window === "undefined") return
  const normalizedSnapshot: AnalysisSnapshot = {
    ...snapshot,
    skills: normalizeSkills(snapshot.skills),
  }
  window.localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(normalizedSnapshot))
  window.localStorage.setItem(HANDLE_STORAGE_KEY, normalizedSnapshot.handle)
  const notifications = buildNotifications(normalizedSnapshot.skills)
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
  window.dispatchEvent(new Event("skillpulse:analysis-updated"))
}

export function readNotifications(): SkillNotification[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SkillNotification[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function markAllNotificationsRead(): void {
  if (typeof window === "undefined") return
  const next = readNotifications().map((n) => ({ ...n, read: true }))
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("skillpulse:analysis-updated"))
}

function deterministicSkillKey(skill: string): string {
  return skill.trim().toLowerCase()
}

const PRACTICE_ACTION_MAP: Record<string, string> = {
  dp: "Solve 1 easy DP problem",
  "dynamic programming": "Solve 1 easy DP problem",
  graphs: "Revise BFS/DFS + solve 1 graph problem",
  strings: "Solve 1 string implementation problem",
  greedy: "Solve 1 greedy warm-up",
  "binary search": "Solve 1 binary search warm-up",
  math: "Revise formulas and solve 1 math problem",
  implementation: "Solve 1 implementation warm-up",
}

const RESOURCE_MAP: Record<string, Omit<ResourceRecommendation, "skill" | "ars" | "risk">> = {
  dp: {
    title: "Dynamic Programming Quick Patterns",
    type: "sheet",
    url: "https://cp-algorithms.com/dynamic_programming/intro-to-dp.html",
    source: "CP Algorithms",
    difficulty: "Intermediate",
    why: "Covers transition patterns to reduce solve-time hesitation.",
  },
  "dynamic programming": {
    title: "Dynamic Programming Practice Set",
    type: "playlist",
    url: "https://codeforces.com/problemset?tags=dp",
    source: "Codeforces",
    difficulty: "Intermediate",
    why: "Targeted DP problem set to rebuild recall speed.",
  },
  graphs: {
    title: "BFS/DFS Visual Guide",
    type: "video",
    url: "https://www.youtube.com/watch?v=pcKY4hjDrxk",
    source: "YouTube",
    difficulty: "Beginner",
    why: "Refresh traversal fundamentals before moving to harder graph problems.",
  },
  "data structures": {
    title: "Data Structures Roadmap",
    type: "notes",
    url: "https://cp-algorithms.com/data_structures/",
    source: "CP Algorithms",
    difficulty: "Beginner",
    why: "Rebuild core data structure intuition with structured notes.",
  },
  "number theory": {
    title: "Number Theory Essentials",
    type: "article",
    url: "https://cp-algorithms.com/algebra/",
    source: "CP Algorithms",
    difficulty: "Intermediate",
    why: "Refresh prime, modular arithmetic, and gcd fundamentals.",
  },
  implementation: {
    title: "Implementation Practice Set",
    type: "sheet",
    url: "https://codeforces.com/problemset?tags=implementation",
    source: "Codeforces",
    difficulty: "Beginner",
    why: "Sharpen implementation accuracy with targeted problems.",
  },
  strings: {
    title: "String Algorithms Basics",
    type: "article",
    url: "https://cp-algorithms.com/string/string-hashing.html",
    source: "CP Algorithms",
    difficulty: "Intermediate",
    why: "Reinforces common string techniques used in contests.",
  },
  greedy: {
    title: "Greedy Strategy Checklist",
    type: "notes",
    url: "https://codeforces.com/blog/entry/111217",
    source: "Codeforces",
    difficulty: "Intermediate",
    why: "Helps identify when local choice proofs apply.",
  },
  math: {
    title: "Math and Number Theory Practice",
    type: "sheet",
    url: "https://codeforces.com/problemset?tags=math",
    source: "Codeforces",
    difficulty: "Beginner",
    why: "Keep math fundamentals warm with routine practice.",
  },
  bitmasks: {
    title: "Bitmask DP Guide",
    type: "article",
    url: "https://cp-algorithms.com/algebra/bitmasks.html",
    source: "CP Algorithms",
    difficulty: "Intermediate",
    why: "Clarifies bitmask representations and subset transitions.",
  },
  "binary search": {
    title: "Binary Search Problem Set",
    type: "playlist",
    url: "https://www.youtube.com/watch?v=3j0SWDX4AtU",
    source: "YouTube",
    difficulty: "Beginner",
    why: "Strengthens boundary handling and invariant thinking.",
  },
  sorting: {
    title: "Sorting & Order Statistics",
    type: "sheet",
    url: "https://leetcode.com/tag/sorting/",
    source: "LeetCode",
    difficulty: "Beginner",
    why: "Practice sorting patterns and stable ordering logic.",
  },
  sortings: {
    title: "Sorting & Order Statistics",
    type: "sheet",
    url: "https://leetcode.com/tag/sorting/",
    source: "LeetCode",
    difficulty: "Beginner",
    why: "Practice sorting patterns and stable ordering logic.",
  },
  "two pointers": {
    title: "Two Pointer Practice",
    type: "sheet",
    url: "https://leetcode.com/tag/two-pointers/",
    source: "LeetCode",
    difficulty: "Beginner",
    why: "Strengthen sliding window and two pointer intuition.",
  },
}

const COURSE_MAP: Record<string, Omit<CourseRecommendation, "skill" | "ars" | "risk">> = {
  dp: {
    title: "Dynamic Programming Masterclass",
    platform: "NPTEL",
    source: "NPTEL",
    duration: "8 weeks",
    level: "Intermediate",
    reason: "Useful when repeated DP decay suggests weak long-term retention.",
    url: "https://nptel.ac.in/courses/106106131",
  },
  "dynamic programming": {
    title: "Dynamic Programming Masterclass",
    platform: "NPTEL",
    source: "NPTEL",
    duration: "8 weeks",
    level: "Intermediate",
    reason: "Structured DP course to rebuild long-term retention.",
    url: "https://nptel.ac.in/courses/106106131",
  },
  graphs: {
    title: "Graph Algorithms",
    platform: "Coursera",
    source: "Coursera",
    duration: "6 weeks",
    level: "Intermediate",
    reason: "Builds stronger graph fundamentals for recurring risk zones.",
    url: "https://www.coursera.org/learn/algorithms-graphs-data-structures",
  },
  "data structures": {
    title: "Data Structures in Practice",
    platform: "GeeksForGeeks",
    source: "GeeksForGeeks",
    duration: "Self-paced",
    level: "Beginner",
    reason: "Refresh DS fundamentals with structured practice modules.",
    url: "https://www.geeksforgeeks.org/data-structures/",
  },
  "number theory": {
    title: "Number Theory Fundamentals",
    platform: "CP Algorithms",
    source: "CP Algorithms",
    duration: "Self-paced",
    level: "Intermediate",
    reason: "Core number theory series with proofs and practice links.",
    url: "https://cp-algorithms.com/algebra/",
  },
  strings: {
    title: "String Algorithms Essentials",
    platform: "YouTube",
    source: "YouTube",
    duration: "4 hours",
    level: "Intermediate",
    reason: "Short focused revision to recover consistency quickly.",
    url: "https://www.youtube.com/results?search_query=string+algorithms+cp",
  },
  greedy: {
    title: "Greedy Algorithms Bootcamp",
    platform: "YouTube",
    source: "YouTube",
    duration: "3 hours",
    level: "Intermediate",
    reason: "Rebuild greedy intuition with proof walkthroughs.",
    url: "https://www.youtube.com/results?search_query=greedy+algorithms+competitive+programming",
  },
  math: {
    title: "Competitive Math Toolkit",
    platform: "GeeksForGeeks",
    source: "GeeksForGeeks",
    duration: "Self-paced",
    level: "Beginner",
    reason: "Strengthen math foundations for frequency-based interview topics.",
    url: "https://www.geeksforgeeks.org/mathematical-algorithms/",
  },
  bitmasks: {
    title: "Bitmasking and Subsets",
    platform: "CP Algorithms",
    source: "CP Algorithms",
    duration: "Self-paced",
    level: "Intermediate",
    reason: "Hands-on bitmask DP and subset enumeration lessons.",
    url: "https://cp-algorithms.com/algebra/bitmasks.html",
  },
  sorting: {
    title: "Sorting & Binary Search Patterns",
    platform: "LeetCode",
    source: "LeetCode",
    duration: "Self-paced",
    level: "Beginner",
    reason: "Practice sorting/binary search workflows in one path.",
    url: "https://leetcode.com/explore/learn/card/sorting/",
  },
}

export function getPracticeAction(skill: string): string {
  const key = deterministicSkillKey(skill)
  if (PRACTICE_ACTION_MAP[key]) return PRACTICE_ACTION_MAP[key]
  return "Practice 1 easy problem in this topic"
}

export function effortForArs(ars: number): string {
  if (ars >= 85) return "15-20 min"
  if (ars >= 70) return "10-15 min"
  if (ars >= 40) return "8-12 min"
  return "5-8 min"
}

export function recommendationTypeForArs(ars: number): "revise" | "practice" | "strengthen" {
  if (ars >= 70) return "practice"
  if (ars >= 40) return "revise"
  return "strengthen"
}

export function buildPracticeRecommendations(skills: SkillRisk[]): PracticeRecommendation[] {
  return normalizeSkills(skills).map((s) => {
    const action = s.ars >= 70 ? getPracticeAction(s.skill) : s.ars >= 40 ? "Revise key concepts and solve 1 warm-up problem" : "No urgent action needed"
    const reason =
      s.ars >= 70
        ? "High decay risk requires immediate reinforcement."
        : s.ars >= 40
        ? "Moderate decay risk; review this week to avoid escalation."
        : "Healthy retention; maintain with light practice."

    return {
      skill: s.skill,
      ars: s.ars,
      risk: s.risk,
      action,
      effort: effortForArs(s.ars),
      recommendationType: recommendationTypeForArs(s.ars),
      reason,
    }
  })
}

export function buildResourceRecommendations(skills: SkillRisk[]): ResourceRecommendation[] {
  const risky = normalizeSkills(skills).filter((s) => s.ars >= 40)
  return risky.slice(0, 3).map((s) => {
    const key = deterministicSkillKey(s.skill)
    const resolvedResourceUrl = resolveSkillResourceUrl(s.skill, "resource")
    const resolvedNotesUrl = resolveSkillResourceUrl(s.skill, "notes")
    const mapped = RESOURCE_MAP[key] ?? {
      title: `${s.skill} Revision Notes`,
      type: "notes" as const,
      url: resolvedNotesUrl ?? resolvedResourceUrl ?? null,
      source: "SkillPulse",
      difficulty: "Beginner" as const,
      why: "Targeted short revision for current weak area.",
    }
    return {
      skill: s.skill,
      ars: s.ars,
      risk: s.risk,
      ...mapped,
      url: mapped.url ?? resolvedResourceUrl ?? resolvedNotesUrl ?? null,
    }
  })
}

export function getSkillLearningLink(
  skill: string,
  intent: "practice" | "course" | "resource" | "notes"
): string | null {
  return resolveSkillResourceUrl(skill, intent)
}

export function buildCourseRecommendations(skills: SkillRisk[]): CourseRecommendation[] {
  const eligible = normalizeSkills(skills).filter((s) => s.ars >= 55)
  return eligible.slice(0, 3).map((s) => {
    const key = deterministicSkillKey(s.skill)
    const resolvedCourseUrl = resolveSkillResourceUrl(s.skill, "course")
    const mapped = COURSE_MAP[key] ?? {
      title: `${s.skill} Foundations Course`,
      platform: "Curated",
      source: "SkillPulse",
      duration: "Self-paced",
      level: "Intermediate" as const,
      reason: "Recommended to stabilize this skill over the next 2-3 weeks.",
      url: resolvedCourseUrl,
    }
    return {
      skill: s.skill,
      ars: s.ars,
      risk: s.risk,
      ...mapped,
      url: mapped.url ?? resolvedCourseUrl ?? null,
    }
  })
}

function cadenceForArs(ars: number): string {
  if (ars > 85) return "Daily"
  if (ars >= 70) return "Daily"
  if (ars >= 55) return "Every 3 days"
  return "Weekly"
}

function notificationMessage(skill: string, ars: number): string {
  if (ars > 85) return `${skill} is in severe decay. Immediate revision recommended.`
  if (ars >= 70) return `${skill} is critically decaying. Practice today.`
  if (ars >= 55) return `${skill} is showing moderate decay risk. Revise it this week.`
  return `Your ${skill} skill has not been used recently. A quick 10-minute revision would help.`
}

export function buildNotifications(skills: SkillRisk[]): SkillNotification[] {
  const now = Date.now()
  return normalizeSkills(skills)
    .filter((s) => s.ars >= 40)
    .map((s, idx) => ({
      id: `${deterministicSkillKey(s.skill)}-${Math.round(s.ars)}-${idx}`,
      skill: s.skill,
      ars: s.ars,
      risk: s.risk,
      message: notificationMessage(s.skill, s.ars),
      cadence: cadenceForArs(s.ars),
      createdAt: now - idx * 60_000,
      read: false,
    }))
}

export function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return "just now"
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function bucketCounts(skills: SkillRisk[]): Array<{ bucket: RiskLabel; count: number }> {
  const labels: RiskLabel[] = ["SAFE", "GENTLE", "AT_RISK", "CRITICAL", "SEVERE"]
  const normalized = normalizeSkills(skills)
  return labels.map((label) => ({
    bucket: label,
    count: normalized.filter((s) => s.risk === label).length,
  }))
}
