import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const servicePath = path.join(root, "src/modules/company-assessment-dashboard/company-assessment-dashboard-service.ts");
const pagePath = path.join(root, "app/company/assessment-dashboard/page.tsx");
const outdoorPath = path.join(root, "app/company/outdoor-mri-dashboard/page.tsx");
const reportAuthorizationPath = path.join(root, "src/modules/report-authorization/report-authorization-service.ts");
const source = readFileSync(servicePath, "utf8");
const page = readFileSync(pagePath, "utf8");
const outdoor = readFileSync(outdoorPath, "utf8");
const reportAuthorization = readFileSync(reportAuthorizationPath, "utf8");

const definitions = {
  "generic-assessment": {
    metadata: { id: "assessment-1", slug: "generic-assessment", name: "Generic Assessment" },
    capabilities: { corporateAvailability: true, managerReport: true },
    report: { supportedAudiences: ["participant", "manager"] },
    scoringStrategy: { mode: "deterministic" },
    questionSource: { questionCount: 20 },
  },
  "no-report-assessment": {
    metadata: { id: "assessment-2", slug: "no-report-assessment", name: "No Report Assessment" },
    capabilities: { corporateAvailability: true, managerReport: false },
    report: { supportedAudiences: ["participant"] },
    scoringStrategy: { mode: "deterministic" },
    questionSource: { questionCount: 0 },
  },
};

function loadService() {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = specifier => {
    if (specifier === "server-only") return {};
    if (specifier === "@/lib/offline-company") return { getSupabaseAdmin: () => null };
    if (specifier === "@/modules/assessment-definition") return { assessmentRegistry: { findCurrentBySlug: slug => definitions[slug] } };
    if (specifier === "@/modules/report-authorization") return { ReportAuthorizationService: class {} };
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function("require", "exports", "module", output)(localRequire, module.exports, module);
  return module.exports.loadCompanyAssessmentDashboard;
}

const loadDashboard = loadService();
const attempt = (overrides = {}) => ({ id: "11111111-1111-4111-8111-111111111111", full_name: "Person One", user_email: "person@example.com", created_at: "2026-09-01T00:00:00.000Z", completed_at: "2026-09-02T00:00:00.000Z", total_percentage: 82, ...overrides });

function harness(overrides = {}) {
  const calls = { access: [], attempts: [], reports: [] };
  const state = { company: { id: "company-1", name: "Acme", package_size: 10, credits_balance: 4 }, active: true, attempts: [attempt()], reportAllowed: true, ...overrides };
  const dependencies = {
    findCompanyByManagerToken: async token => token === "valid-manager" ? state.company : null,
    hasActiveAssessmentAccess: async (companyId, assessmentId) => { calls.access.push([companyId, assessmentId]); return state.active; },
    findAttempts: async (companyId, assessmentId) => { calls.attempts.push([companyId, assessmentId]); return state.attempts; },
    authorizeManagerReport: async (attemptId, slug, token) => { calls.reports.push([attemptId, slug, token]); return state.reportAllowed; },
  };
  return { calls, dependencies };
}

test("valid manager access resolves company, definition, balances, participants, score and report", async () => {
  const { calls, dependencies } = harness();
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "generic-assessment" }, dependencies);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.credits, { allocated: 10, used: 6, remaining: 4 });
  assert.equal(result.data.participants[0].status, "completed");
  assert.equal(result.data.participants[0].percentage, 82);
  assert.match(result.data.participants[0].reportPath, /managerToken=valid-manager/);
  assert.deepEqual(calls.access[0], ["company-1", "assessment-1"]);
  assert.deepEqual(calls.attempts[0], ["company-1", "assessment-1"]);
});

test("invalid manager token and expired or revoked assessment access fail closed", async () => {
  const invalid = harness();
  assert.deepEqual(await loadDashboard({ managerToken: "invalid", assessmentSlug: "generic-assessment" }, invalid.dependencies), { ok: false, reason: "invalid-manager" });
  const expired = harness({ active: false });
  assert.deepEqual(await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "generic-assessment" }, expired.dependencies), { ok: false, reason: "access-expired-or-revoked" });
});

test("company and assessment filtering prevent cross-company or cross-assessment listings", async () => {
  const { calls, dependencies } = harness();
  await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "generic-assessment" }, dependencies);
  assert.deepEqual(calls.attempts, [["company-1", "assessment-1"]]);
  assert.match(source, /\.eq\("company_id", companyId\)/);
  assert.match(source, /\.eq\("assessment_id", assessmentId\)/);
  assert.match(source, /authorizeAttemptAccess/);
  assert.match(reportAuthorization, /attempt\.companyId !== manager\.companyId/);
});

test("participant-only authorization hides reports while retaining participant status and dates", async () => {
  const { dependencies } = harness({ reportAllowed: false, attempts: [attempt({ completed_at: null, total_percentage: null }), attempt()] });
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "generic-assessment" }, dependencies);
  assert.equal(result.ok, true);
  assert.equal(result.data.participants[0].status, "in-progress");
  assert.equal(result.data.participants[0].reportPath, null);
  assert.equal(result.data.participants[1].reportPath, null);
});

test("definitions without manager report or score features expose neither", async () => {
  const { calls, dependencies } = harness();
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "no-report-assessment" }, dependencies);
  assert.equal(result.ok, true);
  assert.equal(result.data.assessment.managerReportSupported, false);
  assert.equal(result.data.assessment.scoreSupported, false);
  assert.equal(result.data.participants[0].percentage, null);
  assert.equal(result.data.participants[0].reportPath, null);
  assert.equal(calls.reports.length, 0);
});

test("dashboard is server-rendered, no-index and delegates report decisions per attempt", () => {
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /await searchParams/);
  assert.doesNotMatch(page, /"use client"|issuance_policy_id|report_visibility/);
  assert.match(source, /ReportAuthorizationService/);
  assert.match(source, /authorizeAttemptAccess/);
});

test("existing Madi Outdoor MRI dashboard remains intact and separate", () => {
  assert.match(outdoor, /Outdoor Sales MRI Results/);
  assert.match(outdoor, /MRI_REPORT_SECTIONS/);
  assert.match(outdoor, /\.eq\("manager_token", managerToken\)/);
  assert.doesNotMatch(page, /MRI_REPORT_SECTIONS|weakestSix|outdoor_sales_mri/);
});
