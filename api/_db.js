import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

// Cached per lambda instance so the DDL runs once per cold start, not per request.
let schemaReady;

export function ensureSchema() {
  schemaReady ??= sql`
    create table if not exists leads (
      id         bigserial   primary key,
      created_at timestamptz not null default now(),
      first_name text        not null,
      last_name  text        not null,
      company    text        not null,
      email      text        not null,
      phone      text        not null,
      zip        text        not null,
      website    text,
      consent_at timestamptz not null,
      lead_score integer     not null,
      lead_tier  text        not null,
      answers    jsonb       not null,
      campaign   jsonb       not null default '{}'::jsonb
    )
  `.then(() => sql`create index if not exists leads_created_at_idx on leads (created_at desc)`);
  return schemaReady;
}
