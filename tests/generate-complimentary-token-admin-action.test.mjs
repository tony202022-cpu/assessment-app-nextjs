import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const action = read("src/modules/admin-actions/actions/generate-complimentary-token.ts");
const registry = read("src/modules/admin-actions/production-admin-actions.ts");
const route = read("app/api/admin/actions/complimentary/generate/route.ts");
const migration = read("supabase/migrations/20260825141734_generate_complimentary_access_token.sql");
const service = read("src/modules/complimentary/complimentary-access-service.ts");
const ui = read("src/components/admin/complimentary-future-actions.tsx");

test("complimentary.generate uses the complete Admin Actions workflow", () => {
  assert.match(action, /id: "complimentary\.generate"/);
  assert.match(action, /anyOf: \["complimentary\.generate"\]/);
  assert.match(action, /async dryRun/);
  assert.match(action, /mode: "reason-required"/);
  assert.match(action, /reasonRequired: true/);
  assert.match(action, /rollback:[\s\S]*mode: "manual"/);
  assert.match(registry, /new ActionRegistry\(\[restoreCreditAction, generateComplimentaryTokenAction\]\)/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
});

test("generation validates assessment eligibility and expiry in application and database", () => {
  for (const field of ["status", "allows_individual_access", "allows_complimentary_access"]) assert.match(action, new RegExp(field));
  assert.match(action, /MAX_LIFETIME_MS/);
  assert.match(migration, /assessment_not_active/);
  assert.match(migration, /individual_access_not_supported/);
  assert.match(migration, /complimentary_access_not_permitted/);
  assert.match(migration, /interval '366 days'/);
});

test("one typed token is generated atomically without company credits", () => {
  assert.equal((migration.match(/insert into public\.access_tokens/g) || []).length, 1);
  assert.match(migration, /entitlement_type[\s\S]*'complimentary'/);
  assert.match(migration, /remaining_uses[\s\S]*1/);
  assert.match(migration, /if v_token\.entitlement_type = 'complimentary'/);
  assert.match(migration, /remaining_uses = 0/);
  const complimentaryBranch = migration.slice(migration.indexOf("if v_token.entitlement_type = 'complimentary'"), migration.indexOf("select \* into v_company"));
  assert.doesNotMatch(complimentaryBranch, /credits_balance|credit_transactions/);
});

test("audit contains token ID but never token value", () => {
  const auditInsert = migration.slice(migration.indexOf("insert into public.admin_action_audit"), migration.indexOf("return query select"));
  assert.match(auditInsert, /'tokenId', v_token_id/);
  assert.doesNotMatch(auditInsert, /v_token_value|token_string/);
  assert.doesNotMatch(action, /console\.(log|info|warn|error)/);
});

test("history reads only complimentary entitlements and UI leaves future mutations disabled", () => {
  assert.match(service, /\.eq\("entitlement_type", "complimentary"\)/);
  assert.doesNotMatch(service, /select\([^)]*token_string/);
  for (const label of ["Email Link", "Revoke Token", "Extend Expiry", "Delete Token"]) assert.match(ui, new RegExp(label));
  assert.match(ui, /disabled className="h-11/);
});

test("route enforces session, trusted origin, rate limit, and capability context", () => {
  assert.match(route, /getDeveloperTestBaseUrl/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /ADMIN_ACTION_CAPABILITIES/);
});
