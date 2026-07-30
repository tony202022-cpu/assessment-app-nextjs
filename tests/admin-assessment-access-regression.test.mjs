import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

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
  assert.match(launch, /\/auth\/callback/);
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
  assert.match(actions, /isTokenBackedPaidAttempt\(existing\)/);
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
