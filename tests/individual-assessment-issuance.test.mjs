import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const action = read("src/modules/admin-actions/actions/issue-individual-assessment-access.ts");
const route = read("app/api/admin/actions/assessment-access/individual/issue/route.ts");
const page = read("app/admin/access-center/page.tsx");
const ui = read("src/components/admin/assessment-access-center.tsx");
const canonical = read("supabase/migrations/20260923130000_unified_assessment_issuance.sql");
const hotfix = read("supabase/migrations/20260924170000_fix_individual_assessment_issuance.sql");

const individualRpc = canonical.slice(
  canonical.indexOf("create or replace function public.issue_individual_assessment_access_admin_action"),
  canonical.indexOf("revoke all on function public.issue_individual_assessment_access_admin_action"),
);

test("individual eligibility comes from current assessment definitions and is enforced", () => {
  assert.match(page, /assessmentRegistry\.listCurrent\(\)/);
  assert.match(page, /individualAvailable: definition\.capabilities\.individualAvailability/);
  assert.match(ui, /kind==="individual"\?assessment\?\.individualAvailable/);
  assert.match(ui, /disabled=\{!available\}/);
  assert.match(action, /definition\?\.capabilities\.individualAvailability/);
});

test("admin route validates and executes the registered individual action", () => {
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /assessment-access\.individual\.issue/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
  assert.match(action, /issue_individual_assessment_access_admin_action/);
});

test("preview and confirmation show every governed individual issuance field", () => {
  for (const field of ["assessment", "participantName", "participantEmail", "language", "reportVisibility", "expiry", "accessQuantity", "reason"]) {
    assert.match(action, new RegExp(`${field}:`));
  }
  assert.match(ui, /Access Quantity \/ Uses/);
  assert.match(ui, /label="Expiry"/);
  assert.match(ui, /Preview Issuance/);
  assert.match(ui, /Confirm and Generate Access/);
});

test("individual policy and token are single-use, named, and company-free", () => {
  assert.match(individualRpc, /recipient_name,recipient_email,quantity/);
  assert.match(individualRpc, /v_name,v_email,1,p_issuance_type/);
  assert.match(individualRpc, /values\(null,v_value/);
  assert.match(individualRpc, /remaining_uses,issuance_policy_id,recipient_name,recipient_email/);
  assert.match(individualRpc, /p_administrator_id,v_reason,1,v_policy,v_name,v_email/);
  assert.doesNotMatch(individualRpc, /credit_transactions|credits_balance|package_size|manager_token/);
});

test("policy, audit, report visibility, language, and expiry are persisted", () => {
  assert.match(individualRpc, /insert into public\.assessment_issuance_policies as aip/);
  assert.match(individualRpc, /p_report_visibility/);
  assert.match(individualRpc, /p_language_mode/);
  assert.match(individualRpc, /p_expires_at/);
  assert.match(individualRpc, /insert into public\.admin_action_audit/);
  assert.match(individualRpc, /'reportVisibility',p_report_visibility/);
});

test("retry safety returns the original policy and token without another write", () => {
  assert.match(individualRpc, /pg_advisory_xact_lock/);
  assert.match(individualRpc, /where request_id=p_request_id/);
  assert.match(individualRpc, /request_id_conflict/);
  const retry = individualRpc.slice(individualRpc.indexOf("if found then"), individualRpc.indexOf("select * into v_assessment"));
  assert.match(retry, /return query select/);
  assert.doesNotMatch(retry, /insert into/);
});

test("canonical and guarded forward migration qualify ambiguous policy outputs", () => {
  assert.match(canonical, /insert into public\.assessment_issuance_policies as aip\(/);
  assert.match(canonical, /returning aip\.id,aip\.issued_at into v_policy,v_issued/);
  assert.doesNotMatch(individualRpc, /returning id,issued_at into v_policy,v_issued/);
  assert.match(hotfix, /unexpected_individual_issuance_function_definition/);
  assert.match(hotfix, /pg_catalog\.pg_get_functiondef/);
  assert.match(hotfix, /returning aip\.id,aip\.issued_at/);
});

test("participant URL uses the existing assessment route and token architecture", () => {
  assert.match(action, /getDeveloperTestBaseUrl\(\)/);
  assert.match(action, /\?token=/);
  assert.match(action, /encodeURIComponent\(String\(row\.assessment_slug\)\)/);
  assert.match(action, /reportVisibility:String\(row\.report_visibility\)/);
});
