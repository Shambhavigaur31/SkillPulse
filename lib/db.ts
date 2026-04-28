import postgres from "postgres"

let schemaReady = false

const QUERY_MAX_RETRIES = Number.parseInt(process.env.DB_QUERY_MAX_RETRIES ?? "2", 10)
const QUERY_RETRY_DELAY_MS = Number.parseInt(process.env.DB_QUERY_RETRY_DELAY_MS ?? "150", 10)

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTemplateCall(value: unknown): value is TemplateStringsArray {
  return Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "raw")
}

function isRetryableDbError(error: unknown): error is { code?: string; errno?: number; syscall?: string } {
  if (!error || typeof error !== "object") return false
  const candidate = error as { code?: string; errno?: number; syscall?: string }
  const code = (candidate.code ?? "").toString().toUpperCase()

  if (code === "ECONNRESET" || code === "EPIPE" || code === "ETIMEDOUT") {
    return true
  }

  // PostgreSQL SQLSTATE classes for connection failures and transient startup issues.
  return (
    code.startsWith("08") ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    code === "53300"
  )
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not configured")
  }
  return url
}

const globalForDb = globalThis as unknown as {
  rawSql?: ReturnType<typeof postgres>
  sql?: ReturnType<typeof postgres>
}

const rawSql =
  globalForDb.rawSql ??
  postgres(getDatabaseUrl(), {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })

const sqlWithRetry =
  globalForDb.sql ??
  (new Proxy(rawSql, {
    apply(target, thisArg, argArray: unknown[]) {
      const [firstArg] = argArray
      if (!isTemplateCall(firstArg)) {
        return Reflect.apply(target, thisArg, argArray)
      }

      const run = async () => {
        let attempt = 0
        while (true) {
          try {
            return await Reflect.apply(target, thisArg, argArray)
          } catch (error) {
            if (!isRetryableDbError(error) || attempt >= QUERY_MAX_RETRIES) {
              throw error
            }

            attempt += 1
            schemaReady = false
            const jitter = Math.floor(Math.random() * 50)
            const waitMs = QUERY_RETRY_DELAY_MS * attempt + jitter
            console.warn(
              `[db] transient query error (${(error as { code?: string }).code ?? "unknown"}); retry ${attempt}/${QUERY_MAX_RETRIES} in ${waitMs}ms`
            )
            await delay(waitMs)
          }
        }
      }

      return run()
    },
  }) as ReturnType<typeof postgres>)

export const sql = sqlWithRetry

if (process.env.NODE_ENV !== "production") {
  globalForDb.rawSql = rawSql
  globalForDb.sql = sqlWithRetry
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return

  await sql`
    create table if not exists app_users (
      id bigserial primary key,
      cf_handle text not null unique,
      first_name text,
      last_name text,
      rank text,
      max_rating integer,
      avatar text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists cf_submissions (
      id bigint primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      cf_handle text not null,
      contest_id integer,
      problem_index text,
      problem_name text,
      problem_type text,
      tags text[] not null default '{}',
      verdict text,
      programming_language text,
      creation_time timestamptz not null,
      raw jsonb not null,
      synced_at timestamptz not null default now()
    )
  `

  await sql`
    create index if not exists idx_cf_submissions_user_id_time
    on cf_submissions(user_id, creation_time desc)
  `

  await sql`
    create table if not exists google_accounts (
      google_sub text primary key,
      email text not null,
      name text,
      avatar text,
      user_id bigint unique references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists inference_runs (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      cf_handle text not null,
      model_version text not null,
      source text not null default 'predict-risk',
      payload_hash text not null,
      summary jsonb not null,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists inference_skill_results (
      run_id bigint not null references inference_runs(id) on delete cascade,
      skill text not null,
      base_ars double precision not null,
      cascaded_ars double precision not null,
      cascade_delta double precision not null,
      risk text not null,
      raw jsonb not null,
      primary key (run_id, skill)
    )
  `

  await sql`
    create index if not exists idx_inference_runs_user_time
    on inference_runs(user_id, created_at desc)
  `

  await sql`
    create index if not exists idx_inference_runs_payload_hash
    on inference_runs(payload_hash)
  `

  await sql`
    create index if not exists idx_inference_skill_results_run_id
    on inference_skill_results(run_id)
  `

  await sql`
    create table if not exists gamification_profiles (
      user_id bigint primary key references app_users(id) on delete cascade,
      xp_total integer not null default 0,
      streak_current integer not null default 0,
      streak_best integer not null default 0,
      last_activity_date date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists gamification_events (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      event_type text not null,
      xp_delta integer not null default 0,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create index if not exists idx_gamification_events_user_time
    on gamification_events(user_id, created_at desc)
  `

  await sql`
    create table if not exists achievement_unlocks (
      user_id bigint not null references app_users(id) on delete cascade,
      achievement_key text not null,
      progress integer not null default 0,
      unlocked_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, achievement_key)
    )
  `

  await sql`
    create index if not exists idx_achievement_unlocks_user
    on achievement_unlocks(user_id)
  `

  await sql`
    create table if not exists notifications (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      run_id bigint references inference_runs(id) on delete set null,
      skill text not null,
      risk text not null,
      message text not null,
      cadence text not null,
      dedupe_key text not null,
      read_at timestamptz,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create unique index if not exists idx_notifications_dedupe_key
    on notifications(user_id, dedupe_key)
  `

  await sql`
    create index if not exists idx_notifications_user_created
    on notifications(user_id, created_at desc)
  `

  await sql`
    create table if not exists user_skill_scheduler (
      user_id bigint not null references app_users(id) on delete cascade,
      skill text not null,
      ease_factor double precision not null default 2.5,
      repetition integer not null default 0,
      interval_days integer not null default 1,
      due_date date not null default now()::date,
      last_quality integer,
      review_count integer not null default 0,
      last_reviewed_at timestamptz,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      primary key (user_id, skill)
    )
  `

  await sql`
    create index if not exists idx_user_skill_scheduler_due
    on user_skill_scheduler(user_id, due_date)
  `

  await sql`
    create table if not exists daily_tasks (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      task_date date not null,
      skill text not null,
      title text not null,
      duration_minutes integer not null,
      difficulty text not null,
      reason text not null,
      status text not null default 'pending',
      source text not null default 'scheduler',
      ars_snapshot double precision not null default 0,
      next_review_date date,
      created_at timestamptz not null default now(),
      completed_at timestamptz,
      unique (user_id, task_date, skill)
    )
  `

  await sql`
    create index if not exists idx_daily_tasks_user_date
    on daily_tasks(user_id, task_date desc)
  `

  await sql`
    create table if not exists notification_channel_prefs (
      user_id bigint primary key references app_users(id) on delete cascade,
      email_enabled boolean not null default true,
      push_enabled boolean not null default false,
      reminder_enabled boolean not null default true,
      escalation_enabled boolean not null default true,
      recovery_enabled boolean not null default true,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists push_subscriptions (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      endpoint text not null,
      p256dh text,
      auth text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, endpoint)
    )
  `

  await sql`
    create table if not exists notification_deliveries (
      id bigserial primary key,
      notification_id bigint not null references notifications(id) on delete cascade,
      user_id bigint not null references app_users(id) on delete cascade,
      channel text not null,
      status text not null default 'queued',
      payload jsonb not null default '{}'::jsonb,
      last_error text,
      created_at timestamptz not null default now(),
      sent_at timestamptz,
      updated_at timestamptz not null default now(),
      unique (notification_id, channel)
    )
  `

  await sql`
    create index if not exists idx_notification_deliveries_status
    on notification_deliveries(status, created_at)
  `

  schemaReady = true
}
