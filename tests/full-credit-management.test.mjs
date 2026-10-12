import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260923010000_full_credit_management.sql");
const action = read("src/modules/admin-actions/actions/adjust-credits.ts");
const production = read("src/modules/admin-actions/production-admin-actions.ts");
const routeFactory = read("src/modules/admin-actions/credit-adjustment-route.ts");
const addRoute = read("app/api/admin/actions/credits/add/route.ts");
const removeRoute = read("app/api/admin/actions/credits/remove/route.ts");
const component = read("src/components/admin/credit-adjustment-action.tsx");
const detail = read("src/components/admin/credit-detail.tsx");
const service = read("src/modules/credits/credit-service.ts");
const accounting = read("docs/architecture/CREDIT_ACCOUNTING.md");

test("credit add and remove are registered capability-gated Admin Actions", () => {
  assert.match(action, /id: actionId/);
  assert.match(action, /permission: \{ anyOf: \[actionId\] \}/);
  assert.match(action, /export const addCreditsAction/);
  assert.match(action, /export const removeCreditsAction/);
  assert.match(production, /addCreditsAction/);
  assert.match(production, /removeCreditsAction/);
  assert.match(routeFactory, /createAdminActionService\(\)/);
  assert.match(routeFactory, /service\.prepare/);
  assert.match(routeFactory, /service\.execute/);
});

test("validation and confirmation require amount, reason, preview, and explicit confirmation", () => {
  assert.match(action, /Number\.isSafeInteger\(amount\)/);
  assert.match(action, /if \(!reason\) fields\.reason/);
  assert.match(action, /internalNote\.length > 1000/);
  assert.match(action, /expectedPhrase: label/);
  assert.match(action, /reasonRequired: true/);
  assert.match(action, /async dryRun\(input\)/);
  assert.match(component, /submit\("preview"\)/);
  assert.match(component, /submit\("execute"\)/);
  for (const label of ["Company:", "Action:", "Amount:", "Current balance:", "New balance:", "Allocation:"]) assert.match(component, new RegExp(label));
});

test("routes enforce authentication, origin, rate limits, capabilities, UUID operations, and no-store", () => {
  assert.match(addRoute, /createCreditAdjustmentPost\("add"\)/);
  assert.match(removeRoute, /createCreditAdjustmentPost\("remove"\)/);
  assert.match(routeFactory, /origin !== request\.nextUrl\.origin/);
  assert.match(routeFactory, /isValidAdminSession/);
  assert.match(routeFactory, /consumeRateLimit/);
  assert.match(routeFactory, /ADMIN_ACTION_CAPABILITIES/);
  assert.match(routeFactory, /UUID_PATTERN\.test\(suppliedOperationId\)/);
  assert.match(routeFactory, /"Cache-Control": "no-store"/);
});

test("RPC locks rows and preserves the documented accounting invariant", () => {
  assert.match(migration, /from public\.companies[\s\S]*for update;/i);
  assert.match(migration, /package_size = v_new_package_size[\s\S]*credits_balance = v_new_balance/i);
  assert.match(migration, /v_new_package_size := v_company\.package_size \+ p_amount/);
  assert.match(migration, /v_new_balance := v_company\.credits_balance \+ p_amount/);
  assert.match(migration, /v_new_package_size := v_company\.package_size - p_amount/);
  assert.match(migration, /v_new_balance := v_company\.credits_balance - p_amount/);
  assert.match(migration, /p_amount > v_company\.credits_balance/);
  assert.match(migration, /v_new_package_size < v_new_balance/);
  assert.match(migration, /2147483647 - p_amount/);
  assert.match(accounting, /package_size - credits_balance` is unchanged/);
  assert.match(accounting, /start_assessment_with_credit`; that function is intentionally unchanged/);
});

test("RPC atomically writes the existing ledger and structured immutable audit", () => {
  assert.match(migration, /^begin;/i);
  assert.match(migration, /insert into public\.credit_transactions/i);
  assert.match(migration, /insert into public\.admin_action_audit/i);
  assert.match(migration, /old_balance, new_balance, metadata/i);
  assert.match(migration, /'oldAllocation'/);
  assert.match(migration, /'newAllocation'/);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /create table|alter table|drop table|start_assessment_with_credit/i);
});

test("request UUID idempotency binds the complete payload and rejects conflicts", () => {
  assert.match(migration, /p_request_id uuid/);
  assert.match(migration, /pg_advisory_xact_lock/);
  for (const binding of ["action_id", "company_id", "administrator_id", "administrator_role", "reason", "amount", "internalNote"]) assert.match(migration, new RegExp(binding));
  assert.match(migration, /request_id_conflict/);
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /disabled=\{submitting/);
});

test("RPC is hardened and executable only by service_role", () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /public\.companies/);
  assert.match(migration, /public\.credit_transactions/);
  assert.match(migration, /public\.admin_action_audit/);
  assert.match(migration, /revoke execute on function[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
});

test("history combines audits and ledger entries without duplicating manual events", () => {
  assert.match(service, /auditedRequestIds/);
  assert.match(service, /if \(requestId && auditedRequestIds\.has\(requestId\)\) return \[\]/);
  assert.match(service, /Assessment Credit Consumption/);
  assert.match(service, /occurredAt: null/);
  assert.match(service, /balanceBefore: null/);
  for (const heading of ["Date/time", "Company", "Action", "Quantity", "Balance before", "Balance after", "Reason", "Administrator", "Reference/request ID"]) assert.match(detail, new RegExp(heading));
  assert.match(detail, /Unavailable/);
});

test("credit controls are capability-aware and Restore Credit remains available beside adjustments", () => {
  assert.match(detail, /canAdd=\{capabilities\.add\}/);
  assert.match(detail, /canRemove=\{capabilities\.remove\}/);
  assert.match(detail, /canRestore=\{capabilities\.restore\}/);
  const futureActions = read("src/components/admin/credit-future-actions.tsx");
  assert.match(futureActions, /kind="add"/);
  assert.match(futureActions, /kind="remove"/);
  assert.match(futureActions, /<RestoreCreditAction/);
});
