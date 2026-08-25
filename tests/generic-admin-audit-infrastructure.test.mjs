import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260825090000_admin_action_audit_infrastructure.sql");
const adapter = read("src/modules/admin-actions/supabase-action-audit.ts");
const publicApi = read("src/modules/admin-actions/index.ts");

test("generic audit migration is transactional, additive, and rerunnable", () => {
  assert.match(migration, /^begin;/i);
  assert.match(migration, /create table if not exists public\.admin_action_audit/i);
  assert.match(migration, /create index if not exists admin_action_audit_resource_created_idx/i);
  assert.match(migration, /create index if not exists admin_action_audit_action_created_idx/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /\b(update|delete|truncate)\s+public\./i);
});

test("browser roles cannot read or write administrative audit records", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.admin_action_audit from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert on table public\.admin_action_audit to service_role/i);
  assert.doesNotMatch(migration, /grant\s+(update|delete|truncate)/i);
  assert.doesNotMatch(migration, /create policy/i);
});

test("audit infrastructure is generic and contains no access or complimentary cutover", () => {
  assert.doesNotMatch(migration, /access_tokens|start_assessment_with_credit|complimentary|allows_individual_access|allows_complimentary_access/i);
  assert.doesNotMatch(migration, /alter table public\.(assessments|access_tokens|companies|quiz_attempts)/i);
  assert.doesNotMatch(migration, /create(?: or replace)? function/i);
});

test("audit records enforce lifecycle identity, object payloads, and replay uniqueness", () => {
  assert.match(migration, /outcome in \('attempted', 'succeeded', 'denied', 'failed'\)/i);
  assert.match(migration, /unique \(request_id, action_id, outcome\)/i);
  assert.match(migration, /jsonb_typeof\(metadata\) = 'object'/i);
  assert.match(migration, /jsonb_typeof\(context\) = 'object'/i);
  assert.match(migration, /raw credentials and tokens are prohibited/i);
});

test("server-only audit adapter validates input and is exported as reusable infrastructure", () => {
  assert.match(adapter, /import "server-only"/);
  assert.match(adapter, /validateAuditEvent\(event\)/);
  assert.match(adapter, /\.from\("admin_action_audit"\)/);
  assert.match(adapter, /error\.code !== "23505"/);
  assert.match(publicApi, /export \{ SupabaseActionAudit \}/);
});
