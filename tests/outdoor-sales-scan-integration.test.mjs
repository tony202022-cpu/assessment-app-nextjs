import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const definition = read("src/modules/assessment-definition/production/production-assessment-definitions.ts");
const authorization = read("src/modules/report-authorization/report-authorization-service.ts");
const results = read("app/(site)/[slug]/results/page.tsx");
const startRoute = read("app/api/start-assessment/route.ts");
const companyAction = read("src/modules/admin-actions/actions/issue-company-assessment-access.ts");
const individualAction = read("src/modules/admin-actions/actions/issue-individual-assessment-access.ts");
const accessCenter = read("src/components/admin/assessment-access-center.tsx");
const dashboard = read("src/modules/company-assessment-dashboard/company-assessment-dashboard-service.ts");
const scanPdf = read("app/reports/pdf/scan/[attemptId]/page.tsx");

test("public Scan supports English and Arabic without company credit", () => {
  assert.match(definition, /supportedLocales: \["en", "ar"\]/);
  assert.match(definition, /id: "outdoor_sales_scan"[\s\S]+publicAccess: true/);
  assert.match(authorization, /scan: "outdoor_sales_scan"/);
  assert.match(authorization, /"outdoor-scan": "outdoor_sales_scan"/);
  assert.match(authorization, /attempt\.assessmentId === OUTDOOR_SCAN_ASSESSMENT_ID/);
  assert.doesNotMatch(authorization, /credits_balance|credit_transactions/);
});

test("Sales Manager Scan is a free bilingual company assessment without MRI changes", () => {
  assert.match(definition, /id: "sales_manager_scan"[\s\S]+slug: "sales-manager-scan"[\s\S]+managerDashboard: true[\s\S]+pricing: \{ model: "free" \}/);
  assert.match(definition, /id: "sales_manager_mri"[\s\S]+pricing: \{ model: "package"/);
  assert.match(companyAction, /CURRENT_COMPANY_ADAPTER_DEFINITIONS = new Set\(\["outdoor_sales_mri", "outdoor_sales_scan", "sales_manager_scan"\]\)/);
  assert.match(startRoute, /\["sales-manager-scan", "sales_manager_scan"\]/);
});

test("public and legacy Scan attempts retain participant report access while stored visibility is enforced", () => {
  assert.match(authorization, /issuancePolicyId/);
  for (const policy of ["participant-only", "manager-only", "participant-and-manager", "admin-only"]) {
    assert.match(authorization, new RegExp(policy));
  }
  assert.match(results, /REPORT_VISIBILITY_DENIED/);
  assert.match(results, /Assessment completed/);
  assert.match(scanPdf, /ReportAuthorizationService/);
  assert.match(scanPdf, /purpose: "pdf"/);
  assert.match(scanPdf, /if \(!authorization\.authorized\) notFound\(\)/);
});

test("free company Scan starts bypass credit consumption while paid assessments keep the generic RPC", () => {
  assert.match(startRoute, /async function startFreeCompanyScan/);
  assert.match(startRoute, /"sales-manager-scan", "sales_manager_scan"/);
  const freeBranch = startRoute.slice(startRoute.indexOf("async function startFreeCompanyScan"), startRoute.indexOf("export async function POST"));
  assert.match(freeBranch, /\.from\("quiz_attempts"\)[\s\S]+\.insert\(/);
  assert.match(freeBranch, /company_id: access\.company_id/);
  assert.match(freeBranch, /issuance_policy_id: access\.issuance_policy_id/);
  assert.doesNotMatch(freeBranch, /credit_transactions|credits_balance/);
  assert.match(startRoute, /\.rpc\("start_assessment_with_credit"/);
  assert.doesNotMatch(startRoute, /start_outdoor_sales_scan_with_access/);
});

test("free company Scan issuance reuses the generic company RPC without package top-up", () => {
  assert.match(companyAction, /\.rpc\("issue_company_assessment_access_admin_action"/);
  for (const parameter of ["p_existing_company_id", "p_language_mode", "p_expires_at", "p_report_visibility", "p_issuance_type"]) {
    assert.match(companyAction, new RegExp(`${parameter}:`));
  }
  assert.doesNotMatch(companyAction, /issue_outdoor_sales_scan_company_access_admin_action/);
  assert.match(companyAction, /p_credits: scan \? 0 : input\.credits/);
  assert.match(companyAction, /p_issuance_type: scan \? "complimentary" : input\.issuanceType/);
  assert.match(companyAction, /FREE_COMPANY_SCAN_IDS = new Set\(\["outdoor_sales_scan", "sales_manager_scan"\]\)/);
  assert.match(companyAction, /package_size: 0,[\s\S]+credits_balance: 0/);
  assert.match(companyAction, /id: context\.requestId/);
  assert.match(companyAction, /\.update\(\{ quantity: input\.participantAllocation \}\)/);
  assert.doesNotMatch(companyAction, /from\("credit_transactions"\)/);
  assert.match(companyAction, /manager_token[^\n]+"Reused"/);
  assert.match(companyAction, /company\/assessment-dashboard/);
  assert.match(dashboard, /authorizeAttemptAccess/);
});

test("direct Scan access is always free with no paid-versus-complimentary user choice", () => {
  assert.match(individualAction, /\.rpc\("issue_individual_assessment_access_admin_action"/);
  assert.match(individualAction, /p_assessment_id:/);
  assert.match(individualAction, /p_funding_type:/);
  assert.match(individualAction, /assessmentDefinitionId === "outdoor_sales_scan" \|\| input\.recipientType === "complimentary" \? "complimentary" : "paid"/);
  assert.match(individualAction, /accessType: "individual"/);
  assert.doesNotMatch(individualAction, /p_recipient_type|credit_transactions|credits_balance/);
  assert.match(accessCenter, /freeCompanyScan[\s\S]+\? selectedAssessment\?\.individualAvailable \? \["company", "individual"\] : \["company"\]/);
  assert.match(accessCenter, /!freeCompanyScan && <IssuanceTypeField/);
});

test("Scan UI exposes only the three approved report visibility choices", () => {
  assert.match(accessCenter, /ASSESSMENT_REPORT_VISIBILITIES\.filter\(\(value\) => value !== "admin-only"\)/);
  assert.match(companyAction, /scan && normalized\.reportVisibility === "admin-only"/);
  assert.match(individualAction, /scan && normalized\.reportVisibility === "admin-only"/);
  for (const policy of ["participant-only", "manager-only", "participant-and-manager"]) assert.match(authorization, new RegExp(policy));
});

test("internal-test is not exposed and the October Scan SQL cannot be deployed", () => {
  assert.doesNotMatch(accessCenter, /value="internal-test"|internal-test:/);
  assert.match(companyAction, /issuanceType: \(isFreeCompanyScan\(normalizeText\(value\.assessmentDefinitionId\)\) \? "complimentary"/);
  assert.match(individualAction, /issuanceType: \(normalize\(value\.assessmentDefinitionId\) === "outdoor_sales_scan" \? "complimentary"/);

  const deployableMigrations = readdirSync(new URL("../supabase/migrations/", import.meta.url));
  assert.equal(deployableMigrations.includes("20261008090000_outdoor_sales_scan_access_integration.sql"), false);
  assert.equal(deployableMigrations.some((name) => /outdoor[_-]sales[_-]scan/i.test(name)), false);

  const scanRuntime = [startRoute, companyAction, individualAction].join("\n");
  assert.doesNotMatch(
    scanRuntime,
    /start_outdoor_sales_scan_with_access|issue_outdoor_sales_scan_(?:company|individual)_access_admin_action/,
  );
});
