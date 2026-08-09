import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/(site)/lawyer-client-conversion-mri/sample-report/page.tsx");
const client = read(
  "app/(site)/lawyer-client-conversion-mri/sample-report/LawyerSampleReport.tsx",
);
const data = read("src/data/lawyer-mri-sample-report.ts");
const protectedReport = read("app/(site)/[slug]/report/page.tsx");

test("public Lawyer sample is static, noindex, and needs no attempt or authentication", () => {
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(page + client + data, /attemptId|searchParams|cookies\(|getUser\(/);
  assert.doesNotMatch(page + client + data, /createClient|SUPABASE|service_role|quiz_attempts/);
  assert.doesNotMatch(page + client + data, /isAuthorizedPaidMriAttempt/);
});

test("sample identity is sanitized and contains no real identifiers", () => {
  assert.match(data, /name: "Test"/);
  assert.match(data, /email: "test"/);
  assert.match(data, /experience: "—"/);
  assert.match(data, /reference: "SAMPLE-LAWYER-MRI"/);
  assert.doesNotMatch(page + client + data, /Developer Test|internal\.test/);
  assert.doesNotMatch(
    page + client + data,
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
});

test("sample includes both complete viewing modes and print behavior", () => {
  assert.match(client, /التقرير التنفيذي/);
  assert.match(client, /دليل التطبيق المهني لمدة 90 يومًا/);
  assert.match(client, /خريطة الكفاءات الخمس عشرة/);
  assert.match(client, /خريطة السبب الجذري/);
  assert.match(client, /تحليل SWOT/);
  assert.match(client, /التشخيص التفصيلي لأضعف ست كفاءات/);
  assert.match(client, /خارطة طريق من صفحة واحدة/);
  assert.match(client, /window\.print\(\)/);
  assert.match(client, /@media print/);
  assert.match(data, /length: 90/);
});

test("sample uses the fixed 39 percent structure without email delivery", () => {
  assert.match(data, /LAWYER_SAMPLE_OVERALL_SCORE = 39/);
  assert.equal((data.match(/id: "[a-z_]+", label:/g) || []).length, 15);
  assert.doesNotMatch(client, /EmailReportButton|Send My Report|إرسال.*البريد/);
});

test("sample headings use explicit readable colors on dark and light backgrounds", () => {
  assert.match(client, /tone\?: "light" \| "dark"/);
  assert.match(client, /isDark \? "text-blue-200" : "text-blue-700"/);
  assert.match(client, /isDark \? "text-white" : "text-slate-950"/);
  assert.match(client, /isDark \? "text-slate-200" : "text-slate-600"/);
  assert.equal((client.match(/tone="dark"/g) || []).length, 3);
});

test("existing paid and Developer Test report authorization remains protected", () => {
  assert.match(protectedReport, /isAuthorizedPaidMriAttempt/);
  assert.match(protectedReport, /readDeveloperTestAccess/);
  assert.match(protectedReport, /DEVELOPER_TEST_ACCESS_COOKIE/);
  assert.match(protectedReport, /isAuthorizedOfflineManager/);
  assert.doesNotMatch(protectedReport, /sample-report/);
});

test("sample adds no payment, company, credit, purchase, or scoring behavior", () => {
  const combined = page + client + data;
  assert.doesNotMatch(
    combined,
    /Stripe|checkout|purchase|coupon|credit_transactions|company_id|access_token_id|submitQuiz|tierFromPercentage/,
  );
});

test("sample scenarios are static, RTL, and separated before the report", () => {
  assert.equal((client.match(/data-sample-scenario/g) || []).length, 1);
  assert.match(client, /SAMPLE_SCENARIOS\.map/);
  assert.equal((client.match(/question:/g) || []).length, 2);
  for (const label of ["أ", "ب", "ج", "د"]) {
    assert.match(client, new RegExp(`\\["${label}",`));
  }
  assert.match(client, /dir="rtl"[\s\S]*data-sample-answer/);
  assert.match(client, /className="flex items-start gap-4[^"]*text-right"/);
  assert.doesNotMatch(client.match(/const SAMPLE_SCENARIOS[\s\S]*?as const;/)?.[0] || "", /\["[ABCD]",/);
  assert.doesNotMatch(client.match(/const SAMPLE_SCENARIOS[\s\S]*?as const;/)?.[0] || "", /score|correct|weight|competency|questionId/i);
  assert.ok(client.indexOf("<SampleDiagnosticIntroduction />") < client.indexOf("<ExecutiveReport />"));
  assert.match(client, /data-report-transition/);
  assert.match(client, /data-report-preview-divider/);
  assert.match(client, /تقرير معيار كسب الموكلين™/);
});
