import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportPage = readFileSync(new URL("../app/(site)/[slug]/report/page.tsx", import.meta.url), "utf8");

test("the primary report is the only production report route integrated in Milestone 1B", () => {
  assert.match(reportPage, /new ReportAuthorizationService\(\)\.authorizeAttemptAccess/);
  const untouchedRoutes = [
    "../app/(site)/[slug]/premium-report/page.tsx",
    "../app/(site)/[slug]/premium-pdf/route.ts",
    "../app/(site)/print-report/page.tsx",
    "../app/reports/pdf/mri/[attemptId]/page.tsx",
    "../app/reports/pdf/scan/[attemptId]/page.tsx",
    "../app/api/report-data/route.ts",
    "../app/api/send-report/route.ts",
  ];
  for (const route of untouchedRoutes) {
    assert.doesNotMatch(readFileSync(new URL(route, import.meta.url), "utf8"), /ReportAuthorizationService/);
  }
});

test("authorization completes before full report content is loaded", () => {
  const authorization = reportPage.indexOf("authorizeAttemptAccess");
  const fullAttemptLoad = reportPage.indexOf('.select("*")', authorization);
  assert.ok(authorization >= 0);
  assert.ok(fullAttemptLoad > authorization);
});

test("the primary report preserves participant compatibility and existing error surfaces", () => {
  assert.match(reportPage, /PARTICIPANT_PROOF_UNAVAILABLE/);
  assert.match(reportPage, /isAuthorizedPaidMriAttempt\(slug, authorization\.attempt\)/);
  assert.match(reportPage, /Report access blocked/);
  assert.match(reportPage, /Report not found/);
  assert.match(reportPage, /\/outdoor-mri\/completed\?attemptId=/);
});
