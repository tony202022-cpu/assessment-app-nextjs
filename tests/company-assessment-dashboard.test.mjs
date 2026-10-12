import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const servicePath = path.join(root, "src/modules/company-assessment-dashboard/company-assessment-dashboard-service.ts");
const pagePath = path.join(root, "app/company/assessment-dashboard/page.tsx");
const source = readFileSync(servicePath, "utf8");
const page = readFileSync(pagePath, "utf8");

const definition = {
  metadata: { id: "outdoor_sales_scan", slug: "outdoor-sales-scan", name: "Outdoor Sales Scan" },
  capabilities: { corporateAvailability: true, managerReport: true },
  report: { supportedAudiences: ["participant", "manager"] },
  scoringStrategy: { mode: "deterministic" },
  questionSource: { questionCount: 20 },
  pricing: { model: "free" },
};
const managerScanDefinition = {
  ...definition,
  metadata: { id: "sales_manager_scan", slug: "sales-manager-scan", name: "Sales Manager Leadership Scan" },
};

function loadService() {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "@/lib/offline-company") return { getSupabaseAdmin: () => null };
    if (specifier === "@/modules/assessment-definition") return { assessmentRegistry: { findCurrentBySlug: (slug) => slug === "outdoor-sales-scan" ? definition : slug === "sales-manager-scan" ? managerScanDefinition : undefined } };
    if (specifier === "@/modules/report-authorization") return { ReportAuthorizationService: class {} };
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function("require", "exports", "module", output)(localRequire, module.exports, module);
  return module.exports.loadCompanyAssessmentDashboard;
}

const loadDashboard = loadService();
const completedAttempt = { id: "attempt-1", full_name: "Person One", user_email: "person@example.com", created_at: "2026-09-01T00:00:00.000Z", completed_at: "2026-09-02T00:00:00.000Z", total_percentage: 82 };

function harness(overrides = {}) {
  const calls = { access: [], attempts: [], reports: [] };
  const state = { company: { id: "company-1", name: "Acme", package_size: 10, credits_balance: 4 }, active: true, attempts: [completedAttempt], reportAllowed: true, ...overrides };
  return {
    calls,
    dependencies: {
      findCompanyByManagerToken: async (token) => token === "valid-manager" ? state.company : null,
      hasActiveAssessmentAccess: async (companyId, assessmentId) => { calls.access.push([companyId, assessmentId]); return state.active; },
      findAttempts: async (companyId, assessmentId) => { calls.attempts.push([companyId, assessmentId]); return state.attempts; },
      findTrackingAllocation: async () => 10,
      authorizeManagerReport: async (attemptId, slug, token) => { calls.reports.push([attemptId, slug, token]); return state.reportAllowed; },
    },
  };
}

test("Scan manager dashboard filters by company and assessment and exposes authorized reports", async () => {
  const { calls, dependencies } = harness();
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "outdoor-sales-scan" }, dependencies);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.credits, { allocated: 10, used: 1, remaining: 9 });
  assert.equal(result.data.capacityKind, "tracking");
  assert.equal(result.data.participants[0].status, "completed");
  assert.match(result.data.participants[0].reportPath, /managerToken=valid-manager/);
  assert.deepEqual(calls.attempts, [["company-1", "outdoor_sales_scan"]]);
});

test("invalid manager, inactive access, and restricted reports fail closed", async () => {
  const invalid = harness();
  assert.deepEqual(await loadDashboard({ managerToken: "invalid", assessmentSlug: "outdoor-sales-scan" }, invalid.dependencies), { ok: false, reason: "invalid-manager" });
  const inactive = harness({ active: false });
  assert.deepEqual(await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "outdoor-sales-scan" }, inactive.dependencies), { ok: false, reason: "access-expired-or-revoked" });
  const restricted = harness({ reportAllowed: false });
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "outdoor-sales-scan" }, restricted.dependencies);
  assert.equal(result.ok, true);
  assert.equal(result.data.participants[0].reportPath, null);
});

test("Sales Manager Scan uses the same tracking dashboard and assessment scope", async () => {
  const { calls, dependencies } = harness();
  const result = await loadDashboard({ managerToken: "valid-manager", assessmentSlug: "sales-manager-scan" }, dependencies);
  assert.equal(result.ok, true);
  assert.equal(result.data.assessment.id, "sales_manager_scan");
  assert.equal(result.data.capacityKind, "tracking");
  assert.deepEqual(calls.attempts, [["company-1", "sales_manager_scan"]]);
});

test("generic dashboard is server-rendered and delegates report authorization", () => {
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(page, /"use client"|issuance_policy_id|report_visibility/);
  assert.match(source, /ReportAuthorizationService/);
  assert.match(source, /authorizeAttemptAccess/);
});
