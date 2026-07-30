import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const nodeRequire = createRequire(import.meta.url);

function loadAdminAccessModule() {
  const source = read("src/lib/admin-assessment-access.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id === "server-only") return {};
    if (id === "@/lib/paid-mri-access") {
      return {
        PAID_MRI_ASSESSMENT_BY_SLUG: {},
        normalizeAccessSlug: (value) => String(value || "").toLowerCase().trim(),
      };
    }
    return nodeRequire(id);
  };
  new Function("require", "module", "exports", compiled)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}

function loadPaidAccessModule() {
  const source = read("src/lib/paid-mri-access.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  return module.exports;
}

const slugs = [
  "outdoor-mri",
  "sales-manager-mri",
  "sme-business-health-mri",
  "lawyer-client-conversion-mri",
];

test("Developer Test Mode covers all four paid MRI allowlist entries", () => {
  const paidAccess = read("src/lib/paid-mri-access.ts");
  const route = read("app/api/admin/assessment-access/route.ts");

  for (const slug of slugs) {
    assert.match(paidAccess, new RegExp(`"${slug}"`));
    assert.match(route, new RegExp(`"${slug}"`));
  }
  assert.match(route, /\.from\("assessments"\)/);
  assert.match(route, /\.eq\("status", "active"\)/);
});

test("generation is automatic, exactly one attempt, and passwordless", () => {
  const helper = read("src/lib/admin-assessment-access.ts");
  const route = read("app/api/admin/assessment-access/route.ts");
  const launch = read("app/api/admin/assessment-access/launch/route.ts");
  const consolePage = read(
    "app/admin/assessment-access/AssessmentAccessConsole.tsx",
  );

  assert.match(helper, /devtest\+/);
  assert.match(helper, /@internal\.test/);
  assert.match(route, /auth\.admin\.createUser/);
  assert.match(route, /create_developer_test_attempt/);
  assert.doesNotMatch(route, /p_attempts|attemptsGranted/);
  assert.match(launch, /auth\.admin\.generateLink/);
  assert.match(launch, /options: \{ redirectTo: redirectUrl \}/);
  assert.match(consolePage, /Generate Fresh Test Attempt/);
  assert.match(consolePage, /Launch Assessment/);
  assert.doesNotMatch(consolePage, /type="email"/);
  assert.equal((consolePage.match(/type="password"/g) || []).length, 1);
});

test("migration marks test attempts without companies, credits, purchases, or offline activation", () => {
  const migration = read(
    "supabase/migrations/20260730_add_admin_test_assessment_access.sql",
  );

  assert.match(migration, /is_developer_test boolean not null default false/);
  assert.match(migration, /developer_test_attempts/);
  assert.match(
    migration,
    /auth_user_id uuid not null references auth\.users\(id\) on delete restrict/,
  );
  assert.match(migration, /used_at timestamptz/);
  assert.match(migration, /company_id,\s*access_token_id,\s*is_developer_test/s);
  assert.match(migration, /null,\s*null,\s*true/s);
  assert.match(migration, /grant execute .*service_role/s);
  assert.doesNotMatch(migration, /insert into public\.companies/i);
  assert.doesNotMatch(migration, /credit_transactions/i);
  assert.doesNotMatch(migration, /is_offline_activated/i);
  assert.doesNotMatch(migration, /stripe|coupon|purchase/i);
});

test("existing paid guards accept only token, company, or explicit developer marker", () => {
  const paidAccess = read("src/lib/paid-mri-access.ts");
  const instructions = read("app/(site)/[slug]/instructions/page.tsx");
  const quiz = read("app/(site)/[slug]/quiz/page.tsx");
  const actions = read("src/lib/actions.ts");

  assert.match(paidAccess, /attempt\?\.is_developer_test === true/);
  assert.match(instructions, /is_developer_test/);
  assert.match(quiz, /is_developer_test/);
  assert.match(actions, /is_developer_test/);
  assert.match(
    actions,
    /isTokenBackedPaidAttempt\(existing, authenticatedDeveloperUserId\)/,
  );
});

test("Developer Test authorization is assessment-matched and user-bound", () => {
  const {
    isAuthorizedPaidMriAttempt,
    isTokenBackedPaidAttempt,
  } = loadPaidAccessModule();
  const developerAttempt = {
    assessment_id: "outdoor_sales_mri",
    is_developer_test: true,
    user_id: "developer-user-a",
    company_id: null,
    access_token_id: null,
  };

  assert.equal(
    isAuthorizedPaidMriAttempt(
      "outdoor-mri",
      developerAttempt,
      "developer-user-a",
    ),
    true,
  );
  assert.equal(
    isAuthorizedPaidMriAttempt(
      "outdoor-mri",
      developerAttempt,
      "developer-user-b",
    ),
    false,
  );
  assert.equal(
    isAuthorizedPaidMriAttempt(
      "sales-manager-mri",
      developerAttempt,
      "developer-user-a",
    ),
    false,
  );
  assert.equal(
    isTokenBackedPaidAttempt({
      assessment_id: "outdoor_sales_mri",
      is_developer_test: false,
      user_id: "unpaid-user",
    }, "unpaid-user"),
    false,
  );
  assert.equal(isTokenBackedPaidAttempt({ access_token_id: "paid-token" }), true);
  assert.equal(isTokenBackedPaidAttempt({ company_id: "company-id" }), true);
});

test("Developer Test authorization survives instructions, Continue, quiz, submit, and report", () => {
  const instructions = read("app/(site)/[slug]/instructions/page.tsx");
  const quizWrapper = read("app/(site)/[slug]/quiz/page.tsx");
  const quiz = read("app/(site)/quiz/page.tsx");
  const actions = read("src/lib/actions.ts");
  const results = read("app/(site)/[slug]/results/ResultsClient.tsx");
  const report = read("app/(site)/[slug]/report/page.tsx");
  const binding = read("app/api/admin/assessment-access/bind/route.ts");

  assert.match(instructions, /supabase\.auth\.getUser\(\)/);
  assert.match(instructions, /\/api\/admin\/assessment-access\/bind/);
  assert.match(instructions, /attemptId=\$\{encodeURIComponent\(attemptId\)\}/);
  assert.match(binding, /supabase\.auth\.getUser\(accessToken\)/);
  assert.match(binding, /isAuthorizedPaidMriAttempt\(slug, attempt, userId\)/);
  assert.match(quizWrapper, /readDeveloperTestAccess/);
  assert.match(quiz, /is_developer_test/);
  assert.match(quiz, /isTokenBackedPaidAttempt\(attempt, authenticatedUserId\)/);
  assert.match(actions, /readDeveloperTestAccess/);
  assert.match(results, /authenticatedUserId/);
  assert.match(report, /readDeveloperTestAccess/);
});

test("history is developer-only and exposes launch/report links by status", () => {
  const route = read("app/api/admin/assessment-access/route.ts");
  const launch = read("app/api/admin/assessment-access/launch/route.ts");
  const consolePage = read(
    "app/admin/assessment-access/AssessmentAccessConsole.tsx",
  );

  assert.match(route, /\.from\("developer_test_attempts"\)/);
  assert.match(route, /quiz_attempts\(completed_at\)/);
  assert.match(route, /reportUrl/);
  assert.match(route, /launchUrl/);
  assert.match(launch, /launch_expires_at/);
  assert.match(launch, /hashDeveloperLaunchToken/);
  assert.match(route, /launchState/);
  assert.match(consolePage, /"Used"/);
  assert.match(consolePage, /"Expired"/);
});

test("launch consumption is atomic and rejects used or expired links", () => {
  const launch = read("app/api/admin/assessment-access/launch/route.ts");

  assert.match(launch, /\.update\(\{ used_at: consumedAt \}\)/);
  assert.match(launch, /\.is\("used_at", null\)/);
  assert.match(launch, /\.gt\("launch_expires_at", consumedAt\)/);
  assert.match(launch, /already been used/);
  assert.match(launch, /\{ status: 410 \}/);
});

test("trusted application base URL is production-safe and host-independent", () => {
  const { getDeveloperTestBaseUrl } = loadAdminAccessModule();
  const route = read("app/api/admin/assessment-access/route.ts");
  const launch = read("app/api/admin/assessment-access/launch/route.ts");

  assert.equal(
    getDeveloperTestBaseUrl(
      { APP_BASE_URL: "https://app.careerlabsai.com" },
      "production",
    ),
    "https://app.careerlabsai.com",
  );
  assert.equal(getDeveloperTestBaseUrl({}, "development"), "http://localhost:32100");
  assert.throws(
    () => getDeveloperTestBaseUrl({}, "production"),
    /APP_BASE_URL is required in production/,
  );
  assert.throws(
    () =>
      getDeveloperTestBaseUrl(
        { APP_BASE_URL: "http://localhost:32100" },
        "production",
      ),
    /must use HTTPS in production/,
  );

  assert.doesNotMatch(route, /request\.nextUrl\.origin/);
  assert.doesNotMatch(launch, /request\.nextUrl\.origin/);
  assert.match(route, /getDeveloperTestBaseUrl/);
  assert.match(launch, /getDeveloperTestBaseUrl/);
  assert.match(launch, /`\$\{appBaseUrl\}\$\{nextPath\}`/);
});

test("admin protections and rate limits remain required", () => {
  const route = read("app/api/admin/assessment-access/route.ts");
  const launch = read("app/api/admin/assessment-access/launch/route.ts");

  for (const source of [route, launch]) {
    assert.match(source, /isValidAdminSession/);
    assert.match(source, /consumeRateLimit/);
    assert.match(source, /getSupabaseAdmin/);
  }
  assert.match(route, /sameOrigin/);
});
