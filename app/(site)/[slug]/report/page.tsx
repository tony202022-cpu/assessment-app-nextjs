// app/(site)/[slug]/report/page.tsx
import "server-only";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getAssessmentConfig } from "@/lib/actions";
import { getRecommendations, Tier, Language } from "@/lib/pdf-recommendations";

/* ----------------------------------------
   Normalize competency ids (ONE TRUTH)
   This fixes: destroying_objections vs handling_objections
----------------------------------------- */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const map: Record<string, string> = {
    destroying_objections: "handling_objections",
    handling_objections: "handling_objections",
  };

  return map[clean] || clean;
}

/* ----------------------------------------
   Competency labels (render-time language)
   NEVER render DB-stored "name" because it may be Arabic
----------------------------------------- */
const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
};

function getCompetencyLabel(competencyId: string, lang: Language): string {
  const key = normalizeCompetencyId(competencyId);
  const meta = COMPETENCY_LABELS[key];
  if (meta) return lang === "ar" ? meta.ar : meta.en;
  return key;
}

/* ----------------------------------------
   Tier labels (localized)
----------------------------------------- */
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

function badgeClasses(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Opportunity":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Weakness":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Threat":
    default:
      return "bg-rose-50 text-rose-700 border-rose-100";
  }
}

/* ---------------------------------------- */

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

function isMriReport(slug: string, attemptAssessmentId?: string | null, config?: any) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(config?.type || "").toLowerCase();
  return s === "mri" || a.includes("mri") || c === "mri" || c === "paid";
}

function pct(n: any) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

const T = {
  en: {
    notFound: "Report not found",
    backToResults: "Back to Results",
    scanTitle: "Scan Web Report",
    scanSubtitle: "Clear, actionable recommendations based on your performance.",
    overall: "Overall Score",
    recommendations: "Recommendations",
    top3: "Top 3 next steps:",
    level: "Level",
    score: "Score",
    mriTitle: "Full MRI Report",
    mriSubtitle: "This is a scaffold. We'll populate the full MRI sections later.",
  },
  ar: {
    notFound: "التقرير غير موجود",
    backToResults: "العودة إلى النتائج",
    scanTitle: "تقرير Scan على الويب",
    scanSubtitle: "توصيات واضحة وقابلة للتنفيذ بناءً على أدائك.",
    overall: "النتيجة الإجمالية",
    recommendations: "التوصيات",
    top3: "أفضل 3 خطوات الآن:",
    level: "المستوى",
    score: "النتيجة",
    mriTitle: "تقرير MRI الكامل",
    mriSubtitle: "هذا قالب هيكلي — سنقوم بملء أقسام تقرير MRI لاحقاً.",
  },
};

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
    .select("id, assessment_id, language, total_percentage, competency_results")
    .eq("id", attemptId)
    .maybeSingle();

  const config = await getAssessmentConfig(slug);

  const lang: Language = pickLang(attempt?.language, urlLang);
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const t = ar ? T.ar : T.en;

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 p-10" dir={dir}>
        <div className="max-w-3xl mx-auto bg-white border rounded-3xl p-8 text-center">
          <div className="text-2xl font-black text-slate-900">{t.notFound}</div>
          <div className="mt-6">
            <Link
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white font-black px-6 py-3"
              href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
            >
              {t.backToResults}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mri = isMriReport(slug, attempt.assessment_id, config);
  const competencyResults: any[] = Array.isArray(attempt.competency_results)
    ? attempt.competency_results
    : [];

  const overall = pct(attempt.total_percentage);

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {ar ? "محاولة" : "Attempt"}:{" "}
            <span className="font-mono text-slate-700">{attemptId.slice(0, 8)}</span>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white font-black px-5 py-3"
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
          >
            {t.backToResults}
          </Link>
        </div>

        {/* SCAN WEB REPORT */}
        {!mri && (
          <>
            {/* HERO */}
            <section className="bg-white border rounded-3xl p-8 md:p-12 shadow-sm">
              <div className={`flex flex-col md:flex-row items-center gap-10 ${ar ? "md:flex-row-reverse" : ""}`}>
                <div className={`flex-1 space-y-4 ${ar ? "text-right" : "text-left"}`}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-black">
                    {ar ? "تقرير ويب" : "WEB REPORT"}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                    {t.scanTitle}
                  </h1>

                  <p className="text-slate-600 leading-relaxed">{t.scanSubtitle}</p>
                </div>

                <div className="w-full max-w-[280px] aspect-square relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-50 rounded-full opacity-70" />
                  <div className="relative z-10 text-center">
                    <div className="text-6xl font-black text-slate-900">{overall}%</div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
                      {t.overall}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* RECOMMENDATIONS */}
            <section className="space-y-5">
              <h2 className={`text-2xl font-black text-slate-900 ${ar ? "text-right" : "text-left"}`}>
                {t.recommendations}
              </h2>

              <div className="grid grid-cols-1 gap-6">
                {competencyResults.map((raw: any) => {
                  const competencyId = normalizeCompetencyId(raw?.competencyId);
                  const tier: Tier = (raw?.tier as Tier) || "Threat";
                  const recs = getRecommendations(competencyId, tier, lang);

                  return (
                    <div
                      key={competencyId}
                      className={`bg-white border rounded-3xl p-8 shadow-sm ${ar ? "text-right" : "text-left"}`}
                    >
                      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${ar ? "md:flex-row-reverse" : ""}`}>
                        <div>
                          <div className="text-xl font-black text-slate-900">
                            {getCompetencyLabel(competencyId, lang)}
                          </div>

                          <div className="text-slate-600 text-sm mt-1">
                            {t.level}:{" "}
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-black ${badgeClasses(tier)}`}
                            >
                              {getTierLabel(tier, lang)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 px-5 py-4 text-center min-w-[140px]">
                          <div className="text-2xl font-black text-slate-900">{pct(raw?.percentage)}%</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {t.score}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="text-sm font-black text-slate-900 mb-3">
                          {t.top3}
                        </div>

                        {recs.length ? (
                          <ul
                            className={`space-y-3 list-disc ${ar ? "pr-6" : "pl-6"}`}
                            style={{ direction: ar ? "rtl" : "ltr" }}
                          >
                            {recs.map((text, idx) => (
                              <li key={idx} className="text-slate-700 leading-relaxed">
                                {text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-slate-500 italic">
                            {ar ? "لا توجد توصيات لهذه الكفاءة." : "No recommendations available for this competency."}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* MRI PLACEHOLDER */}
        {mri && (
          <section className={`bg-white border rounded-3xl p-10 ${ar ? "text-right" : "text-left"}`}>
            <h1 className="text-3xl font-black text-slate-900">{t.mriTitle}</h1>
            <p className="text-slate-600 mt-4">{t.mriSubtitle}</p>
          </section>
        )}
      </main>
    </div>
  );
}
