// app/reports/pdf/[attemptId]/page.tsx
import { createClient } from "@supabase/supabase-js";
import type React from "react";
import { getRecommendations as getPdfRecommendations } from "@/lib/pdf-recommendations";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// TYPES
// ============================================================================

type Lang = "en" | "ar";
type Tier = "Strength" | "Opportunity" | "Weakness" | "Threat";

type CompetencyKey =
  | "mental_toughness"
  | "opening_conversations"
  | "identifying_real_needs"
  | "handling_objections"
  | "creating_irresistible_offers"
  | "mastering_closing"
  | "follow_up_discipline";

type CompetencyResult = {
  key: CompetencyKey;
  percentage: number;
  tier: Tier;
  recommendations?: string[];
};

type ReportRow = {
  id: string;
  user_id?: string | null;
  created_at?: string | null;
  language?: string | null;
  total_percentage?: number | null;
  competency_results?: any[] | null;
  swot_analysis?: any | null;
  full_name?: string | null;
  name?: string | null;
  company?: string | null;
  user_email?: string | null;
  email?: string | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPETENCIES: { key: CompetencyKey; labelEn: string; labelAr: string }[] = [
  { key: "mental_toughness", labelEn: "Mental Toughness", labelAr: "الصلابة الذهنية" },
  { key: "opening_conversations", labelEn: "Opening Conversations", labelAr: "فتح المحادثات" },
  { key: "identifying_real_needs", labelEn: "Identifying Real Needs", labelAr: "تحديد الاحتياجات الحقيقية" },
  { key: "handling_objections", labelEn: "Handling Objections", labelAr: "التعامل مع الاعتراضات" },
  { key: "creating_irresistible_offers", labelEn: "Creating Irresistible Offers", labelAr: "إنشاء عروض لا تُقاوَم" },
  { key: "mastering_closing", labelEn: "Mastering Closing", labelAr: "إتقان الإغلاق" },
  { key: "follow_up_discipline", labelEn: "Follow-Up Discipline", labelAr: "انضباط المتابعة" },
];

const PDF_KEY_MAP: Record<string, string> = {
  handling_objections: "destroying_objections",
};

const COMPETENCY_ALIASES: Record<string, CompetencyKey> = {
  mental_toughness: "mental_toughness",
  "mental toughness": "mental_toughness",
  "الصلابة الذهنية": "mental_toughness",
  opening_conversations: "opening_conversations",
  "opening conversations": "opening_conversations",
  "فتح المحادثات": "opening_conversations",
  identifying_real_needs: "identifying_real_needs",
  "identifying real needs": "identifying_real_needs",
  "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
  handling_objections: "handling_objections",
  "handling objections": "handling_objections",
  destroying_objections: "handling_objections",
  "destroying objections": "handling_objections",
  "التعامل مع الاعتراضات": "handling_objections",
  creating_irresistible_offers: "creating_irresistible_offers",
  "creating irresistible offers": "creating_irresistible_offers",
  "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
  mastering_closing: "mastering_closing",
  "mastering closing": "mastering_closing",
  "إتقان الإغلاق": "mastering_closing",
  follow_up_discipline: "follow_up_discipline",
  "follow-up discipline": "follow_up_discipline",
  "follow up discipline": "follow_up_discipline",
  "انضباط المتابعة": "follow_up_discipline",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeCompetencyKey(input: any): CompetencyKey | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  return COMPETENCY_ALIASES[key] ?? COMPETENCY_ALIASES[raw] ?? COMPETENCY_ALIASES[raw.toLowerCase()] ?? null;
}

function clamp(n: any, min = 0, max = 100): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.round(x)));
}

function safeNumber(n: any, fallback = 0): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

// 100% SAFE DATE FORMATTER (Manual String Construction)
function formatDate(iso: any, lang: Lang): string {
  try {
    const d = new Date(String(iso));
    if (isNaN(d.getTime())) return "—";

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0-11
    const day = String(d.getUTCDate()).padStart(2, "0");

    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    if (lang === "ar") {
      // Manual RTL construction
      return `${day} ${monthsAr[month]} ${year}`;
    }
    return `${monthsEn[month]} ${day}, ${year}`;
  } catch {
    return "—";
  }
}

function tierFromPct(pct: number): Tier {
  if (pct >= 75) return "Strength";
  if (pct >= 50) return "Opportunity";
  if (pct >= 25) return "Weakness";
  return "Threat";
}

function tierLabel(tier: Tier, lang: Lang): string {
  const labels: Record<Tier, { en: string; ar: string }> = {
    Strength: { en: "Strength", ar: "قوة" },
    Opportunity: { en: "Opportunity", ar: "فرصة" },
    Weakness: { en: "Weakness", ar: "ضعف" },
    Threat: { en: "Threat", ar: "تهديد" },
  };
  return labels[tier][lang];
}

function tierColor(tier: Tier): string {
  const colors: Record<Tier, string> = {
    Strength: "#059669",
    Opportunity: "#0284c7",
    Weakness: "#d97706",
    Threat: "#dc2626",
  };
  return colors[tier];
}

function tierBg(tier: Tier): string {
  const bgs: Record<Tier, string> = {
    Strength: "#ecfdf5",
    Opportunity: "#f0f9ff",
    Weakness: "#fffbeb",
    Threat: "#fef2f2",
  };
  return bgs[tier];
}

function toStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") {
    return v.split(/\r?\n|•|·|-/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function pickByLang(v: any, lang: Lang): any {
  if (!v || typeof v !== "object") return v;
  return v[lang] ?? v.en ?? v.ar ?? v.value ?? v;
}

function extractSwot(swotRaw: any, lang: Lang) {
  if (!swotRaw) return { strengths: [], opportunities: [], weaknesses: [], threats: [] };
  
  const sw = pickByLang(swotRaw, lang) ?? swotRaw;
  
  return {
    strengths: toStringArray(sw?.strengths ?? sw?.Strengths ?? sw?.قوة ?? sw?.نقاط_القوة ?? []),
    opportunities: toStringArray(sw?.opportunities ?? sw?.Opportunities ?? sw?.فرص ?? sw?.الفرص ?? []),
    weaknesses: toStringArray(sw?.weaknesses ?? sw?.Weaknesses ?? sw?.ضعف ?? sw?.نقاط_الضعف ?? []),
    threats: toStringArray(sw?.threats ?? sw?.Threats ?? sw?.تهديدات ?? sw?.التهديدات ?? []),
  };
}

// ============================================================================
// SAFE RAW RECOMMENDATION EXTRACTOR (prevents empty/undefined crashes)
// ============================================================================
function extractRecsFromRaw(rawRow: any, lang: Lang): string[] {
  if (!rawRow) return [];

  // Try common shapes that could exist in your DB row
  const candidate =
    rawRow?.recommendations ??
    rawRow?.recs ??
    rawRow?.tips ??
    rawRow?.advice ??
    rawRow?.action_recommendations ??
    rawRow?.actionRecommendations ??
    rawRow?.plan ??
    rawRow?.recommendation ??
    rawRow?.data?.recommendations ??
    rawRow?.data?.recs ??
    rawRow?.result?.recommendations;

  // If it's an object with {en/ar}, pick language safely
  const picked = pickByLang(candidate, lang);

  // Convert to clean string[]
  return toStringArray(picked);
}

function getRecommendations(key: CompetencyKey, tier: Tier, lang: Lang): string[] {
  const recs: Record<Tier, { en: string[]; ar: string[] }> = {
    Strength: {
      en: ["Leverage this strength daily", "Mentor others", "Set stretch goals"],
      ar: ["استفد من هذه القوة يومياً", "وجه الآخرين", "ضع أهدافاً طموحة"],
    },
    Opportunity: {
      en: ["Practice consistently", "Seek feedback", "Track progress"],
      ar: ["تدرب باستمرار", "اطلب الملاحظات", "تابع التقدم"],
    },
    Weakness: {
      en: ["Follow a checklist", "Role-play scenarios", "Focus on basics"],
      ar: ["اتبع قائمة مراجعة", "مثّل الأدوار", "ركز على الأساسيات"],
    },
    Threat: {
      en: ["Get immediate coaching", "Simplify approach", "Daily feedback"],
      ar: ["احصل على تدريب فوري", "بسّط النهج", "ملاحظات يومية"],
    },
  };
  return recs[tier][lang];
}

function overallTips(tier: Tier, lang: Lang): string[] {
  const tips: Record<Tier, { en: string[]; ar: string[] }> = {
    Strength: {
      en: ["Maintain consistency", "Systemize strengths", "Set high KPIs"],
      ar: ["حافظ على الاستمرارية", "نظّم نقاط القوة", "ضع مؤشرات أداء عالية"],
    },
    Opportunity: {
      en: ["Improve weak links", "Weekly drills", "Tighten process"],
      ar: ["حسّن الروابط الضعيفة", "تدريبات أسبوعية", "أحكم العملية"],
    },
    Weakness: {
      en: ["Use structure", "Focus on discovery", "30-day plan"],
      ar: ["استخدم الهيكلة", "ركز على الاكتشاف", "خطة 30 يوم"],
    },
    Threat: {
      en: ["Simplify script", "Immediate coaching", "Reduce volume"],
      ar: ["بسّط النص", "تدريب فوري", "قلل الكمية"],
    },
  };
  return tips[tier][lang];
}

function computeFromRawResults(raw: any[]): CompetencyResult[] {
  const mapped: CompetencyResult[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    const key = normalizeCompetencyKey(r?.competencyId ?? r?.competency ?? r?.id ?? r?.key ?? r?.name);
    if (!key) continue;
    let pct = r?.percentage ?? r?.pct ?? r?.scorePct;
    if (pct === undefined && r?.score !== undefined && r?.maxScore) {
      pct = (safeNumber(r.score) / safeNumber(r.maxScore)) * 100;
    }
    const percentage = clamp(pct);
    mapped.push({
      key,
      percentage,
      tier: tierFromPct(percentage),
      recommendations: r?.recommendations ?? [],
    });
  }
  const byKey = new Map(mapped.map(m => [m.key, m]));
  return COMPETENCIES.map(({ key }) => byKey.get(key) ?? { key, percentage: 0, tier: "Threat" as Tier });
}

function computeOverallPct(results: CompetencyResult[], fromDb?: any): number {
  const db = Number(fromDb);
  if (Number.isFinite(db) && db >= 0 && db <= 100) return clamp(db);
  const sum = results.reduce((acc, r) => acc + r.percentage, 0);
  return clamp(sum / Math.max(1, results.length));
}

function pickLang(dbLang: any, urlLang: any): Lang {
  const q = String(urlLang ?? "").toLowerCase();
  if (q === "ar") return "ar";
  if (q === "en") return "en";
  return String(dbLang ?? "").toLowerCase() === "ar" ? "ar" : "en";
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function fetchReportRow(attemptId: string): Promise<ReportRow | null> {
  const supabase = getSupabaseAdminClient();
  let { data: row } = await supabase.from("quiz_attempts").select("*").eq("id", attemptId).maybeSingle();
  
  if (!row) {
    const { data: legacy } = await supabase.from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle();
    row = legacy;
  }
  
  if (row && row.user_id) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", row.user_id).maybeSingle();
    if (profile) {
      row.full_name = row.full_name || profile.full_name || profile.name;
      row.user_email = row.user_email || profile.user_email || profile.email;
      row.company = row.company || profile.company;
    }
    // Fallback if email missing
    if (!row.user_email && !row.email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
      if (authUser?.user?.email) row.user_email = authUser.user.email;
    }
  }
  return row as ReportRow;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

function getTranslations(lang: Lang) {
  return {
    title: lang === "ar" ? "تشخيص لقدرات مندوبي المبيعات" : "Outdoor Sales SCAN Report",
    subtitle: lang === "ar" ? "تحليل مختصر لنقاط الضعف والقوة لدى المندوبين" : "Professional Sales Competency Summary",
    name: lang === "ar" ? "الاسم" : "Name",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    company: lang === "ar" ? "الشركة" : "Company",
    date: lang === "ar" ? "التاريخ" : "Date",
    overallScore: lang === "ar" ? "النتيجة الإجمالية" : "Overall Score",
    outOf100: lang === "ar" ? "من 100%" : "out of 100%",
    confidential: lang === "ar" ? "سري" : "Confidential",
    performanceSummary: lang === "ar" ? "ملخص الأداء" : "Performance Summary",
    sevenCompetencies: lang === "ar" ? "الكفاءات السبع + النتيجة الإجمالية" : "Seven competencies + overall score",
    tier: lang === "ar" ? "المستوى" : "Tier",
    actionRecs: lang === "ar" ? "توصيات عملية" : "Action Plan",
    dynamicRecs: lang === "ar" ? "توصيات ديناميكية من نتائجك" : "Recommendations from your results",
    plan30Day: lang === "ar" ? "خطة 30 يوماً" : "30-Day Plan",
    swot: lang === "ar" ? "تحليل SWOT" : "SWOT Analysis",
    strengths: lang === "ar" ? "القوة" : "Strengths",
    opportunities: lang === "ar" ? "الفرص" : "Opportunities",
    weaknesses: lang === "ar" ? "الضعف" : "Weaknesses",
    threats: lang === "ar" ? "التهديدات" : "Threats",
    noItems: lang === "ar" ? "لا توجد عناصر حالياً" : "No items currently",
    nextStep: lang === "ar" ? "خطوتك التالية" : "Your Next Step",
    nextStepDesc: lang === "ar" 
      ? "احصل على خطة تطوير مخصصة (جلسة + خريطة تنفيذ 30 يوماً)"
      : "Get a personalized plan (diagnostic + 30-day roadmap)",
    bookSession: lang === "ar" ? "احجز جلسة" : "Book Session",
    page: lang === "ar" ? "الصفحة" : "Page",
    of: lang === "ar" ? "من" : "of",
    notFound: lang === "ar" ? "التقرير غير موجود" : "Report not found",
  };
}

// ============================================================================
// SVG RING COMPONENT
// ============================================================================

function ScoreRing({ percentage, color, size = 120 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span suppressHydrationWarning={true} style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{percentage}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default async function Page({
  params,
  searchParams,
}: {
  params: { attemptId: string };
  searchParams?: { lang?: string };
}) {
  const attemptId = params.attemptId;
  const row = await fetchReportRow(attemptId);
  const lang: Lang = pickLang(row?.language, searchParams?.lang);
  const t = getTranslations(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  if (!row) return <div style={{ padding: 40, textAlign: "center" }}>{t.notFound}</div>;

  const email = row.user_email || row.email || "—";
  let fullName = row.full_name || row.name;
  if (!fullName || fullName === "—") {
    if (email !== "—") {
      const match = email.match(/^([^@]+)/);
      if (match) fullName = match[1].replace(/[._-]/g, ' ').replace(/\d+/g, '').trim();
    }
  }
  fullName = fullName || "—";
  const company = row.company || "—";
  const reportDate = formatDate(row.created_at, lang);

  const rawResults = Array.isArray(row.competency_results) ? row.competency_results : [];
  const results = computeFromRawResults(rawResults);
  const overallPct = computeOverallPct(results, row.total_percentage);
  const overallTier = tierFromPct(overallPct);
  const overallColor = tierColor(overallTier);

  let swot = extractSwot(row.swot_analysis, lang);
  if (!swot.strengths.length && !swot.opportunities.length && !swot.weaknesses.length && !swot.threats.length) {
    swot.strengths = results.filter(r => r.tier === "Strength").map(r => lang === "ar" ? COMPETENCIES.find(c=>c.key===r.key)!.labelAr : COMPETENCIES.find(c=>c.key===r.key)!.labelEn);
    swot.opportunities = results.filter(r => r.tier === "Opportunity").map(r => lang === "ar" ? COMPETENCIES.find(c=>c.key===r.key)!.labelAr : COMPETENCIES.find(c=>c.key===r.key)!.labelEn);
    swot.weaknesses = results.filter(r => r.tier === "Weakness").map(r => lang === "ar" ? COMPETENCIES.find(c=>c.key===r.key)!.labelAr : COMPETENCIES.find(c=>c.key===r.key)!.labelEn);
    swot.threats = results.filter(r => r.tier === "Threat").map(r => lang === "ar" ? COMPETENCIES.find(c=>c.key===r.key)!.labelAr : COMPETENCIES.find(c=>c.key===r.key)!.labelEn);
  }

  const logoSrc = "/brand/logo.png";

  return (
<div className="pdf-root" dir={dir} lang={lang} suppressHydrationWarning={true}>
  <style
    suppressHydrationWarning
    dangerouslySetInnerHTML={{
      __html: `
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap");

        :root {
          --ink: #0f172a;
          --muted: #64748b;
          --border: #e2e8f0;
          --bg: #f8fafc;
          --pad: 16mm;
          --pageW: 210mm;
          --pageH: 297mm;
          --radius: 12px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: var(--bg); color: var(--ink); font-family: "Cairo", sans-serif; }

        @page { size: A4; margin: 0; }

        /* FIX: 5th PAGE / OVERFLOW */
        @media print {
          html, body { background: #fff !important; margin: 0 !important; }
          .pdf-root { padding: 0 !important; }
          .page { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; break-after: page; }
          .page:last-child { break-after: auto; }
        }

        .pdf-root { padding: 10px 0 20px; }

        /* Reduced page height slightly to avoid accidental overflow */
        .page {
          width: var(--pageW); height: 296mm;
          background: #fff; margin: 0 auto 10px; padding: var(--pad);
          border-radius: var(--radius); box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          position: relative; display: flex; flex-direction: column; overflow: hidden;
          page-break-after: always;
        }

        /* --- BASE STYLES --- */
        .topline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .brand { display: flex; align-items: center; gap: 8px; }

        .logoWrap {
          width: 38px; height: 38px; border-radius: 10px; overflow: hidden;
          background: linear-gradient(135deg, #0ea5e9, #059669);
          display: grid; place-items: center;
        }
        .logoImg { width: 100%; height: 100%; object-fit: cover; }

        .brandText h1 { font-size: 15px; font-weight: 900; }
        .brandText p { font-size: 12px; color: var(--muted); font-weight: 800; }

        .badge {
          font-weight: 900; font-size: 11px; padding: 6px 12px; border-radius: 99px;
          background: #fff; border: 1px solid var(--border); color: var(--muted);
        }

        .footer {
          margin-top: auto; padding-top: 8px;
          display: flex; justify-content: space-between;
          font-size: 11px; font-weight: 800;
          border-top: 1px solid var(--border);
        }

        /* --- COVER SPECIFIC (Page 1) --- */
        .coverPage .coverTopline { justify-content: center; }
        .coverPage .coverBrand { flex-direction: column; align-items: center; text-align: center; gap: 10px; }

        .coverPage .logoWrap {
          width: 260px; height: 80px;
          background: transparent;
          box-shadow: none; border-radius: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .coverPage .logoImg { object-fit: contain; }

        .coverPage .coverH1 { font-size: 22px; font-weight: 900; }
        .coverPage .coverP { font-size: 14px; font-weight: 600; color: var(--muted); line-height: 1.35; }
        .coverPage .coverBadge { position: absolute; inset-inline-start: 0; top: 0; }

        .coverHero {
          margin-top: 4px; padding: 16px;
          border: 1px solid var(--border); border-radius: 16px;
          background:
            radial-gradient(ellipse at 0% 0%, rgba(14,165,233,0.10), transparent 45%),
            radial-gradient(ellipse at 100% 100%, rgba(5,150,105,0.08), transparent 45%),
            #fff;
        }

        .coverPage .coverVisualWrap {
          height: auto; min-height: 200px;
          margin: 12px 0; border-radius: 0; overflow: visible;
          background: transparent; border: none;
          display: flex; justify-content: center;
        }
        .coverPage .coverVisualImg { object-fit: contain; max-height: 250px; width: 100%; }

        .coverStack { display: flex; flex-direction: column; align-items: center; width: 100%; }

        .infoCard {
          width: 100%; max-width: 165mm;
          border-radius: 14px; padding: 14px 16px;
          border: 1px solid var(--border); background: #fff;
        }
        .infoRow { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
        .infoRow:last-child { border-bottom: 0; }
        .infoLabel { font-size: 14px; font-weight: 900; color: #334155; }
        .infoVal { font-size: 14px; font-weight: 900; }

        .coverGap { height: 18px; }

        .scoreCard {
          width: 100%; max-width: 120mm; border-radius: 16px;
          padding: 14px 16px; gap: 10px;
          background: transparent; border: 0;
          display: flex; flex-direction: column; align-items: center;
        }
        .scoreLabel { font-size: 14px; font-weight: 900; color: var(--muted); }
        .scoreHint { font-size: 12px; font-weight: 800; color: var(--muted); }

        /* --- GRIDS --- */
        .summaryGrid, .cardsGrid, .swotGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
          flex: 1;
        }

        .metric, .recCard, .swotBox {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          background: #fff;
        }

        .metricTop, .recHead, .swotTitle {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 6px;
          font-weight: 900;
          font-size: 11px;
        }

        /* ===== IMPORTANT: pill labels bigger ===== */
        .metricTier, .recTierDot, .swotPill {
          font-weight: 900;
          font-size: 11px;
          padding: 3px 9px;
          border-radius: 8px;
          line-height: 1;
          white-space: nowrap;
        }

        .bar { height: 7px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
        .barFill { height: 100%; border-radius: 999px; }

        .metricFoot {
          margin-top: 5px;
          display: flex; justify-content: space-between;
          font-weight: 900; font-size: 11px;
          color: var(--muted);
        }

        /* ===== Lists ===== */
        .recList, .swotList {
          margin: 0;
          padding-inline-start: 18px;
          font-weight: 700;
          font-size: 12px;
          color: #334155;
        }
        .recList li, .swotList li { margin-bottom: 3px; list-style-type: disc; }

        /* ===== Page 2 SWOT grid inserted under summary ===== */
        .swotGridInline {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .swotBoxInline {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          background: #fff;
        }
        .swotHeadInline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .swotTitleInline {
          font-weight: 900;
          font-size: 13px;
        }

        /* ===== Page 3: Action Plan (make it feel full + premium) ===== */
        .cardsGrid{ gap: 10px; margin-top: 10px; }

        .recCard{
          padding: 12px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          position: relative;
          overflow: hidden;
        }

        .recHead{
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 900;
        }

        .recTierDot{
          font-size: 11px;
          font-weight: 900;
          padding: 3px 9px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .recTierDot .dot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
          margin-inline-end: 6px;
          vertical-align: middle;
        }

        .recList{
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.7;
          color: #334155;
          padding-inline-start: 18px;
        }
        .recList li{ margin-bottom: 6px; }

        /* ===== NEW: "Framed" cards (prevents floating text) ===== */
        .metric, .recCard, .swotBox, .swotBoxInline{
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
        }

        .recHead{
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(226,232,240,0.9);
          margin-bottom: 10px;
        }

        /* ===== Sales page (Page 4) upsell base ===== */
        .upsell {
          margin-top: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .upsellRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

        .cta{
          -webkit-appearance:none;
          appearance:none;
          padding: 10px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #0284c7, #059669);
          color: #fff;
          font-weight: 900;
          font-size: 11px;
          border: 0;
          white-space: nowrap;
        }

        .upsellTitle { font-weight: 900; font-size: 13px; margin-bottom: 4px; }
        .upsellBody { font-weight: 700; font-size: 12px; color: var(--muted); line-height: 1.5; }
      `,
    }}
  />


      {/* PAGE 1: COVER */}
      <section className="page coverPage">
        <div className="topline coverTopline">
          <div className="brand coverBrand">
            <div className="logoWrap">
              <img className="logoImg" src={logoSrc} alt="Logo" />
            </div>
            <div className="brandText">
              <h1 className="coverH1">{t.title}</h1>
              <p className="coverP">{t.subtitle}</p>
            </div>
          </div>
          <div className="badge coverBadge">{t.confidential}</div>
        </div>

        <div className="coverHero">
          <div className="coverVisualWrap">
            <img className="coverVisualImg" src="/brand/cover-visual.jpg" alt="" />
          </div>

          <div className="coverStack">
            <div className="infoCard">
              <div className="infoRow">
                <span className="infoLabel">{t.name}</span>
                {/* HYDRATION FIX */}
                <span className="infoVal" suppressHydrationWarning>{fullName}</span>
              </div>
              <div className="infoRow">
                <span className="infoLabel">{t.email}</span>
                <span className="infoVal" suppressHydrationWarning>{email}</span>
              </div>
              <div className="infoRow">
                <span className="infoLabel">{t.company}</span>
                <span className="infoVal" suppressHydrationWarning>{company}</span>
              </div>
              <div className="infoRow">
                <span className="infoLabel">{t.date}</span>
                <span className="infoVal" suppressHydrationWarning>{reportDate}</span>
              </div>
            </div>

            <div className="coverGap" />

            <div className="scoreCard">
              <div className="scoreLabel">{t.overallScore}</div>
              <ScoreRing percentage={overallPct} color={overallColor} size={160} />
              <div className="scoreHint">{t.outOf100}</div>
            </div>
          </div>
        </div>

        <div className="footer">
          <span>{t.confidential}</span>
          <span>ID: {attemptId.slice(0, 8)}...</span>
        </div>
      </section>

    {/* PAGE 2: SUMMARY + SWOT MOVED HERE */}
  <section className="page">
    <div className="topline">
      <div className="brand">
        <div className="logoWrap"><img className="logoImg" src={logoSrc} alt="" /></div>
        <div className="brandText">
          <h1>{t.performanceSummary}</h1>
          <p>{t.sevenCompetencies}</p>
        </div>
      </div>
      <div className="badge">{overallPct}%</div>
    </div>

    {/* COMPACT LAYOUT */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 15, padding: "12px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", borderInlineStart: `4px solid ${overallColor}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>{t.overallScore}</span>
            <span style={{ fontWeight: 900, fontSize: 11, padding: "3px 9px", borderRadius: 6, background: tierBg(overallTier), color: tierColor(overallTier) }}>
              {tierLabel(overallTier, lang)}
            </span>
          </div>
          <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${overallPct}%`, background: overallColor, height: "100%" }} />
          </div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{overallPct}%</div>
      </div>

      {COMPETENCIES.map(({ key, labelEn, labelAr }) => {
        const r = results.find((x) => x.key === key)!;
        const color = tierColor(r.tier);
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderInlineStart: `4px solid ${color}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 14 }}>{lang === "ar" ? labelAr : labelEn}</span>
                <span style={{ fontWeight: 900, fontSize: 11, padding: "3px 9px", borderRadius: 6, background: tierBg(r.tier), color }}>
                  {tierLabel(r.tier, lang)}
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${r.percentage}%`, background: color, height: "100%" }} />
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{r.percentage}%</div>
          </div>
        );
      })}

      {/* SWOT MOVED HERE (2x2 grid) */}
      <div className="swotGridInline">
        {/* Strengths */}
        <div className="swotBoxInline" style={{ borderInlineStart: `4px solid ${tierColor("Strength")}` }}>
          <div className="swotHeadInline">
            <span className="swotTitleInline" style={{ color: tierColor("Strength") }}>{t.strengths}</span>
            <span className="swotPill" style={{ background: tierBg("Strength"), color: tierColor("Strength") }}>{tierLabel("Strength", lang)}</span>
          </div>
          <ul className="swotList" style={{ fontWeight: 700, lineHeight: 1.6 }}>
            {swot.strengths.length ? swot.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>{t.noItems}</li>}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="swotBoxInline" style={{ borderInlineStart: `4px solid ${tierColor("Opportunity")}` }}>
          <div className="swotHeadInline">
            <span className="swotTitleInline" style={{ color: tierColor("Opportunity") }}>{t.opportunities}</span>
            <span className="swotPill" style={{ background: tierBg("Opportunity"), color: tierColor("Opportunity") }}>{tierLabel("Opportunity", lang)}</span>
          </div>
          <ul className="swotList" style={{ fontWeight: 700, lineHeight: 1.6 }}>
            {swot.opportunities.length ? swot.opportunities.map((s, i) => <li key={i}>{s}</li>) : <li>{t.noItems}</li>}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="swotBoxInline" style={{ borderInlineStart: `4px solid ${tierColor("Weakness")}` }}>
          <div className="swotHeadInline">
            <span className="swotTitleInline" style={{ color: tierColor("Weakness") }}>{t.weaknesses}</span>
            <span className="swotPill" style={{ background: tierBg("Weakness"), color: tierColor("Weakness") }}>{tierLabel("Weakness", lang)}</span>
          </div>
          <ul className="swotList" style={{ fontWeight: 700, lineHeight: 1.6 }}>
            {swot.weaknesses.length ? swot.weaknesses.map((s, i) => <li key={i}>{s}</li>) : <li>{t.noItems}</li>}
          </ul>
        </div>

        {/* Threats */}
        <div className="swotBoxInline" style={{ borderInlineStart: `4px solid ${tierColor("Threat")}` }}>
          <div className="swotHeadInline">
            <span className="swotTitleInline" style={{ color: tierColor("Threat") }}>{t.threats}</span>
            <span className="swotPill" style={{ background: tierBg("Threat"), color: tierColor("Threat") }}>{tierLabel("Threat", lang)}</span>
          </div>
          <ul className="swotList" style={{ fontWeight: 700, lineHeight: 1.6 }}>
            {swot.threats.length ? swot.threats.map((s, i) => <li key={i}>{s}</li>) : <li>{t.noItems}</li>}
          </ul>
        </div>
      </div>
    </div>

    <div className="footer">
      <span>{t.performanceSummary}</span>
      <span>{t.page} 2 {t.of} 4</span>
    </div>
  </section>

{/* PAGE 3: RECOMMENDATIONS (revamped display + safe mapping) */}
<section className="page">
  <div className="topline">
    <div className="brand">
      <div className="logoWrap">
        <img className="logoImg" src={logoSrc} alt="" />
      </div>
      <div className="brandText">
        <h1>{t.actionRecs}</h1>
        <p>{t.dynamicRecs}</p>
      </div>
    </div>
    <div className="badge">{t.plan30Day}</div>
  </div>

  <div className="cardsGrid">
    {/* Overall card */}
    <div
      className="recCard"
      style={{
        borderInlineStart: `4px solid ${tierColor(overallTier)}`,
        background:
          overallTier === "Weakness"
            ? "rgba(245, 158, 11, 0.06)"
            : overallTier === "Threat"
            ? "rgba(239, 68, 68, 0.06)"
            : overallTier === "Strength"
            ? "rgba(34, 197, 94, 0.06)"
            : "rgba(14, 165, 233, 0.06)",
      }}
    >
      <div className="recHead">
        <span>{t.overallScore}</span>
        <span
          className="recTierDot"
          style={{ background: tierBg(overallTier), color: tierColor(overallTier) }}
        >
          <span className="dot" style={{ background: tierColor(overallTier) }} />{" "}
          {tierLabel(overallTier, lang)}
        </span>
      </div>

      <ul className="recList">
        {(overallTips(overallTier, lang).length
          ? overallTips(overallTier, lang)
          : [lang === "ar" ? "سيتم إضافة توصيات مخصصة قريباً." : "Personalized recommendations will appear here."]
        )
          .slice(0, 5)
          .map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
      </ul>
    </div>

    {COMPETENCIES.map(({ key, labelEn, labelAr }) => {
      const r = results.find((x) => x.key === key)!;

      const rawRow = rawResults.find(
        (z: any) => normalizeCompetencyKey(z?.competencyId || z?.competency) === key
      );
      const rawTips = extractRecsFromRaw(rawRow, lang);

      // ✅ Fix key mismatch between your competency keys and pdf-recommendations.ts keys
      const pdfKey = key === "handling_objections" ? "destroying_objections" : key;

      const tips =
        rawTips.length > 0
          ? rawTips
          : getPdfRecommendations(pdfKey, r.tier as any, (lang === "ar" ? "ar" : "en") as any);

      const safeTips =
        tips.length > 0
          ? tips
          : [lang === "ar" ? "سيتم إضافة توصيات مخصصة قريباً." : "Personalized recommendations will appear here."];

      const tierTint =
        r.tier === "Weakness"
          ? "rgba(245, 158, 11, 0.06)"
          : r.tier === "Threat"
          ? "rgba(239, 68, 68, 0.06)"
          : r.tier === "Strength"
          ? "rgba(34, 197, 94, 0.06)"
          : "rgba(14, 165, 233, 0.06)";

      return (
        <div
          key={key}
          className="recCard"
          style={{
            borderInlineStart: `4px solid ${tierColor(r.tier)}`,
            background: tierTint,
          }}
        >
          <div className="recHead">
            <span>{lang === "ar" ? labelAr : labelEn}</span>
            <span className="recTierDot" style={{ background: tierBg(r.tier), color: tierColor(r.tier) }}>
              <span className="dot" style={{ background: tierColor(r.tier) }} /> {tierLabel(r.tier, lang)}
            </span>
          </div>

          <ul className="recList">
            {safeTips.slice(0, 5).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      );
    })}
  </div>

  <div className="footer">
    <span>{t.actionRecs}</span>
    <span>
      {t.page} 3 {t.of} 4
    </span>
  </div>
</section>




  {/* PAGE 4: SALES PAGE ONLY (SWOT REMOVED) */}
  <section className="page">
    <div className="topline">
      <div className="brand">
        <div className="logoWrap"><img className="logoImg" src={logoSrc} alt="" /></div>
        <div className="brandText">
          <h1>{t.nextStep}</h1>
          <p>{t.nextStepDesc}</p>
        </div>
      </div>
      <div className="badge">{overallPct}%</div>
    </div>

    {/* Sales content: keep it simple + strong */}
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, background: "#fff" }}>
        <div className="upsellTitle">{t.nextStep}</div>
        <div className="upsellBody">{t.nextStepDesc}</div>
      </div>

      <div className="upsell">
        <div className="upsellRow">
          <div>
            <div className="upsellTitle">{t.plan30Day}</div>
            <div className="upsellBody">{t.dynamicRecs}</div>
          </div>
          <button className="cta">{t.bookSession}</button>
        </div>
      </div>
    </div>

 <div className="footer">
      <span>{t.nextStep}</span>
      <span>{t.page} 4 {t.of} 4</span>
    </div>
  </section>
</div>
);
}
