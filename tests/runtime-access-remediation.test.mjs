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

test("governed issuance validates token state and links the attempt to its token", () => {
  const migration = read("supabase/migrations/20260923130000_unified_assessment_issuance.sql");
  assert.match(migration, /from public\.access_tokens at[\s\S]*for update/);
  assert.match(migration, /v_token\.revoked_at is not null/);
  assert.match(migration, /v_token\.expires_at is not null/);
  assert.match(migration, /v_token\.assessment_type<>v_assessment\.id/);
  assert.match(migration, /coalesce\(v_token\.remaining_uses,0\)<>1/);
  assert.match(migration, /access_token_id/);
  assert.match(migration, /issuance_policy_id/);
});

test("SME production capability alignment is guarded and does not touch credits", () => {
  const migration = read("supabase/migrations/20260925100000_align_sme_governed_access.sql");
  assert.match(migration, /where id = 'sme_business_health_mri'/);
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /allows_individual_access is distinct from true/);
  assert.doesNotMatch(migration, /credits|package_size|credit_transactions/i);
});

test("Complimentary availability is independent from Individual Paid availability", () => {
  const center = read("src/components/admin/assessment-access-center.tsx");
  assert.match(center, /kind==="individual"\?assessment\?\.individualAvailable:assessment\?\.complimentaryAvailable/);
  assert.doesNotMatch(center, /individualAvailable\s*&&\s*assessment\?\.complimentaryAvailable/);
});
