// FILE: app/(site)/[slug]/report/page.tsx
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

// ======================================================
// SLUG-COMPATIBLE OUTDOOR SALES REPORT
// Safe replacement for: app/(site)/[slug]/report/page.tsx
// Uses: params.slug + searchParams.attemptId
// Does NOT touch quiz, scoring, login, Supabase schema, timer, or randomization.
// ======================================================

const MRI_CHECKOUT_URL = "PASTE_NEW_ZENLER_MRI_LINK_HERE";

type PageProps = {
  params: { slug: string };
  searchParams?: { attemptId?: string; lang?: string; v?: string };
};

type CompetencyRow = {
  competencyId: string;
  label: string;
  percentage: number;
  tier: Tier;
  score?: number;
  maxScore?: number;
};

const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },

  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation", ar: "العقلية والتحفيز" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Handling Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Handling Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
};

const TIER_LABELS: Record<Tier, { en: string; ar: string }> = {
  Strength: { en: "Strength", ar: "نقطة قوة" },
  Opportunity: { en: "Opportunity", ar: "فرصة تطوير" },
  Threat: { en: "Threat", ar: "منطقة خطر" },
  Weakness: { en: "Weakness", ar: "نقطة ضعف" },
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeCompetencySafe(raw: any) {
  const id = normalizeCompetencyId(String(raw || ""));
  if (id === "destroying_objections") return "handling_objections";
  return id;
}

function pct(n: any) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function pickLang(attemptLang?: string | null, urlLang?: string | null): Language {
  const l = (urlLang || attemptLang || "en").toLowerCase();
  return l === "ar" ? "ar" : "en";
}

function isMriReport(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("mri") || a.includes("mri");
}

function shortAttemptId(id: string) {
  const x = String(id || "");
  return x ? x.slice(0, 8) : "";
}

function getTierLabel(tier: Tier, lang: Language) {
  const meta = TIER_LABELS[tier] || { en: String(tier), ar: String(tier) };
  return lang === "ar" ? meta.ar : meta.en;
}

function tierBadgeClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Threat":
      return "bg-amber-500 text-white";
    case "Weakness":
    default:
      return "bg-rose-600 text-white";
  }
}

function tierSoftClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "border-emerald-200 bg-emerald-50";
    case "Opportunity":
      return "border-blue-200 bg-blue-50";
    case "Threat":
      return "border-amber-200 bg-amber-50";
    case "Weakness":
    default:
      return "border-rose-200 bg-rose-50";
  }
}

function tierTextClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "text-emerald-700";
    case "Opportunity":
      return "text-blue-700";
    case "Threat":
      return "text-amber-700";
    case "Weakness":
    default:
      return "text-rose-700";
  }
}

function healthLabel(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "منطقة أداء قوية";
    if (overall >= 50) return "منطقة فرصة واضحة";
    if (overall >= 30) return "منطقة إنذار تجاري";
    return "منطقة تسريب حاد";
  }

  if (overall >= 75) return "Strong Performance Zone";
  if (overall >= 50) return "Clear Opportunity Zone";
  if (overall >= 30) return "Commercial Warning Zone";
  return "High Leakage Zone";
}

function commercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") {
      return `تشير نتيجة ${label} إلى أن هذا الجانب يدعم أداءك الحالي ويمكن استخدامه كنقطة ارتكاز لرفع بقية النتائج.`;
    }
    if (tier === "Opportunity") {
      return `تشير نتيجة ${label} إلى وجود أساس جيد، لكن الأداء ما زال غير ثابت بما يكفي لحماية كل فرصة تجارية.`;
    }
    if (tier === "Threat") {
      return `تشير نتيجة ${label} إلى منطقة قد تُسبب تسريبًا في الفرص إذا لم يتم التعامل معها بسرعة وبشكل منظم.`;
    }
    return `تشير نتيجة ${label} إلى فجوة واضحة قد تؤثر على المحادثات والصفقات والمتابعة إذا بقيت دون علاج.`;
  }

  if (tier === "Strength") {
    return `${label} is currently supporting your performance. It can become an anchor strength that helps lift the rest of your sales behavior.`;
  }
  if (tier === "Opportunity") {
    return `${label} has a useful foundation, but it is not yet consistent enough to protect every commercial opportunity.`;
  }
  if (tier === "Threat") {
    return `${label} is creating a warning signal. If left untreated, it may quietly leak opportunities, momentum, or follow-up discipline.`;
  }
  return `${label} is showing a clear gap. This area may be affecting conversations, deal movement, or buyer confidence more than you realize.`;
}

function overallCommercialMeaning(overall: number, tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") {
      return "الصورة العامة قوية، لكن القوة لا تعني التوقف. المطلوب الآن هو تحويل السلوك القوي إلى نظام يومي ثابت.";
    }
    if (tier === "Opportunity") {
      return "الصورة العامة جيدة لكنها غير مكتملة. لديك أساس يمكن البناء عليه، لكن بعض التسريبات قد تمنع الأداء من الوصول إلى مستوى أعلى.";
    }
    if (tier === "Threat") {
      return "الصورة العامة تُظهر إشارات إنذار. هناك تسريب محتمل في بعض السلوكيات البيعية يحتاج إلى علاج قبل أن يتحول إلى نمط ثابت.";
    }
    return "الصورة العامة تُظهر فجوة واضحة. هذا لا يعني الفشل، لكنه يعني أن الأداء يحتاج إلى خطة علاج عملية ومنظمة بدل الاعتماد على المحاولة والتخمين.";
  }

  if (tier === "Strength") {
    return "Your overall sales health is strong, but strength is not the finish line. The next step is turning strong behaviors into a repeatable system.";
  }
  if (tier === "Opportunity") {
    return "Your overall sales health has a useful base, but it is not yet fully protected. Some hidden leakage may still be limiting your results.";
  }
  if (tier === "Threat") {
    return "Your overall sales health is showing warning signals. Some sales behaviors may be leaking momentum and need correction before they become permanent habits.";
  }
  return "Your overall sales health is showing a clear performance gap. This is not failure, but it does mean you need a practical treatment plan instead of more guessing.";
}

function shortDiagnosis(tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "مؤشر صحي قوي يمكن البناء عليه.";
    if (tier === "Opportunity") return "مؤشر قابل للتحسين بسرعة مع تدريب مركز.";
    if (tier === "Threat") return "إشارة إنذار تحتاج إلى تدخل عملي سريع.";
    return "فجوة أداء واضحة تحتاج إلى إعادة بناء منهجية.";
  }

  if (tier === "Strength") return "A healthy signal that can be protected and used as leverage.";
  if (tier === "Opportunity") return "A workable signal that can improve quickly with focused practice.";
  if (tier === "Threat") return "A warning signal that needs immediate practical correction.";
  return "A clear performance gap that needs structured rebuilding.";
}

function cleanRecommendation(input: string) {
  let text = String(input || "").trim();
  text = text.replace(/\*\*/g, "");
  text = text.replace(/^[•●▪◦✔✓✅✦★☆▶►→⚡📊📋🧠🔍🎯💡📞🛡️📝📌🧩🧭🧪📈🔬🚨⏸️🎙️🤝🔧\s]+/, "");
  text = text.replace(/^\d{1,2}[.)\-:]\s*/, "");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailLike(s: string) {
  return EMAIL_RE.test(String(s || "").trim());
}

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

  const nameCandidates: string[] = [];
  const emailCandidates: string[] = [];
  const companyCandidates: string[] = [];

  for (const b of blocks) {
    nameCandidates.push(
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

    emailCandidates.push(
      pickFirstNonEmpty(
        b?.user_email,
        b?.email,
        b?.participant_email,
        b?.candidate_email,
        b?.work_email,
        b?.workEmail
      )
    );

    companyCandidates.push(
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

  const rawName = pickFirstNonEmpty(
    ...nameCandidates,
    dig(attempt, "participant.full_name"),
    dig(attempt, "registration.full_name"),
    dig(attempt, "contact.name")
  );

  const rawEmail = pickFirstNonEmpty(
    ...emailCandidates,
    dig(attempt, "participant.email"),
    dig(attempt, "registration.email"),
    dig(attempt, "contact.email")
  );

  const rawCompany = pickFirstNonEmpty(
    ...companyCandidates,
    dig(attempt, "participant.company"),
    dig(attempt, "registration.company"),
    dig(attempt, "organization.name")
  );

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";

  let fullName = rawName.trim() || "—";
  if ((fullName === "—" || !fullName) && email !== "—") {
    const m = email.match(/^([^@]+)/);
    if (m) {
      fullName = m[1].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
    }
  }

  return {
    fullName,
    email,
    company: rawCompany.trim() || "—",
  };
}

async function getAssessmentConfigServer(supabase: any, slug: string) {
  const routeSlug = String(slug || "").toLowerCase();

  const bySlug = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", routeSlug)
    .maybeSingle();

  if (bySlug?.data) return bySlug.data;

  const ROUTE_TO_ID: Record<string, string> = {
    scan: "outdoor_sales_scan",
    mri: "outdoor_sales_mri",
    "outdoor-scan": "outdoor_sales_scan",
    "outdoor-mri": "outdoor_sales_mri",
  };

  const assessmentId = ROUTE_TO_ID[routeSlug] || routeSlug;

  const byId = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();

  return byId?.data ?? null;
}

function sortRows(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage);
}

function getWeakest(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage)[0] || null;
}

function getStrongest(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage)[0] || null;
}

function getPriorityRows(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
}

function sectionTitle(text: string, sub?: string) {
  return (
    <div className="pdf-avoid-break mb-5">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight rtl-text">
        {text}
      </h2>
      {sub && <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed rtl-text">{sub}</p>}
    </div>
  );
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const slug = params.slug;
  const attemptId = searchParams?.attemptId?.trim() || "";
  const urlLang = (searchParams?.lang || "").trim();

  if (!attemptId) {
    return <div className="p-10 text-center">Missing attemptId</div>;
  }

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
      <div className="min-h-screen bg-slate-50 p-8 text-center" data-rtl={ar ? "true" : "false"}>
        <div className="max-w-2xl mx-auto bg-white border rounded-3xl shadow-xl p-8">
          <h1 className="text-3xl font-black text-slate-900">
            {ar ? "التقرير غير موجود" : "Report not found"}
          </h1>
          <Link
            className="mt-6 inline-flex rounded-2xl bg-slate-900 text-white px-6 py-3 font-black"
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
          >
            {ar ? "العودة إلى النتائج" : "Back to Results"}
          </Link>
        </div>
      </div>
    );
  }

  const assessment = await getAssessmentConfigServer(supabase, slug);
  const mri = isMriReport(slug, (attempt as any).assessment_id);

  const labelsFromConfig: Record<string, { en: string; ar: string }> = {};
  const comps = Array.isArray((assessment as any)?.config?.competencies)
    ? (assessment as any).config.competencies
    : [];

  for (const c of comps) {
    const id = normalizeCompetencySafe(c?.id);
    if (!id) continue;
    labelsFromConfig[id] = {
      en: String(c?.en || ""),
      ar: String(c?.ar || ""),
    };
  }

  function getCompetencyLabel(competencyId: string): string {
    const key = normalizeCompetencySafe(competencyId);
    const meta = labelsFromConfig[key] || COMPETENCY_LABELS[key] || null;

    if (meta) {
      return ar ? meta.ar || meta.en || key : meta.en || meta.ar || key;
    }

    return key.replace(/_/g, " ");
  }

  const competencyResults = Array.isArray((attempt as any).competency_results)
    ? (attempt as any).competency_results
    : [];

  const rows: CompetencyRow[] = competencyResults.map((raw: any) => {
    const competencyId = normalizeCompetencySafe(raw?.competencyId || raw?.key);
    const percentage = pct(raw?.percentage);
    return {
      competencyId,
      label: getCompetencyLabel(competencyId),
      percentage,
      tier: tierFromPercentage(percentage),
      score: Number(raw?.score || 0),
      maxScore: Number(raw?.maxScore || 0),
    };
  });

  const sortedRows = sortRows(rows);
  const strongest = getStrongest(rows);
  const weakest = getWeakest(rows);
  const priorityRows = getPriorityRows(rows);

  const strengths = rows.filter((r) => r.tier === "Strength");
  const opportunities = rows.filter((r) => r.tier === "Opportunity");
  const threats = rows.filter((r) => r.tier === "Threat");
  const weaknesses = rows.filter((r) => r.tier === "Weakness");

  const overall = pct((attempt as any).total_percentage);
  const overallTier: Tier = tierFromPercentage(overall);
  const identity = extractIdentity(attempt);

  const reportTitle =
    (ar
      ? (assessment as any)?.title_ar || (assessment as any)?.name_ar || ""
      : (assessment as any)?.title_en || (assessment as any)?.name_en || "") ||
    (mri
      ? ar
        ? "تقرير Outdoor Sales MRI المتقدم"
        : "Advanced Outdoor Sales MRI Report"
      : ar
      ? "فحص المبيعات الميدانية"
      : "Outdoor Sales Scan");

  const hardRtlCss = `
    [data-rtl="true"] * { direction: rtl !important; }
    [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important; }
    [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
    [data-rtl="false"] .rtl-text { text-align: left !important; }
    @media print {
      .print-hide { display: none !important; }
      .pdf-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
      .pdf-page-break { break-before: page !important; page-break-before: always !important; }
      body { background: white !important; }
    }
  `;

  const t = {
    en: {
      back: "Back to Results",
      printNote: "For best PDF export: choose Save as PDF, turn on background graphics, and turn off browser headers and footers.",
      badge: mri ? "Advanced Diagnostic Report" : "Sales Performance Blood Test",
      subtitle: mri
        ? "A full diagnostic and treatment tool for your sales performance body."
        : "A fast diagnostic scan of your sales performance body — like a blood test for field sales.",
      overall: "Overall Sales Health Score",
      overallMarker: "Overall Sales Health Index",
      participant: "Participant Identity",
      health: "Sales Health Zone",
      bloodPanel: mri ? "Competency Diagnostic Panel" : "Sales Health Panel: Overall Score + 7 Core Markers",
      bloodPanelSub:
        "This panel combines your overall sales health score with the seven core markers that reveal where performance is strong, where it is leaking, and what needs treatment.",
      strongest: "Strongest Signal",
      weakest: "Biggest Hidden Revenue Leak",
      commercial: "Commercial Interpretation",
      swot: "Strategic SWOT Analysis",
      actions: "Priority Execution Plan",
      prescriptionHeadline: "Your Scan Is the Blood Test. The MRI Gives You the Prescription.",
      prescriptionSubhead: "The Advanced Outdoor Sales MRI is a full diagnostic and treatment tool for your sales performance body.",
      prescriptionCta: "Get My Full Sales MRI & 90-Day Prescription",
      enterpriseTitle: "For Sales Managers & Business Owners",
      enterpriseCta: "Diagnose the Team Before You Train the Team",
    },
    ar: {
      back: "العودة إلى النتائج",
      printNote: "لأفضل تصدير PDF: اختر Save as PDF، فعّل Background graphics، وألغِ ترويسات وتذييلات المتصفح.",
      badge: mri ? "تقرير تشخيصي متقدم" : "فحص دم لأداء المبيعات",
      subtitle: mri
        ? "أداة تشخيص وعلاج كاملة لجسم أدائك البيعي."
        : "فحص تشخيصي سريع لجسم أدائك البيعي — كأنه تحليل دم مهني للمبيعات الميدانية.",
      overall: "مؤشر الصحة البيعية العام",
      overallMarker: "مؤشر الصحة البيعية العام",
      participant: "هوية المشارك",
      health: "منطقة الصحة البيعية",
      bloodPanel: mri ? "لوحة التشخيص المتقدمة" : "لوحة الصحة البيعية: النتيجة العامة + ٧ مؤشرات أساسية",
      bloodPanelSub:
        "تجمع هذه اللوحة بين مؤشر الصحة البيعية العام والسبعة مؤشرات الأساسية التي تكشف أين يقوى الأداء، أين يحدث التسريب، وما الذي يحتاج إلى علاج.",
      strongest: "أقوى مؤشر",
      weakest: "أكبر تسريب مخفي للفرص",
      commercial: "التفسير التجاري",
      swot: "تحليل SWOT الاستراتيجي",
      actions: "خطة التنفيذ ذات الأولوية",
      prescriptionHeadline: "الفحص هو تحليل الدم. أما الـ MRI فيعطيك الوصفة العلاجية.",
      prescriptionSubhead: "تقرير Advanced Outdoor Sales MRI هو أداة تشخيص وعلاج كاملة لجسم أدائك البيعي.",
      prescriptionCta: "احصل على تقرير MRI الكامل ووصفة الـ ٩٠ يومًا",
      enterpriseTitle: "لمديري المبيعات وأصحاب الشركات",
      enterpriseCta: "شخّص الفريق قبل أن تدرّبه",
    },
  }[lang];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-rtl={ar ? "true" : "false"}
      className="scan-pdf-container min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900"
    >
      <style dangerouslySetInnerHTML={{ __html: hardRtlCss }} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* TOP BAR */}
        <div className="print-hide flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-md p-4">
          <div className="text-xs sm:text-sm text-slate-600 font-bold rtl-text">
            {ar ? "معرّف التقرير" : "Report ID"}:{" "}
            <span className="font-mono text-blue-700 force-ltr">{shortAttemptId(attemptId)}</span>
          </div>

          <Link
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-3 transition-all shadow-lg text-sm min-h-[44px]"
          >
            {t.back}
          </Link>
        </div>

        {/* COVER */}
        <section className="pdf-avoid-break relative overflow-hidden rounded-3xl shadow-2xl border border-slate-800/10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-400 blur-3xl" />
          </div>

          <div className="relative p-7 sm:p-10 md:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_.7fr] gap-8 lg:gap-12 items-center">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-black text-blue-100 uppercase tracking-widest">
                  🧪 {t.badge}
                </div>

                <div>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight rtl-text">
                    {reportTitle}
                  </h1>
                  <p className="mt-4 text-base sm:text-xl text-blue-100 leading-relaxed max-w-3xl rtl-text">
                    {t.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InfoChip label={ar ? "الاسم" : "Name"} value={identity.fullName} />
                  <InfoChip label={ar ? "الشركة" : "Company"} value={identity.company} />
                  <InfoChip label={ar ? "البريد" : "Email"} value={identity.email} forceLtr />
                </div>
              </div>

              <div className="relative flex justify-center">
                <div className="relative h-64 w-64 sm:h-72 sm:w-72 rounded-full border-[12px] border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <div className="text-center">
                    <div className="text-6xl sm:text-7xl font-black text-white">{overall}%</div>
                    <div className="mt-2 text-xs font-black uppercase tracking-widest text-blue-100">
                      {t.overall}
                    </div>
                    <div className="mt-4">
                      <span className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${tierBadgeClass(overallTier)}`}>
                        {getTierLabel(overallTier, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="print-hide mt-7 text-xs sm:text-sm text-blue-100/80 rtl-text">
              {t.printNote}
            </p>
          </div>
        </section>

        {/* OVERALL DIAGNOSIS */}
        <section className="pdf-avoid-break rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(t.overall, ar ? "قراءة تشخيصية سريعة لما تكشفه النتيجة العامة." : "A quick diagnostic reading of what the overall score reveals.")}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-3xl bg-slate-950 text-white p-6 shadow-xl">
              <div className="text-sm font-black text-blue-200 uppercase tracking-widest">{t.health}</div>
              <div className="mt-3 text-3xl font-black rtl-text">{healthLabel(overall, lang)}</div>
              <div className="mt-4">
                <span className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${tierBadgeClass(overallTier)}`}>
                  {overall}% · {getTierLabel(overallTier, lang)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-6">
              <h3 className="text-xl font-black text-slate-950 rtl-text">
                {ar ? "ما الذي يعنيه هذا تجاريًا؟" : "What this means commercially"}
              </h3>
              <p className="mt-3 text-slate-700 leading-relaxed rtl-text">
                {overallCommercialMeaning(overall, overallTier, lang)}
              </p>
            </div>
          </div>
        </section>

        {/* SALES HEALTH PANEL */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(t.bloodPanel, t.bloodPanelSub)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`pdf-avoid-break rounded-3xl border-2 ${tierSoftClass(overallTier)} p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {ar ? "المؤشر العام" : "Overall Marker"}
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-950 rtl-text">{t.overallMarker}</h3>
                </div>

                <div className="text-right force-ltr">
                  <div className="text-3xl font-black text-slate-950">{overall}%</div>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(overallTier)}`}>
                    {getTierLabel(overallTier, lang)}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${overall}%` }} />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700 leading-relaxed rtl-text">
                {ar ? "القراءة المجمعة لكل مؤشرات أدائك البيعي." : "The combined reading of your full sales performance scan."}
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed rtl-text">
                {overallCommercialMeaning(overall, overallTier, lang)}
              </p>
            </div>

            {sortedRows.map((row, idx) => (
              <div key={`${row.competencyId}-${idx}`} className={`pdf-avoid-break rounded-3xl border-2 ${tierSoftClass(row.tier)} p-5 shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {ar ? "المؤشر" : `Marker ${idx + 1}`}
                    </div>
                    <h3 className="mt-1 text-xl font-black text-slate-950 rtl-text">{row.label}</h3>
                  </div>

                  <div className="text-right force-ltr">
                    <div className="text-3xl font-black text-slate-950">{row.percentage}%</div>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
                      {getTierLabel(row.tier, lang)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${row.percentage}%` }} />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700 leading-relaxed rtl-text">
                  {shortDiagnosis(row.tier, lang)}
                </p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed rtl-text">
                  {commercialMeaning(row.tier, row.label, lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* STRONGEST / WEAKEST */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SignalCard
            title={t.strongest}
            row={strongest}
            lang={lang}
            description={
              ar
                ? "هذه هي المنطقة التي يمكن استخدامها كرافعة للأداء، لأنها تكشف سلوكًا يدعم الثقة والتحكم في المحادثة."
                : "This is the area you can use as leverage because it reveals a behavior that supports confidence and sales control."
            }
          />

          <SignalCard
            title={t.weakest}
            row={weakest}
            lang={lang}
            description={
              ar
                ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه تسريب الفرص دون أن يكون واضحًا في البداية."
                : "This is not just a low score. It is often where opportunity leakage begins before it becomes obvious."
            }
          />
        </section>

        {/* COMMERCIAL INTERPRETATION */}
        <section className="pdf-avoid-break rounded-3xl bg-gradient-to-br from-slate-950 to-blue-950 text-white shadow-2xl p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight rtl-text">
              {t.commercial}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed rtl-text">
              {ar ? "قراءة تجارية مختصرة لما قد يحدث في الميدان." : "A practical commercial reading of what may be happening in the field."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DarkInsight
              title={ar ? "ما يشعر به العميل" : "What prospects experience"}
              body={
                ar
                  ? "العميل لا يرى درجاتك. هو يشعر بطريقة افتتاحك، عمق أسئلتك، صبرك مع الاعتراضات، وقدرتك على المتابعة."
                  : "Prospects do not see your score. They experience your opening, question depth, patience with objections, and follow-up discipline."
              }
            />

            <DarkInsight
              title={ar ? "أين يحدث التسريب" : "Where leakage happens"}
              body={
                weakest
                  ? ar
                    ? `أكبر تسريب ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تجعل الفرص تتوقف أو تضعف قبل أن تعرف السبب الحقيقي.`
                    : `The clearest leakage signal is currently connected to ${weakest.label}. This area may stall or weaken opportunities before the real reason is visible.`
                  : ar
                  ? "لا توجد بيانات كافية لتحديد منطقة التسريب."
                  : "There is not enough data to identify the leakage area."
              }
            />

            <DarkInsight
              title={ar ? "ما يجب إصلاحه أولًا" : "What to fix first"}
              body={
                ar
                  ? "لا تبدأ بإصلاح كل شيء. ابدأ بالمؤشر الأضعف، ثم المؤشر الواقع في منطقة الخطر، ثم حوّل نقاط القوة إلى روتين يومي."
                  : "Do not try to fix everything first. Start with the weakest marker, then the warning-zone marker, then turn your strengths into daily routines."
              }
            />
          </div>
        </section>

        {/* SWOT */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(
            t.swot,
            ar
              ? "ليس مجرد تصنيف للكفاءات، بل قراءة لما تعنيه النتائج في الأداء البيعي الحقيقي."
              : "Not just a category list — a practical reading of what the results mean in real sales performance."
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SwotBox
              title={ar ? "نقاط القوة" : "Strengths"}
              tier="Strength"
              rows={strengths}
              empty={ar ? "لا توجد نقاط قوة واضحة حتى الآن." : "No clear strengths yet."}
              explanation={
                ar
                  ? "هذه المناطق يمكن تحويلها إلى عادات ثابتة تدعم بقية الأداء."
                  : "These areas can be turned into repeatable habits that support the rest of the performance."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "الفرص" : "Opportunities"}
              tier="Opportunity"
              rows={opportunities}
              empty={ar ? "لا توجد فرص مصنفة هنا." : "No opportunities listed here."}
              explanation={
                ar
                  ? "هذه المناطق ليست ضعيفة، لكنها تحتاج إلى تنظيم وممارسة حتى تصبح مصدر قوة."
                  : "These areas are not broken, but they need structure and practice before they become strengths."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "التهديدات" : "Threats"}
              tier="Threat"
              rows={threats}
              empty={ar ? "لا توجد مناطق خطر واضحة." : "No clear threats listed."}
              explanation={
                ar
                  ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب تسريبًا في البايبلاين والمتابعة والثقة."
                  : "These are warning signals. If left untreated, they may create leakage in pipeline movement, follow-up, or confidence."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "نقاط الضعف" : "Weaknesses"}
              tier="Weakness"
              rows={weaknesses}
              empty={ar ? "لا توجد نقاط ضعف مصنفة هنا." : "No weaknesses listed here."}
              explanation={
                ar
                  ? "هذه المناطق تحتاج إلى تدخل مباشر، لأنها غالبًا تؤثر على الانطباع الأول أو تقدم الصفقة."
                  : "These areas need direct intervention because they often affect first impressions or deal progression."
              }
              lang={lang}
            />
          </div>
        </section>

        {/* PRIORITY ACTIONS */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(
            t.actions,
            ar
              ? "اخترنا لك التوصيات حسب المناطق الأضعف والأكثر خطورة، وليس بصورة عامة."
              : "These recommendations are selected from your weakest and highest-risk areas, not from generic advice."
          )}

          <div className="space-y-5">
            <ActionBlock
              index={1}
              title={ar ? "أولوية عامة" : "Overall Priority"}
              tier={overallTier}
              percentage={overall}
              recommendations={getRecommendations("overall_score", overallTier, lang)}
              lang={lang}
            />

            {priorityRows.map((row, idx) => (
              <ActionBlock
                key={row.competencyId}
                index={idx + 2}
                title={row.label}
                tier={row.tier}
                percentage={row.percentage}
                recommendations={getRecommendations(row.competencyId, row.tier, lang)}
                lang={lang}
              />
            ))}
          </div>
        </section>

        {/* MRI PRESCRIPTION UPSELL */}
        {!mri && (
          <section className="pdf-avoid-break rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-7 sm:p-10">
              <div className="inline-flex rounded-full bg-rose-500/20 border border-rose-300/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-100">
                {ar ? "لا تتوقف عند نتيجة الفحص" : "Do Not Stop at the Scan"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {t.prescriptionHeadline}
              </h2>

              <p className="mt-4 text-lg sm:text-2xl font-black leading-relaxed text-amber-200 max-w-4xl rtl-text">
                {t.prescriptionSubhead}
              </p>

              <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-stretch">
                <div className="rounded-3xl bg-white/10 border border-white/15 p-6 sm:p-7 backdrop-blur-md">
                  <h3 className="text-2xl font-black text-white rtl-text">
                    {ar ? "لماذا لا يكفي الفحص وحده؟" : "Why the scan alone is not enough"}
                  </h3>

                  <div className="mt-4 space-y-4 text-blue-100 leading-relaxed rtl-text">
                    <p>
                      {ar
                        ? "الفحص يشبه تحليل الدم: يكشف لك أن هناك مؤشرات يجب الانتباه لها. لكنه لا يمنحك الفحص الكامل، ولا الوصفة العلاجية، ولا خطة التصحيح اليومية."
                        : "The scan is like a blood test: it reveals signals you must not ignore. But it does not give you the full examination, the treatment prescription, or the day-by-day correction path."}
                    </p>

                    <p>
                      {ar
                        ? "معظم الناس يقرؤون النتيجة، يشعرون بالاهتمام لدقائق، ثم يعودون إلى نفس العادات التي صنعت النتيجة. هنا يحدث الخطر: أن ترى علامة الإنذار ثم تتركها كما هي."
                        : "Most people read the result, feel interested for a few minutes, then return to the same habits that created the result. That is the dangerous part: seeing the warning sign and leaving it untreated."}
                    </p>

                    <p className="font-black text-white">
                      {ar
                        ? "إذا كشف الفحص تسريبًا، فالخطوة الذكية ليست تجاهله. الخطوة الذكية هي فحص الجسم المهني كاملًا، معرفة الجذر، ثم اتباع الوصفة."
                        : "If the scan exposed a leak, the smart move is not to ignore it. The smart move is to examine the full career body, identify the root pattern, and follow the prescription."}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white text-slate-950 p-6 sm:p-7 shadow-2xl">
                  <div className="inline-flex rounded-full bg-blue-100 text-blue-800 px-4 py-2 text-xs font-black uppercase tracking-widest">
                    {ar ? "ما الذي ستحصل عليه؟" : "What you unlock"}
                  </div>

                  <h3 className="mt-4 text-2xl font-black rtl-text">
                    {ar ? "تقرير شخصي مفصل وخطة علاج كاملة" : "A personalized detailed report and full treatment plan"}
                  </h3>

                  <div className="mt-5 space-y-3">
                    {(ar
                      ? [
                          "تقرير Sales MRI شخصي مفصل من حوالي ٣٠ صفحة مبني على إجاباتك ونتائجك",
                          "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في جسم أدائك البيعي",
                          "كشف الأنماط الجذرية خلف تعثّر الصفقات وضعف الزخم",
                          "ترتيب واضح لما يجب إصلاحه أولًا بدل التخمين",
                          "وصفة أداء عملية لمدة ٩٠ يومًا دون الجلوس في دورة تدريبية طويلة",
                          "مسار تصحيح يومي يساعدك على معرفة ماذا تفعل وماذا تتوقف عن فعله",
                          "٥ مكافآت تنفيذية تساعدك على التطبيق وليس القراءة فقط",
                        ]
                      : [
                          "A personalized, super-detailed Sales MRI report of around 30 pages based on your answers and scores",
                          "A full diagnostic and treatment tool examining 15 competencies in your sales performance body",
                          "The root patterns behind stalled deals, weak momentum, and hidden leakage",
                          "A clear priority order of what to correct first instead of guessing",
                          "A practical 90-day performance prescription without sitting through a long training course",
                          "A day-by-day correction path showing what to do and what to stop doing",
                          "5 implementation bonuses that help you act, not just read",
                        ]
                    ).map((x) => (
                      <div key={x} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="shrink-0 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
                          ✓
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-700 rtl-text">{x}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-1 shadow-2xl max-w-3xl">
                <div className="rounded-[1.35rem] bg-slate-950/95 p-6 sm:p-7">
                  <h3 className="text-2xl sm:text-3xl font-black text-white rtl-text">
                    {ar ? "هذه ليست دورة تدريبية أخرى." : "This is not another training course."}
                  </h3>

                  <p className="mt-3 text-blue-100 leading-relaxed rtl-text">
                    {ar
                      ? "لا فيديوهات طويلة. لا تكديس نظري. لا نصائح عامة. إنها وصفة علاج عملية ومفصلة مبنية على نتائجك، لتعرف ماذا تعمل عليه، ماذا تتوقف عن فعله، وما الذي يجب إصلاحه أولًا."
                      : "No long videos. No theory overload. No generic sales advice. It is a practical, detailed treatment prescription built from your results, showing what to work on, what to stop doing, and what to fix first."}
                  </p>

                  <a
                    href={MRI_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="print-hide mt-6 inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-white text-slate-950 px-6 py-4 font-black shadow-xl hover:bg-amber-50 transition"
                  >
                    🚀 {t.prescriptionCta}
                  </a>

                  <p className="mt-3 text-xs text-blue-100/70 rtl-text">
                    {ar
                      ? "سيتم ربط هذا الزر لاحقًا بصفحة New Zenler التي تعرض التفاصيل، المكافآت، والدفع."
                      : "This button will connect to your New Zenler page with the full details, bonuses, and checkout."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ENTERPRISE CTA */}
        <section className="pdf-avoid-break rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-6 items-center">
            <div>
              <div className="inline-flex rounded-full bg-amber-100 text-amber-800 px-4 py-2 text-xs font-black uppercase tracking-widest">
                B2B / Team Diagnostic
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black text-slate-950 rtl-text">
                {t.enterpriseTitle}
              </h2>
              <p className="mt-3 text-lg font-black text-blue-800 rtl-text">
                {t.enterpriseCta}
              </p>
            </div>

            <div className="space-y-3 text-slate-700 leading-relaxed rtl-text">
              <p>
                {ar
                  ? "إذا كان هذا الفحص مفيدًا لفرد واحد، فقيمته الحقيقية تظهر عندما يستخدمه المدير مع الفريق بالكامل. عندها لا يرى المدير آراء عامة، بل خريطة واضحة لمناطق القوة والتسريب والتدريب المطلوب."
                  : "If this scan is useful for one person, its real value appears when a manager uses it across the whole team. The manager no longer sees opinions — they see a diagnostic map of strengths, leakage areas, and training priorities."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(ar
                  ? ["خريطة حرارة للفريق", "أقوى ٣ مناطق", "أخطر ٣ فجوات", "أولويات تدريب واضحة"]
                  : ["Team heatmap", "Top 3 strengths", "Top 3 risk gaps", "Clear training priorities"]
                ).map((x) => (
                  <div key={x} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold">
                    ✓ {x}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoChip({ label, value, forceLtr = false }: { label: string; value: string; forceLtr?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
      <div className="text-[10px] font-black uppercase tracking-widest text-blue-100">{label}</div>
      <div className={`mt-1 text-sm font-bold text-white break-words ${forceLtr ? "force-ltr" : "rtl-text"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function SignalCard({
  title,
  row,
  lang,
  description,
}: {
  title: string;
  row: CompetencyRow | null;
  lang: Language;
  description: string;
}) {
  if (!row) {
    return (
      <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6">
        <h2 className="text-2xl font-black text-slate-950 rtl-text">{title}</h2>
        <p className="mt-3 text-slate-600 rtl-text">{lang === "ar" ? "لا توجد بيانات كافية." : "Not enough data."}</p>
      </section>
    );
  }

  return (
    <section className={`pdf-avoid-break rounded-3xl border-2 ${tierSoftClass(row.tier)} shadow-xl p-6`}>
      <h2 className="text-2xl font-black text-slate-950 rtl-text">{title}</h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 rtl-text">{row.label}</h3>
          <p className="mt-2 text-slate-700 leading-relaxed rtl-text">{description}</p>
        </div>

        <div className="force-ltr text-right">
          <div className="text-4xl font-black text-slate-950">{row.percentage}%</div>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
            {getTierLabel(row.tier, lang)}
          </span>
        </div>
      </div>
    </section>
  );
}

function DarkInsight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
      <h3 className="text-lg font-black text-white rtl-text">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-blue-100 rtl-text">{body}</p>
    </div>
  );
}

function SwotBox({
  title,
  tier,
  rows,
  empty,
  explanation,
  lang,
}: {
  title: string;
  tier: Tier;
  rows: CompetencyRow[];
  empty: string;
  explanation: string;
  lang: Language;
}) {
  return (
    <div className={`pdf-avoid-break rounded-3xl border-2 ${tierSoftClass(tier)} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={`text-xl font-black rtl-text ${tierTextClass(tier)}`}>{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(tier)}`}>
          {rows.length}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-700 leading-relaxed rtl-text">{explanation}</p>

      <div className="mt-4 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.competencyId} className="rounded-2xl bg-white/70 border border-white p-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-800 rtl-text">{r.label}</span>
              <span className="text-sm font-black text-slate-950 force-ltr">{r.percentage}%</span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white/70 border border-white p-3 text-sm italic text-slate-600 rtl-text">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBlock({
  index,
  title,
  tier,
  percentage,
  recommendations,
  lang,
}: {
  index: number;
  title: string;
  tier: Tier;
  percentage: number;
  recommendations: string[];
  lang: Language;
}) {
  const clean = recommendations.map(cleanRecommendation).filter(Boolean).slice(0, 3);

  return (
    <div className={`pdf-avoid-break rounded-3xl border-2 ${tierSoftClass(tier)} p-5 sm:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {lang === "ar" ? `أولوية ${index}` : `Priority ${index}`}
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-950 rtl-text">{title}</h3>
        </div>

        <div className="force-ltr">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(tier)}`}>
            {percentage}% · {getTierLabel(tier, lang)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        {clean.length ? (
          clean.map((rec, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black">
                  {i + 1}
                </div>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed rtl-text">{rec}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 text-slate-600 italic rtl-text">
            {lang === "ar" ? "لا توجد توصيات متاحة لهذه المنطقة." : "No recommendations available for this area."}
          </div>
        )}
      </div>
    </div>
  );
}