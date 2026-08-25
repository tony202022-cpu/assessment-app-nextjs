import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const moduleRoot = path.resolve(new URL("../src/modules/assessment-definition/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const cache = new Map();

function loadTypeScript(file) {
  const resolved = path.resolve(moduleRoot, file.endsWith(".ts") ? file : `${file}.ts`);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const source = readFileSync(resolved, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  cache.set(resolved, module);
  const localRequire = (request) => {
    if (!request.startsWith(".")) throw new Error(`Unexpected runtime dependency: ${request}`);
    return loadTypeScript(path.relative(moduleRoot, path.resolve(path.dirname(resolved), request)).replaceAll("\\", "/"));
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const { AssessmentLoader, AssessmentDefinitionValidationError } = loadTypeScript("assessment-loader");
const { AssessmentRegistry, assessmentRegistry } = loadTypeScript("assessment-registry");

function definition(overrides = {}) {
  const base = {
    metadata: { id: "test_capability_assessment", version: "1.0.0", name: "Test Capability Assessment", slug: "test-capability-assessment", status: "draft", type: "diagnostic", owner: "architecture-tests", theme: { id: "test-theme", version: "1.0.0" }, icons: { primary: "test-icon" } },
    capabilities: { individualAvailability: true, corporateAvailability: false, managerDashboard: false, participantReport: true, managerReport: false, executiveReport: false, timed: true, bilingual: true, complimentaryAccess: false, developerTesting: false },
    audience: { primary: "professional", supported: ["professional"] },
    accessPolicy: { channels: ["authenticated"], authenticationRequired: true, individualEnabled: true, corporateEnabled: false, managerAccessEnabled: false, entitlementPolicies: [] },
    localization: { defaultLocale: "en", supportedLocales: ["en", "ar"], requiredResourceKeys: ["start"], locales: { en: { locale: "en", direction: "ltr", displayName: "Test", resources: { start: "Start" } }, ar: { locale: "ar", direction: "rtl", displayName: "اختبار", resources: { start: "ابدأ" } } } },
    competencyModel: { id: "test-competencies", version: "1.0.0", competencies: [{ id: "communication", order: 1, label: { en: "Communication", ar: "التواصل" }, reportKey: "communication" }] },
    questionSource: { providerId: "test-questions", version: "1.0.0", kind: "versioned-content", questionCount: 10, timeLimitMinutes: 20, randomization: "questions-and-options" },
    scoringStrategy: { providerId: "test-scoring", strategyId: "deterministic-test", version: "1.0.0", mode: "deterministic" },
    report: { providerId: "test-report", version: "1.0.0", definitionId: "test-report-definition", supportedAudiences: ["participant"] },
    pricing: { model: "free" },
    features: { ninetyDayPlan: false, dailySchedule: false, strengthsAndWeaknesses: true, recommendations: true, charts: true, managerSections: false, executiveSections: false, pdfExport: false, docxExport: false, emailDelivery: false, aiModules: [] },
  };
  return { ...base, ...overrides };
}

test("production assessment registry contains only the characterized SME definition", () => {
  assert.deepEqual(assessmentRegistry.list().map((entry) => entry.metadata.id), ["sme_business_health_mri"]);
});

test("loader accepts and freezes a complete canonical definition", () => {
  const loaded = new AssessmentLoader().load(definition());
  assert.equal(loaded.metadata.slug, "test-capability-assessment");
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.metadata), true);
});

test("loader rejects invalid versions and incomplete localization", () => {
  const invalid = definition();
  invalid.metadata.version = "v1";
  delete invalid.localization.locales.ar.resources.start;
  assert.throws(() => new AssessmentLoader().load(invalid), (error) => {
    assert.ok(error instanceof AssessmentDefinitionValidationError);
    assert.ok(error.issues.some((entry) => entry.code === "VERSION_INVALID"));
    assert.ok(error.issues.some((entry) => entry.code === "LOCALIZATION_INCOMPLETE"));
    return true;
  });
});

test("loader rejects incompatible manager features", () => {
  const invalid = definition({ features: { ...definition().features, managerSections: true } });
  assert.throws(() => new AssessmentLoader().load(invalid), (error) => error.issues.some((entry) => entry.code === "FEATURE_INCOMPATIBLE"));
});

test("registry rejects duplicate IDs and slugs while supporting versions", () => {
  const registry = new AssessmentRegistry([definition()]);
  assert.throws(() => registry.register(definition()), /Duplicate assessment ID and version/);
  const secondId = definition({ metadata: { ...definition().metadata, id: "another_assessment" } });
  assert.throws(() => registry.register(secondId), /Duplicate assessment slug/);
  const versionTwo = definition({ metadata: { ...definition().metadata, version: "2.0.0" }, competencyModel: { ...definition().competencyModel, version: "2.0.0" }, questionSource: { ...definition().questionSource, version: "2.0.0" }, scoringStrategy: { ...definition().scoringStrategy, version: "2.0.0" }, report: { ...definition().report, version: "2.0.0" } });
  registry.register(versionTwo);
  assert.equal(registry.require("test_capability_assessment", "2.0.0").metadata.version, "2.0.0");
});

test("module registers no production assessment other than SME and contains no data access or scoring", () => {
  const source = readdirSync(moduleRoot).filter((name) => name.endsWith(".ts")).map((name) => readFileSync(path.join(moduleRoot, name), "utf8")).join("\n");
  assert.doesNotMatch(source, /outdoor_sales|outdoor-mri|sales_manager|lawyer_client/i);
  assert.doesNotMatch(source, /@supabase|\.from\(["']|\.rpc\(["']|fetch\(/);
  assert.doesNotMatch(source, /calculateScore|total_percentage\s*[+*/-]/i);
});
