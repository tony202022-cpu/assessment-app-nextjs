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
        ASSESSMENT_ACCESS_TYPES: ["company", "individual", "complimentary"],
        ASSESSMENT_FUNDING_TYPES: ["paid", "complimentary"],
        ASSESSMENT_ISSUANCE_TYPES: ["offline-paid", "online-paid", "complimentary", "internal-test"],
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
  { id: "outdoor_sales_scan", version: "1.0.0", name: "Outdoor Sales Scan", slug: "outdoor-scan", languages: ["en", "ar"], individualAvailable: true, companyAvailable: true, companyIssuanceAvailable: true, complimentaryAvailable: true },
  { id: "sales_manager_scan", version: "1.0.0", name: "Sales Manager Scan", slug: "sales-manager-scan", languages: ["en", "ar"], individualAvailable: false, companyAvailable: true, companyIssuanceAvailable: true, complimentaryAvailable: false },
];

const base = { assessmentId: "company_assessment", accessType: "company", existingCompanyId: "", companyName: "Acme", managerName: "A Manager", managerEmail: "manager@example.com", credits: "2", participantAllocation: "", participantName: "", participantEmail: "", fundingType: "paid", issuanceType: "offline-paid", commercialReference: "PO-42", reportVisibility: "manager-only", languageMode: "participant-choice", expiresAt: "" };

test("page loads its catalog only from current Assessment Definitions", () => {
  assert.match(page, /assessmentRegistry\.listCurrent\(\)/);
  assert.doesNotMatch(page, /outdoor|sales-manager|lawyer|sme-business/i);
  assert.doesNotMatch(page, /fetch\(|axios|\.rpc\(/i);
  assert.match(page, /\.from\("companies"\)/);
});

test("wizard supports all five approved steps and both dynamic branches", () => {
  for (const label of ["Assessment", "Access Type", "Configure", "Report Visibility", "Summary"]) assert.match(component, new RegExp(label));
  assert.match(component, /state\.accessType === "company"/);
  assert.match(component, /\["individual", "complimentary"\]\.includes\(state\.accessType\)/);
  assert.match(component, /"company", "individual", "complimentary"/);
  assert.match(component, /assessment-access\/individual\/issue/);
});

test("company validation requires manager, email, credits, and commercial reference", () => {
  assert.deepEqual(validateAssessmentAccessWizardStep(4, base, assessments), {});
  const errors = validateAssessmentAccessWizardStep(4, { ...base, managerName: "", managerEmail: "bad", credits: "0", commercialReference: "" }, assessments);
  assert.ok(errors.managerName && errors.managerEmail && errors.credits && errors.commercialReference);
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

test("both free Scans accept new companies without credits and reject admin-only visibility", () => {
  const companyScan = { ...base, assessmentId: "outdoor_sales_scan", participantAllocation: "25", credits: "", issuanceType: "", reportVisibility: "participant-and-manager" };
  assert.deepEqual(validateAssessmentAccessWizardStep(4, companyScan, assessments), {});
  assert.ok(validateAssessmentAccessWizardStep(4, { ...companyScan, reportVisibility: "admin-only" }, assessments).reportVisibility);
  assert.ok(validateAssessmentAccessWizardStep(4, { ...companyScan, participantAllocation: "0" }, assessments).participantAllocation);

  const managerScan = { ...companyScan, assessmentId: "sales_manager_scan" };
  assert.deepEqual(validateAssessmentAccessWizardStep(4, managerScan, assessments), {});
  assert.ok(validateAssessmentAccessWizardStep(4, { ...managerScan, reportVisibility: "admin-only" }, assessments).reportVisibility);

  const individualScan = { ...companyScan, accessType: "individual", participantName: "Free Participant", participantEmail: "free@example.com", existingCompanyId: "", companyName: "", managerName: "", managerEmail: "", fundingType: "", reportVisibility: "participant-only" };
  assert.deepEqual(validateAssessmentAccessWizardStep(4, individualScan, assessments), {});
});

test("wizard is responsive, keyboard accessible, and protected by existing admin auth", () => {
  assert.match(component, /sm:grid-cols|md:grid-cols|overflow-x-auto/);
  assert.match(component, /<fieldset|<legend|aria-current|aria-invalid|aria-describedby|role="alert"/);
  assert.match(layout, /isValidAdminSession/);
  assert.match(layout, /AdminShell/);
  assert.match(shell, /\/admin\/access-center/);
  assert.match(middleware, /\/admin\/access-center\/\:path\*/);
});
