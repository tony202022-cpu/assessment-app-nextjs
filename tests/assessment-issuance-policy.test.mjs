import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const moduleRoot = path.join(root, "src/modules/assessment-issuance-policy");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260827090000_assessment_issuance_policy.sql"),
  "utf8",
);
const cache = new Map();

function loadTypeScript(file) {
  const resolved = path.resolve(moduleRoot, file.endsWith(".ts") ? file : `${file}.ts`);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const source = readFileSync(resolved, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  cache.set(resolved, module);
  const localRequire = (request) => {
    if (request === "server-only") return {};
    if (request === "@/lib/offline-company") return { getSupabaseAdmin: () => null };
    if (request === "@/modules/assessment-definition") return { assessmentRegistry: {} };
    if (request.startsWith(".")) {
      return loadTypeScript(path.relative(moduleRoot, path.resolve(path.dirname(resolved), request)).replaceAll("\\", "/"));
    }
    throw new Error(`Unexpected dependency in domain test: ${request}`);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const domain = loadTypeScript("assessment-issuance-policy");
const validation = loadTypeScript("assessment-issuance-policy-validation");
const repositoryModule = loadTypeScript("assessment-issuance-policy-repository");
const serviceModule = loadTypeScript("assessment-issuance-policy-service");

function validInput() {
  return {
    assessmentDefinition: { id: "outdoor_sales_mri", version: "1.0.0" },
    accessType: "company",
    fundingType: "paid",
    reportVisibility: "manager-only",
    commercialReference: "PO-2026-0042",
  };
}

test("migration creates one additive policy table and changes no production table", () => {
  assert.match(migration, /create table public\.assessment_issuance_policies/i);
  assert.equal((migration.match(/create table/gi) || []).length, 1);
  assert.doesNotMatch(migration, /alter table public\.(companies|access_tokens|quiz_attempts|assessments|reports|credit_transactions)/i);
  assert.doesNotMatch(migration, /\b(insert into|update|delete from)\b/i);
  assert.doesNotMatch(migration, /create\s+(or\s+replace\s+)?function|create\s+trigger/i);
});

test("schema requires the complete Version 1.0 policy and protects it from browser roles", () => {
  for (const column of [
    "assessment_definition_id",
    "assessment_definition_version",
    "access_type",
    "funding_type",
    "report_visibility",
    "commercial_reference",
    "issued_by",
    "issued_at",
  ]) assert.match(migration, new RegExp(`${column}\\s+[^,]+not null`, "i"));
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all[^;]+from public, anon, authenticated/i);
  assert.match(migration, /revoke all[^;]+from service_role/i);
  assert.match(migration, /grant select, insert[^;]+to service_role/i);
  assert.doesNotMatch(migration, /grant (update|delete)/i);
});

test("domain exposes only approved Version 1.0 values", () => {
  assert.deepEqual(domain.ASSESSMENT_ACCESS_TYPES, ["company", "individual"]);
  assert.deepEqual(domain.ASSESSMENT_FUNDING_TYPES, ["paid", "complimentary"]);
  assert.deepEqual(domain.ASSESSMENT_REPORT_VISIBILITIES, ["participant", "manager-only"]);
});

test("domain validation normalizes a complete policy", () => {
  const result = validation.validateAssessmentIssuancePolicy(
    { ...validInput(), commercialReference: "  PO-2026-0042  " },
    { id: "  production-admin  " },
  );
  assert.equal(result.commercialReference, "PO-2026-0042");
});

test("domain validation rejects missing commercial reference and administrator", () => {
  assert.throws(
    () => validation.validateAssessmentIssuancePolicy({ ...validInput(), commercialReference: " " }, { id: "admin" }),
    (error) => error.code === "COMMERCIAL_REFERENCE_REQUIRED",
  );
  assert.throws(
    () => validation.validateAssessmentIssuancePolicy(validInput(), { id: " " }),
    (error) => error.code === "INVALID_ACTOR",
  );
});

test("domain validation rejects unsupported access, funding, visibility, and definition values", () => {
  const actor = { id: "admin" };
  assert.throws(() => validation.validateAssessmentIssuancePolicy({ ...validInput(), accessType: "partner" }, actor));
  assert.throws(() => validation.validateAssessmentIssuancePolicy({ ...validInput(), fundingType: "trial" }, actor));
  assert.throws(() => validation.validateAssessmentIssuancePolicy({ ...validInput(), reportVisibility: "administrator-only" }, actor));
  assert.throws(() => validation.validateAssessmentIssuancePolicy({ ...validInput(), assessmentDefinition: { id: "Outdoor MRI", version: "v1" } }, actor));
});

test("repository inserts only policy fields and maps the stored database timestamp", async () => {
  let inserted;
  const row = {
    id: "45c2a2c0-b312-4b91-8c98-54378781892d",
    assessment_definition_id: "outdoor_sales_mri",
    assessment_definition_version: "1.0.0",
    access_type: "company",
    funding_type: "paid",
    report_visibility: "manager-only",
    commercial_reference: "PO-2026-0042",
    issued_by: "production-admin",
    issued_at: "2026-08-27T09:00:00.000Z",
  };
  const client = {
    from(table) {
      assert.equal(table, "assessment_issuance_policies");
      return {
        insert(values) {
          inserted = values;
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
      };
    },
  };
  const repository = new repositoryModule.SupabaseAssessmentIssuancePolicyRepository(client);
  const stored = await repository.create(validInput(), { id: "production-admin" });
  assert.deepEqual(inserted, {
    assessment_definition_id: "outdoor_sales_mri",
    assessment_definition_version: "1.0.0",
    access_type: "company",
    funding_type: "paid",
    report_visibility: "manager-only",
    commercial_reference: "PO-2026-0042",
    issued_by: "production-admin",
  });
  assert.equal(stored.issuedAt, row.issued_at);
  assert.equal(stored.assessmentDefinition.version, "1.0.0");
});

test("service accepts only the current published assessment definition", async () => {
  let persisted;
  const repository = {
    async create(input, actor) {
      persisted = { input, actor };
      return { id: "policy", ...input, issuedBy: actor.id, issuedAt: "2026-08-27T09:00:00.000Z" };
    },
    async findById() { return null; },
  };
  const definitions = {
    getCurrent(id) {
      return id === "outdoor_sales_mri"
        ? { metadata: { id, version: "1.0.0", status: "published" } }
        : undefined;
    },
  };
  const service = new serviceModule.AssessmentIssuancePolicyService(repository, definitions);
  await service.create(validInput(), { id: " production-admin " });
  assert.equal(persisted.actor.id, "production-admin");
  await assert.rejects(
    service.create(
      { ...validInput(), assessmentDefinition: { id: "outdoor_sales_mri", version: "2.0.0" } },
      { id: "production-admin" },
    ),
    (error) => error.code === "INVALID_ASSESSMENT_DEFINITION",
  );
});

test("module contains no issuance execution or protected production business logic", () => {
  const source = [
    "assessment-issuance-policy.ts",
    "assessment-issuance-policy-validation.ts",
    "assessment-issuance-policy-repository.ts",
    "assessment-issuance-policy-service.ts",
  ].map((file) => readFileSync(path.join(moduleRoot, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /start_assessment_with_credit|credit_transactions|manager_token|quiz_attempts|report authorization|payment/i);
  assert.doesNotMatch(source, /\.update\(|\.delete\(|\.rpc\(/i);
});
