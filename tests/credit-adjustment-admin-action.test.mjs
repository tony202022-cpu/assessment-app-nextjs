import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260923090000_adjust_company_credits_admin_action.sql");
const action = read("src/modules/admin-actions/actions/adjust-credits.ts");
const route = read("app/api/admin/actions/credits/adjust/route.ts");
const component = read("src/components/admin/credit-adjustment-action.tsx");
const service = read("src/modules/credits/credit-service.ts");

test("add and remove use the guarded admin action pipeline", () => {
  assert.match(action, /id: actionId/);
  assert.match(action, /"credits\.add"/);
  assert.match(action, /"credits\.remove"/);
  assert.match(route, /createAdminActionService\(\)/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /origin !== request\.nextUrl\.origin/);
});

test("both adjustments require amount, reason, preview, and explicit confirmation", () => {
  assert.match(action, /reasonRequired: true/);
  assert.match(action, /expectedPhrase: title/);
  assert.match(action, /Number\.isInteger\(amount\)/);
  assert.match(action, /if \(!reason\) fields\.reason/);
  assert.match(component, /mode: "preview" \| "execute"/);
  assert.match(component, /setPreview\(result\.data\.dryRun\)/);
  assert.match(component, /Confirm \$\{title\}/);
});

test("database adjustment is atomic, idempotent, ledger-backed, and audited", () => {
  assert.match(migration, /for update;/i);
  assert.match(migration, /request_id_conflict/);
  assert.match(migration, /set package_size = v_new_package_size,[\s\S]*credits_balance = v_new_balance/i);
  assert.match(migration, /insert into public\.credit_transactions/i);
  assert.match(migration, /insert into public\.admin_action_audit/i);
  assert.match(migration, /old_balance, new_balance/i);
  assert.match(migration, /insufficient_unused_credits/);
  assert.match(migration, /credit_limit_exceeded/);
});

test("row locking serializes adjustments and a successful retry returns before mutating again", () => {
  const lock = migration.indexOf("for update;");
  const replayLookup = migration.indexOf("where audit.request_id = p_request_id");
  const replayReturn = migration.indexOf("return;", replayLookup);
  const balanceUpdate = migration.indexOf("update public.companies");
  const ledgerInsert = migration.indexOf("insert into public.credit_transactions");
  const auditInsert = migration.indexOf("insert into public.admin_action_audit");

  assert.ok(lock >= 0 && lock < replayLookup, "the company row must be locked before replay detection");
  assert.ok(replayLookup < replayReturn && replayReturn < balanceUpdate, "a successful replay must return before the balance update");
  assert.ok(balanceUpdate < ledgerInsert && ledgerInsert < auditInsert, "balance, ledger, and audit writes must stay in one ordered RPC transaction");
  assert.match(migration, /v_existing_audit\.company_id is distinct from v_company\.id/);
  assert.match(migration, /\(v_existing_audit\.metadata ->> 'amount'\)::integer is distinct from p_amount/);
});

test("add and remove preserve consumed-credit accounting", () => {
  assert.match(migration, /v_delta := case p_adjustment_type when 'add' then p_amount else -p_amount end/);
  assert.match(migration, /v_new_package_size := v_company\.package_size \+ v_delta/);
  assert.match(migration, /v_new_balance := v_company\.credits_balance \+ v_delta/);
  assert.match(migration, /p_amount > v_company\.credits_balance/);
});

test("RPC is restricted to the trusted server role and leaves assessment execution untouched", () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke execute on function[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /start_assessment_with_credit/i);
  assert.doesNotMatch(migration, /quiz_attempts|reports|access_tokens/i);
});

test("company credit detail exposes before/after audit history", () => {
  assert.match(service, /admin_action_audit/);
  assert.match(service, /old_balance, new_balance/);
  assert.match(service, /auditTrail/);
});
