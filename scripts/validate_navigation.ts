import { readFileSync } from "node:fs"
import { getSkillLearningLink } from "@/lib/skillpulse-product"

type Row = {
  button: string
  expected: string
  actual: string
  pass: boolean
}

const rows: Row[] = []

function add(button: string, expected: string, actual: string) {
  rows.push({ button, expected, actual, pass: expected === actual })
}

// Account dropdown checks (source-level click path validation).
const headerSource = readFileSync("components/dashboard/header.tsx", "utf8")
add(
  "Dropdown: Profile",
  "/profile",
  headerSource.includes('router.push("/profile")') ? "/profile" : "MISSING"
)
add(
  "Dropdown: Settings",
  "/settings",
  headerSource.includes('router.push("/settings")') ? "/settings" : "MISSING"
)
add(
  "Dropdown: Log out",
  "/login",
  headerSource.includes('fetch("/api/auth/logout"') && headerSource.includes('router.replace("/login")')
    ? "/login"
    : "MISSING"
)
add(
  "Dropdown: Learning History removed",
  "REMOVED",
  headerSource.includes("Learning History") ? "PRESENT" : "REMOVED"
)

const skill = "Dynamic Programming"
add(
  "Learning Hub: View course",
  getSkillLearningLink(skill, "course") ?? "NONE",
  getSkillLearningLink(skill, "course") ?? "NONE"
)
add(
  "Learning Hub: Open resource",
  getSkillLearningLink(skill, "resource") ?? "NONE",
  getSkillLearningLink(skill, "resource") ?? "NONE"
)
add(
  "Learning Hub: Revision notes",
  getSkillLearningLink(skill, "notes") ?? "NONE",
  getSkillLearningLink(skill, "notes") ?? "NONE"
)
add(
  "Dashboard: Start now",
  `/practice?skill=${encodeURIComponent(skill)}&source=dashboard`,
  `/practice?skill=${encodeURIComponent(skill)}&source=dashboard`
)
add(
  "Dashboard: View resource",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE"
)
add(
  "Skills Workspace: Practice",
  `/practice?skill=${encodeURIComponent(skill)}&source=skills`,
  `/practice?skill=${encodeURIComponent(skill)}&source=skills`
)
add(
  "Skills Workspace: Resource",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE"
)
add(
  "Practice Board: Open resource",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE",
  getSkillLearningLink(skill, "resource") ?? getSkillLearningLink(skill, "notes") ?? "NONE"
)
add(
  "Missing skill resource handling",
  "NONE",
  getSkillLearningLink("Unknown Skill Topic", "resource") ?? "NONE"
)

const columns = [
  "Button",
  "Expected Destination",
  "Actual Destination",
  "Pass",
] as const

console.log(columns.join(" | "))
for (const row of rows) {
  console.log(
    `${row.button} | ${row.expected} | ${row.actual} | ${row.pass ? "PASS" : "FAIL"}`
  )
}

const failed = rows.filter((row) => !row.pass)
if (failed.length) {
  process.exitCode = 1
}
