// FILE: app/(site)/[slug]/premium-report/page.tsx
import "server-only";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  getRecommendations,
  Tier,
  Language,
  normalizeCompetencyId,
  tierFromPercentage,
} from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Premium Report V2 — SME Business Health MRI only
 * Safe new route:
 * app/(site)/[slug]/premium-report/page.tsx
 *
 * This file does NOT replace:
 * - app/(site)/[slug]/report/page.tsx
 * - app/(site)/[slug]/results/page.tsx
 * - quiz/scoring/timer/randomization/Supabase schema
 */

type PageProps = {
  params: { slug: string };
  searchParams?: { attemptId?: string; lang?: string; v?: string };
};

type AreaRow = {
  competencyId: string;
  label: string;
  percentage: number;
  tier: Tier;
  score?: number;
  maxScore?: number;
};

const BRAND_LOGO_SRC = "/brand/levelup-logo.png";


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

function canonicalAreaId(raw: any) {
  const id = normalizeCompetencyId(String(raw || ""));
  const aliases: Record<string, string> = {
    revenue_engine_predictability: "revenue_engine_sales_predictability",
    technology_data_visibility: "technology_data_management_visibility",
    risk_compliance_continuity: "risk_compliance_business_continuity",
  };
  return aliases[id] || id;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getAssessmentConfigServer(supabase: any, slug: string) {
  const routeSlug = String(slug || "").toLowerCase();

  const bySlug = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", routeSlug)
    .maybeSingle();

  if (bySlug?.data) return bySlug.data;

  const byId = await supabase
    .from("assessments")
    .select("*")
    .eq("id", routeSlug.replace(/-/g, "_"))
    .maybeSingle();

  return byId?.data ?? null;
}

function isBusinessHealthAssessment(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("sme-business-health") || a.includes("sme_business_health") || s.includes("business-health") || a.includes("business_health");
}

function pickLang(attemptLang?: string | null, urlLang?: string | null): Language {
  const l = (urlLang || attemptLang || "en").toLowerCase();
  return l === "ar" ? "ar" : "en";
}

function pct(n: any) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function shortAttemptId(id: string) {
  return String(id || "").slice(0, 8);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pickFirstNonEmpty(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function dig(obj: any, path: string) {
  try {
    return path.split(".").reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function extractIdentity(attempt: any) {
  const blocks = [
    attempt,
    attempt?.participant,
    attempt?.candidate,
    attempt?.user,
    attempt?.profile,
    attempt?.registration,
    attempt?.contact,
    attempt?.meta,
    attempt?.metadata,
    attempt?.data,
    attempt?.payload,
    attempt?.details,
    attempt?.info,
    attempt?.user_info,
    attempt?.userInfo,
  ].filter(Boolean);

  const names: string[] = [];
  const emails: string[] = [];
  const companies: string[] = [];

  for (const b of blocks) {
    names.push(
      pickFirstNonEmpty(
        b?.full_name,
        b?.fullname,
        b?.fullName,
        b?.name,
        b?.participant_name,
        b?.candidate_name,
        b?.display_name,
        b?.displayName,
        b?.first_name && b?.last_name ? `${b.first_name} ${b.last_name}` : "",
        b?.firstName && b?.lastName ? `${b.firstName} ${b.lastName}` : ""
      )
    );

    emails.push(
      pickFirstNonEmpty(
        b?.user_email,
        b?.email,
        b?.participant_email,
        b?.candidate_email,
        b?.work_email,
        b?.workEmail
      )
    );

    companies.push(
      pickFirstNonEmpty(
        b?.company,
        b?.company_name,
        b?.companyName,
        b?.organization,
        b?.organization_name,
        b?.org,
        b?.employer
      )
    );
  }

  const rawEmail = pickFirstNonEmpty(...emails, dig(attempt, "participant.email"), dig(attempt, "registration.email"));
  const email = EMAIL_RE.test(rawEmail) ? rawEmail.trim() : "—";

  let fullName = pickFirstNonEmpty(...names, dig(attempt, "participant.full_name"), dig(attempt, "registration.full_name"));
  if (!fullName && email !== "—") {
    fullName = String(email).split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, "").trim();
  }

  return {
    fullName: fullName || "—",
    email,
    company: pickFirstNonEmpty(...companies, dig(attempt, "participant.company"), dig(attempt, "registration.company")) || "—",
  };
}

function tierLabel(tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "قوة";
    if (tier === "Opportunity") return "فرصة تطوير";
    if (tier === "Threat") return "إنذار";
    return "تسريب حاد";
  }
  return tier === "Weakness" ? "Critical Leak" : tier;
}

function tierClass(tier: Tier) {
  if (tier === "Strength") return "bg-emerald-600 text-white border-emerald-600";
  if (tier === "Opportunity") return "bg-blue-600 text-white border-blue-600";
  if (tier === "Threat") return "bg-amber-500 text-slate-950 border-amber-500";
  return "bg-rose-700 text-white border-rose-700";
}

function tierSoftClass(tier: Tier) {
  if (tier === "Strength") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tier === "Opportunity") return "border-blue-200 bg-blue-50 text-blue-900";
  if (tier === "Threat") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-rose-200 bg-rose-50 text-rose-950";
}

function tierAccentHex(tier: Tier) {
  if (tier === "Strength") return "#059669";
  if (tier === "Opportunity") return "#2563eb";
  if (tier === "Threat") return "#f59e0b";
  return "#be123c";
}

function tierTextClass(tier: Tier) {
  if (tier === "Strength") return "text-emerald-600";
  if (tier === "Opportunity") return "text-blue-600";
  if (tier === "Threat") return "text-amber-500";
  return "text-rose-600";
}

function tierRingClass(tier: Tier) {
  if (tier === "Strength") return "border-emerald-400/60 bg-emerald-500/10 text-emerald-100";
  if (tier === "Opportunity") return "border-blue-400/60 bg-blue-500/10 text-blue-100";
  if (tier === "Threat") return "border-amber-300/70 bg-amber-300/10 text-amber-100";
  return "border-rose-400/70 bg-rose-500/10 text-rose-100";
}

function businessHealthLabel(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "منطقة صحة أعمال قوية";
    if (overall >= 50) return "منطقة فرصة واضحة لتقوية الشركة";
    if (overall >= 30) return "منطقة إنذار في صحة الشركة";
    return "منطقة تسريب حاد في الأعمال";
  }
  if (overall >= 75) return "Strong Business Health Zone";
  if (overall >= 50) return "Clear Business Improvement Zone";
  if (overall >= 30) return "Business Health Warning Zone";
  return "High Business Leakage Zone";
}

function executiveMeaning(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "الشركة لديها أساس صحي يمكن البناء عليه، لكن القوة تحتاج إلى نظام تشغيل يحمي النقد والعملاء والفريق والنمو.";
    if (overall >= 50) return "الشركة تملك قاعدة قابلة للتقوية، لكن بعض التسريبات ما زالت تحد من الربحية والاستقرار وجاهزية النمو.";
    if (overall >= 30) return "هناك إشارات إنذار واضحة في صحة الشركة. لا يكفي بذل جهد أكبر؛ المطلوب علاج الأولويات التي تسرّب المال والوقت والطاقة.";
    return "هناك نمط تسريب حاد داخل الشركة يحتاج إلى تثبيت عاجل وخارطة علاج قبل محاولة التوسع أو ضخ حلول عشوائية.";
  }
  if (overall >= 75) return "The business has a healthy base, but strength must be converted into an operating system that protects cash, customers, people, execution, and growth.";
  if (overall >= 50) return "The business has a workable base, but some leaks may still be limiting profitability, stability, and growth readiness.";
  if (overall >= 30) return "The business is showing clear warning signals. More effort is not enough; the company needs to treat the priorities leaking cash, time, and energy.";
  return "The business is showing a serious leakage pattern and needs urgent stabilization before adding more pressure, staff, marketing, or expansion.";
}

function areaMeaning(row: AreaRow, lang: Language) {
  if (lang === "ar") {
    if (row.tier === "Strength") return `${row.label} يمثل منطقة صحية يمكن استخدامها كرافعة لتقوية بقية الشركة.`;
    if (row.tier === "Opportunity") return `${row.label} لديه أساس قابل للتطوير، لكنه يحتاج إلى وضوح وانضباط أعلى حتى يصبح موثوقًا تحت ضغط السوق.`;
    if (row.tier === "Threat") return `${row.label} يرسل إشارة إنذار قد تضعف النقد أو العملاء أو التنفيذ أو جاهزية النمو إذا لم يُعالج.`;
    return `${row.label} يظهر تسريبًا واضحًا قد يجعل الشركة تعمل بجهد كبير دون أن تصبح أقوى أو أكثر ربحية أو أكثر قابلية للنمو.`;
  }
  if (row.tier === "Strength") return `${row.label} is currently a healthy business area. Use it as leverage to strengthen weaker parts of the business system.`;
  if (row.tier === "Opportunity") return `${row.label} has a workable base, but it needs clearer discipline before it becomes dependable under market pressure.`;
  if (row.tier === "Threat") return `${row.label} is creating a business health warning signal that may weaken cash flow, customer retention, team execution, or growth readiness.`;
  return `${row.label} is showing a clear business leak. This area may be making the company work hard without becoming stronger, more profitable, more stable, or more scalable.`;
}

function sortByWeakness(rows: AreaRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage);
}

function sortByStrength(rows: AreaRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage);
}


function BrandLogo({ dark = false, ar = false }: { dark?: boolean; ar?: boolean }) {
  return (
    <div className={`brand-logo-wrap flex items-center gap-3 ${ar ? "flex-row-reverse text-right" : "text-left"}`}>
      <div className={`brand-logo-box flex h-14 w-44 items-center justify-center rounded-2xl border ${dark ? "border-white/20 bg-white/10" : "border-slate-200 bg-white"}`}>
        <img src={BRAND_LOGO_SRC} alt="Level Up Business Consulting" className="max-h-10 max-w-[150px] object-contain" />
      </div>
      <div className={dark ? "text-blue-100" : "text-slate-500"}>
        <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${dark ? "text-amber-200" : "text-amber-700"}`}>Level Up</div>
        <div className="text-xs font-bold leading-tight">Business Consulting</div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle, ar }: { eyebrow?: string; title: string; subtitle?: string; ar: boolean }) {
  return (
    <div className="mb-6 break-inside-avoid">
      {eyebrow && (
        <div className="mb-2 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">{title}</h2>
      {subtitle && <p className="mt-2 max-w-4xl text-sm sm:text-base leading-relaxed text-slate-600">{subtitle}</p>}
    </div>
  );
}

function ScoreDonut({ score, label, tier }: { score: number; label: string; tier: Tier }) {
  const accent = tierAccentHex(tier);
  return (
    <div className="score-donut relative mx-auto flex h-48 w-48 items-center justify-center rounded-full border-[16px] border-slate-200 bg-white shadow-2xl">
      <div
        className="absolute inset-[-18px] rounded-full"
        style={{
          background: `conic-gradient(${accent} ${score * 3.6}deg, rgba(255,255,255,0.16) 0deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 17px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 17px))",
        }}
      />
      <div className="text-center">
        <div className={`text-5xl font-black ${tierTextClass(tier)}`}>{score}%</div>
        <div className="score-donut-label mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function AreaBar({ row, ar }: { row: AreaRow; ar: boolean }) {
  return (
    <div className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-sm font-black leading-snug text-slate-900">{row.label}</div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${tierClass(row.tier)}`}>
          {tierLabel(row.tier, ar ? "ar" : "en")}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-slate-900 to-amber-400"
          style={{ width: `${row.percentage}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
        <span>{ar ? "درجة المجال" : "Area Score"}</span>
        <span>{row.percentage}%</span>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, sub, dark = false, tone }: { label: string; value: string; sub?: string; dark?: boolean; tone?: Tier }) {
  const toneClasses = tone
    ? dark
      ? `border ${tierRingClass(tone)}`
      : `border shadow-sm ${tierSoftClass(tone)}`
    : dark
    ? "border border-white/15 bg-white/10 text-white"
    : "border border-slate-200 bg-white text-slate-950 shadow-sm";

  return (
    <div className={`rounded-3xl p-5 ${toneClasses}`}>
      <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${dark ? "text-blue-100" : "text-slate-500"}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${tone ? (dark ? "text-white" : tierTextClass(tone)) : dark ? "text-amber-200" : "text-slate-950"}`}>{value}</div>
      {sub && <div className={`mt-1 text-sm leading-snug ${dark ? "text-blue-100" : "text-slate-500"}`}>{sub}</div>}
    </div>
  );
}

function TreatmentCard({ row, index, lang }: { row: AreaRow; index: number; lang: Language }) {
  const ar = lang === "ar";
  const recs = getRecommendations(row.competencyId, row.tier, lang).slice(0, 4);
  return (
    <section className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-600">
            {ar ? `أولوية علاجية ${index + 1}` : `Treatment Priority ${index + 1}`}
          </div>
          <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">{row.label}</h2>
        </div>
        <div className="rounded-3xl bg-slate-950 px-5 py-4 text-center text-white">
          <div className="text-4xl font-black text-amber-200">{row.percentage}%</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">{ar ? "درجة المجال" : "Area Score"}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-3xl border p-5 ${tierSoftClass(row.tier)}`}>
          <h3 className="text-lg font-black">{ar ? "ما الذي يكشفه هذا المجال؟" : "What this area reveals"}</h3>
          <p className="mt-2 text-sm leading-relaxed">{areaMeaning(row, lang)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-black text-slate-950">{ar ? "أين قد يحدث التسريب؟" : "Where the leakage may happen"}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {ar
              ? "ابحث عن أثر هذا المجال في النقد، العملاء، سرعة التنفيذ، وضوح الأدوار، قدرة الفريق، وقت المالك، أو جاهزية الشركة للنمو."
              : "Look for the impact of this area on cash, customers, execution speed, role clarity, team capacity, owner time, or the company’s readiness to grow."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-black text-slate-950">{ar ? "إجراءات علاجية مقترحة" : "Suggested treatment actions"}</h3>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {recs.map((r, i) => (
            <div key={`${row.competencyId}-${i}`} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-amber-200">{i + 1}</div>
              <p className="text-sm leading-relaxed text-slate-700">{String(r).replace(/\*\*/g, "")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function roadmapAction(day: number, risks: AreaRow[], strengths: AreaRow[], lang: Language) {
  const ar = lang === "ar";
  const r1 = risks[0]?.label || (ar ? "أضعف مجال في صحة الشركة" : "the weakest business health area");
  const r2 = risks[1]?.label || (ar ? "ثاني أضعف مجال" : "the second weakest area");
  const r3 = risks[2]?.label || (ar ? "ثالث أضعف مجال" : "the third weakest area");
  const s1 = strengths[0]?.label || (ar ? "أقوى مجال في الشركة" : "the strongest business area");

  const enPhases = [
    { until: 7, title: "Executive Reality Check", action: `Review the full report, confirm the top three leaks, and decide who owns the first correction in ${r1}.` },
    { until: 14, title: "Leak 1 Stabilization", action: `Focus on ${r1}. Define the visible symptom, the root cause, one weekly metric, and one correction owner.` },
    { until: 21, title: "Cash, Customer, and Owner-Time Visibility", action: `Connect ${r1} to cash flow, customer experience, operating pressure, and owner time. Remove one avoidable leakage point.` },
    { until: 28, title: "Leak 2 Stabilization", action: `Move to ${r2}. Document where this area creates delay, confusion, waste, or inconsistent execution.` },
    { until: 35, title: "Operating Rhythm", action: `Install a weekly review rhythm: numbers, blockers, decisions, owners, deadlines, and follow-up evidence.` },
    { until: 42, title: "Leak 3 Stabilization", action: `Treat ${r3}. Decide which process, role, customer journey, or dashboard must be clarified first.` },
    { until: 49, title: "People and Accountability", action: `Clarify ownership: who owns the number, who reports it, who decides, who escalates, and who follows up.` },
    { until: 56, title: "Revenue and Customer Flow", action: `Inspect the flow from lead source to customer decision, delivery, retention, referral, and repeat business.` },
    { until: 63, title: "Systems and Dashboard Visibility", action: `Build a simple weekly dashboard across revenue, cash, customers, operations, people, and risk.` },
    { until: 70, title: "Risk and Continuity Protection", action: `Identify the top business risks that could harm cash, delivery, reputation, compliance, or continuity.` },
    { until: 77, title: "Use the Strongest Leverage", action: `Use ${s1} as a stabilizer. Turn it into a repeatable operating standard that supports weaker areas.` },
    { until: 84, title: "Scale Readiness", action: `Check whether the business can handle more customers, more marketing, more staff, or more demand without breaking.` },
    { until: 90, title: "Executive Revamp Decision", action: `Review the 90-day progress, compare the before/after pattern, and choose the next treatment pathway.` },
  ];

  const arPhases = [
    { until: 7, title: "فحص الواقع التنفيذي", action: `راجع التقرير كاملًا، ثبّت أكبر ثلاثة تسريبات، وحدد من يملك أول تصحيح في ${r1}.` },
    { until: 14, title: "تثبيت التسريب الأول", action: `ركز على ${r1}. حدد العرض الظاهر، السبب الجذري، مؤشرًا أسبوعيًا، ومالكًا واحدًا للتصحيح.` },
    { until: 21, title: "وضوح النقد والعملاء ووقت المالك", action: `اربط ${r1} بالتدفق النقدي وتجربة العملاء والضغط التشغيلي ووقت المالك. أزل نقطة تسريب واحدة يمكن تجنبها.` },
    { until: 28, title: "تثبيت التسريب الثاني", action: `انتقل إلى ${r2}. وثّق أين يخلق هذا المجال تأخيرًا أو ارتباكًا أو هدرًا أو تنفيذًا غير ثابت.` },
    { until: 35, title: "إيقاع التشغيل", action: `ركّب مراجعة أسبوعية ثابتة: أرقام، عوائق، قرارات، ملاك، مواعيد، ودليل متابعة.` },
    { until: 42, title: "تثبيت التسريب الثالث", action: `عالج ${r3}. حدد أي عملية أو دور أو رحلة عميل أو لوحة قياس يجب توضيحها أولًا.` },
    { until: 49, title: "الأفراد والمساءلة", action: `وضح الملكية: من يملك الرقم، من يرفعه، من يقرر، من يصعّد، ومن يتابع.` },
    { until: 56, title: "تدفق الإيرادات والعملاء", action: `افحص التدفق من مصدر العميل المحتمل إلى القرار، التسليم، الاحتفاظ، الإحالة، والشراء المتكرر.` },
    { until: 63, title: "الأنظمة ووضوح اللوحة", action: `ابنِ لوحة أسبوعية بسيطة عبر الإيرادات، النقد، العملاء، العمليات، الأشخاص، والمخاطر.` },
    { until: 70, title: "حماية المخاطر والاستمرارية", action: `حدد أهم المخاطر التي قد تضرب النقد أو التسليم أو السمعة أو الامتثال أو استمرارية العمل.` },
    { until: 77, title: "استخدم أقوى رافعة", action: `استخدم ${s1} كرافعة تثبيت. حوّلها إلى معيار تشغيل متكرر يدعم المجالات الأضعف.` },
    { until: 84, title: "جاهزية التوسع", action: `افحص هل تستطيع الشركة تحمل عملاء أكثر أو تسويق أكثر أو موظفين أكثر أو طلبًا أكبر دون أن تنكسر.` },
    { until: 90, title: "قرار إعادة البناء التنفيذي", action: `راجع تقدم 90 يومًا، قارن النمط قبل وبعد، واختر مسار العلاج التالي.` },
  ];

  const phases = ar ? arPhases : enPhases;
  const phase = phases.find((p) => day <= p.until) || phases[phases.length - 1];
  const dayInWeek = ((day - 1) % 7) + 1;

  const dailyFocusEn = [
    "Review evidence and write the current fact.",
    "Identify one leakage point.",
    "Assign one owner.",
    "Choose one metric.",
    "Execute one correction.",
    "Review progress.",
    "Document the lesson and next action.",
  ];

  const dailyFocusAr = [
    "راجع الدليل واكتب الحقيقة الحالية.",
    "حدد نقطة تسريب واحدة.",
    "عيّن مالكًا واحدًا.",
    "اختر مؤشرًا واحدًا.",
    "نفّذ تصحيحًا واحدًا.",
    "راجع التقدم.",
    "وثّق الدرس والخطوة التالية.",
  ];

  return {
    day,
    week: Math.ceil(day / 7),
    phase: phase.title,
    action: `${phase.action} ${ar ? dailyFocusAr[dayInWeek - 1] : dailyFocusEn[dayInWeek - 1]}`,
  };
}

function RoadmapTable({ rows, strengths, lang }: { rows: AreaRow[]; strengths: AreaRow[]; lang: Language }) {
  const ar = lang === "ar";
  const risks = sortByWeakness(rows).slice(0, 3);
  const days = Array.from({ length: 90 }, (_, i) => roadmapAction(i + 1, risks, strengths, lang));
  const chunks = [days.slice(0, 30), days.slice(30, 60), days.slice(60, 90)];

  return (
    <>
      {chunks.map((chunk, chunkIndex) => (
        <section key={chunkIndex} className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <SectionTitle
            ar={ar}
            eyebrow={ar ? "خارطة 90 يومًا" : "90-Day Roadmap"}
            title={
              ar
                ? chunkIndex === 0
                  ? "الأيام 1–30: إيقاف التسريبات الحرجة"
                  : chunkIndex === 1
                  ? "الأيام 31–60: بناء إيقاع التشغيل"
                  : "الأيام 61–90: التثبيت والاستعداد للنمو"
                : chunkIndex === 0
                ? "Days 1–30: Stop the Critical Leaks"
                : chunkIndex === 1
                ? "Days 31–60: Build Operating Rhythm"
                : "Days 61–90: Stabilize and Prepare to Grow"
            }
            subtitle={
              ar
                ? "كل يوم له إجراء تنفيذي صغير. لا تعقيد، لا تنظير، ولا إصلاح عشوائي قبل التشخيص."
                : "Each day has one executive action. No overcomplication, no theory overload, and no random fixing before diagnosis."
            }
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="w-16 px-3 py-3 text-start text-xs font-black uppercase tracking-widest">{ar ? "اليوم" : "Day"}</th>
                  <th className="w-36 px-3 py-3 text-start text-xs font-black uppercase tracking-widest">{ar ? "المهمة" : "Mission"}</th>
                  <th className="px-3 py-3 text-start text-xs font-black uppercase tracking-widest">{ar ? "الإجراء التنفيذي" : "Executive Action"}</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((d) => (
                  <tr key={d.day} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2 font-black text-slate-950">{d.day}</td>
                    <td className="px-3 py-2 font-bold text-slate-700">{d.phase}</td>
                    <td className="px-3 py-2 leading-relaxed text-slate-600">{d.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

function PathwayCard({ title, body, ar }: { title: string; body: string; ar: boolean }) {
  return (
    <div className="break-inside-avoid rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function treatmentPathways(weakest: AreaRow[], ar: boolean) {
  const names = weakest.map((r) => r.competencyId);
  const has = (fragment: string) => names.some((n) => n.includes(fragment));

  const out = [
    {
      title: ar ? "جلسة تفسير صحة الشركة" : "Business Health Interpretation Session",
      body: ar
        ? "جلسة تنفيذية لمراجعة النتائج، تحديد التسريبات، واختيار أولويات العلاج قبل أي قرار استثماري أو تدريبي."
        : "An executive session to review the findings, identify the leakage pattern, and choose treatment priorities before investing in training, systems, or expansion.",
    },
  ];

  if (has("revenue") || has("marketing") || has("customer")) {
    out.push({
      title: ar ? "مسار نمو الإيرادات والعملاء" : "Revenue and Customer Growth Pathway",
      body: ar
        ? "مناسب إذا كانت التسريبات في محرك الإيرادات، جودة العملاء، تجربة العملاء، أو الاحتفاظ بهم."
        : "Best when the leaks are in revenue engine, lead quality, customer experience, conversion, or retention.",
    });
  }

  if (has("people") || has("leadership") || has("operations")) {
    out.push({
      title: ar ? "مسار الأنظمة والمساءلة" : "Systems and Accountability Pathway",
      body: ar
        ? "مناسب إذا كانت الشركة تعتمد على المالك أو تعاني من أدوار غير واضحة أو تنفيذ غير ثابت."
        : "Best when the business depends too heavily on the owner or suffers from unclear roles, weak accountability, or inconsistent execution.",
    });
  }

  if (has("cash") || has("products")) {
    out.push({
      title: ar ? "مسار النقد والربحية" : "Cash and Profitability Pathway",
      body: ar
        ? "مناسب إذا كانت الإيرادات موجودة لكن الربح أو النقد أو الهوامش لا تعكس حجم الجهد."
        : "Best when revenue exists but cash, margin, and profitability do not reflect the amount of effort.",
    });
  }

  if (has("risk") || has("growth") || has("technology")) {
    out.push({
      title: ar ? "مسار الرؤية والمخاطر وجاهزية النمو" : "Visibility, Risk, and Growth Readiness Pathway",
      body: ar
        ? "مناسب إذا كانت الإدارة لا ترى الأرقام بوضوح أو إذا كان النمو قد يخلق فوضى أو مخاطر جديدة."
        : "Best when management visibility is weak, risks are hidden, or growth could create chaos instead of strength.",
    });
  }

  return out.slice(0, 5);
}

export default async function PremiumReportPage({ params, searchParams }: PageProps) {
  const slug = params.slug;
  const attemptId = searchParams?.attemptId?.trim() || "";
  const urlLang = (searchParams?.lang || "").trim();

  if (!attemptId) return <div className="p-10 text-center">Missing attemptId</div>;

  const supabase = getSupabaseAdmin();

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  const lang: Language = pickLang((attempt as any)?.language, urlLang);
  const ar = lang === "ar";

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center" dir={ar ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-black text-slate-900">{ar ? "التقرير غير موجود" : "Report not found"}</h1>
          <Link className="mt-6 inline-flex rounded-2xl bg-slate-900 px-6 py-3 font-black text-white" href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}>
            {ar ? "العودة إلى النتائج" : "Back to Results"}
          </Link>
        </div>
      </div>
    );
  }

  if (!isBusinessHealthAssessment(slug, (attempt as any).assessment_id)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center" dir={ar ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-black text-slate-900">
            {ar ? "هذا التقرير الفاخر مخصص حاليًا لـ Business Health MRI فقط" : "This Premium Report V2 is currently built for the SME Business Health MRI only."}
          </h1>
          <p className="mt-3 text-slate-600">
            {ar ? "التقارير الأخرى لم يتم لمسها أو تغييرها." : "The other assessment reports were not touched or changed."}
          </p>
          <Link className="mt-6 inline-flex rounded-2xl bg-slate-900 px-6 py-3 font-black text-white" href={`/${slug}/report?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}>
            {ar ? "فتح التقرير العادي" : "Open Standard Report"}
          </Link>
        </div>
      </div>
    );
  }

  const assessment = await getAssessmentConfigServer(supabase, slug);

  const labelsFromConfig: Record<string, { en: string; ar: string }> = {};
  const comps = Array.isArray((assessment as any)?.config?.competencies)
    ? (assessment as any).config.competencies
    : [];

  for (const c of comps) {
    const id = canonicalAreaId(c?.id);
    if (!id) continue;
    labelsFromConfig[id] = {
      en: String(c?.en || ""),
      ar: String(c?.ar || ""),
    };
  }

  function labelFor(idRaw: string) {
    const id = canonicalAreaId(idRaw);
    const meta = labelsFromConfig[id] || AREA_LABELS[id];
    if (meta) return ar ? meta.ar || meta.en : meta.en || meta.ar;
    return id.replace(/_/g, " ");
  }

  const competencyResults = Array.isArray((attempt as any).competency_results)
    ? (attempt as any).competency_results
    : [];

  const rows: AreaRow[] = competencyResults.map((raw: any) => {
    const competencyId = canonicalAreaId(raw?.competencyId || raw?.key);
    const percentage = pct(raw?.percentage);
    return {
      competencyId,
      label: labelFor(competencyId),
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
  const identity = extractIdentity(attempt);
  const weakest = sortByWeakness(finalRows)[0];
  const strongest = sortByStrength(finalRows)[0];
  const topRisks = sortByWeakness(finalRows).slice(0, 3);
  const topStrengths = sortByStrength(finalRows).slice(0, 3);
  const treatmentRows = sortByWeakness(finalRows).slice(0, 6);
  const scoreZone = businessHealthLabel(overall, lang);
  const reportTitle = ar ? "التقرير الفاخر لصحة الشركات الصغيرة والمتوسطة" : "SME Business Health MRI — Premium Executive Report";

  const css = `
    [data-premium-report="true"] {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    [data-rtl="true"] * { direction: rtl; }
    [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important; }
    [data-rtl="false"] { direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important; }
    [data-rtl="false"] * { direction: ltr !important; unicode-bidi: isolate !important; }

    @page {
      size: A4;
      margin: 11mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-size: 10.2pt !important;
      }

      .print-hide { display: none !important; }

      main {
        max-width: none !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .premium-page {
        min-height: auto !important;
        box-shadow: none !important;
        border-radius: 14px !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
        padding: 14mm !important;
        margin: 0 0 8mm 0 !important;
      }

      .break-before-page {
        break-before: auto !important;
        page-break-before: auto !important;
      }

      .premium-cover {
        min-height: 270mm !important;
        border-radius: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        break-after: page !important;
        page-break-after: always !important;
        padding: 18mm !important;
      }

      .compact-print-text {
        font-size: 9pt !important;
        line-height: 1.32 !important;
      }

      .score-donut {
        width: 145px !important;
        height: 145px !important;
        border-width: 12px !important;
        box-shadow: none !important;
      }

      .score-donut-label {
        letter-spacing: .03em !important;
        max-width: 105px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        line-height: 1.1 !important;
        word-break: normal !important;
      }

      .brand-logo-box img {
        max-height: 34px !important;
        max-width: 135px !important;
      }

      table {
        page-break-inside: auto !important;
        font-size: 8.6pt !important;
      }

      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }

      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      th, td {
        padding-top: 5px !important;
        padding-bottom: 5px !important;
        line-height: 1.22 !important;
      }
    }
  `;

  const pathways = treatmentPathways(topRisks, ar);

  return (
    <div
      data-premium-report="true"
      data-rtl={ar ? "true" : "false"}
      dir={ar ? "rtl" : "ltr"}
      className={`min-h-screen bg-slate-100 text-slate-950 ${ar ? "text-right" : "text-left"}`}
      style={{
        fontFamily: ar
          ? "'Cairo','Tajawal','Noto Kufi Arabic',Arial,sans-serif"
          : "Arial, Helvetica, sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="print-hide sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-sm font-black text-slate-950">{reportTitle}</div>
            <div className="text-xs text-slate-500">{ar ? "رابط منفصل آمن للتقرير الفاخر" : "Safe separate premium-report route"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${slug}/report?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
              {ar ? "التقرير العادي" : "Standard Report"}
            </Link>
            <div className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
              {ar ? "استخدم Ctrl+P للحفظ PDF" : "Use Ctrl+P to Save PDF"}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* COVER */}
        <section className="premium-cover overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="w-full flex justify-between items-start gap-4">
              <BrandLogo dark ar={ar} />
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">{ar ? "تقرير سري" : "Confidential Report"}</div>
            </div>
            <div>
              <div className="inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-200">
                {ar ? "تقرير تنفيذي فاخر" : "Premium Executive Report"}
              </div>
              <h1 className="mt-8 max-w-4xl text-5xl font-black leading-tight tracking-tight sm:text-6xl">
                {ar ? "Business Health MRI للشركات الصغيرة والمتوسطة" : "SME Business Health MRI"}
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-relaxed text-blue-100">
                {ar
                  ? "تشخيص تنفيذي لصحة الشركة يكشف التسريبات، المخاطر، الاختناقات، وأولويات العلاج قبل ضخ المزيد من المال أو الوقت أو الجهد."
                  : "An executive business health diagnostic that reveals leaks, risks, bottlenecks, and treatment priorities before adding more money, time, people, or effort."}
              </p>
            </div>
            <div className={`rounded-[32px] p-5 text-center shadow-2xl ${tierRingClass(overallTier)}`}>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">{ar ? "درجة صحة الشركة" : "Business Health Score"}</div>
              <div className="mt-2 text-7xl font-black text-white">{overall}%</div>
              <div className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">{scoreZone}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MiniKpi dark label={ar ? "المشارك" : "Participant"} value={identity.fullName} sub={identity.email} />
            <MiniKpi dark label={ar ? "الشركة" : "Company"} value={identity.company} />
            <MiniKpi dark label={ar ? "رقم التقرير" : "Report ID"} value={shortAttemptId(attemptId)} sub={ar ? "للمراجعة الداخلية" : "For internal review"} />
            <MiniKpi dark label={ar ? "المجالات" : "Areas"} value="12" sub={ar ? "مؤشرًا حيويًا" : "Vital business areas"} />
          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/10 p-6">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{ar ? "الانطباع التنفيذي الأول" : "Executive First Impression"}</div>
            <p className="mt-3 max-w-5xl text-lg leading-relaxed text-blue-100">{executiveMeaning(overall, lang)}</p>
          </div>
        </section>

        {/* EXECUTIVE SNAPSHOT */}
        <section className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <SectionTitle
            ar={ar}
            eyebrow={ar ? "الملخص التنفيذي" : "Executive Diagnosis Snapshot"}
            title={ar ? "ما الذي يكشفه هذا التقرير؟" : "What this report reveals"}
            subtitle={
              ar
                ? "هذه الصفحة تجمع أهم النتائج التنفيذية قبل الدخول في التفاصيل. الهدف هو معرفة ما يجب علاجه أولًا، وليس قراءة تقرير طويل بلا قرار."
                : "This page captures the most important executive findings before the details. The goal is to know what to treat first, not to read a long report without a decision."
            }
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-[32px] bg-slate-950 p-6 text-white lg:col-span-1">
              <ScoreDonut score={overall} label={ar ? "صحة الشركة" : "Health"} tier={overallTier} />
              <div className={`mt-6 text-center text-lg font-black ${tierTextClass(overallTier)}`}>{scoreZone}</div>
              <p className="mt-3 text-center text-sm leading-relaxed text-blue-100">{executiveMeaning(overall, lang)}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:col-span-2">
              <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">{ar ? "أكبر تسريب خفي" : "Biggest Hidden Business Leak"}</div>
                <h3 className="mt-2 text-2xl font-black text-rose-950">{weakest?.label || "—"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-rose-900">{weakest ? areaMeaning(weakest, lang) : "—"}</p>
              </div>
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{ar ? "أقوى رافعة حالية" : "Strongest Current Leverage"}</div>
                <h3 className="mt-2 text-2xl font-black text-emerald-950">{strongest?.label || "—"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-900">{strongest ? areaMeaning(strongest, lang) : "—"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {topRisks.map((r, i) => (
              <div key={r.competencyId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  {ar ? `أولوية تثبيت ${i + 1}` : `Stabilization Priority ${i + 1}`}
                </div>
                <div className="mt-2 text-xl font-black text-slate-950">{r.label}</div>
                <div className="mt-2 text-sm font-bold text-slate-500">{r.percentage}% • {tierLabel(r.tier, lang)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* DASHBOARD */}
        <section className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <SectionTitle
            ar={ar}
            eyebrow={ar ? "لوحة المؤشرات الحيوية" : "Vital Signs Dashboard"}
            title={ar ? "صحة الشركة عبر 12 مجالًا" : "Business Health Across 12 Areas"}
            subtitle={
              ar
                ? "هذه اللوحة تُظهر أين الشركة صحية، أين تحتاج إلى تقوية، وأين توجد إشارات إنذار أو تسريبات حادة."
                : "This dashboard shows where the business is healthy, where it needs strengthening, and where warning signals or critical leaks are present."
            }
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {finalRows.map((row) => (
              <AreaBar key={row.competencyId} row={row} ar={ar} />
            ))}
          </div>
        </section>

        {/* SWOT / LEAKAGE MAP */}
        <section className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <SectionTitle
            ar={ar}
            eyebrow={ar ? "تحليل تنفيذي" : "Executive Analysis"}
            title={ar ? "SWOT لصحة الشركة وخريطة التسريبات" : "Business Health SWOT and Leakage Map"}
            subtitle={
              ar
                ? "الهدف ليس وصف الشركة فقط، بل تحويل النتائج إلى قرار: ما الذي نحميه، ما الذي نعالجه، وما الذي نستثمر فيه لاحقًا."
                : "The goal is not only to describe the business, but to turn the findings into decisions: what to protect, what to treat, and what to invest in next."
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="text-xl font-black text-emerald-950">{ar ? "نقاط القوة" : "Strengths"}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-emerald-900">
                {topStrengths.map((r) => <li key={r.competencyId}>• {r.label} — {r.percentage}%</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <h3 className="text-xl font-black text-rose-950">{ar ? "نقاط التسريب" : "Leaks"}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-rose-900">
                {topRisks.map((r) => <li key={r.competencyId}>• {r.label} — {r.percentage}%</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="text-xl font-black text-blue-950">{ar ? "الفرص" : "Opportunities"}</h3>
              <p className="mt-3 text-sm leading-relaxed text-blue-900">
                {ar
                  ? "أكبر فرصة هي تحويل النتائج إلى نظام تشغيل أسبوعي: أرقام واضحة، ملاك محددون، مراجعة ثابتة، ومؤشرات لا تعتمد على ذاكرة المالك."
                  : "The biggest opportunity is to turn the findings into a weekly operating system: clear numbers, assigned owners, fixed review rhythm, and indicators that do not depend on the owner’s memory."}
              </p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-xl font-black text-amber-950">{ar ? "التهديدات" : "Threats"}</h3>
              <p className="mt-3 text-sm leading-relaxed text-amber-900">
                {ar
                  ? "الخطر الحقيقي أن تستمر الشركة في العمل بجهد أعلى دون علاج التسريبات الأساسية، فيتحول النمو إلى ضغط إضافي بدل أن يصبح قوة."
                  : "The real threat is that the company keeps working harder without treating the core leaks, turning growth into additional pressure instead of strength."}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-slate-950 p-6 text-white">
            <h3 className="text-2xl font-black text-amber-200">{ar ? "خريطة التسريب" : "Leakage Map"}</h3>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              {ar
                ? `الأولوية الأولى (${topRisks[0]?.label || "—"}) قد تؤثر على النقد والعملاء والتنفيذ ووقت المالك. الأولوية الثانية (${topRisks[1]?.label || "—"}) قد تضغط على استقرار النظام. الأولوية الثالثة (${topRisks[2]?.label || "—"}) قد تحد من جاهزية النمو.`
                : `The first priority (${topRisks[0]?.label || "—"}) may affect cash, customers, execution, and owner time. The second priority (${topRisks[1]?.label || "—"}) may pressure operating stability. The third priority (${topRisks[2]?.label || "—"}) may limit growth readiness.`}
            </p>
          </div>
        </section>

        {/* TREATMENT PAGES */}
        {treatmentRows.map((row, i) => (
          <TreatmentCard key={row.competencyId} row={row} index={i} lang={lang} />
        ))}

        {/* 90 DAY ROADMAP */}
        <RoadmapTable rows={finalRows} strengths={topStrengths} lang={lang} />

        {/* PATHWAYS */}
        <section className="premium-page break-before-page rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <SectionTitle
            ar={ar}
            eyebrow={ar ? "الخطوة التالية" : "Next Treatment Pathways"}
            title={ar ? "ما المسار العلاجي المناسب بعد هذا التقرير؟" : "Which treatment pathway should follow this report?"}
            subtitle={
              ar
                ? "هذا التقرير لا ينتهي عند التشخيص. قيمته الكبرى أنه يوضح المسار التالي: جلسة تفسير، خارطة إعادة بناء، أو تقييمات أعمق للفريق والمبيعات والأنظمة."
                : "This report does not end with diagnosis. Its greatest value is clarifying the next pathway: interpretation session, business revamp roadmap, or deeper team, sales, and systems diagnostics."
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pathways.map((p) => (
              <PathwayCard key={p.title} title={p.title} body={p.body} ar={ar} />
            ))}
          </div>

          <div className="mt-7 rounded-[32px] bg-gradient-to-br from-slate-950 to-blue-950 p-7 text-white">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{ar ? "قرار تنفيذي" : "Executive Decision"}</div>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              {ar ? "لا تضخ حلولًا جديدة قبل علاج التسريبات القديمة." : "Do not add new solutions before treating old leaks."}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-blue-100">
              {ar
                ? "قبل الاستثمار في مبيعات أكثر، موظفين أكثر، تسويق أكثر، أو توسع أكبر، استخدم هذا التقرير لاختيار أول مسار علاج يحمي الشركة من تكرار نفس التسريبات."
                : "Before investing in more sales, more staff, more marketing, or more expansion, use this report to choose the first treatment pathway that prevents the business from repeating the same leaks."}
            </p>
          </div>
        </section>

        {/* FINAL PAGE */}
        <section className="premium-page break-before-page flex flex-col justify-between rounded-[32px] bg-slate-950 p-8 text-white shadow-sm">
          <div>
            <div className="inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-200">
              {ar ? "نهاية التقرير" : "End of Report"}
            </div>
            <h2 className="mt-8 max-w-4xl text-5xl font-black leading-tight">
              {ar ? "التشخيص لا يغيّر الشركة. القرار التنفيذي بعد التشخيص هو الذي يغيّرها." : "Diagnosis does not change the business. The executive decision after diagnosis does."}
            </h2>
            <p className="mt-5 max-w-4xl text-lg leading-relaxed text-blue-100">
              {ar
                ? "استخدم هذا التقرير كخريطة قرار. اختر أول تسريب، عيّن مالكًا واضحًا، اربطه بمؤشر، وابدأ 90 يومًا من العلاج المنظم."
                : "Use this report as a decision map. Choose the first leak, assign a clear owner, connect it to a metric, and begin 90 days of structured treatment."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniKpi dark label={ar ? "أكبر تسريب" : "Biggest Leak"} value={weakest?.label || "—"} />
            <MiniKpi dark label={ar ? "أقوى رافعة" : "Strongest Leverage"} value={strongest?.label || "—"} />
            <MiniKpi dark tone={overallTier} label={ar ? "درجة الصحة" : "Health Score"} value={`${overall}%`} sub={scoreZone} />
          </div>

          <div className="border-t border-white/10 pt-5 text-sm text-blue-100">
            <BrandLogo dark ar={ar} />
            <div className="mt-3">{ar ? "Level Up Business Consulting — تقرير تشخيصي تنفيذي" : "Level Up Business Consulting — Executive Diagnostic Report"}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
