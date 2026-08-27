import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260827143000_issue_company_assessment_access_admin_action.sql");
const action = read("src/modules/admin-actions/actions/issue-company-assessment-access.ts");
const registry = read("src/modules/admin-actions/production-admin-actions.ts");
const route = read("app/api/admin/actions/assessment-access/company/issue/route.ts");
const component = read("src/components/admin/assessment-access-center.tsx");
const page = read("app/admin/access-center/page.tsx");

test("company issuance is registered and uses the existing Admin Actions Framework", () => {
  assert.match(action, /id: "assessment-access\.company\.issue"/);
  assert.match(action, /anyOf: \["assessment-access\.company\.issue"\]/);
  assert.match(registry, /issueCompanyAssessmentAccessAction/);
  assert.match(route, /createAdminActionService\(\)/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
  assert.match(action, /mode: "dangerous"/);
  assert.match(action, /confirmLabel: "Issue Company Access"/);
});

test("production issuance reuses the existing company activation transaction", () => {
  assert.match(migration, /from public\.activate_offline_company\(/i);
  assert.doesNotMatch(migration, /create table|alter table|drop table|start_assessment_with_credit/i);
  assert.match(migration, /insert into public\.assessment_issuance_policies/i);
  assert.match(migration, /insert into public\.admin_action_audit/i);
  assert.match(migration, /'company',[\s\S]*'paid'/i);
});

test("the privileged function is browser-inaccessible and does not leak tokens into audit", () => {
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  const auditInsert = migration.slice(migration.indexOf("insert into public.admin_action_audit"));
  assert.doesNotMatch(auditInsert, /'managerToken'|'employeeToken'|'tokenValue'/i);
});

test("operation ID serializes retries and returns the original issuance", () => {
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /operationId: id/);
  assert.match(route, /suppliedOperationId/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /v_existing_audit/);
  assert.match(migration, /request_id_conflict/);
});

test("only current manager-dashboard-backed company definitions can execute", () => {
  assert.match(page, /definition\.capabilities\.managerDashboard/);
  assert.match(action, /corporateAvailability/);
  assert.match(action, /managerDashboard/);
  assert.match(action, /CURRENT_COMPANY_ADAPTER_DEFINITION/);
  assert.match(migration, /p_assessment_definition_id <> 'outdoor_sales_mri'/);
});

test("individual and complimentary issuance remain unimplemented", () => {
  assert.match(component, /Individual issuance is not available in this milestone/);
  assert.doesNotMatch(route, /participantName|participantEmail|complimentary/i);
  assert.doesNotMatch(action, /accessType:\s*"individual"|fundingType:\s*"complimentary"/i);
  assert.doesNotMatch(migration, /'individual'|'complimentary'/i);
});

test("route enforces session, origin, rate limit, capability and accountable actor", () => {
  assert.match(route, /origin !== request\.nextUrl\.origin/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /ADMIN_ACTION_CAPABILITIES/);
  assert.match(route, /ADMIN_ACTION_ACTOR_ID/);
  assert.match(route, /process\.env\.NODE_ENV === "production"/);
});
