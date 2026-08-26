import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260825095443_restore_credit_admin_action.sql");
const action = read("src/modules/admin-actions/actions/restore-credit.ts");
const production = read("src/modules/admin-actions/production-admin-actions.ts");
const route = read("app/api/admin/actions/credits/restore/route.ts");
const framework = read("src/modules/admin-actions/action-execution-pipeline.ts");
const component = read("src/components/admin/restore-credit-action.tsx");

test("credits.restore is registered and executed only through AdminActionService", () => {
  assert.match(action, /id: "credits\.restore"/);
  assert.match(production, /new ActionRegistry\(\[[^\]]*restoreCreditAction[^\]]*\]\)/);
  assert.match(route, /createAdminActionService\(\)/);
  assert.match(route, /service\.execute\(\{/);
  assert.match(framework, /permissions\.assertAllowed/);
  assert.match(framework, /confirmations\.validate/);
});

test("restore requires capability, reason, and explicit confirmation", () => {
  assert.match(action, /anyOf: \["credits\.restore"\]/);
  assert.match(action, /reasonRequired: true/);
  assert.match(action, /expectedPhrase: "Restore Credit"/);
  assert.match(action, /rollback:[\s\S]*mode: "manual"/);
  assert.match(action, /async dryRun\(input\)/);
  assert.match(action, /createDryRunPreview/);
  assert.match(action, /if \(!reason\) fields\.reason/);
  assert.match(route, /ADMIN_ACTION_CAPABILITIES/);
  assert.match(route, /capabilities,/);
});

test("restore reuses one operation ID across preview and execution", () => {
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /operationId/);
  assert.match(component, /submit\("preview"\)/);
  assert.match(component, /submit\("execute"\)/);
  assert.match(route, /suppliedOperationId/);
  assert.match(route, /if \(!UUID_PATTERN\.test\(suppliedOperationId\)\)/);
  assert.match(route, /service\.prepare/);
  assert.match(migration, /v_existing_audit/);
  assert.match(migration, /request_id_conflict/);
});

test("production requires an accountable actor and success is structured", () => {
  assert.match(route, /process\.env\.NODE_ENV === "production"/);
  assert.match(route, /Administrative actor identity is not configured/);
  assert.doesNotMatch(route, /unidentified-admin-session/);
  for (const field of ["previousBalance", "newBalance", "packageSize", "companyName", "administrator", "reason", "timestamp"]) {
    assert.match(action, new RegExp(field));
  }
});

test("restore is atomic, row-locked, capped, and ledger-backed", () => {
  assert.match(migration, /for update;/i);
  assert.match(migration, /credits_balance = v_company\.credits_balance \+ 1/i);
  assert.match(migration, /credits_balance = v_company\.package_size/i);
  assert.match(migration, /credits_already_at_maximum/);
  assert.match(migration, /insert into public\.credit_transactions/i);
  assert.match(migration, /insert into public\.admin_action_audit/i);
  assert.match(migration, /old_balance, new_balance/i);
});

test("restore database function is inaccessible to browser roles", () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke execute on function[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]+to service_role/i);
});

test("restore route enforces session, origin, and rate limit", () => {
  assert.match(route, /origin !== request\.nextUrl\.origin/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
});
