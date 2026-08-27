import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const sourcePath = path.resolve(new URL("../src/modules/report-authorization/report-authorization-service.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

function loadService() {
  const source = readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "@/lib/offline-company") {
      return { getSupabaseAdmin: () => null, isValidAdminSession: () => false, OFFLINE_ADMIN_COOKIE: "offline_company_admin" };
    }
    if (specifier === "@/lib/admin-assessment-access") {
      return { DEVELOPER_TEST_ACCESS_COOKIE: "developer_test_attempt_access", readDeveloperTestAccess: () => null };
    }
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function("require", "exports", "module", output)(localRequire, module.exports, module);
  return module.exports.ReportAuthorizationService;
}

const ReportAuthorizationService = loadService();
const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ATTEMPT_ID = "22222222-2222-4222-8222-222222222222";

function attempt(overrides = {}) {
  return {
    id: ATTEMPT_ID,
    userId: "participant-1",
    assessmentId: "assessment-1",
    companyId: "company-1",
    accessTokenId: "token-1",
    isDeveloperTest: false,
    completedAt: "2026-08-27T00:00:00.000Z",
    isOfflineCompany: false,
    ...overrides,
  };
}

function harness(overrides = {}) {
  const state = { attempt: attempt(), assessmentId: "assessment-1", manager: null, participant: { status: "unavailable" }, adminValid: false, capabilities: [], adminId: "admin-1", developer: { status: "invalid" } };
  Object.assign(state, overrides);
  const dependencies = {
    findAttempt: async () => state.attempt,
    findAssessmentIdBySlug: async () => state.assessmentId,
    findManagerByToken: async () => state.manager,
    verifyParticipantProof: async () => state.participant,
    verifyAdministratorSession: () => state.adminValid,
    administratorCapabilities: () => state.capabilities,
    administratorId: () => state.adminId,
    verifyDeveloperProof: () => state.developer,
  };
  return new ReportAuthorizationService(dependencies);
}

const request = (overrides = {}) => ({ attemptId: ATTEMPT_ID, purpose: "view", ...overrides });

test("authorizes the participant who owns the attempt for every access purpose", async () => {
  const service = harness({ participant: { status: "valid", userId: "participant-1" } });
  for (const purpose of ["view", "print", "pdf", "data", "email", "preview"]) {
    const result = await service.authorizeAttemptAccess(request({ purpose, headers: { authorization: "Bearer valid" } }));
    assert.equal(result.decision, "AUTHORIZED");
    assert.equal(result.actor.type, "participant");
  }
});

test("denies a participant who does not own the attempt", async () => {
  const result = await harness({ participant: { status: "valid", userId: "participant-2" } }).authorizeAttemptAccess(request({ headers: { authorization: "Bearer valid" } }));
  assert.equal(result.decision, "DENIED");
});

test("returns typed participant compatibility and invalid-proof decisions", async () => {
  assert.equal((await harness().authorizeAttemptAccess(request())).decision, "PARTICIPANT_PROOF_UNAVAILABLE");
  assert.equal((await harness({ participant: { status: "invalid" } }).authorizeAttemptAccess(request({ headers: { authorization: "invalid" } }))).decision, "INVALID_PROOF");
});

test("authorizes a company manager only for the matching company", async () => {
  const service = harness({ manager: { companyId: "company-1", offline: false } });
  const result = await service.authorizeAttemptAccess(request({ managerToken: "manager-token" }));
  assert.equal(result.decision, "AUTHORIZED");
  assert.equal(result.actor.type, "company-manager");

  const mismatch = await harness({ manager: { companyId: "company-2", offline: false } }).authorizeAttemptAccess(request({ managerToken: "manager-token" }));
  assert.equal(mismatch.decision, "DENIED");
});

test("rejects missing and invalid manager proofs", async () => {
  assert.equal((await harness().authorizeAttemptAccess(request({ actorHint: "company-manager" }))).decision, "INVALID_PROOF");
  assert.equal((await harness({ manager: null }).authorizeAttemptAccess(request({ managerToken: "unknown" }))).decision, "INVALID_PROOF");
});

test("recognizes an offline company manager and rejects the wrong actor hint", async () => {
  const service = harness({ attempt: attempt({ isOfflineCompany: true }), manager: { companyId: "company-1", offline: true } });
  const allowed = await service.authorizeAttemptAccess(request({ actorHint: "offline-company", managerToken: "offline-token" }));
  assert.equal(allowed.decision, "AUTHORIZED");
  assert.equal(allowed.actor.type, "offline-company");
  assert.equal((await service.authorizeAttemptAccess(request({ actorHint: "company-manager", managerToken: "offline-token" }))).decision, "INVALID_ACTOR");
});

test("an offline attempt never falls through to participant compatibility", async () => {
  const service = harness({ attempt: attempt({ isOfflineCompany: true }) });
  const result = await service.authorizeAttemptAccess(request());
  assert.equal(result.decision, "INVALID_PROOF");
  assert.equal(result.actorType, "offline-company");
});

test("requires the existing administrator session and reports.read capability", async () => {
  const cookies = { offline_company_admin: "admin-cookie" };
  assert.equal((await harness({ adminValid: false }).authorizeAttemptAccess(request({ cookies }))).decision, "INVALID_PROOF");
  assert.equal((await harness({ adminValid: true, capabilities: [] }).authorizeAttemptAccess(request({ cookies }))).decision, "MISSING_CAPABILITY");
  const allowed = await harness({ adminValid: true, capabilities: ["reports.read"] }).authorizeAttemptAccess(request({ cookies }));
  assert.equal(allowed.decision, "AUTHORIZED");
  assert.equal(allowed.actor.type, "administrator");
});

test("rejects an administrator without an actor identity", async () => {
  const result = await harness({ adminValid: true, capabilities: ["reports.read"], adminId: "" }).authorizeAttemptAccess(request({ actorHint: "administrator", cookies: { offline_company_admin: "admin-cookie" } }));
  assert.equal(result.decision, "INVALID_ACTOR");
});

test("authorizes only a matching developer-test proof", async () => {
  const devAttempt = attempt({ isDeveloperTest: true });
  const validProof = { status: "valid", attemptId: ATTEMPT_ID, userId: "participant-1", assessmentId: "assessment-1" };
  const allowed = await harness({ attempt: devAttempt, developer: validProof }).authorizeAttemptAccess(request({ cookies: { developer_test_attempt_access: "signed" } }));
  assert.equal(allowed.decision, "AUTHORIZED");
  assert.equal(allowed.actor.type, "developer-test");

  const mismatch = await harness({ attempt: devAttempt, developer: { ...validProof, attemptId: OTHER_ATTEMPT_ID } }).authorizeAttemptAccess(request({ cookies: { developer_test_attempt_access: "signed" } }));
  assert.equal(mismatch.decision, "DENIED");
});

test("reports invalid and expired developer-test proofs", async () => {
  const devAttempt = attempt({ isDeveloperTest: true });
  assert.equal((await harness({ attempt: devAttempt, developer: { status: "invalid" } }).authorizeAttemptAccess(request())).decision, "INVALID_PROOF");
  assert.equal((await harness({ attempt: devAttempt, developer: { status: "expired" } }).authorizeAttemptAccess(request({ cookies: { developer_test_attempt_access: "expired" } }))).decision, "EXPIRED_PROOF");
});

test("returns NOT_FOUND and WRONG_ASSESSMENT without loading report content", async () => {
  assert.equal((await harness({ attempt: null }).authorizeAttemptAccess(request())).decision, "NOT_FOUND");
  assert.equal((await harness({ assessmentId: "assessment-2" }).authorizeAttemptAccess(request({ expectedAssessmentSlug: "expected-assessment" }))).decision, "WRONG_ASSESSMENT");
});

test("rejects malformed identifiers and unsupported actors", async () => {
  assert.equal((await harness().authorizeAttemptAccess(request({ attemptId: "not-an-id" }))).decision, "INVALID_PROOF");
  assert.equal((await harness().authorizeAttemptAccess(request({ actorHint: "robot" }))).decision, "INVALID_ACTOR");
});

test("future entitlement is a deny-by-default compatibility placeholder", async () => {
  const result = await harness().authorizeAttemptAccess(request({ actorHint: "future-entitlement" }));
  assert.equal(result.decision, "ENTITLEMENT_NOT_SUPPORTED");
  assert.equal(result.actorType, "future-entitlement");
});

test("the production lookup selects identity fields only", () => {
  const source = readFileSync(sourcePath, "utf8");
  assert.match(source, /select\("id, user_id, assessment_id, company_id, access_token_id, is_developer_test, completed_at"\)/);
  assert.doesNotMatch(source, /competency_results|strengths|weaknesses|recommendations|report_content|from\("profiles"\)/);
});
