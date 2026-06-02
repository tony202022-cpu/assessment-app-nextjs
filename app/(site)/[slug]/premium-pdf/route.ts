// FILE: app/(site)/[slug]/premium-pdf/route.ts
import "server-only";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getRecommendations,
  normalizeCompetencyId,
  tierFromPercentage,
  Tier,
  Language,
} from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AreaRow = {
  competencyId: string;
  label: string;
  percentage: number;
  tier: Tier;
  score?: number;
  maxScore?: number;
};

const AREA_LABELS: Record<string, { en: string; ar: string }> = {
  strategic_direction_business_clarity: { en: "Strategic Direction & Business Clarity", ar: "الاتجاه الاستراتيجي ووضوح الشركة" },
  revenue_engine_sales_predictability: { en: "Revenue Engine & Sales Predictability", ar: "محرك الإيرادات واستقرار المبيعات" },
  revenue_engine_predictability: { en: "Revenue Engine & Sales Predictability", ar: "محرك الإيرادات واستقرار المبيعات" },
  marketing_positioning_lead_quality: { en: "Marketing Positioning & Lead Quality", ar: "التموضع التسويقي وجودة العملاء المحتملين" },
  customer_experience_retention: { en: "Customer Experience & Retention", ar: "تجربة العملاء والاحتفاظ بهم" },
  cash_flow_margins_financial_control: { en: "Cash Flow, Margins & Financial Control", ar: "التدفق النقدي والهوامش والرقابة المالية" },
  operations_systems_process_discipline: { en: "Operations, Systems & Process Discipline", ar: "العمليات والأنظمة وانضباط الإجراءات" },
  people_roles_accountability: { en: "People, Roles & Accountability", ar: "الأفراد والأدوار والمساءلة" },
  leadership_decision_making_rhythm: { en: "Leadership & Decision-Making Rhythm", ar: "القيادة وإيقاع اتخاذ القرار" },
  products_services_value_proposition: { en: "Products, Services & Value Proposition", ar: "المنتجات والخدمات وعرض القيمة" },
  technology_data_management_visibility: { en: "Technology, Data & Management Visibility", ar: "التقنية والبيانات ووضوح الإدارة" },
  technology_data_visibility: { en: "Technology, Data & Management Visibility", ar: "التقنية والبيانات ووضوح الإدارة" },
  risk_compliance_business_continuity: { en: "Risk, Compliance & Business Continuity", ar: "المخاطر والامتثال واستمرارية الأعمال" },
  risk_compliance_continuity: { en: "Risk, Compliance & Business Continuity", ar: "المخاطر والامتثال واستمرارية الأعمال" },
  growth_readiness_scalability: { en: "Growth Readiness & Scalability", ar: "جاهزية النمو وقابلية التوسع" },
};

const SME_AREA_ORDER = [
  "strategic_direction_business_clarity",
  "revenue_engine_sales_predictability",
  "marketing_positioning_lead_quality",
  "customer_experience_retention",
  "cash_flow_margins_financial_control",
  "operations_systems_process_discipline",
  "people_roles_accountability",
  "leadership_decision_making_rhythm",
  "products_services_value_proposition",
  "technology_data_management_visibility",
  "risk_compliance_business_continuity",
  "growth_readiness_scalability",
];

const ROUTE_ALIAS: Record<string, string> = {
  revenue_engine_predictability: "revenue_engine_sales_predictability",
  technology_data_visibility: "technology_data_management_visibility",
  risk_compliance_continuity: "risk_compliance_business_continuity",
};

function canonicalAreaId(raw: unknown) {
  const id = normalizeCompetencyId(String(raw || ""));
  return ROUTE_ALIAS[id] || id;
}

function pct(raw: unknown) {
  const n = Math.round(Number(raw) || 0);
  return Math.max(0, Math.min(100, n));
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function tierLabel(tier: Tier) {
  if (tier === "Strength") return "Strength";
  if (tier === "Opportunity") return "Opportunity";
  if (tier === "Threat") return "Threat";
  return "Critical Leak";
}

function tierColor(tier: Tier) {
  if (tier === "Strength") return "#059669";
  if (tier === "Opportunity") return "#2563EB";
  if (tier === "Threat") return "#D97706";
  return "#DC2626";
}

function tierFill(tier: Tier) {
  if (tier === "Strength") return "#ECFDF5";
  if (tier === "Opportunity") return "#EFF6FF";
  if (tier === "Threat") return "#FFFBEB";
  return "#FEF2F2";
}

function businessHealthLabel(overall: number) {
  if (overall >= 75) return "Strong Business Health Zone";
  if (overall >= 50) return "Clear Business Improvement Zone";
  if (overall >= 30) return "Business Health Warning Zone";
  return "High Business Leakage Zone";
}

function firstImpression(overall: number) {
  if (overall >= 75) return "The business has a strong base. The next step is to protect the strengths and turn them into a repeatable operating system.";
  if (overall >= 50) return "The business has a workable base, but visible leaks may still be limiting stability, profitability, or growth readiness.";
  if (overall >= 30) return "The business is showing clear warning signals. More effort is not enough; the company needs to treat the priorities leaking cash, time, and energy.";
  return "The business is showing a serious leakage pattern. Diagnosis, prioritization, and structured treatment are needed before more pressure is added.";
}

function areaMeaning(row: AreaRow) {
  if (row.tier === "Strength") return `${row.label} is currently a healthy business area. Use it as leverage to strengthen weaker parts of the business system.`;
  if (row.tier === "Opportunity") return `${row.label} has a workable base, but it needs clearer discipline before it becomes dependable under market pressure.`;
  if (row.tier === "Threat") return `${row.label} is creating a business health warning signal that may weaken cash flow, customer retention, team execution, or growth readiness.`;
  return `${row.label} is showing a clear business leak. This area may be making the company work hard without becoming stronger, more profitable, more stable, or more scalable.`;
}

function cleanRecommendation(input: string) {
  return String(input || "")
    .replace(/\*\*/g, "")
    .replace(/^[•●▪◦✔✓✅✦★☆▶►→⚡📊📋🧠🔍🎯💡📞🛡️📝📌🧩🧭🧪📈🔬🚨⏸️🎙️🤝🔧\s]+/, "")
    .replace(/^\d{1,2}[.)\-:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailLike(s: string) {
  return EMAIL_RE.test(String(s || "").trim());
}

function pickFirstNonEmpty(...vals: unknown[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function extractIdentity(attempt: any, profile: any, emailFromAuth?: string | null) {
  const rawName = pickFirstNonEmpty(
    profile?.full_name,
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
    attempt?.full_name,
    attempt?.name,
    attempt?.participant?.full_name,
    attempt?.participant?.name,
    attempt?.metadata?.full_name,
    attempt?.metadata?.name
  );
  const rawEmail = pickFirstNonEmpty(
    emailFromAuth,
    attempt?.email,
    attempt?.participant?.email,
    attempt?.metadata?.email
  );
  const rawCompany = pickFirstNonEmpty(
    profile?.company,
    attempt?.company,
    attempt?.participant?.company,
    attempt?.metadata?.company
  );

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";
  let fullName = rawName.trim() || "—";
  if (fullName === "—" && email !== "—") {
    fullName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
  }

  return {
    fullName,
    email,
    company: rawCompany.trim() || "—",
  };
}

function sortByWeakness(rows: AreaRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage);
}

function sortByStrength(rows: AreaRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage);
}

function roadmapWeeks(risks: AreaRow[], strengths: AreaRow[]) {
  const r1 = risks[0]?.label || "the weakest business health area";
  const r2 = risks[1]?.label || "the second weakest business health area";
  const r3 = risks[2]?.label || "the third weakest business health area";
  const s1 = strengths[0]?.label || "the strongest business health area";

  return [
    ["Week 1", "Executive Reality Check", `Review the full report, confirm the top three leaks, and appoint one owner for the first correction in ${r1}.`, ["Confirm the current facts", "List the evidence behind the score", "Choose the first owner", "Define one weekly review rhythm", "Stop adding new fixes before diagnosis"]],
    ["Week 2", "Leak 1 Stabilization", `Focus on ${r1}. Define the visible symptom, the root cause, one weekly metric, and one correction owner.`, ["Name the leak", "Map its effect on cash, customers, owner time, and execution", "Choose one metric", "Run one correction", "Review what changed"]],
    ["Week 3", "Cash, Customer, and Owner-Time Visibility", `Connect ${r1} to the places where the business loses cash, customer confidence, operating control, or owner time.`, ["Map avoidable cash leakage", "Find customer friction points", "Identify owner-time traps", "Remove one repeated delay", "Document the new rule"]],
    ["Week 4", "Leak 2 Stabilization", `Move to ${r2}. Document where this area creates delay, confusion, waste, risk, or inconsistent execution.`, ["Define the symptom", "Choose the owner", "Set the checkpoint", "Run a correction", "Review the result"]],
    ["Week 5", "Operating Rhythm", "Install a weekly management rhythm: numbers, blockers, decisions, owners, deadlines, and follow-up evidence.", ["Create the weekly agenda", "Select the numbers", "Assign owners", "Review blockers", "Close every meeting with decisions and deadlines"]],
    ["Week 6", "Leak 3 Stabilization", `Treat ${r3}. Decide which process, role, customer journey, or dashboard must be clarified first.`, ["Find the repeated leak", "Simplify the process", "Clarify the role", "Connect it to a metric", "Document the correction"]],
    ["Week 7", "People and Accountability", "Clarify ownership: who owns the number, who reports it, who decides, who escalates, and who follows up.", ["Rewrite key role outcomes", "Name decision rights", "Define escalation rules", "Create a review date", "Remove vague accountability"]],
    ["Week 8", "Revenue and Customer Flow", "Inspect the flow from lead source to customer decision, delivery, retention, referral, and repeat business.", ["Track the last 20 customers", "Find lead quality issues", "Identify conversion friction", "Review retention risk", "Choose one improvement"]],
    ["Week 9", "Systems and Dashboard Visibility", "Build a simple weekly dashboard across revenue, cash, customers, operations, people, and risk.", ["Choose 12 core numbers", "Remove manual chasing", "Create dashboard ownership", "Review weekly", "Decide from evidence"]],
    ["Week 10", "Risk and Continuity Protection", "Identify the top business risks that could damage cash, delivery, reputation, compliance, or continuity.", ["Create the top-10 risk register", "Rate likelihood and impact", "Assign controls", "Define contingency actions", "Set review dates"]],
    ["Week 11", "Use the Strongest Leverage", `Use ${s1} as a stabilizer and turn it into a repeatable operating standard that supports weaker areas.`, ["Protect the strength", "Copy the rhythm", "Use it to lift a weak area", "Train the team on the standard", "Measure consistency"]],
    ["Week 12", "Executive Revamp Decision", "Review the 90-day progress, compare the before/after pattern, and choose the next treatment pathway.", ["Compare before and after", "Select the next pathway", "Decide what to stop", "Decide what to scale", "Schedule the next executive review"]],
  ] as const;
}

function getPdfMakePrinter() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfmakeModule = require("pdfmake");
  const PdfPrinter = pdfmakeModule.default || pdfmakeModule;
  return new PdfPrinter({
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  });
}

function buildPdfBuffer(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const printer = getPdfMakePrinter();
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

function smallLabel(text: string, color = "#64748B") {
  return { text, fontSize: 8, bold: true, color, characterSpacing: 1.8, margin: [0, 0, 0, 4] };
}

function sectionTitle(title: string, subtitle?: string) {
  return [
    { text: title, fontSize: 20, bold: true, color: "#0F172A", margin: [0, 0, 0, 6] },
    subtitle ? { text: subtitle, fontSize: 9.5, color: "#475569", lineHeight: 1.25, margin: [0, 0, 0, 14] } : null,
  ].filter(Boolean);
}

function scoreBar(score: number, accent: string) {
  return {
    table: {
      widths: [Math.max(1, score), Math.max(1, 100 - score)],
      body: [[
        { text: "", fillColor: accent, border: [false, false, false, false], margin: [0, 4, 0, 4] },
        { text: "", fillColor: "#E5E7EB", border: [false, false, false, false], margin: [0, 4, 0, 4] },
      ]],
    },
    layout: "noBorders",
    margin: [0, 4, 0, 8],
  };
}

function buildDocDefinition(params: {
  attemptId: string;
  identity: { fullName: string; email: string; company: string };
  overall: number;
  overallTier: Tier;
  zone: string;
  rows: AreaRow[];
  topRisks: AreaRow[];
  topStrengths: AreaRow[];
  treatmentRows: AreaRow[];
}) {
  const { attemptId, identity, overall, overallTier, zone, rows, topRisks, topStrengths, treatmentRows } = params;
  const accent = tierColor(overallTier);
  const generatedDate = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
  const weakest = topRisks[0];
  const strongest = topStrengths[0];
  const reportId = attemptId.slice(0, 8);

  const pageHeader = (currentPage: number) => {
    if (currentPage === 1) return { text: "" };
    return {
      columns: [
        { text: "LEVEL UP BUSINESS CONSULTING", fontSize: 8, bold: true, color: "#64748B", characterSpacing: 1.4 },
        { text: "SME BUSINESS HEALTH MRI", alignment: "right", fontSize: 8, bold: true, color: "#64748B", characterSpacing: 1.4 },
      ],
      margin: [36, 18, 36, 0],
    };
  };

  const pageFooter = (currentPage: number, pageCount: number) => ({
    columns: [
      { text: `Report ID ${reportId}`, fontSize: 8, color: "#94A3B8" },
      { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 8, color: "#94A3B8" },
    ],
    margin: [36, 0, 36, 18],
  });

  const vitalRows = rows.map((r) => [
    { text: r.label, bold: true, color: "#0F172A", fontSize: 8.5, margin: [0, 3, 0, 3] },
    { text: tierLabel(r.tier), bold: true, color: tierColor(r.tier), fontSize: 8.2, margin: [0, 3, 0, 3] },
    { text: `${r.percentage}%`, alignment: "right", bold: true, color: "#0F172A", fontSize: 8.2, margin: [0, 3, 0, 3] },
  ]);

  const swotTable = {
    table: {
      widths: ["*", "*"],
      body: [
        [
          { stack: [{ text: "Strengths", bold: true, fontSize: 12, color: "#059669" }, ...topStrengths.map((r) => ({ text: `• ${r.label} — ${r.percentage}%`, fontSize: 9, margin: [0, 5, 0, 0] }))], fillColor: "#ECFDF5", margin: [10, 10, 10, 10] },
          { stack: [{ text: "Leaks", bold: true, fontSize: 12, color: "#DC2626" }, ...topRisks.map((r) => ({ text: `• ${r.label} — ${r.percentage}%`, fontSize: 9, margin: [0, 5, 0, 0] }))], fillColor: "#FEF2F2", margin: [10, 10, 10, 10] },
        ],
        [
          { stack: [{ text: "Opportunities", bold: true, fontSize: 12, color: "#2563EB" }, { text: "Turn the findings into a weekly operating system: clear numbers, assigned owners, fixed review rhythm, and indicators that do not depend on memory.", fontSize: 9, lineHeight: 1.25, margin: [0, 5, 0, 0] }], fillColor: "#EFF6FF", margin: [10, 10, 10, 10] },
          { stack: [{ text: "Threats", bold: true, fontSize: 12, color: "#D97706" }, { text: "The real threat is that the company keeps working harder without treating the core leaks, turning growth into additional pressure instead of strength.", fontSize: 9, lineHeight: 1.25, margin: [0, 5, 0, 0] }], fillColor: "#FFFBEB", margin: [10, 10, 10, 10] },
        ],
      ],
    },
    layout: {
      hLineColor: () => "#E2E8F0",
      vLineColor: () => "#E2E8F0",
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
    },
    margin: [0, 8, 0, 0],
  };

  const treatmentPages = treatmentRows.map((row, index) => {
    const recs = getRecommendations(row.competencyId, row.tier, "en" as Language).slice(0, 3).map(cleanRecommendation);
    return [
      { text: `TREATMENT PRIORITY ${index + 1}`, fontSize: 9, bold: true, color: "#B45309", characterSpacing: 1.8, margin: [0, 0, 0, 4], pageBreak: index === 0 ? "before" : undefined },
      {
        columns: [
          { stack: [{ text: row.label, fontSize: 19, bold: true, color: "#0F172A" }, { text: areaMeaning(row), fontSize: 9.2, color: "#475569", lineHeight: 1.25, margin: [0, 8, 0, 0] }], width: "*" },
          { stack: [{ text: `${row.percentage}%`, fontSize: 24, bold: true, color: tierColor(row.tier), alignment: "center" }, { text: "AREA SCORE", fontSize: 7.5, bold: true, color: "#64748B", alignment: "center" }], width: 88, margin: [8, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: { widths: ["*"], body: [[{ stack: [
          { text: "Where the leakage may happen", bold: true, fontSize: 11, color: "#0F172A" },
          { text: "Look for the impact on cash, customers, execution speed, role clarity, team capacity, owner time, and readiness to grow.", fontSize: 9, color: "#475569", lineHeight: 1.25, margin: [0, 5, 0, 0] },
        ], fillColor: tierFill(row.tier), margin: [10, 10, 10, 10] }]] },
        layout: "noBorders",
        margin: [0, 0, 0, 10],
      },
      { text: "Suggested treatment actions", bold: true, fontSize: 11.5, color: "#0F172A", margin: [0, 0, 0, 6] },
      ...recs.map((rec, i) => ({
        table: { widths: [22, "*"], body: [[
          { text: String(i + 1), alignment: "center", bold: true, color: "#FDE68A", fillColor: "#0F172A", margin: [0, 4, 0, 4] },
          { text: rec, fontSize: 9, color: "#334155", lineHeight: 1.25, fillColor: "#F8FAFC", margin: [8, 5, 8, 5] },
        ]] },
        layout: "noBorders",
        margin: [0, 2, 0, 3],
      })),
    ];
  }).flat();

  const weeks = roadmapWeeks(topRisks, topStrengths);
  const roadmapBlocks = weeks.map((w, i) => ({
    table: { widths: [58, 145, "*"], body: [[
      { text: w[0], bold: true, color: "#0F172A", fillColor: "#F8FAFC", margin: [6, 7, 6, 7] },
      { text: w[1], bold: true, color: accent, fillColor: "#F8FAFC", margin: [6, 7, 6, 7] },
      { stack: [
        { text: w[2], fontSize: 8.7, color: "#334155", lineHeight: 1.18 },
        { ul: w[3].map((x) => ({ text: x, fontSize: 8.3, color: "#475569", margin: [0, 1, 0, 1] })), margin: [0, 5, 0, 0] },
      ], fillColor: "#FFFFFF", margin: [6, 7, 6, 7] },
    ]] },
    layout: {
      hLineColor: () => "#E2E8F0",
      vLineColor: () => "#E2E8F0",
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
    },
    margin: [0, i === 0 ? 6 : 4, 0, 0],
  }));

  return {
    pageSize: "A4",
    pageMargins: [36, 42, 36, 38],
    defaultStyle: { font: "Helvetica", fontSize: 9.5, color: "#334155" },
    header: pageHeader,
    footer: pageFooter,
    info: {
      title: `SME Business Health MRI - ${identity.fullName}`,
      author: "Level Up Business Consulting",
      subject: "Premium Executive Diagnostic Report",
    },
    content: [
      // Cover
      {
        stack: [
          {
            columns: [
              { stack: [{ text: "LEVEL UP", fontSize: 18, bold: true, color: "#FDE68A", characterSpacing: 2 }, { text: "BUSINESS CONSULTING", fontSize: 8, bold: true, color: "#BFDBFE", characterSpacing: 1.8 }], width: "*" },
              { stack: [{ text: "CONFIDENTIAL EXECUTIVE REPORT", fontSize: 8, bold: true, color: "#BFDBFE", alignment: "right", characterSpacing: 1.5 }, { text: `Report ID ${reportId} • ${generatedDate}`, fontSize: 8, color: "#CBD5E1", alignment: "right", margin: [0, 4, 0, 0] }], width: 200 },
            ],
            margin: [0, 0, 0, 70],
          },
          { text: "SME Business Health", fontSize: 34, bold: true, color: "#FFFFFF", margin: [0, 0, 0, 2] },
          { text: "MRI", fontSize: 58, bold: true, color: "#FDE68A", margin: [0, 0, 0, 10] },
          { text: "A premium executive diagnostic that reveals leaks, risks, bottlenecks, and treatment priorities before adding more money, time, people, or effort.", fontSize: 12.5, color: "#DBEAFE", lineHeight: 1.35, margin: [0, 0, 0, 28] },
          {
            columns: [
              { stack: [smallLabel("BUSINESS HEALTH SCORE", "#BFDBFE"), { text: `${overall}%`, fontSize: 42, bold: true, color: accent }, { text: zone, fontSize: 12, bold: true, color: "#FFFFFF" }, scoreBar(overall, accent)], width: "*" },
              { stack: [smallLabel("PARTICIPANT", "#BFDBFE"), { text: identity.fullName, fontSize: 12, bold: true, color: "#FFFFFF" }, { text: identity.email, fontSize: 9.5, color: "#CBD5E1", margin: [0, 2, 0, 9] }, smallLabel("COMPANY", "#BFDBFE"), { text: identity.company, fontSize: 12, bold: true, color: "#FFFFFF" }, { text: "12 vital business areas", fontSize: 9, color: "#CBD5E1", margin: [0, 12, 0, 0] }], width: 190 },
            ],
            columnGap: 30,
            margin: [0, 0, 0, 40],
          },
          {
            table: { widths: ["*"], body: [[{ stack: [smallLabel("EXECUTIVE FIRST IMPRESSION", "#FDE68A"), { text: firstImpression(overall), fontSize: 12, color: "#FFFFFF", lineHeight: 1.35 }], fillColor: "#0F172A", margin: [14, 14, 14, 14] }]] },
            layout: { hLineColor: () => "#334155", vLineColor: () => "#334155" },
          },
        ],
        pageBreak: "after",
        background: "#07111F",
      },

      // Snapshot
      ...sectionTitle("Executive Diagnosis Snapshot", "This page captures the most important findings before the details. The goal is to know what to treat first, not to read a long report without a decision."),
      {
        columns: [
          { stack: [{ text: zone, fontSize: 16, bold: true, color: accent }, { text: firstImpression(overall), fontSize: 10, color: "#475569", lineHeight: 1.25, margin: [0, 6, 0, 0] }], width: "*" },
          { stack: [{ text: `${overall}%`, fontSize: 36, bold: true, color: accent, alignment: "center" }, { text: "HEALTH SCORE", fontSize: 8, bold: true, color: "#64748B", alignment: "center" }], width: 110 },
        ],
        margin: [0, 0, 0, 14],
      },
      {
        table: { widths: ["*", "*"], body: [[
          { stack: [smallLabel("BIGGEST HIDDEN BUSINESS LEAK"), { text: weakest?.label || "—", fontSize: 14, bold: true, color: "#0F172A" }, { text: weakest ? areaMeaning(weakest) : "—", fontSize: 9, color: "#475569", lineHeight: 1.2, margin: [0, 6, 0, 0] }], fillColor: "#FEF2F2", margin: [12, 12, 12, 12] },
          { stack: [smallLabel("STRONGEST CURRENT LEVERAGE"), { text: strongest?.label || "—", fontSize: 14, bold: true, color: "#0F172A" }, { text: strongest ? areaMeaning(strongest) : "—", fontSize: 9, color: "#475569", lineHeight: 1.2, margin: [0, 6, 0, 0] }], fillColor: "#ECFDF5", margin: [12, 12, 12, 12] },
        ]] },
        layout: { hLineColor: () => "#E2E8F0", vLineColor: () => "#E2E8F0" },
        margin: [0, 0, 0, 18],
      },
      { text: "Top Stabilization Priorities", fontSize: 14, bold: true, color: "#0F172A", margin: [0, 0, 0, 8] },
      {
        table: { headerRows: 1, widths: ["*", 60, 80], body: [
          [{ text: "Area", bold: true, fillColor: "#F1F5F9", margin: [6, 6, 6, 6] }, { text: "Score", bold: true, fillColor: "#F1F5F9", alignment: "right", margin: [6, 6, 6, 6] }, { text: "Zone", bold: true, fillColor: "#F1F5F9", alignment: "right", margin: [6, 6, 6, 6] }],
          ...topRisks.map((r) => [{ text: r.label, bold: true, margin: [6, 6, 6, 6] }, { text: `${r.percentage}%`, alignment: "right", color: tierColor(r.tier), bold: true, margin: [6, 6, 6, 6] }, { text: tierLabel(r.tier), alignment: "right", color: tierColor(r.tier), bold: true, margin: [6, 6, 6, 6] }]),
        ] },
        layout: { hLineColor: () => "#E2E8F0", vLineColor: () => "#E2E8F0" },
        pageBreak: "after",
      },

      // Dashboard + SWOT
      ...sectionTitle("Vital Signs Dashboard", "Business health across 12 areas."),
      { table: { headerRows: 1, widths: ["*", 75, 55], body: [[
        { text: "Business Health Area", bold: true, fillColor: "#F1F5F9", margin: [6, 6, 6, 6] },
        { text: "Zone", bold: true, fillColor: "#F1F5F9", alignment: "right", margin: [6, 6, 6, 6] },
        { text: "Score", bold: true, fillColor: "#F1F5F9", alignment: "right", margin: [6, 6, 6, 6] },
      ], ...vitalRows] }, layout: { hLineColor: () => "#E2E8F0", vLineColor: () => "#E2E8F0" }, margin: [0, 0, 0, 18] },
      ...sectionTitle("Executive Analysis", "Business Health SWOT and leakage map."),
      swotTable,
      { text: "Leakage Map", fontSize: 13, bold: true, color: "#0F172A", margin: [0, 14, 0, 5] },
      { text: `The first priority (${topRisks[0]?.label || "—"}) may affect cash, customers, execution, and owner time. The second priority (${topRisks[1]?.label || "—"}) may pressure operating stability. The third priority (${topRisks[2]?.label || "—"}) may limit growth readiness.`, fontSize: 9.5, color: "#475569", lineHeight: 1.3, pageBreak: "after" },

      // Treatments
      ...treatmentPages,

      // Roadmap
      { text: "90-Day Business Health Roadmap", fontSize: 22, bold: true, color: "#0F172A", margin: [0, 0, 0, 6], pageBreak: "before" },
      { text: "A weekly executive roadmap with practical actions. This is designed to be read, owned, and reviewed — not printed as an ugly 90-row spreadsheet.", fontSize: 10, color: "#475569", lineHeight: 1.25, margin: [0, 0, 0, 12] },
      ...roadmapBlocks,

      // Pathways
      { text: "Next Treatment Pathways", fontSize: 22, bold: true, color: "#0F172A", margin: [0, 0, 0, 8], pageBreak: "before" },
      { text: "This report does not end with diagnosis. Its greatest value is clarifying the next pathway: interpretation session, business revamp roadmap, or deeper team, sales, and systems diagnostics.", fontSize: 10, color: "#475569", lineHeight: 1.25, margin: [0, 0, 0, 14] },
      {
        table: { widths: ["*", "*", "*"], body: [[
          { stack: [{ text: "Business Health Interpretation Session", bold: true, fontSize: 11, color: "#0F172A" }, { text: "Review the findings, identify the leakage pattern, and choose treatment priorities before investing in training, systems, or expansion.", fontSize: 9, color: "#475569", lineHeight: 1.25, margin: [0, 6, 0, 0] }], fillColor: "#F8FAFC", margin: [10, 10, 10, 10] },
          { stack: [{ text: "Revenue and Customer Growth", bold: true, fontSize: 11, color: "#0F172A" }, { text: "Best when the leaks are in revenue engine, lead quality, customer experience, conversion, or retention.", fontSize: 9, color: "#475569", lineHeight: 1.25, margin: [0, 6, 0, 0] }], fillColor: "#F8FAFC", margin: [10, 10, 10, 10] },
          { stack: [{ text: "Visibility, Risk, and Growth Readiness", bold: true, fontSize: 11, color: "#0F172A" }, { text: "Best when management visibility is weak, risks are hidden, or growth could create chaos instead of strength.", fontSize: 9, color: "#475569", lineHeight: 1.25, margin: [0, 6, 0, 0] }], fillColor: "#F8FAFC", margin: [10, 10, 10, 10] },
        ]] },
        layout: { hLineColor: () => "#E2E8F0", vLineColor: () => "#E2E8F0" },
        margin: [0, 0, 0, 18],
      },
      {
        table: { widths: ["*"], body: [[{ stack: [
          { text: "Executive Decision", fontSize: 17, bold: true, color: "#FFFFFF" },
          { text: "Do not add new solutions before treating old leaks.", fontSize: 13, bold: true, color: "#FDE68A", margin: [0, 6, 0, 4] },
          { text: "Use this report as a decision map. Choose the first leak, assign a clear owner, connect it to a metric, and begin 90 days of structured treatment.", fontSize: 10, color: "#DBEAFE", lineHeight: 1.3 },
          { text: `Biggest leak: ${weakest?.label || "—"}`, fontSize: 10, bold: true, color: "#FFFFFF", margin: [0, 12, 0, 0] },
          { text: `Strongest leverage: ${strongest?.label || "—"}`, fontSize: 10, bold: true, color: "#FFFFFF", margin: [0, 3, 0, 0] },
          { text: `Health score: ${overall}% — ${zone}`, fontSize: 10, bold: true, color: "#FDE68A", margin: [0, 3, 0, 0] },
        ], fillColor: "#07111F", margin: [16, 16, 16, 16] }]] },
        layout: "noBorders",
      },
    ],
    styles: {},
  };
}

export async function GET(request: NextRequest, context: { params: { slug: string } }) {
  try {
    const slug = context.params.slug;
    const url = new URL(request.url);
    const attemptId = String(url.searchParams.get("attemptId") || "").trim();
    const lang = (String(url.searchParams.get("lang") || "en").toLowerCase() === "ar" ? "ar" : "en") as Language;

    if (!attemptId) {
      return new Response("Missing attemptId", { status: 400 });
    }

    const isSme = slug.toLowerCase().includes("sme-business-health") || slug.toLowerCase().includes("business-health");
    if (!isSme) {
      return new Response("Premium PDF V1 is currently enabled for SME Business Health MRI only.", { status: 404 });
    }

    if (lang === "ar") {
      return new Response("Arabic premium PDF needs an embedded Arabic font. English premium PDF is ready for testing first.", { status: 501 });
    }

    const supabase = getSupabaseAdmin();
    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .maybeSingle();

    if (error || !attempt) {
      return new Response("Report not found", { status: 404 });
    }

    let profile: any = null;
    let authEmail: string | null = null;
    const userId = (attempt as any).user_id as string | null;
    if (userId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, company, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      profile = p || null;

      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        authEmail = userData?.user?.email || null;
      } catch {
        authEmail = null;
      }
    }

    const competencyResults = Array.isArray((attempt as any).competency_results)
      ? (attempt as any).competency_results
      : [];

    const rows: AreaRow[] = competencyResults.map((raw: any) => {
      const competencyId = canonicalAreaId(raw?.competencyId || raw?.key || raw?.competency_id || raw?.id);
      const percentage = pct(raw?.percentage ?? raw?.pct ?? raw?.value);
      const label = AREA_LABELS[competencyId]?.en || competencyId.replace(/_/g, " ");
      return {
        competencyId,
        label,
        percentage,
        tier: tierFromPercentage(percentage),
        score: Number(raw?.score || 0),
        maxScore: Number(raw?.maxScore || 0),
      };
    });

    const rowById = new Map(rows.map((r) => [r.competencyId, r]));
    const orderedRows = SME_AREA_ORDER.map((id) => rowById.get(id)).filter(Boolean) as AreaRow[];
    const finalRows = orderedRows.length ? orderedRows : rows;

    const overall = pct((attempt as any).total_percentage);
    const overallTier = tierFromPercentage(overall);
    const zone = businessHealthLabel(overall);
    const identity = extractIdentity(attempt, profile, authEmail);
    const topRisks = sortByWeakness(finalRows).slice(0, 3);
    const topStrengths = sortByStrength(finalRows).slice(0, 3);
    const treatmentRows = sortByWeakness(finalRows).slice(0, 6);

    const docDefinition = buildDocDefinition({
      attemptId,
      identity,
      overall,
      overallTier,
      zone,
      rows: finalRows,
      topRisks,
      topStrengths,
      treatmentRows,
    });

    const pdfBuffer = await buildPdfBuffer(docDefinition);
    const filename = `sme-business-health-mri-${attemptId.slice(0, 8)}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "no-store",
  },
});
  } catch (err: any) {
    console.error("Premium PDF generation error:", err);
    return new Response(`Premium PDF generation failed: ${err?.message || "Unknown error"}`, { status: 500 });
  }
}
