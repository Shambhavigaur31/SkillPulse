import postgres from "postgres"

let schemaReady = false

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not configured")
  }
  return url
}

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>
}

export const sql =
  globalForDb.sql ??
  postgres(getDatabaseUrl(), {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    prepare: false,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql
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
    create table if not exists cf_credentials (
      user_id bigint primary key references app_users(id) on delete cascade,
      encrypted_api_key text not null,
      encrypted_api_secret text not null,
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

  schemaReady = true
}