import { CodeforcesSubmission } from "@/lib/codeforces"
import { ensureSchema, sql } from "@/lib/db"

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
  ars: number
  risk: string
}

interface InferenceSummaryOutput {
  skillsTracked: number
  critical: number
  atRisk: number
  overallHealth: number
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

export async function saveInferenceOutputToSubmissions(
  userId: number,
  handle: string,
  skills: InferenceSkillOutput[],
  summary: InferenceSummaryOutput
): Promise<number> {
  await ensureSchema()
  if (!skills.length) return 0

  const baseId = -Date.now()
  const now = new Date()

  const rows = skills.map((s, idx) => ({
    id: baseId - idx,
    user_id: userId,
    cf_handle: handle,
    contest_id: null,
    problem_index: "INFER",
    problem_name: `skill:${s.skill}`,
    problem_type: "INFERENCE",
    tags: [s.skill],
    verdict: s.risk,
    programming_language: "skillpulse-inference",
    creation_time: now,
    raw: JSON.stringify({
      source: "inference",
      skill: s.skill,
      ars: s.ars,
      risk: s.risk,
      summary,
      createdAt: now.toISOString(),
    }),
  }))

  const inserted = await sql`
    insert into cf_submissions ${sql(rows)}
    on conflict (id) do nothing
    returning id
  `

  return inserted.length
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