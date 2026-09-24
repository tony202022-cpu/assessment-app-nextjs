import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Control Center overview is server-rendered and preserves existing admin authorization", () => {
  const page = read("app/admin/page.tsx");
  const service = read("src/modules/control-center/dashboard-service.ts");
  assert.match(page, /isValidAdminSession/);
  assert.match(page, /getControlCenterDashboard/);
  assert.match(service, /import "server-only"/);
  assert.doesNotMatch(service, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
});

test("dashboard presents all approved executive KPIs and explicit unavailable state", () => {
  const dashboard = read("src/components/admin/control-center-dashboard.tsx");
  for (const label of ["Total Companies", "Participants", "Reports", "Credits Remaining", "Complimentary Access Issued", "Today’s Attempts", "Completed Today"]) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.match(dashboard, /Not Available/);
});

test("overview uses existing production records for recent operations and product activity", () => {
  const service = read("src/modules/control-center/dashboard-service.ts");
  const dashboard = read("src/components/admin/control-center-dashboard.tsx");
  assert.match(service, /admin_action_audit/);
  assert.match(service, /\.eq\("outcome", "succeeded"\)/);
  assert.match(service, /\.eq\("entitlement_type", "complimentary"\)/);
  assert.match(service, /recentActivity/);
  assert.match(service, /recentCompletions/);
  assert.match(service, /productActivity/);
  assert.doesNotMatch(service, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  for (const label of ["Recent activity", "Recent completions", "Assessment activity", "Assessment Access", "Complimentary Access", "System Tools"]) {
    assert.match(dashboard, new RegExp(label));
  }
});

test("admin shell links its identity to Overview and describes governed operational writes", () => {
  const shell = read("src/components/admin/admin-shell.tsx");
  assert.match(shell, /<Link href="\/admin" className="flex items-center gap-3/);
  assert.match(shell, /Operational safety/);
  assert.match(shell, /permission, preview, confirmation, and an immutable audit record/);
  assert.doesNotMatch(shell, /Milestone 5/);
});

test("company analytics use stored results without mutating production data", () => {
  const service = read("src/modules/companies/company-service.ts");
  const detail = read("src/components/admin/company-detail.tsx");
  assert.match(service, /competency_results/);
  assert.match(service, /total_percentage/);
  assert.doesNotMatch(service, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(detail, /Executive metrics/);
  assert.match(detail, /Report analytics/);
  assert.match(detail, /Participant status summary/);
});

test("company detail retrieves and exposes the existing participant access token without mutation", () => {
  const service = read("src/modules/companies/company-service.ts");
  const detail = read("src/components/admin/company-detail.tsx");
  assert.match(service, /token_string/);
  assert.match(service, /participantAccessPath/);
  assert.match(service, /encodeURIComponent\(participantAccessToken\.token_string\)/);
  assert.doesNotMatch(service, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(detail, /Open Participant Link/);
  assert.match(detail, /Copy Participant Link/);
});

test("product language removes developer mode and soon badges", () => {
  const shell = read("src/components/admin/admin-shell.tsx");
  const consolePage = read("app/admin/assessment-access/AssessmentAccessConsole.tsx");
  assert.doesNotMatch(shell, /Developer Test Mode|>Soon</);
  assert.doesNotMatch(consolePage, /Developer Test Mode/);
  assert.match(shell, /System Tools/);
});
