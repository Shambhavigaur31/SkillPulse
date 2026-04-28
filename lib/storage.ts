import { CodeforcesSubmission } from "@/lib/codeforces"
import { ensureSchema, sql } from "@/lib/db"
import { createHash } from "node:crypto"

interface SessionUserRecord {
  id: number
  handle: string
  firstName: string | null
  lastName: string | null
  rank: string | null
  maxRating: number | null
  avatar: string | null
}

interface UpsertUserInput {
  handle: string
  firstName?: string
  lastName?: string
  rank?: string
  maxRating?: number
  avatar?: string
}

interface InferenceSkillOutput {
  skill: string
  baseArs: number
  cascadedArs: number
  cascadeDelta: number
  risk: string
}

interface InferenceSummaryOutput {
  skillsTracked: number
  critical: number
  atRisk: number
  overallHealth: number
}

interface InferenceRunRecord {
  id: number | string
  handle: string
  modelVersion: string
  source: string
  summary: InferenceSummaryOutput | string
  createdAt: string
}

interface InferenceSkillRecord {
  skill: string
  baseArs: number
  cascadedArs: number
  cascadeDelta: number
  risk: string
}

export interface InferenceSnapshot {
  runId: number
  handle: string
  modelVersion: string
  source: string
  summary: InferenceSummaryOutput
  createdAt: string
  skills: InferenceSkillRecord[]
}

function toNumericId(value: number | string): number {
  if (typeof value === "number") return value
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseSummary(value: InferenceSummaryOutput | string): InferenceSummaryOutput {
  if (typeof value !== "string") return value
  try {
    const parsed = JSON.parse(value) as InferenceSummaryOutput
    return parsed
  } catch {
    return {
      skillsTracked: 0,
      critical: 0,
      atRisk: 0,
      overallHealth: 100,
    }
  }
}

function safeDateIso(date: Date, fallback = new Date()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return fallback.toISOString()
  }
  return date.toISOString()
}

function safeDateOnlyIso(date: Date, fallback = new Date()): string {
  return safeDateIso(date, fallback).slice(0, 10)
}

export async function upsertUser(input: UpsertUserInput): Promise<number> {
  await ensureSchema()

  const [user] = await sql<[{ id: number }]>`
    insert into app_users (cf_handle, first_name, last_name, rank, max_rating, avatar)
    values (
      ${input.handle},
      ${input.firstName ?? null},
      ${input.lastName ?? null},
      ${input.rank ?? null},
      ${input.maxRating ?? null},
      ${input.avatar ?? null}
    )
    on conflict (cf_handle)
    do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      rank = excluded.rank,
      max_rating = excluded.max_rating,
      avatar = excluded.avatar,
      updated_at = now()
    returning id
  `

  return user.id
}

export async function saveSubmissions(
  userId: number,
  handle: string,
  submissions: CodeforcesSubmission[]
): Promise<number> {
  await ensureSchema()
  if (!submissions.length) return 0

  const rows = submissions.map((s) => ({
    id: s.id,
    user_id: userId,
    cf_handle: handle,
    contest_id: s.contestId ?? null,
    problem_index: s.problem.index,
    problem_name: s.problem.name,
    problem_type: s.problem.type,
    tags: s.problem.tags,
    verdict: s.verdict ?? null,
    programming_language: s.programmingLanguage,
    creation_time: new Date(s.creationTimeSeconds * 1000),
    raw: JSON.stringify(s),
  }))

  const inserted = await sql`
    insert into cf_submissions ${sql(rows)}
    on conflict (id) do nothing
    returning id
  `

  return inserted.length
}

function inferencePayloadHash(
  handle: string,
  modelVersion: string,
  skills: InferenceSkillOutput[],
  summary: InferenceSummaryOutput
): string {
  const normalizedSkills = [...skills]
    .sort((a, b) => a.skill.localeCompare(b.skill))
    .map((s) => ({
      skill: s.skill,
      baseArs: Number(s.baseArs.toFixed(4)),
      cascadedArs: Number(s.cascadedArs.toFixed(4)),
      cascadeDelta: Number(s.cascadeDelta.toFixed(4)),
      risk: s.risk,
    }))

  return createHash("sha256")
    .update(
      JSON.stringify({
        handle: handle.toLowerCase(),
        modelVersion,
        summary,
        skills: normalizedSkills,
      })
    )
    .digest("hex")
}

export async function saveInferenceRun(
  userId: number,
  handle: string,
  modelVersion: string,
  skills: InferenceSkillOutput[],
  summary: InferenceSummaryOutput
): Promise<{ runId: number; insertedSkills: number; deduped: boolean }> {
  await ensureSchema()
  if (!skills.length) {
    return { runId: 0, insertedSkills: 0, deduped: false }
  }

  const payloadHash = inferencePayloadHash(handle, modelVersion, skills, summary)

  const [recent] = await sql<[{ id: number | string }] | []>`
    select id
    from inference_runs
    where user_id = ${userId}
      and payload_hash = ${payloadHash}
      and created_at >= now() - interval '10 minutes'
    order by created_at desc
    limit 1
  `

  if (recent?.id) {
    return { runId: toNumericId(recent.id), insertedSkills: 0, deduped: true }
  }

  const [run] = await sql<[{ id: number | string }]>`
    insert into inference_runs (user_id, cf_handle, model_version, source, payload_hash, summary)
    values (${userId}, ${handle}, ${modelVersion}, 'predict-risk', ${payloadHash}, ${JSON.stringify(summary)})
    returning id
  `

  const rows = skills.map((s) => ({
    run_id: run.id,
    skill: s.skill,
    base_ars: s.baseArs,
    cascaded_ars: s.cascadedArs,
    cascade_delta: s.cascadeDelta,
    risk: s.risk,
    raw: JSON.stringify({
      skill: s.skill,
      baseArs: s.baseArs,
      cascadedArs: s.cascadedArs,
      cascadeDelta: s.cascadeDelta,
      risk: s.risk,
    }),
  }))

  const inserted = await sql`
    insert into inference_skill_results ${sql(rows)}
    on conflict (run_id, skill) do nothing
    returning skill
  `

  return {
    runId: toNumericId(run.id),
    insertedSkills: inserted.length,
    deduped: false,
  }
}

export async function getLatestInferenceSnapshot(
  userId: number,
  handle?: string
): Promise<InferenceSnapshot | null> {
  await ensureSchema()

  const runRows = await sql<InferenceRunRecord[]>`
    select
      id,
      cf_handle as handle,
      model_version as "modelVersion",
      source,
      summary,
      created_at as "createdAt"
    from inference_runs
    where user_id = ${userId}
      and (${handle ?? null}::text is null or lower(cf_handle) = lower(${handle ?? null}))
    order by created_at desc
    limit 1
  `

  const run = runRows[0]
  if (!run) return null

  const skills = await sql<InferenceSkillRecord[]>`
    select
      skill,
      base_ars as "baseArs",
      cascaded_ars as "cascadedArs",
      cascade_delta as "cascadeDelta",
      risk
    from inference_skill_results
    where run_id = ${run.id}
    order by cascaded_ars desc, skill asc
  `

  return {
    runId: toNumericId(run.id),
    handle: run.handle,
    modelVersion: run.modelVersion,
    source: run.source,
    summary: parseSummary(run.summary),
    createdAt: run.createdAt,
    skills,
  }
}

export async function upsertGoogleAccount(input: {
  googleSub: string
  email: string
  name?: string
  avatar?: string
}): Promise<void> {
  await ensureSchema()

  await sql`
    insert into google_accounts (google_sub, email, name, avatar)
    values (${input.googleSub}, ${input.email}, ${input.name ?? null}, ${input.avatar ?? null})
    on conflict (google_sub)
    do update set
      email = excluded.email,
      name = excluded.name,
      avatar = excluded.avatar,
      updated_at = now()
  `
}

export async function linkGoogleAccountToUser(
  googleSub: string,
  userId: number
): Promise<void> {
  await ensureSchema()

  await sql`
    update google_accounts
    set user_id = ${userId}, updated_at = now()
    where google_sub = ${googleSub}
  `
}

export async function getUserById(userId: number): Promise<SessionUserRecord | null> {
  await ensureSchema()

  const rows = await sql<SessionUserRecord[]>`
    select
      id,
      cf_handle as handle,
      first_name as "firstName",
      last_name as "lastName",
      rank,
      max_rating as "maxRating",
      avatar
    from app_users
    where id = ${userId}
    limit 1
  `

  return rows[0] ?? null
}

export async function getLinkedUserByGoogleSub(
  googleSub: string
): Promise<SessionUserRecord | null> {
  await ensureSchema()

  const rows = await sql<SessionUserRecord[]>`
    select
      u.id,
      u.cf_handle as handle,
      u.first_name as "firstName",
      u.last_name as "lastName",
      u.rank,
      u.max_rating as "maxRating",
      u.avatar
    from google_accounts g
    join app_users u on u.id = g.user_id
    where g.google_sub = ${googleSub}
    limit 1
  `

  return rows[0] ?? null
}

export interface GamificationProfile {
  xpTotal: number
  xpToday: number
  streak: number
  bestStreak: number
}

export interface AchievementView {
  key: string
  name: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  total: number
  progress: number
  unlocked: boolean
  unlockedAt: string | null
}

export interface LeaderboardEntry {
  rank: number
  handle: string
  xpTotal: number
  streak: number
  bestStreak: number
  isCurrentUser: boolean
}

export interface PersistedNotification {
  id: string
  skill: string
  risk: "SAFE" | "GENTLE" | "AT_RISK" | "CRITICAL" | "SEVERE"
  message: string
  cadence: string
  createdAt: number
  read: boolean
}

export interface TrendSkillDelta {
  skill: string
  latestArs: number
  previousArs: number | null
  delta: number
  trend: "improving" | "stable" | "declining"
}

export interface InferenceHistoryView {
  timeline: Array<{
    runId: number
    createdAt: string
    overallHealth: number
    skillsTracked: number
    critical: number
    atRisk: number
  }>
  latestSkills: Array<{ skill: string; ars: number; risk: string }>
  trends: TrendSkillDelta[]
  insight: string
}

export interface SchedulerState {
  skill: string
  easeFactor: number
  repetition: number
  intervalDays: number
  dueDate: string
  lastQuality: number | null
  reviewCount: number
}

export interface DailyTask {
  id: string
  skill: string
  title: string
  durationMinutes: number
  difficulty: "easy" | "medium" | "hard"
  reason: string
  status: "pending" | "planned" | "completed" | "skipped"
  source: string
  arsSnapshot: number
  nextReviewDate: string | null
}

export interface NotificationChannelPrefs {
  emailEnabled: boolean
  pushEnabled: boolean
  reminderEnabled: boolean
  escalationEnabled: boolean
  recoveryEnabled: boolean
}

type AchievementRule = {
  key: string
  name: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  total: number
  evaluate: (ctx: {
    totalRuns: number
    xpTotal: number
    streakCurrent: number
    severeSkillCount: number
    completedTasks: number
    highQualityReviews: number
  }) => number
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    key: "first_analysis",
    name: "First Pulse",
    description: "Complete your first skill analysis run.",
    rarity: "common",
    total: 1,
    evaluate: ({ totalRuns }) => Math.min(1, totalRuns),
  },
  {
    key: "analysis_habit_5",
    name: "Momentum Builder",
    description: "Complete 5 analysis runs.",
    rarity: "rare",
    total: 5,
    evaluate: ({ totalRuns }) => Math.min(5, totalRuns),
  },
  {
    key: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day activity streak.",
    rarity: "epic",
    total: 7,
    evaluate: ({ streakCurrent }) => Math.min(7, streakCurrent),
  },
  {
    key: "xp_1000",
    name: "XP Grinder",
    description: "Reach 1000 total XP.",
    rarity: "rare",
    total: 1000,
    evaluate: ({ xpTotal }) => Math.min(1000, xpTotal),
  },
  {
    key: "risk_hunter",
    name: "Risk Hunter",
    description: "Resolve 10 severe/critical skill alerts.",
    rarity: "legendary",
    total: 10,
    evaluate: ({ severeSkillCount }) => Math.min(10, severeSkillCount),
  },
  {
    key: "task_finisher_25",
    name: "Consistency Operator",
    description: "Complete 25 scheduled recovery tasks.",
    rarity: "epic",
    total: 25,
    evaluate: ({ completedTasks }) => Math.min(25, completedTasks),
  },
  {
    key: "quality_loop_15",
    name: "Feedback Loop",
    description: "Submit 15 high-quality (4-5) review feedback entries.",
    rarity: "rare",
    total: 15,
    evaluate: ({ highQualityReviews }) => Math.min(15, highQualityReviews),
  },
]

async function ensureGamificationProfile(userId: number): Promise<void> {
  await ensureSchema()
  await sql`
    insert into gamification_profiles (user_id)
    values (${userId})
    on conflict (user_id) do nothing
  `
}

function toTrendLabel(delta: number): "improving" | "stable" | "declining" {
  if (delta <= -3) return "improving"
  if (delta >= 3) return "declining"
  return "stable"
}

function buildHistoryInsight(trends: TrendSkillDelta[]): string {
  if (!trends.length) return "Run another analysis to start trend tracking."
  const improving = trends.filter((t) => t.trend === "improving").length
  const declining = trends.filter((t) => t.trend === "declining").length
  if (declining > improving) {
    return `${declining} skills are declining versus ${improving} improving. Focus this week's high-risk set first.`
  }
  if (improving > declining) {
    return `${improving} skills are improving and ${declining} are declining. Keep current reinforcement cadence.`
  }
  return "Trend posture is balanced. Target quick wins to shift more skills into improving."
}

function normalizeDifficulty(ars: number): "easy" | "medium" | "hard" {
  if (ars >= 80) return "hard"
  if (ars >= 60) return "medium"
  return "easy"
}

function durationForArs(ars: number): number {
  if (ars >= 85) return 30
  if (ars >= 70) return 22
  if (ars >= 55) return 16
  return 12
}

function taskTitleForSkill(skill: string, difficulty: "easy" | "medium" | "hard"): string {
  if (difficulty === "hard") return `Recovery Sprint: ${skill}`
  if (difficulty === "medium") return `Stabilize ${skill}`
  return `Maintain ${skill}`
}

function applySm2Review(previous: {
  repetition: number
  intervalDays: number
  easeFactor: number
}, quality: number): {
  repetition: number
  intervalDays: number
  easeFactor: number
} {
  const clampedQuality = Math.max(0, Math.min(5, Math.trunc(quality)))
  let repetition = previous.repetition
  let intervalDays = previous.intervalDays
  let easeFactor = previous.easeFactor

  if (clampedQuality < 3) {
    repetition = 0
    intervalDays = 1
  } else {
    repetition += 1
    if (repetition === 1) intervalDays = 1
    else if (repetition === 2) intervalDays = 6
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor))
  }

  easeFactor =
    easeFactor +
    (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02))
  easeFactor = Math.max(1.3, Math.min(3.0, easeFactor))

  return { repetition, intervalDays, easeFactor }
}

export async function getInferenceHistory(
  userId: number,
  handle: string,
  runLimit = 12
): Promise<InferenceHistoryView> {
  await ensureSchema()

  const runRows = await sql<
    Array<{
      id: number | string
      createdAt: string
      summary: InferenceSummaryOutput | string
    }>
  >`
    select id, created_at as "createdAt", summary
    from inference_runs
    where user_id = ${userId}
      and lower(cf_handle) = lower(${handle})
    order by created_at desc
    limit ${Math.max(1, Math.min(runLimit, 50))}
  `

  if (!runRows.length) {
    return {
      timeline: [],
      latestSkills: [],
      trends: [],
      insight: "No persisted history yet. Complete an analysis run to create your baseline.",
    }
  }

  const timeline = runRows
    .map((row) => {
      const summary = parseSummary(row.summary)
      return {
        runId: toNumericId(row.id),
        createdAt: row.createdAt,
        overallHealth: summary.overallHealth ?? 0,
        skillsTracked: summary.skillsTracked ?? 0,
        critical: summary.critical ?? 0,
        atRisk: summary.atRisk ?? 0,
      }
    })
    .reverse()

  const latestRunId = toNumericId(runRows[0].id)
  const previousRunId = runRows[1] ? toNumericId(runRows[1].id) : null

  const latestSkills = await sql<Array<{ skill: string; ars: number; risk: string }>>`
    select
      skill,
      cascaded_ars as ars,
      risk
    from inference_skill_results
    where run_id = ${latestRunId}
    order by cascaded_ars desc, skill asc
  `

  const previousSkills = previousRunId
    ? await sql<Array<{ skill: string; ars: number }>>`
        select
          skill,
          cascaded_ars as ars
        from inference_skill_results
        where run_id = ${previousRunId}
      `
    : []

  const previousBySkill = new Map(previousSkills.map((row) => [row.skill, row.ars]))
  const trends: TrendSkillDelta[] = latestSkills.map((row) => {
    const previousArs = previousBySkill.has(row.skill) ? previousBySkill.get(row.skill) ?? null : null
    const delta = previousArs === null ? 0 : row.ars - previousArs
    return {
      skill: row.skill,
      latestArs: row.ars,
      previousArs,
      delta,
      trend: toTrendLabel(delta),
    }
  })

  return {
    timeline,
    latestSkills,
    trends,
    insight: buildHistoryInsight(trends),
  }
}

export async function addGamificationEvent(params: {
  userId: number
  eventType: string
  xpDelta: number
  metadata?: Record<string, unknown>
}): Promise<GamificationProfile> {
  await ensureGamificationProfile(params.userId)

  const [profileBefore] = await sql<
    Array<{
      xpTotal: number
      streakCurrent: number
      streakBest: number
      lastActivityDate: string | null
    }>
  >`
    select
      xp_total as "xpTotal",
      streak_current as "streakCurrent",
      streak_best as "streakBest",
      last_activity_date::text as "lastActivityDate"
    from gamification_profiles
    where user_id = ${params.userId}
    limit 1
  `

  const today = new Date()
  const todayIso = safeDateOnlyIso(today)
  const advancesStreak =
    params.xpDelta > 0 ||
    ["analysis_run", "task_review_completed", "daily_plan_completed"].includes(
      params.eventType
    )
  const lastDateIso = profileBefore?.lastActivityDate ?? null
  let nextStreak = profileBefore?.streakCurrent ?? 0
  if (advancesStreak) {
    if (!lastDateIso) {
      nextStreak = 1
    } else if (lastDateIso === todayIso) {
      nextStreak = profileBefore.streakCurrent
    } else {
      const lastDate = new Date(`${lastDateIso}T00:00:00.000Z`)
      const dayDiff = Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000)
      nextStreak = dayDiff === 1 ? profileBefore.streakCurrent + 1 : 1
    }
  }

  const nextXpTotal = Math.max(0, (profileBefore?.xpTotal ?? 0) + params.xpDelta)
  const nextBestStreak = Math.max(profileBefore?.streakBest ?? 0, nextStreak)
  const nextLastActivityDate = advancesStreak
    ? todayIso
    : profileBefore?.lastActivityDate ?? null

  await sql`
    insert into gamification_events (user_id, event_type, xp_delta, metadata)
    values (
      ${params.userId},
      ${params.eventType},
      ${params.xpDelta},
      ${JSON.stringify(params.metadata ?? {})}
    )
  `

  await sql`
    update gamification_profiles
    set
      xp_total = ${nextXpTotal},
      streak_current = ${nextStreak},
      streak_best = ${nextBestStreak},
      last_activity_date = ${nextLastActivityDate}::date,
      updated_at = now()
    where user_id = ${params.userId}
  `

  return getGamificationProfile(params.userId)
}

export async function getGamificationProfile(userId: number): Promise<GamificationProfile> {
  await ensureGamificationProfile(userId)

  const rows = await sql<
    Array<{
      xpTotal: number
      streakCurrent: number
      streakBest: number
      xpToday: number | null
    }>
  >`
    select
      p.xp_total as "xpTotal",
      p.streak_current as "streakCurrent",
      p.streak_best as "streakBest",
      coalesce((
        select sum(e.xp_delta)::int
        from gamification_events e
        where e.user_id = p.user_id
          and e.created_at::date = now()::date
      ), 0) as "xpToday"
    from gamification_profiles p
    where p.user_id = ${userId}
    limit 1
  `

  const row = rows[0]
  if (!row) {
    return { xpTotal: 0, xpToday: 0, streak: 0, bestStreak: 0 }
  }

  return {
    xpTotal: row.xpTotal,
    xpToday: row.xpToday ?? 0,
    streak: row.streakCurrent,
    bestStreak: row.streakBest,
  }
}

export async function syncAchievements(userId: number): Promise<AchievementView[]> {
  await ensureSchema()
  const profile = await getGamificationProfile(userId)

  const [runStats] = await sql<
    Array<{
      totalRuns: number
      severeSkillCount: number
      completedTasks: number
      highQualityReviews: number
    }>
  >`
    with run_stats as (
      select
        count(*)::int as total_runs,
        coalesce(sum(case when r.risk in ('SEVERE', 'CRITICAL') then 1 else 0 end), 0)::int as severe_skill_count
      from inference_runs ir
      left join inference_skill_results r on r.run_id = ir.id
      where ir.user_id = ${userId}
    ),
    task_stats as (
      select
        count(*)::int as completed_tasks
      from daily_tasks
      where user_id = ${userId}
        and status = 'completed'
    ),
    review_stats as (
      select
        count(*)::int as high_quality_reviews
      from user_skill_scheduler
      where user_id = ${userId}
        and last_quality is not null
        and last_quality >= 4
    )
    select
      run_stats.total_runs as "totalRuns",
      run_stats.severe_skill_count as "severeSkillCount",
      task_stats.completed_tasks as "completedTasks",
      review_stats.high_quality_reviews as "highQualityReviews"
    from run_stats, task_stats, review_stats
  `

  const ctx = {
    totalRuns: runStats?.totalRuns ?? 0,
    xpTotal: profile.xpTotal,
    streakCurrent: profile.streak,
    severeSkillCount: runStats?.severeSkillCount ?? 0,
    completedTasks: runStats?.completedTasks ?? 0,
    highQualityReviews: runStats?.highQualityReviews ?? 0,
  }

  for (const rule of ACHIEVEMENT_RULES) {
    const progress = Math.max(0, Math.min(rule.total, rule.evaluate(ctx)))
    const unlocked = progress >= rule.total
    await sql`
      insert into achievement_unlocks (user_id, achievement_key, progress, unlocked_at)
      values (
        ${userId},
        ${rule.key},
        ${progress},
        case when ${unlocked ? 1 : 0} = 1 then CURRENT_TIMESTAMP else null end
      )
      on conflict (user_id, achievement_key)
      do update set
        progress = excluded.progress,
        unlocked_at = case
          when achievement_unlocks.unlocked_at is not null then achievement_unlocks.unlocked_at
          when excluded.unlocked_at is not null then excluded.unlocked_at
          else null
        end,
        updated_at = now()
    `
  }

  const rows = await sql<
    Array<{
      key: string
      progress: number
      unlockedAt: string | null
    }>
  >`
    select
      achievement_key as key,
      progress,
      unlocked_at as "unlockedAt"
    from achievement_unlocks
    where user_id = ${userId}
  `

  const byKey = new Map(rows.map((r) => [r.key, r]))

  return ACHIEVEMENT_RULES.map((rule) => {
    const matched = byKey.get(rule.key)
    const progress = matched?.progress ?? 0
    return {
      key: rule.key,
      name: rule.name,
      description: rule.description,
      rarity: rule.rarity,
      total: rule.total,
      progress,
      unlocked: progress >= rule.total,
      unlockedAt: matched?.unlockedAt ?? null,
    }
  })
}

export async function getLeaderboard(
  currentUserId: number,
  limit = 20
): Promise<LeaderboardEntry[]> {
  return getLeaderboardWithCurrentUser(currentUserId, limit)
}

export async function getLeaderboardWithCurrentUser(
  currentUserId: number,
  limit = 20
): Promise<LeaderboardEntry[]> {
  await ensureSchema()
  const rows = await sql<
    Array<{
      userId: number
      handle: string
      xpTotal: number
      streak: number
      bestStreak: number
      completedTasks: number
      latestHealth: number
      rankScore: number
    }>
  >`
    with latest_health as (
      select distinct on (user_id)
        user_id,
        coalesce((summary->>'overallHealth')::int, 0) as health
      from inference_runs
      order by user_id, created_at desc
    ),
    completed_tasks as (
      select user_id, count(*)::int as completed
      from daily_tasks
      where status = 'completed'
      group by user_id
    )
    select
      u.id as "userId",
      u.cf_handle as handle,
      coalesce(g.xp_total, 0) as "xpTotal",
      coalesce(g.streak_current, 0) as streak,
      coalesce(g.streak_best, 0) as "bestStreak",
      coalesce(t.completed, 0) as "completedTasks",
      coalesce(h.health, 0) as "latestHealth",
      (
        coalesce(g.xp_total, 0) +
        (coalesce(g.streak_current, 0) * 25) +
        (coalesce(t.completed, 0) * 8) +
        coalesce(h.health, 0)
      )::int as "rankScore"
    from app_users u
    left join gamification_profiles g on g.user_id = u.id
    left join completed_tasks t on t.user_id = u.id
    left join latest_health h on h.user_id = u.id
    order by "rankScore" desc, coalesce(g.xp_total, 0) desc, u.cf_handle asc
    limit ${Math.max(1, Math.min(limit, 100))}
  `

  return rows.map((row, idx) => ({
    rank: idx + 1,
    handle: row.handle,
    xpTotal: row.xpTotal,
    streak: row.streak,
    bestStreak: row.bestStreak,
    isCurrentUser: row.userId === currentUserId,
  }))
}

function cadenceForRisk(risk: PersistedNotification["risk"]): string {
  if (risk === "SEVERE" || risk === "CRITICAL") return "Daily"
  if (risk === "AT_RISK") return "Every 3 days"
  return "Weekly"
}

function notificationMessage(skill: string, risk: PersistedNotification["risk"]): string {
  if (risk === "SEVERE") return `${skill} is in severe decay. Immediate revision recommended.`
  if (risk === "CRITICAL") return `${skill} is critically decaying. Practice today.`
  if (risk === "AT_RISK") return `${skill} shows moderate decay risk. Revise it this week.`
  return `${skill} has a mild decay signal. Keep it warm with quick practice.`
}

async function ensureNotificationChannelPrefs(userId: number): Promise<void> {
  await ensureSchema()
  await sql`
    insert into notification_channel_prefs (user_id)
    values (${userId})
    on conflict (user_id) do nothing
  `
}

function inferNotificationKind(
  risk: PersistedNotification["risk"],
  message: string
): "reminder" | "escalation" | "recovery" {
  if (risk === "SEVERE" || risk === "CRITICAL") return "escalation"
  if (risk === "GENTLE" || risk === "SAFE") return "recovery"
  if (message.toLowerCase().includes("recovery") || message.toLowerCase().includes("improv")) {
    return "recovery"
  }
  return "reminder"
}

async function queueNotificationDeliveries(params: {
  notificationId: number | string
  userId: number
  risk: PersistedNotification["risk"]
  message: string
  skill: string
}): Promise<void> {
  await ensureNotificationChannelPrefs(params.userId)

  const [prefs] = await sql<Array<NotificationChannelPrefs>>`
    select
      email_enabled as "emailEnabled",
      push_enabled as "pushEnabled",
      reminder_enabled as "reminderEnabled",
      escalation_enabled as "escalationEnabled",
      recovery_enabled as "recoveryEnabled"
    from notification_channel_prefs
    where user_id = ${params.userId}
    limit 1
  `

  const kind = inferNotificationKind(params.risk, params.message)
  const kindEnabled =
    kind === "escalation"
      ? prefs?.escalationEnabled
      : kind === "recovery"
      ? prefs?.recoveryEnabled
      : prefs?.reminderEnabled

  if (!kindEnabled) return

  const channels: Array<"email" | "push"> = []
  if (prefs?.emailEnabled) channels.push("email")
  if (prefs?.pushEnabled) channels.push("push")

  for (const channel of channels) {
    await sql`
      insert into notification_deliveries (
        notification_id,
        user_id,
        channel,
        status,
        payload,
        updated_at
      )
      values (
        ${params.notificationId},
        ${params.userId},
        ${channel},
        'queued',
        ${JSON.stringify({
          kind,
          skill: params.skill,
          risk: params.risk,
          message: params.message,
        })},
        now()
      )
      on conflict (notification_id, channel)
      do update set
        status = 'queued',
        payload = excluded.payload,
        last_error = null,
        sent_at = null,
        updated_at = now()
    `
  }
}

export async function syncNotificationsFromSkills(
  userId: number,
  runId: number | null,
  skills: Array<{ skill: string; risk: PersistedNotification["risk"]; ars: number }>
): Promise<void> {
  await ensureSchema()
  const actionable = skills.filter((s) => s.ars >= 40)
  for (const skill of actionable) {
    const dedupeKey = `${skill.skill.trim().toLowerCase()}:${skill.risk}`
    const [row] = await sql<Array<{ id: number | string; message: string }>>`
      insert into notifications (user_id, run_id, skill, risk, message, cadence, dedupe_key)
      values (
        ${userId},
        ${runId},
        ${skill.skill},
        ${skill.risk},
        ${notificationMessage(skill.skill, skill.risk)},
        ${cadenceForRisk(skill.risk)},
        ${dedupeKey}
      )
      on conflict (user_id, dedupe_key)
      do update set
        run_id = excluded.run_id,
        message = excluded.message,
        cadence = excluded.cadence,
        created_at = case
          when notifications.read_at is null then notifications.created_at
          else now()
        end,
        read_at = case
          when notifications.read_at is null then notifications.read_at
          else null
        end
      returning id, message
    `

    if (row?.id) {
      await queueNotificationDeliveries({
        notificationId: row.id,
        userId,
        risk: skill.risk,
        message: row.message,
        skill: skill.skill,
      })
    }
  }
}

export async function getNotifications(
  userId: number,
  limit = 30
): Promise<PersistedNotification[]> {
  await ensureSchema()
  const rows = await sql<
    Array<{
      id: number | string
      skill: string
      risk: PersistedNotification["risk"]
      message: string
      cadence: string
      createdAt: string
      readAt: string | null
    }>
  >`
    select
      id,
      skill,
      risk,
      message,
      cadence,
      created_at as "createdAt",
      read_at as "readAt"
    from notifications
    where user_id = ${userId}
    order by created_at desc
    limit ${Math.max(1, Math.min(limit, 200))}
  `

  return rows.map((row) => ({
    id: String(row.id),
    skill: row.skill,
    risk: row.risk,
    message: row.message,
    cadence: row.cadence,
    createdAt: new Date(row.createdAt).getTime(),
    read: row.readAt !== null,
  }))
}

export async function markNotificationRead(
  userId: number,
  notificationId: string
): Promise<void> {
  await ensureSchema()
  await sql`
    update notifications
    set read_at = coalesce(read_at, now())
    where user_id = ${userId}
      and id = ${notificationId}
  `
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await ensureSchema()
  await sql`
    update notifications
    set read_at = coalesce(read_at, now())
    where user_id = ${userId}
      and read_at is null
  `
}

export async function getSkillGraphSnapshot(userId: number, handle: string): Promise<{
  runId: number
  createdAt: string
  skills: Array<{
    skill: string
    baseArs: number
    cascadedArs: number
    cascadeDelta: number
    ars: number
    risk: string
  }>
} | null> {
  const snapshot = await getLatestInferenceSnapshot(userId, handle)
  if (!snapshot) return null
  return {
    runId: snapshot.runId,
    createdAt: snapshot.createdAt,
    skills: snapshot.skills.map((row) => ({
      skill: row.skill,
      baseArs: row.baseArs,
      cascadedArs: row.cascadedArs,
      cascadeDelta: row.cascadeDelta,
      ars: row.cascadedArs,
      risk: row.risk,
    })),
  }
}

export async function getNotificationChannelPrefs(
  userId: number
): Promise<NotificationChannelPrefs> {
  await ensureNotificationChannelPrefs(userId)
  const rows = await sql<Array<NotificationChannelPrefs>>`
    select
      email_enabled as "emailEnabled",
      push_enabled as "pushEnabled",
      reminder_enabled as "reminderEnabled",
      escalation_enabled as "escalationEnabled",
      recovery_enabled as "recoveryEnabled"
    from notification_channel_prefs
    where user_id = ${userId}
    limit 1
  `
  return (
    rows[0] ?? {
      emailEnabled: true,
      pushEnabled: false,
      reminderEnabled: true,
      escalationEnabled: true,
      recoveryEnabled: true,
    }
  )
}

export async function updateNotificationChannelPrefs(
  userId: number,
  patch: Partial<NotificationChannelPrefs>
): Promise<NotificationChannelPrefs> {
  await ensureNotificationChannelPrefs(userId)
  const current = await getNotificationChannelPrefs(userId)
  const next = { ...current, ...patch }

  await sql`
    update notification_channel_prefs
    set
      email_enabled = ${next.emailEnabled},
      push_enabled = ${next.pushEnabled},
      reminder_enabled = ${next.reminderEnabled},
      escalation_enabled = ${next.escalationEnabled},
      recovery_enabled = ${next.recoveryEnabled},
      updated_at = now()
    where user_id = ${userId}
  `

  return next
}

export async function registerPushSubscription(params: {
  userId: number
  endpoint: string
  p256dh?: string
  auth?: string
}): Promise<void> {
  await ensureSchema()
  await sql`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth)
    values (${params.userId}, ${params.endpoint}, ${params.p256dh ?? null}, ${params.auth ?? null})
    on conflict (user_id, endpoint)
    do update set
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      updated_at = now()
  `
}

export async function processQueuedNotificationDeliveries(
  limit = 30
): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  await ensureSchema()
  const rows = await sql<
    Array<{
      id: number | string
      channel: "email" | "push"
      payload: Record<string, unknown>
      userId: number
      email: string | null
      pushEndpointCount: number
    }>
  >`
    select
      d.id,
      d.channel,
      d.payload,
      d.user_id as "userId",
      g.email,
      (
        select count(*)::int from push_subscriptions p where p.user_id = d.user_id
      ) as "pushEndpointCount"
    from notification_deliveries d
    left join google_accounts g on g.user_id = d.user_id
    where d.status = 'queued'
    order by d.created_at asc
    limit ${Math.max(1, Math.min(limit, 200))}
  `

  let sent = 0
  let failed = 0
  for (const row of rows) {
    const canSendEmail = row.channel === "email" && !!row.email
    const canSendPush = row.channel === "push" && row.pushEndpointCount > 0
    const success = canSendEmail || canSendPush

    if (success) {
      await sql`
        update notification_deliveries
        set
          status = 'sent',
          sent_at = now(),
          updated_at = now(),
          last_error = null
        where id = ${row.id}
      `
      sent += 1
    } else {
      await sql`
        update notification_deliveries
        set
          status = 'skipped',
          updated_at = now(),
          last_error = ${row.channel === "email"
            ? "No linked email for user."
            : "No push subscriptions for user."}
        where id = ${row.id}
      `
      failed += 1
    }
  }

  return {
    processed: rows.length,
    sent,
    failed,
  }
}

async function ensureSchedulerStateRow(userId: number, skill: string): Promise<void> {
  await ensureSchema()
  await sql`
    insert into user_skill_scheduler (user_id, skill, due_date)
    values (${userId}, ${skill}, now()::date)
    on conflict (user_id, skill) do nothing
  `
}

export async function getSchedulerStateForSkills(
  userId: number,
  skills: string[]
): Promise<Map<string, SchedulerState>> {
  await ensureSchema()
  const normalizedSkills = Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean)))
  for (const skill of normalizedSkills) {
    await ensureSchedulerStateRow(userId, skill)
  }

  const rows = normalizedSkills.length
    ? await sql<
        Array<{
          skill: string
          easeFactor: number
          repetition: number
          intervalDays: number
          dueDate: string
          lastQuality: number | null
          reviewCount: number
        }>
      >`
        select
          skill,
          ease_factor as "easeFactor",
          repetition,
          interval_days as "intervalDays",
          due_date::text as "dueDate",
          last_quality as "lastQuality",
          review_count as "reviewCount"
        from user_skill_scheduler
        where user_id = ${userId}
          and skill = any(${normalizedSkills}::text[])
      `
    : []

  return new Map(rows.map((row) => [row.skill, row]))
}

export async function generateDailyTasks(
  userId: number,
  handle: string,
  forDate = new Date()
): Promise<DailyTask[]> {
  await ensureSchema()
  const snapshot = await getLatestInferenceSnapshot(userId, handle)
  if (!snapshot) return []

  const taskDate = safeDateOnlyIso(forDate)
  const schedulerState = await getSchedulerStateForSkills(
    userId,
    snapshot.skills.map((s) => s.skill)
  )

  const candidateSkills = [...snapshot.skills]
    .sort((a, b) => b.cascadedArs - a.cascadedArs)
    .slice(0, 8)
    .filter((row) => {
      const state = schedulerState.get(row.skill)
      if (!state) return true
      return state.dueDate <= taskDate || row.cascadedArs >= 60
    })
    .slice(0, 5)

  for (const skill of candidateSkills) {
    const difficulty = normalizeDifficulty(skill.cascadedArs)
    const duration = durationForArs(skill.cascadedArs)
    const title = taskTitleForSkill(skill.skill, difficulty)
    const dueReason = schedulerState.get(skill.skill)?.dueDate
    const reason =
      skill.cascadeDelta > 0
        ? `${skill.skill} gained +${skill.cascadeDelta.toFixed(1)} cascade risk. Scheduled for recovery.`
        : dueReason && dueReason <= taskDate
        ? `${skill.skill} is due for spaced review today.`
        : `${skill.skill} remains a top-risk topic from latest ARS snapshot.`

    await sql`
      insert into daily_tasks (
        user_id,
        task_date,
        skill,
        title,
        duration_minutes,
        difficulty,
        reason,
        status,
        source,
        ars_snapshot,
        next_review_date
      )
      values (
        ${userId},
        ${taskDate}::date,
        ${skill.skill},
        ${title},
        ${duration},
        ${difficulty},
        ${reason},
        'pending',
        'sm2+scheduler',
        ${skill.cascadedArs},
        ${schedulerState.get(skill.skill)?.dueDate ?? taskDate}::date
      )
      on conflict (user_id, task_date, skill)
      do update set
        title = excluded.title,
        duration_minutes = excluded.duration_minutes,
        difficulty = excluded.difficulty,
        reason = excluded.reason,
        ars_snapshot = excluded.ars_snapshot,
        next_review_date = excluded.next_review_date
    `
  }

  const rows = await sql<
    Array<{
      id: number | string
      skill: string
      title: string
      durationMinutes: number
      difficulty: "easy" | "medium" | "hard"
      reason: string
      status: "pending" | "planned" | "completed" | "skipped"
      source: string
      arsSnapshot: number
      nextReviewDate: string | null
    }>
  >`
    select
      id,
      skill,
      title,
      duration_minutes as "durationMinutes",
      difficulty,
      reason,
      status,
      source,
      ars_snapshot as "arsSnapshot",
      next_review_date::text as "nextReviewDate"
    from daily_tasks
    where user_id = ${userId}
      and task_date = ${taskDate}::date
    order by ars_snapshot desc, duration_minutes desc, skill asc
  `

  return rows.map((row) => ({
    id: String(row.id),
    skill: row.skill,
    title: row.title,
    durationMinutes: row.durationMinutes,
    difficulty: row.difficulty,
    reason: row.reason,
    status: row.status,
    source: row.source,
    arsSnapshot: row.arsSnapshot,
    nextReviewDate: row.nextReviewDate,
  }))
}

export async function submitReviewFeedback(params: {
  userId: number
  taskId?: string
  skill: string
  quality: number
  completed?: boolean
}): Promise<{
  scheduler: SchedulerState
  nextReviewDate: string
  xpAwarded: number
}> {
  await ensureSchedulerStateRow(params.userId, params.skill)
  const [current] = await sql<
    Array<{
      easeFactor: number
      repetition: number
      intervalDays: number
      reviewCount: number
    }>
  >`
    select
      ease_factor as "easeFactor",
      repetition,
      interval_days as "intervalDays",
      review_count as "reviewCount"
    from user_skill_scheduler
    where user_id = ${params.userId}
      and skill = ${params.skill}
    limit 1
  `

  const next = applySm2Review(
    {
      easeFactor: current?.easeFactor ?? 2.5,
      repetition: current?.repetition ?? 0,
      intervalDays: current?.intervalDays ?? 1,
    },
    params.quality
  )

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + next.intervalDays)
  const nextReviewDateIso = safeDateOnlyIso(nextReviewDate)

  await sql`
    update user_skill_scheduler
    set
      ease_factor = ${next.easeFactor},
      repetition = ${next.repetition},
      interval_days = ${next.intervalDays},
      due_date = ${nextReviewDateIso}::date,
      last_quality = ${Math.max(0, Math.min(5, Math.trunc(params.quality)))},
      review_count = review_count + 1,
      last_reviewed_at = now(),
      updated_at = now()
    where user_id = ${params.userId}
      and skill = ${params.skill}
  `

  if (params.taskId) {
    await sql`
      update daily_tasks
      set
        status = ${params.completed ? "completed" : "planned"},
        completed_at = case when ${params.completed ? 1 : 0} = 1 then now() else completed_at end,
        next_review_date = ${nextReviewDateIso}::date
      where id = ${params.taskId}
        and user_id = ${params.userId}
    `
  }

  const qualityClamped = Math.max(0, Math.min(5, Math.trunc(params.quality)))
  const xpAwarded =
    params.completed === false
      ? 0
      : qualityClamped >= 4
      ? 40
      : qualityClamped === 3
      ? 30
      : 20
  if (xpAwarded > 0) {
    await addGamificationEvent({
      userId: params.userId,
      eventType: "task_review_completed",
      xpDelta: xpAwarded,
      metadata: {
        skill: params.skill,
        quality: qualityClamped,
        intervalDays: next.intervalDays,
      },
    })
  }

  return {
    scheduler: {
      skill: params.skill,
      easeFactor: next.easeFactor,
      repetition: next.repetition,
      intervalDays: next.intervalDays,
      dueDate: nextReviewDateIso,
      lastQuality: qualityClamped,
      reviewCount: (current?.reviewCount ?? 0) + 1,
    },
    nextReviewDate: nextReviewDateIso,
    xpAwarded,
  }
}
