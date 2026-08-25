import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const sourceRoot = path.resolve(new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const cache = new Map();

function loadTypeScript(request, parent = sourceRoot) {
  const base = request.startsWith("@/") ? path.resolve(sourceRoot, request.slice(2)) : path.resolve(parent, request);
  const resolved = base.endsWith(".ts") ? base : existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, "index.ts");
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const output = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  cache.set(resolved, module);
  const localRequire = (child) => {
    if (child.startsWith("@/")) return loadTypeScript(child, sourceRoot);
    if (child.startsWith(".")) return loadTypeScript(child, path.dirname(resolved));
    throw new Error(`Unexpected runtime dependency: ${child}`);
  };
  new Function("require", "module", "exports", "process", output)(localRequire, module, module.exports, process);
  return module.exports;
}

const sme = loadTypeScript("modules/assessment-definition/sme/index");
const { AssessmentLoader } = loadTypeScript("modules/assessment-definition/assessment-loader");
const { assessmentRegistry } = loadTypeScript("modules/assessment-definition/assessment-registry");

const legacyIds = [
  "strategic_direction_clarity", "revenue_engine_predictability", "marketing_positioning_lead_quality",
  "customer_experience_retention", "cash_flow_margins_control", "operations_systems_process",
  "people_roles_accountability", "leadership_decision_rhythm", "products_services_value_prop",
  "technology_data_visibility", "risk_compliance_continuity", "growth_readiness_scalability",
];

function reportInput(locale = "en") {
  return {
    reportId: "parity-report", attemptId: "parity-attempt", assessmentVersion: "1.0.0",
    scoringVersion: "1.0.0", completedAt: "2026-08-25T00:00:00.000Z",
    generatedAt: "2026-08-25T00:00:00.000Z", locale, totalPercentage: 58,
    competencyResults: legacyIds.map((competencyId, index) => ({ competencyId, percentage: 20 + index * 5 })),
    executiveSummary: locale === "ar" ? "ملخص تنفيذي" : "Executive summary",
  };
}

test("SME is the only registered production definition and passes canonical validation", () => {
  const definitions = assessmentRegistry.list();
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].metadata.id, "sme_business_health_mri");
  assert.equal(new AssessmentLoader().validate(sme.smeBusinessHealthAssessmentDefinition).length, 0);
  assert.equal(definitions[0].questionSource.questionCount, 96);
  assert.equal(definitions[0].competencyModel.competencies.length, 12);
});

test("question and scoring adapters delegate to the existing providers without copying logic", async () => {
  const questions = [{ id: "q1", competency_id: legacyIds[0], question_en: "Q", question_ar: "س", options_en: ["A"], options_ar: ["أ"], options_scores: [5] }];
  let questionAssessmentId = "";
  const questionProvider = new sme.SmeLegacyQuestionProvider(async (assessmentId) => { questionAssessmentId = assessmentId; return questions; });
  assert.equal(await questionProvider.load(sme.smeBusinessHealthAssessmentDefinition), questions);
  assert.equal(questionAssessmentId, "sme_business_health_mri");

  const expected = { totalPercentage: 100, competencies: [{ competencyId: legacyIds[0], percentage: 100 }] };
  let scoringCalls = 0;
  const scoringProvider = new sme.SmeLegacyScoringProvider((answers) => { scoringCalls += 1; assert.deepEqual(answers, [0]); return expected; });
  assert.deepEqual(await scoringProvider.score(sme.smeBusinessHealthAssessmentDefinition, [0]), expected);
  assert.equal(scoringCalls, 1);
});

test("Universal Report Engine renders the canonical SME sections in English and Arabic", () => {
  for (const locale of ["en", "ar"]) {
    const rendered = sme.renderSmeWithUniversalReportEngine(reportInput(locale));
    assert.deepEqual(sme.reportSectionsFromUniversalReport(rendered), sme.expectedLegacySmeReportSections());
    assert.equal(rendered.direction, locale === "ar" ? "rtl" : "ltr");
    assert.equal(rendered.sections.length, 8);
  }
});

test("parity harness covers every required comparison and reports drift", () => {
  const questions = [{ id: "q1", competency_id: legacyIds[0], question_en: "Q", question_ar: "س", options_en: ["A"], options_ar: ["أ"], options_scores: [5] }];
  const canonical = sme.buildSmeCanonicalReportFacts(reportInput());
  const snapshot = {
    questions,
    competencies: canonical.competencies.map((row) => row.competencyId),
    scores: { totalPercentage: canonical.overallPercentage, competencies: canonical.competencies },
    percentages: canonical.competencies.map((row) => row.percentage),
    recommendations: canonical.recommendations.map((row) => row.rationale),
    weakestCompetencies: canonical.weakestCompetencies.map((row) => row.competencyId),
    reportSections: sme.expectedLegacySmeReportSections(),
    localization: { en: ["Advanced SME Business Health MRI"], ar: ["Business Health MRI للشركات الصغيرة والمتوسطة"] },
  };
  assert.deepEqual(sme.compareSmeParity(snapshot, structuredClone(snapshot)), { equivalent: true, differences: [] });
  const changed = structuredClone(snapshot);
  changed.percentages[0] += 1;
  const result = sme.compareSmeParity(snapshot, changed);
  assert.equal(result.equivalent, false);
  assert.deepEqual(result.differences.map((entry) => entry.field), ["percentages"]);
});

test("feature flag remains legacy by default and cannot switch without clean parity", () => {
  assert.equal(sme.selectSmeAssessmentPipeline(null, true), "legacy");
  assert.equal(sme.selectSmeAssessmentPipeline({ equivalent: false, differences: [{ field: "scores", message: "changed" }] }, true), "legacy");
  assert.equal(sme.selectSmeAssessmentPipeline({ equivalent: true, differences: [] }, false), "legacy");
  assert.equal(sme.selectSmeAssessmentPipeline({ equivalent: true, differences: [] }, true), "universal");
});
