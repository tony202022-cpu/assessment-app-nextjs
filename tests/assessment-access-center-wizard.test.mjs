import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const validationPath = path.join(root, "src/modules/assessment-access-center/assessment-access-wizard.ts");
const page = readFileSync(path.join(root, "app/admin/access-center/page.tsx"), "utf8");
const layout = readFileSync(path.join(root, "app/admin/access-center/layout.tsx"), "utf8");
const component = readFileSync(path.join(root, "src/components/admin/assessment-access-center.tsx"), "utf8");
const shell = readFileSync(path.join(root, "src/components/admin/admin-shell.tsx"), "utf8");
const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8");

function loadValidation() {
  const source = readFileSync(validationPath, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const localRequire = (request) => request === "@/modules/assessment-issuance-policy/assessment-issuance-policy"
    ? {
        ASSESSMENT_ACCESS_TYPES: ["company", "individual"],
        ASSESSMENT_FUNDING_TYPES: ["paid", "complimentary"],
        ASSESSMENT_REPORT_VISIBILITIES: ["participant-only", "manager-only", "participant-and-manager", "admin-only"],
      }
    : (() => { throw new Error(`Unexpected dependency: ${request}`); })();
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const { validateAssessmentAccessWizardStep } = loadValidation();
const assessments = [
  { id: "company_assessment", version: "1.0.0", name: "Company", slug: "company", languages: ["en"], individualAvailable: false, companyAvailable: true, companyIssuanceAvailable: true, complimentaryAvailable: false },
  { id: "individual_assessment", version: "1.0.0", name: "Individual", slug: "individual", languages: ["en", "ar"], individualAvailable: true, companyAvailable: false, companyIssuanceAvailable: false, complimentaryAvailable: true },
];

const base = { assessmentId: "company_assessment", accessType: "company", existingCompanyId: "", companyName: "Acme", managerName: "A Manager", managerEmail: "manager@example.com", credits: "2", participantName: "", participantEmail: "", fundingType: "paid", commercialReference: "PO-42", reportVisibility: "manager-only", issuanceType: "offline-paid", languageMode: "participant-choice", expiresAt: "" };

test("page loads its catalog only from current Assessment Definitions", () => {
  assert.match(page, /assessmentRegistry\.listCurrent\(\)/);
  assert.doesNotMatch(page, /outdoor|sales-manager|lawyer|sme-business/i);
  assert.doesNotMatch(page, /const assessments[^;]+\[(?:.|\n)*outdoor|sales-manager|lawyer|sme-business/i);
});

test("wizard supports all five approved steps and both dynamic branches", () => {
  for (const label of ["Assessment", "Recipient Type", "Configure", "Report Visibility", "Confirmation"]) assert.match(component, new RegExp(label));
  assert.match(component, /state\.accessType==="company"/);
  assert.match(component, /assessment-access\/individual\/issue/);
  assert.match(component, /Company \/ Team/);
  assert.match(component, /Complimentary/);
});

test("company validation requires manager, email, credits, and commercial reference", () => {
  assert.deepEqual(validateAssessmentAccessWizardStep(4, base, assessments), {});
  const errors = validateAssessmentAccessWizardStep(4, { ...base, managerName: "", managerEmail: "bad", credits: "0", commercialReference: "" }, assessments);
  assert.ok(errors.managerName && errors.managerEmail && errors.credits && errors.commercialReference);
});

test("existing-company validation accepts zero and positive top-ups but rejects negative credits", () => {
  const existing = { ...base, existingCompanyId: "11111111-1111-4111-8111-111111111111" };
  assert.deepEqual(validateAssessmentAccessWizardStep(4, { ...existing, credits: "0" }, assessments), {});
  assert.deepEqual(validateAssessmentAccessWizardStep(4, { ...existing, credits: "5" }, assessments), {});
  assert.ok(validateAssessmentAccessWizardStep(4, { ...existing, credits: "-1" }, assessments).credits);
  assert.match(component, /existingCompanyId:state\.existingCompanyId\|\|null/);
  assert.match(component, /Current package/);
  assert.match(component, /Available credits/);
});

test("existing-company selector is layered, opaque, scrollable, and preserves UUID selection details", () => {
  const selectPrimitive = readFileSync(path.join(root, "src/components/ui/select.tsx"), "utf8");
  assert.match(component, /value=\{state\.existingCompanyId\|\|"new"\}/);
  assert.match(component, /value=\{c\.id\}/);
  assert.match(component, /z-\[100\]/);
  assert.match(component, /bg-white/);
  assert.match(component, /max-h-72/);
  assert.match(component, /overflow-y-auto/);
  assert.match(component, /textValue=/);
  assert.match(component, /manager_name/);
  assert.match(component, /billing_email/);
  assert.match(component, /credits_balance/);
  assert.match(component, /package_size/);
  assert.match(selectPrimitive, /viewportClassName/);
});

test("new-company validation requires at least one credit", () => {
  assert.ok(validateAssessmentAccessWizardStep(4, { ...base, existingCompanyId: "", credits: "0" }, assessments).credits);
  assert.deepEqual(validateAssessmentAccessWizardStep(4, { ...base, existingCompanyId: "", credits: "1" }, assessments), {});
});

test("individual validation requires participant, funding, and supported capability", () => {
  const valid = { ...base, assessmentId: "individual_assessment", accessType: "individual", participantName: "Participant", participantEmail: "person@example.com", fundingType: "complimentary", issuanceType: "complimentary", reportVisibility: "participant-only" };
  assert.deepEqual(validateAssessmentAccessWizardStep(4, valid, assessments), {});
  const errors = validateAssessmentAccessWizardStep(4, { ...valid, participantName: "", participantEmail: "bad", fundingType: "" }, assessments);
  assert.ok(errors.participantName && errors.participantEmail && errors.fundingType);
});

test("assessment and access switching reject unsupported combinations", () => {
  assert.ok(validateAssessmentAccessWizardStep(2, { ...base, assessmentId: "missing" }, assessments).assessmentId);
  assert.ok(validateAssessmentAccessWizardStep(2, { ...base, assessmentId: "individual_assessment", accessType: "company" }, assessments).accessType);
  assert.ok(validateAssessmentAccessWizardStep(2, { ...base, assessmentId: "company_assessment", accessType: "individual" }, assessments).accessType);
});

test("wizard is responsive, keyboard accessible, and protected by existing admin auth", () => {
  assert.match(component, /sm:grid-cols|md:grid-cols|overflow-x-auto/);
  assert.match(component, /RadioGroup|Label|aria-invalid|role="alert"/);
  assert.match(layout, /isValidAdminSession/);
  assert.match(layout, /AdminShell/);
  assert.match(shell, /\/admin\/access-center/);
  assert.match(middleware, /\/admin\/access-center\/\:path\*/);
});
