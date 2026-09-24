import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const action = read("src/modules/admin-actions/actions/issue-individual-assessment-access.ts");
const registry = read("src/modules/admin-actions/production-admin-actions.ts");
const route = read("app/api/admin/actions/assessment-access/individual/issue/route.ts");
const migration = read("supabase/migrations/20260923130000_unified_assessment_issuance.sql");
const historicalMigration = read("supabase/migrations/20260825141734_generate_complimentary_access_token.sql");
const service = read("src/modules/complimentary/complimentary-access-service.ts");
const detail = read("src/components/admin/complimentary-detail.tsx");
const ui = read("src/components/admin/complimentary-future-actions.tsx");
const actionMigration = read("supabase/migrations/20260924180000_complete_complimentary_issuance.sql");

test("Complimentary Center uses unified individual issuance end to end", () => {
  assert.match(ui, /participantName/);
  assert.match(ui, /participantEmail/);
  assert.match(ui, /assessmentVersion/);
  assert.match(ui, /\/api\/admin\/actions\/assessment-access\/individual\/issue/);
  assert.match(ui, /fundingType: "complimentary"/);
  assert.match(ui, /issuanceType: "complimentary"/);
  assert.match(ui, /reportVisibility,/);
  assert.match(ui, /languageMode,/);
  assert.match(ui, /participant-only/);
  assert.match(ui, /admin-only/);
  assert.match(ui, /participant-choice/);
  assert.match(ui, /operationId: id/);
  assert.match(ui, /mode === "preview"/);
  assert.match(ui, /Confirm and Generate/);
  assert.match(ui, /Leave blank for No Expiry/);
});

test("current assessment definition version is supplied to the dedicated page", () => {
  assert.match(service, /assessmentRegistry\.getCurrent\(id\)/);
  assert.match(service, /version: definition\?\.metadata\.version \|\| ""/);
  assert.match(detail, /assessmentVersion=\{detail\.version\}/);
});

test("unified complimentary action is registered and invokes the unified RPC", () => {
  assert.match(action, /id: "assessment-access\.complimentary\.issue"/);
  assert.match(action, /anyOf: \["assessment-access\.complimentary\.issue"\]/);
  assert.match(action, /issue_individual_assessment_access_admin_action/);
  assert.match(route, /fundingType==="complimentary"/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
  assert.match(registry, /issueComplimentaryAssessmentAccessAction/);
  assert.doesNotMatch(registry, /generateComplimentaryTokenAction/);
});

test("unified database path creates a typed single-use token without company credits", () => {
  assert.match(migration, /p_funding_type='complimentary'/);
  assert.match(migration, /then 'complimentary' else 'individual'/);
  assert.match(migration, /remaining_uses,issuance_policy_id/);
  assert.match(migration, /if v_token\.entitlement_type in \('individual','complimentary'\)/);
  assert.match(migration, /remaining_uses=0/);
  const individualBranch = migration.slice(migration.indexOf("if v_token.entitlement_type in ('individual','complimentary')"), migration.indexOf("select * into v_company"));
  assert.doesNotMatch(individualBranch, /credits_balance|credit_transactions/);
});

test("complimentary preview is explicit and complete", () => {
  for (const field of ["assessment", "accessType", "participantName", "participantEmail", "language", "reportVisibility", "expiry", "accessQuantity", "companyCreditsConsumed", "reason"]) {
    assert.match(action, new RegExp(`${field}:`));
  }
  assert.match(action, /COMPLIMENTARY/);
  assert.match(action, /companyCreditsConsumed:"No"/);
  assert.match(action, /No company credit is consumed/);
  assert.match(ui, /Object\.entries\(preview\.expectedResult\)/);
});

test("only Definition Engine assessments with complimentary capability are selectable", () => {
  assert.match(service, /assessmentRegistry\.getCurrent\(id\)/);
  assert.match(service, /definition\.capabilities\.complimentaryAccess/);
  assert.match(service, /filter\(\(assessment\) => assessment\.complimentaryCapability === "Available"\)/);
});

test("complimentary action identity drives idempotency and authoritative audit", () => {
  assert.match(migration, /v_action_id text := case when p_funding_type='complimentary' then 'assessment-access\.complimentary\.issue' else 'assessment-access\.individual\.issue' end/);
  assert.match(migration, /action_id=v_action_id/);
  assert.match(migration, /values\(p_request_id,v_action_id,p_administrator_id/);
  assert.match(actionMigration, /pg_catalog\.pg_get_functiondef/);
  assert.match(actionMigration, /unexpected_individual_issuance_function_definition/);
});

test("complimentary issuance stays company- and manager-token-free", () => {
  const individualRpc = migration.slice(migration.indexOf("create or replace function public.issue_individual_assessment_access_admin_action"), migration.indexOf("revoke all on function public.issue_individual_assessment_access_admin_action"));
  assert.match(individualRpc, /values\(null,v_value/);
  assert.doesNotMatch(individualRpc, /credit_transactions|credits_balance|package_size|manager_token/);
});

test("history remains filtered to complimentary entitlements without token values", () => {
  assert.match(service, /\.eq\("entitlement_type", "complimentary"\)/);
  assert.doesNotMatch(service, /select\([^)]*token_string/);
  for (const label of ["Email Link", "Revoke Token", "Extend Expiry", "Delete Token"]) assert.match(ui, new RegExp(label));
});

test("legacy complimentary RPC remains historical only", () => {
  assert.match(historicalMigration, /generate_complimentary_access_token_admin_action/);
  for (const source of [action, registry, route, service, detail, ui]) {
    assert.doesNotMatch(source, /generate_complimentary_access_token_admin_action/);
    assert.doesNotMatch(source, /\/api\/admin\/actions\/complimentary\/generate/);
  }
});
