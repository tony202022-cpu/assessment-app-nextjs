import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

test("SME Business Health MRI requires governed token access on every assessment entry route", () => {
  const definition = read("src/modules/assessment-definition/sme/sme-assessment-definition.ts");
  assert.match(definition, /authenticationRequired: true/);
  assert.match(definition, /tokenPolicy: \{\s*required: true/);
  assert.doesNotMatch(definition, /channels: \[[^\]]*"public"/);

  for (const route of [
    "app/(site)/[slug]/login/page.tsx",
    "app/(site)/[slug]/instructions/page.tsx",
    "app/(site)/[slug]/quiz/page.tsx",
  ]) {
    const source = read(route);
    assert.doesNotMatch(source, /isSmeBusinessHealthMri/);
    assert.match(source, /isPaidMriSlug\(slug\)/);
  }
});

test("governed start validates free-Scan token state, links the attempt, and preserves the generic paid RPC", () => {
  const route = read("app/api/start-assessment/route.ts");
  assert.match(route, /entitlement_type, issuance_policy_id, revoked_at, expires_at/);
  assert.match(route, /access\.assessment_type !== assessmentId/);
  assert.match(route, /if \(access\.revoked_at\)/);
  assert.match(route, /if \(access\.expires_at/);
  assert.match(route, /access_token_id: access\.id/);
  assert.match(route, /issuance_policy_id: access\.issuance_policy_id/);
  assert.match(route, /\.rpc\("start_assessment_with_credit"/);
});

test("SME production capability alignment is guarded and does not touch credits", () => {
  const migration = read("supabase/migrations/20260925100000_align_sme_governed_access.sql");
  assert.match(migration, /where id = 'sme_business_health_mri'/);
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /allows_individual_access is distinct from true/);
  assert.doesNotMatch(migration, /credits|package_size|credit_transactions/i);
});

test("free Scans hide paid-versus-complimentary choices while generic assessments honor explicit capabilities", () => {
  const center = read("src/components/admin/assessment-access-center.tsx");
  assert.match(center, /freeCompanyScan[\s\S]*\["company", "individual"\]/);
  assert.match(center, /type === "complimentary" \? selectedAssessment\?\.individualAvailable && selectedAssessment\.complimentaryAvailable/);
  assert.match(center, /!freeCompanyScan && <IssuanceTypeField/);
});
