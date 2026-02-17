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

// ✅ local fallback (safe)
const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
  // MRI extras
  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation", ar: "عقلية التحفيز والموقف" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },

};

function normalizeCompetencySafe(raw: any) {
  const id = normalizeCompetencyId(String(raw || ""));
  if (id === "destroying_objections") return "handling_objections";
  return id;
}

const TIER_LABELS: Record<Tier, { en: string; ar: string }> = {
  Strength: { en: "Strength", ar: "نقطة قوة" },
  Opportunity: { en: "Opportunity", ar: "فرصة" },
  Weakness: { en: "Weakness", ar: "نقطة ضعف" },
  Threat: { en: "Threat", ar: "تهديد" },
};

function getTierLabel(tier: Tier, lang: Language) {
  const meta = TIER_LABELS[tier] || { en: String(tier), ar: String(tier) };
  return lang === "ar" ? meta.ar : meta.en;
}

function tierCardBgClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-gradient-to-br from-emerald-500 to-green-600";
    case "Opportunity":
      return "bg-gradient-to-br from-blue-500 to-cyan-600";
    case "Weakness":
      return "bg-gradient-to-br from-rose-500 to-red-600";
    case "Threat":
    default:
      return "bg-gradient-to-br from-amber-400 to-orange-500";
  }
}

function tierBadgeClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Weakness":
      return "bg-rose-600 text-white";
    case "Threat":
    default:
      return "bg-amber-500 text-white";
  }
}

function tierSoftBg(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-gradient-to-br from-emerald-50 to-green-50";
    case "Opportunity":
      return "bg-gradient-to-br from-blue-50 to-cyan-50";
    case "Weakness":
      return "bg-gradient-to-br from-rose-50 to-red-50";
    case "Threat":
    default:
      return "bg-gradient-to-br from-amber-50 to-orange-50";
  }
}

type PageProps = {
  params: { slug: string };
  searchParams?: { attemptId?: string; lang?: string };
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function pickLang(attemptLang?: string | null, urlLang?: string | null): Language {
  const l = (urlLang || attemptLang || "en").toLowerCase();
  return l === "ar" ? "ar" : "en";
}

function isMriReport(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s === "mri" || a.includes("mri");
}

function pct(n: any) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function shortAttemptId(id: string) {
  const x = String(id || "");
  return x ? x.slice(0, 8) : "";
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

  const deepName = pickFirstNonEmpty(
    dig(attempt, "participant.full_name"),
    dig(attempt, "participant.name"),
    dig(attempt, "registration.full_name"),
    dig(attempt, "registration.name"),
    dig(attempt, "contact.name")
  );
  const deepEmail = pickFirstNonEmpty(
    dig(attempt, "participant.email"),
    dig(attempt, "registration.email"),
    dig(attempt, "contact.email")
  );
  const deepCompany = pickFirstNonEmpty(
    dig(attempt, "participant.company"),
    dig(attempt, "registration.company"),
    dig(attempt, "contact.company"),
    dig(attempt, "organization.name")
  );

  const rawName = pickFirstNonEmpty(...nameCandidates, deepName);
  const rawEmail = pickFirstNonEmpty(...emailCandidates, deepEmail);
  const rawCompany = pickFirstNonEmpty(...companyCandidates, deepCompany);

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";

  let fullName = rawName.trim() || "—";
  if ((fullName === "—" || !fullName) && email !== "—") {
    const m = email.match(/^([^@]+)/);
    if (m) fullName = m[1].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
  }

  const company = rawCompany.trim() || "—";
  return { fullName, email, company };
}

// ✅ Server-side assessment config fetch (slug-first)
async function getAssessmentConfigServer(supabase: any, slug: string) {
  const routeSlug = String(slug || "").toLowerCase();

  // 1) try by slug column
  const bySlug = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", routeSlug)
    .maybeSingle();

  if (bySlug?.data) return bySlug.data;

  // 2) fallback mapping (keeps old behavior safe)
  const ROUTE_TO_ID: Record<string, string> = {
    scan: "outdoor_sales_scan",
    mri: "outdoor_sales_mri",
  };

  const assessmentId = ROUTE_TO_ID[routeSlug] || routeSlug;

  const byId = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();

  return byId?.data ?? null;
}

const T = {
  en: {
    notFound: "Report not found",
    backToResults: "Back to Results",
    overall: "Overall Score",
    recommendations: "Execution Roadmap",
    top3: "Top 3 Priority Actions:",
    score: "Score",
    mriFallbackTitle: "Full MRI Report",
    mriFallbackSubtitle: "Comprehensive assessment with detailed insights and strategic recommendations.",
  },
  ar: {
    notFound: "التقرير غير موجود",
    backToResults: "العودة إلى النتائج",
    overall: "النتيجة الإجمالية",
    recommendations: "خارطة الطريق التنفيذية",
    top3: "أفضل 3 إجراءات ذات أولوية:",
    score: "النتيجة",
    mriFallbackTitle: "التقرير المتقدم",
    mriFallbackSubtitle: "تقييم شامل مع رؤى تفصيلية وتوصيات استراتيجية.",
  },
};

export default async function ReportPage({ params, searchParams }: PageProps) {
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
  const t = ar ? T.ar : T.en;

  const hardRtlCss = `
    [data-rtl="true"] * { direction: rtl !important; }
    [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; }
    [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
    [data-rtl="true"] ol.rtl-ol { direction: rtl !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-right: 1.25rem !important; padding-left: 0 !important; }
    [data-rtl="false"] ol.ltr-ol { direction: ltr !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-left: 1.25rem !important; padding-right: 0 !important; }
  `;

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 sm:p-10" data-rtl={ar ? "true" : "false"}>
        <style dangerouslySetInnerHTML={{ __html: hardRtlCss }} />
        <div className="max-w-3xl mx-auto bg-white border-2 border-slate-200 rounded-2xl md:rounded-3xl p-6 sm:p-10 text-center shadow-xl">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 sm:mb-6">{t.notFound}</div>
          <Link
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white font-black px-6 sm:px-8 py-3 sm:py-4 hover:bg-slate-800 transition-all shadow-lg min-h-[48px]"
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
          >
            {t.backToResults}
          </Link>
        </div>
      </div>
    );
  }

  // ✅ load assessment config by slug (menu-driven)
  const assessment = await getAssessmentConfigServer(supabase, slug);

  // ✅ build competency label registry from DB config (menu-driven)
  const labelsFromConfig: Record<string, { en: string; ar: string }> = {};
  const comps = Array.isArray((assessment as any)?.config?.competencies)
    ? (assessment as any).config.competencies
    : [];
  for (const c of comps) {
    const id = normalizeCompetencySafe(c?.id);
    if (!id) continue;
    labelsFromConfig[id] = { en: String(c?.en || ""), ar: String(c?.ar || "") };
  }

  function getCompetencyLabel(competencyId: string, lang: Language): string {
    const key = normalizeCompetencySafe(competencyId);
    const meta =
      labelsFromConfig[key] ||
      COMPETENCY_LABELS[key] ||
      null;

    if (meta) {
      return lang === "ar" ? (meta.ar || meta.en || key) : (meta.en || meta.ar || key);
    }
    return key;
  }

  // ✅ menu-driven titles/subtitles
  const reportTitle =
    (lang === "ar"
      ? ((assessment as any)?.title_ar || (assessment as any)?.name_ar || "")
      : ((assessment as any)?.title_en || (assessment as any)?.name_en || "")) || "";

  const reportSubtitle =
    (lang === "ar"
      ? String((assessment as any)?.config?.subtitle_ar || "")
      : String((assessment as any)?.config?.subtitle_en || "")) || "";

  const mri = isMriReport(slug, (attempt as any).assessment_id);

  const competencyResults: any[] = Array.isArray((attempt as any).competency_results)
    ? (attempt as any).competency_results
    : [];

  const overall = pct((attempt as any).total_percentage);
  const overallTier: Tier = tierFromPercentage(overall);
  const identity = extractIdentity(attempt);

  // ✅ fallback titles if DB missing
  const heroTitle = reportTitle || (mri ? t.mriFallbackTitle : (ar ? "تقرير كفاءات المبيعات" : "Sales Competency Report"));
  const heroSubtitle =
    reportSubtitle ||
    (mri ? t.mriFallbackSubtitle : (ar ? "خارطة طريق تنفيذية كاملة مع خطوات قابلة للتنفيذ." : "Your complete execution roadmap with actionable next steps."));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" data-rtl={ar ? "true" : "false"}>
      <style dangerouslySetInnerHTML={{ __html: hardRtlCss }} />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-slate-200">
          <div className="text-xs sm:text-sm text-slate-600 rtl-text font-bold">
            {ar ? "معرّف المحاولة" : "Attempt ID"}:{" "}
            <span className="font-mono text-blue-600 force-ltr">{shortAttemptId(attemptId)}</span>
          </div>

          <Link
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black px-5 sm:px-6 py-2.5 sm:py-3 transition-all shadow-lg active:scale-95 text-sm sm:text-base min-h-[44px]"
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
          >
            {t.backToResults}
          </Link>
        </div>

        {!mri && (
          <>
            {/* HERO */}
            <section className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-2 border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />

              <div className="absolute inset-0 overflow-hidden opacity-30">
                <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-400 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-400 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-purple-400 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
              </div>

              <div className="relative p-6 sm:p-10 md:p-12 lg:p-16">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  <div className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-start">
                    <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-blue-500/20 border-2 border-blue-400/30 text-blue-200 text-xs sm:text-sm font-black uppercase tracking-wider backdrop-blur-sm">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {ar ? "تقرير ويب احترافي" : "Professional Web Report"}
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight rtl-text drop-shadow-lg">
                      {heroTitle}
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-blue-100 leading-relaxed rtl-text max-w-2xl">
                      {heroSubtitle}
                    </p>
                  </div>

                  <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[340px] aspect-square relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 sm:border-8 border-white/10 backdrop-blur-md" />
                    <div className="absolute inset-2 sm:inset-4 rounded-full border-2 sm:border-4 border-white/5" />
                    <div className="absolute inset-4 sm:inset-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 blur-2xl opacity-60 animate-pulse" />

                    <div className="relative z-10 text-center space-y-2 sm:space-y-4">
                      <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-white drop-shadow-2xl">
                        {overall}%
                      </div>
                      <div className="text-xs sm:text-sm font-black text-blue-200 uppercase tracking-widest px-2 sm:px-4">
                        {t.overall}
                      </div>

                      <div className="flex items-center justify-center pt-1 sm:pt-2">
                        <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black shadow-xl ${tierBadgeClass(overallTier)}`}>
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {getTierLabel(overallTier, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* IDENTITY CARD */}
            <section className="relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-xl">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 blur-3xl opacity-40" />
                <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-200 to-blue-300 blur-3xl opacity-30" />
              </div>

              <div className="relative p-5 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 md:mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {ar ? "بطاقة هوية المشارك" : "Participant Identity Card"}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600">
                      {ar ? "هوية احترافية عالمية المستوى — جاهزة للمشاركة والأرشفة." : "World-class professional identity — ready for sharing and archiving."}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 bg-white shadow-sm self-start sm:self-auto">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <span className="text-xs sm:text-sm font-black text-slate-700">
                      ID: <span className="font-mono text-blue-600 force-ltr">{shortAttemptId(attemptId) || "—"}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-start gap-3 md:gap-4">
                      <div className="shrink-0 inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 mb-1 rtl-text">
                          {ar ? "الاسم الكامل" : "Full Name"}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight rtl-text">
                          {identity.fullName || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-start gap-3 md:gap-4">
                      <div className="shrink-0 inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 mb-1 rtl-text">
                          {ar ? "البريد الإلكتروني" : "Email"}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight force-ltr">
                          {identity.email || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-start gap-3 md:gap-4">
                      <div className="shrink-0 inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 mb-1 rtl-text">
                          {ar ? "الشركة" : "Company"}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight rtl-text">
                          {identity.company || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* EXECUTION ROADMAP */}
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">{t.recommendations}</h2>
              </div>

              <ActionableExecutionCard
                ar={ar}
                titleAr="النتيجة الإجمالية"
                titleEn="Overall Score"
                descAr="هذا يلخص نمطك الكامل تحت الضغط — ما يختبره العميل فعليًا."
                descEn="Your complete pattern under pressure — what prospects actually experience."
                tier={overallTier}
                percentage={overall}
                recommendations={getRecommendations("overall_score", overallTier, lang)}
                t={t}
              />

              {competencyResults.map((raw: any) => {
                const competencyId = normalizeCompetencySafe(raw?.competencyId);
                const percentage = pct(raw?.percentage);
                const tier: Tier = tierFromPercentage(percentage);
                const recs = getRecommendations(competencyId, tier, lang);

                return (
                  <ActionableExecutionCard
                    key={competencyId}
                    ar={ar}
                    titleAr={getCompetencyLabel(competencyId, lang)}
                    titleEn={getCompetencyLabel(competencyId, lang)}
                    tier={tier}
                    percentage={percentage}
                    recommendations={recs}
                    t={t}
                  />
                );
              })}
            </section>
          </>
        )}

        {mri && (
          <section className="bg-white border-2 border-slate-200 rounded-2xl md:rounded-3xl p-8 sm:p-10 md:p-12 shadow-xl">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="inline-block p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl mb-3 sm:mb-4">
                <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 rtl-text">{heroTitle}</h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto rtl-text">{heroSubtitle}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ActionableExecutionCard({
  ar,
  titleAr,
  titleEn,
  descAr,
  descEn,
  tier,
  percentage,
  recommendations,
  t,
}: {
  ar: boolean;
  titleAr: string;
  titleEn: string;
  descAr?: string;
  descEn?: string;
  tier: Tier;
  percentage?: number;
  recommendations: string[];
  t: any;
}) {
  const parseTimeframe = (rec: string): string => {
    const s = String(rec || "");
    const low = s.toLowerCase();
    if (low.includes("today")) return ar ? "اليوم" : "Today";
    if (low.includes("7 days") || low.includes("for 7 days")) return ar ? "7 أيام" : "7 Days";
    return ar ? "هذا الأسبوع" : "This Week";
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-2 border-white/20 ${tierCardBgClass(tier)}`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 h-60 w-60 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative p-5 sm:p-6 md:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex-1 space-y-1.5 sm:space-y-2">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-lg rtl-text">
              {ar ? titleAr : titleEn}
            </h3>
            {(descAr || descEn) && (
              <p className="text-sm sm:text-base text-white/90 leading-relaxed rtl-text">
                {ar ? descAr : descEn}
              </p>
            )}
          </div>

          {percentage !== undefined && (
            <div className="shrink-0 text-center bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl border-2 border-white/30 p-4 sm:p-5 md:p-6 min-w-[120px] sm:min-w-[140px] shadow-xl self-start md:self-auto">
              <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">{percentage}%</div>
              <div className="text-[10px] sm:text-xs font-black text-white/80 uppercase tracking-widest mt-1.5 sm:mt-2">{t.score}</div>
            </div>
          )}
        </div>

        <div className="mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-xs sm:text-sm">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {t.top3}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {recommendations.length ? (
            recommendations.slice(0, 3).map((rec, idx) => {
              const timeframe = parseTimeframe(rec);

              return (
                <div
                  key={idx}
                  className={`group rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-xl transition-all border-2 border-white/50 hover:scale-[1.02] ${tierSoftBg(
                    tier
                  )}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-black text-base sm:text-lg shadow-md">
                      {idx + 1}
                    </div>

                    <div className="flex-1 space-y-2.5 sm:space-y-3">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white border-2 border-slate-200 text-slate-700 text-xs font-black shadow-sm">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {timeframe}
                      </div>

                      <p className="text-slate-800 text-sm sm:text-base font-medium leading-relaxed rtl-text">
                        {rec}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/90 rounded-2xl p-5 sm:p-6 text-center">
              <p className="text-slate-600 text-sm sm:text-base italic rtl-text">
                {ar ? "لا توجد توصيات متاحة." : "No recommendations available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
