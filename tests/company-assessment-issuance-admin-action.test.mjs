import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260827143000_issue_company_assessment_access_admin_action.sql");
const unifiedMigration = read("supabase/migrations/20260923130000_unified_assessment_issuance.sql");
const existingCompanyMigration = read("supabase/migrations/20260924090000_existing_company_assessment_access.sql");
const individualAction = read("src/modules/admin-actions/actions/issue-individual-assessment-access.ts");
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
  assert.match(component, /operationId:id/);
  assert.match(route, /suppliedOperationId/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /v_existing_audit/);
  assert.match(unifiedMigration, /pg_advisory_xact_lock/);
  assert.match(unifiedMigration, /v_existing/);
});

test("all current corporate-enabled definitions can use the shared issuance engine", () => {
  assert.match(page, /definition\.capabilities\.corporateAvailability/);
  assert.match(action, /corporateAvailability/);
  assert.doesNotMatch(action, /CURRENT_COMPANY_ADAPTER_DEFINITION/);
  assert.match(unifiedMigration, /where id=p_assessment_definition_id and status='active'/);
});

test("individual and complimentary issuance use the same governed token architecture", () => {
  assert.match(component, /assessment-access\/individual\/issue/);
  assert.match(individualAction, /assessment-access\.individual\.issue/);
  assert.match(individualAction, /assessment-access\.complimentary\.issue/);
  assert.match(unifiedMigration, /entitlement_type in \('company','individual','complimentary'\)/i);
  assert.match(unifiedMigration, /No company credit is consumed|p_funding_type='complimentary'|remaining_uses/i);
});

test("unified migration is backward-compatible with legacy production tokens", () => {
  const addColumn = unifiedMigration.indexOf("add column if not exists entitlement_type text");
  const firstReference = unifiedMigration.indexOf("check (entitlement_type");
  assert.ok(addColumn >= 0 && addColumn < firstReference);
  assert.match(unifiedMigration, /entitlement_type is null and company_id is not null/);
  assert.doesNotMatch(unifiedMigration, /update public\.access_tokens[\s\S]*set entitlement_type/i);
  assert.match(unifiedMigration, /if v_token\.entitlement_type in \('individual','complimentary'\)/i);
});

test("route enforces session, origin, rate limit, capability and accountable actor", () => {
  assert.match(route, /origin !== request\.nextUrl\.origin/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /ADMIN_ACTION_CAPABILITIES/);
  assert.match(route, /ADMIN_ACTION_ACTOR_ID/);
  assert.match(route, /process\.env\.NODE_ENV === "production"/);
});

test("existing-company issuance is selected by UUID and reuses the governed transaction", () => {
  assert.match(component, /existingCompanyId:state\.existingCompanyId\|\|null/);
  assert.match(route, /existingCompanyId: body\.existingCompanyId/);
  assert.match(action, /p_existing_company_id: input\.existingCompanyId/);
  assert.match(existingCompanyMigration, /where id=p_existing_company_id for update/i);
  assert.match(existingCompanyMigration, /company_identity_mismatch/i);
  assert.match(existingCompanyMigration, /package_size=coalesce\(package_size,0\)\+p_credits/i);
  assert.match(existingCompanyMigration, /credits_balance=coalesce\(credits_balance,0\)\+p_credits/i);
  assert.match(existingCompanyMigration, /insert into public\.credit_transactions/i);
});

test("zero-credit existing-company issuance skips every balance and ledger mutation", () => {
  assert.match(existingCompanyMigration, /p_credits < \(case when p_existing_company_id is null then 1 else 0 end\)/i);
  const guardedTopUp = existingCompanyMigration.match(/if p_credits > 0 then([\s\S]*?)end if;/i)?.[1] || "";
  assert.match(guardedTopUp, /update public\.companies/i);
  assert.match(guardedTopUp, /package_size=coalesce\(package_size,0\)\+p_credits/i);
  assert.match(guardedTopUp, /credits_balance=coalesce\(credits_balance,0\)\+p_credits/i);
  assert.match(guardedTopUp, /insert into public\.credit_transactions/i);
  const existingBranch = existingCompanyMigration.slice(
    existingCompanyMigration.indexOf("if p_existing_company_id is not null then"),
    existingCompanyMigration.indexOf("else\n    if exists"),
  );
  assert.equal((existingBranch.match(/update public\.companies/gi) || []).length, 1);
  assert.equal((existingBranch.match(/insert into public\.credit_transactions/gi) || []).length, 1);
});

test("existing-company issuance preserves manager and access credentials", () => {
  assert.match(existingCompanyMigration, /if v_company\.manager_token is null then/i);
  assert.match(existingCompanyMigration, /where company_id=v_company\.id and assessment_type=v_assessment\.id and revoked_at is null/i);
  assert.match(existingCompanyMigration, /if v_access is null then/i);
  assert.match(existingCompanyMigration, /if exists\(select 1 from public\.companies/i);
  assert.match(existingCompanyMigration, /raise exception 'duplicate_company'/i);
  assert.doesNotMatch(existingCompanyMigration, /delete from|truncate /i);
});

test("new overload remains service-role only and idempotency binds the company UUID", () => {
  assert.match(existingCompanyMigration, /pg_advisory_xact_lock/i);
  assert.match(existingCompanyMigration, /existingCompanyId/i);
  assert.match(existingCompanyMigration, /revoke all on function[\s\S]*from public,anon,authenticated/i);
  assert.match(existingCompanyMigration, /grant execute on function[\s\S]*to service_role/i);
});
