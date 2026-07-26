import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const helper = read("src/lib/offline-attempt-access.ts");
const completed = read("app/(site)/[slug]/completed/page.tsx");
const quizWrapper = read("app/(site)/[slug]/quiz/page.tsx");
const sharedQuiz = read("app/(site)/quiz/page.tsx");
const startAssessment = read("app/api/start-assessment/route.ts");
const login = read("app/(site)/[slug]/login/page.tsx");
const resultsGate = read("app/(site)/[slug]/results/page.tsx");
const resultsClient = read("app/(site)/[slug]/results/ResultsClient.tsx");
const report = read("app/(site)/[slug]/report/page.tsx");
const dashboard = read("app/company/outdoor-mri-dashboard/page.tsx");

test("offline classification uses only the authoritative assessment/company marker", () => {
  assert.match(helper, /assessmentId === OUTDOOR_SALES_MRI && companyId/);
  assert.match(helper, /\.eq\("id", companyId\)/);
  assert.match(helper, /company\?\.is_offline_activated === true/);
  assert.doesNotMatch(helper, /package_size|credits_balance|employee_token/);
});

test("offline English completion renders the required copy", () => {
  assert.match(completed, /Assessment Submitted Successfully/);
  assert.match(completed, /Thank you for completing the Outdoor Sales MRI\./);
  assert.match(completed, /Your responses have been submitted successfully\./);
  assert.match(completed, /You may now close this page\./);
});

test("offline Arabic completion uses stored language and RTL", () => {
  assert.match(completed, /context\.language/);
  assert.match(completed, /lang=\{ar \? "ar" : "en"\}/);
  assert.match(completed, /dir=\{ar \? "rtl" : "ltr"\}/);
  assert.match(completed, /تم إرسال التقييم بنجاح/);
});

test("offline duplicate completed email reaches localized duplicate state", () => {
  assert.match(startAssessment, /isOfflineActivated/);
  assert.match(
    login,
    /completed\?attemptId=\$\{encodeURIComponent\(\s*attemptId\s*\)\}&alreadyCompleted=1/,
  );
  assert.match(completed, /Assessment Already Completed/);
  assert.match(completed, /تم إكمال التقييم مسبقاً/);
});

test("successful offline submit redirects to completion and other submits keep results", () => {
  assert.match(quizWrapper, /offlineCorporate=\{offlineCorporate\}/);
  assert.match(sharedQuiz, /window\.location\.href = offlineCorporate\s*\?/);
  assert.match(sharedQuiz, /\/outdoor-mri\/completed\?attemptId=/);
  assert.match(sharedQuiz, /\/\$\{slug\}\/results\?attemptId=/);
});

test("offline results are server-gated before the unchanged client renders", () => {
  assert.match(resultsGate, /await isOfflineActivatedOutdoorMriAttempt\(attemptId\)/);
  assert.match(resultsGate, /redirect\(/);
  assert.match(resultsGate, /return <ResultsClient \/>/);
  assert.match(resultsClient, /^"use client";/);
});

test("offline reports require a same-company manager token", () => {
  assert.match(report, /offlineContext\?\.isOfflineActivated/);
  assert.match(report, /isAuthorizedOfflineManager\(/);
  assert.match(helper, /\.eq\("id", context\.companyId\)/);
  assert.match(helper, /\.eq\("manager_token", token\)/);
  assert.match(helper, /return company\?\.id === context\.companyId/);
});

test("manager report links carry tokens only for offline companies", () => {
  assert.match(dashboard, /company\.is_offline_activated\s*\?/);
  assert.match(dashboard, /managerToken=\$\{encodeURIComponent\(managerToken\)\}/);
  assert.match(
    dashboard,
    /: `https:\/\/app\.careerlabsai\.com\/outdoor-mri\/report\?attemptId=\$\{attempt\.id\}`/,
  );
});

test("individual and online corporate attempts retain the existing result/report branches", () => {
  assert.match(sharedQuiz, /\/\$\{slug\}\/results\?attemptId=/);
  assert.match(login, /: `\/\$\{slug\}\/results\?attemptId=/);
  assert.match(report, /if \(offlineContext\?\.isOfflineActivated\)/);
});

test("credit and duplicate-credit protection remain in the existing start RPC flow", () => {
  assert.match(startAssessment, /start_assessment_with_credit/);
  assert.match(startAssessment, /alreadySubmitted/);
  assert.doesNotMatch(helper, /credits|deduct|start_or_resume_company_assessment/);
});

test("explicitly excluded legacy report surfaces are untouched", () => {
  const excluded = [
    "app/(site)/premium-report",
    "app/(site)/premium-pdf",
    "app/reports/pdf/mri",
    "app/reports/pdf/scan",
    "app/print-report",
    "app/api/report-data",
    "app/(site)/dashboard",
  ];

  execFileSync("git", ["diff", "--quiet", "--", ...excluded], {
    stdio: "pipe",
  });
});
