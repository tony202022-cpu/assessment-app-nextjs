import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportPage = readFileSync(new URL("../app/(site)/[slug]/report/page.tsx", import.meta.url), "utf8");
const resultsClient = readFileSync(new URL("../app/(site)/[slug]/results/ResultsClient.tsx", import.meta.url), "utf8");
const bindRoute = readFileSync(new URL("../app/api/report-access/bind/route.ts", import.meta.url), "utf8");

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

test("the primary report fails closed when only an attempt UUID is supplied", () => {
  assert.doesNotMatch(reportPage, /compatibilityAllowed/);
  assert.doesNotMatch(reportPage, /isAuthorizedPaidMriAttempt\(slug, authorization\.attempt\)/);
  assert.match(reportPage, /Report access blocked/);
  assert.match(reportPage, /Report not found/);
  assert.match(reportPage, /\/outdoor-mri\/completed\?attemptId=/);
});

test("the participant results flow binds authenticated report access before navigation", () => {
  assert.match(resultsClient, /supabase\.auth\.getSession\(\)/);
  assert.match(resultsClient, /fetch\("\/api\/report-access\/bind"/);
  assert.match(resultsClient, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(bindRoute, /supabase\.auth\.getUser\(accessToken\)/);
  assert.match(bindRoute, /\.eq\("id", attemptId\)/);
  assert.match(bindRoute, /String\(attempt\.user_id\) !== userId/);
  assert.match(bindRoute, /PARTICIPANT_REPORT_ACCESS_COOKIE/);
  assert.match(bindRoute, /httpOnly: true/);
});
