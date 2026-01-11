// app/print-report/PrintReportClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";
import { getQuizAttempt } from "@/lib/actions";
import { getRecommendations } from "@/lib/pdf-recommendations";

export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */
type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

interface CompetencyResult {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
}

/* =========================================================
   COMPETENCY META (SINGLE SOURCE OF TRUTH)
========================================================= */
const COMPETENCY_META: Record<
  string,
  { labelEn: string; labelAr: string; diagnosticEn: string; diagnosticAr: string }
> = {
  mental_toughness: {
    labelEn: "Mental Toughness",
    labelAr: "الصلابة الذهنية",
    diagnosticEn:
      "Your ability to stay focused, resilient, and emotionally stable during field challenges.",
    diagnosticAr:
      "قدرتك على البقاء مركزاً ومرناً ومستقراً عاطفياً أثناء تحديات العمل الميداني.",
  },
  opening_conversations: {
    labelEn: "Opening Conversations",
    labelAr: "فتح المحادثات",
    diagnosticEn: "How effectively you initiate conversations and create positive first impressions.",
    diagnosticAr: "مدى فعالية بدء المحادثات وخلق انطباعات أولى إيجابية.",
  },
  identifying_real_needs: {
    labelEn: "Identifying Real Needs",
    labelAr: "تحديد الاحتياجات الحقيقية",
    diagnosticEn: "Your skill in uncovering the customer's true motivations and buying triggers.",
    diagnosticAr: "مهارتك في كشف الدوافع الحقيقة ومحفزات الشراء لدى العميل.",
  },
  destroying_objections: {
    labelEn: "Handling Objections",
    labelAr: "التعامل مع الاعتراضات",
    diagnosticEn: "How well you neutralize resistance and guide prospects back to value.",
    diagnosticAr: "مدى قدرتك على تحييد المقاومة وتوجيه العميل نحو القيمة.",
  },
  creating_irresistible_offers: {
    labelEn: "Creating Irresistible Offers",
    labelAr: "إنشاء عروض لا تُقاوَم",
    diagnosticEn: "Your ability to craft compelling, high-value offers that excite prospects.",
    diagnosticAr: "قدرتك على إنشاء عروض جذابة وعالية القيمة تثير اهتمام العملاء.",
  },
  mastering_closing: {
    labelEn: "Mastering Closing",
    labelAr: "إتقان الإغلاق",
    diagnosticEn: "How effectively you guide prospects toward confident buying decisions.",
    diagnosticAr: "مدى فعالية توجيه العملاء نحو اتخاذ قرارات شراء بثقة.",
  },
  follow_up_discipline: {
    labelEn: "Follow-Up Discipline",
    labelAr: "انضباط المتابعة",
    diagnosticEn: "Your consistency in following up and converting warm leads into customers.",
    diagnosticAr: "مدى التزامك بالمتابعة وتحويل العملاء المحتملين إلى عملاء فعليين.",
  },
};

const COMPETENCY_ORDER = [
  "mental_toughness",
  "opening_conversations",
  "identifying_real_needs",
  "destroying_objections",
  "creating_irresistible_offers",
  "mastering_closing",
  "follow_up_discipline",
] as const;

/* =========================================================
   HELPERS
========================================================= */
const tierColor = (tier: Tier) => {
  if (tier === "Strength") return "#16a34a";
  if (tier === "Opportunity") return "#2563eb";
  if (tier === "Threat") return "#A97142"; // deep bronze
  return "#ef4444";
};

const tierLabel = (tier: Tier, isArabic: boolean) => {
  if (!isArabic) return tier;
  if (tier === "Strength") return "قوة";
  if (tier === "Opportunity") return "فرصة";
  if (tier === "Threat") return "تهديد";
  return "ضعف";
};

const clampPct = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const normalizeCompetencyId = (id: string) => {
  const clean = String(id || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "destroying_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    "mental toughness": "mental_toughness",
    "opening conversations": "opening_conversations",
    "identifying real needs": "identifying_real_needs",
    "handling objections": "destroying_objections",
    "creating irresistible offers": "creating_irresistible_offers",
    "mastering closing": "mastering_closing",
    "follow-up discipline": "follow_up_discipline",

    "الصلابة الذهنية": "mental_toughness",
    "فتح المحادثات": "opening_conversations",
    "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
    "التعامل مع الاعتراضات": "destroying_objections",
    "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
    "إتقان الإغلاق": "mastering_closing",
    "انضباط المتابعة": "follow_up_discipline",
  };

  return map[clean] || map[key] || key;
};

function formatReportDate(dateValue: any, isArabic: boolean) {
  try {
    const d = dateValue ? new Date(dateValue) : new Date();
    return d.toLocaleDateString(isArabic ? "ar-AE" : "en-AU");
  } catch {
    return new Date().toLocaleDateString();
  }
}

/* =================
DONUT (PRINT SAFE)
================= */
function Donut({ value, color }: { value: number; color: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = clampPct(value);
  const dash = (pct / 100) * c;
  const rest = c - dash;

  return (
    <div className="relative w-[100px] h-[100px] mx-auto">
      <svg width="100" height="100" viewBox="0 0 100 100" className="donut-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${rest}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-gray-900 num">
        {pct}%
      </div>
    </div>
  );
}

/* =================
MAIN COMPONENT
================= */
export default function PrintReportClient() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId") || "";
  const puppeteerMode = (searchParams.get("puppeteer") || "") === "1";

  const { language: localeLanguage } = useLocale();

  const langParamRaw = (searchParams.get("lang") || "").toLowerCase();
  const langParam = langParamRaw === "ar" ? "ar" : langParamRaw === "en" ? "en" : null;

  const [reportLang, setReportLang] = useState<"en" | "ar">(
    langParam || (localeLanguage === "ar" ? "ar" : "en")
  );

  const isArabic = reportLang === "ar";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompetencyResult[]>([]);
  const [total, setTotal] = useState(0);

  // attempt + identity fields from server action
  const [userMeta, setUserMeta] = useState<any | null>(null);

  /* ============================
     A) FETCH RESULTS + USER META
  ============================ */
  useEffect(() => {
    const load = async () => {
      const uiLang: "en" | "ar" = langParam || (localeLanguage === "ar" ? "ar" : "en");
      const uiIsArabic = uiLang === "ar";

      if (!attemptId) {
        toast.error(uiIsArabic ? "لا يوجد attemptId" : "Missing attemptId");
        setLoading(false);
        return;
      }

      try {
        const data: any = await getQuizAttempt(attemptId);

        const dbLangRaw = String(data?.language || "").toLowerCase();
        const dbLang = dbLangRaw === "ar" ? "ar" : dbLangRaw === "en" ? "en" : null;

        const finalLang = langParam || dbLang || (localeLanguage === "ar" ? "ar" : "en");
        setReportLang(finalLang);

        const parsed = (data?.competency_results || []) as CompetencyResult[];
        const normalized = parsed.map((r) => ({
          ...r,
          competencyId: normalizeCompetencyId((r as any).competencyId),
          percentage: clampPct((r as any).percentage),
        }));

        setResults(normalized);

        // Prefer DB total, fallback to average if missing
        const dbTotal = Number(data?.total_percentage);
        const safeTotal =
          Number.isFinite(dbTotal) && dbTotal >= 0
            ? clampPct(dbTotal)
            : clampPct(
                normalized.reduce((s, r) => s + (Number(r.percentage) || 0), 0) /
                  Math.max(1, normalized.length)
              );

        setTotal(safeTotal);

        setUserMeta(data || null);
        setLoading(false);
      } catch (e) {
        console.error("getQuizAttempt error:", e);
        toast.error(uiIsArabic ? "خطأ في تحميل النتائج" : "Error loading results");
        setLoading(false);
      }
    };

    load();
  }, [attemptId, langParam, localeLanguage]);

  /* ============================
     B) ORDER RESULTS
  ============================ */
  const ordered = useMemo(() => {
    const map = new Map<string, CompetencyResult>();
    results.forEach((r) => map.set(r.competencyId, r));

    const orderedCore = COMPETENCY_ORDER.map((id) => map.get(id)).filter(Boolean) as CompetencyResult[];
    const extras = results.filter((r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId));

    return [...orderedCore, ...extras];
  }, [results]);

  /* ============================
     C) PAGE SPLITTING
  ============================ */
  const firstFive = useMemo(() => ordered.slice(0, 5), [ordered]);
  const lastTwo = useMemo(() => ordered.slice(5, 7), [ordered]);
  const firstFourForRecs = useMemo(() => ordered.slice(0, 4), [ordered]);
  const lastThreeForRecs = useMemo(() => ordered.slice(4, 7), [ordered]);

  /* ============================
     D) AUTO-PRINT (HUMAN ONLY)
  ============================ */
  useEffect(() => {
    if (puppeteerMode) return;
    if (!loading && ordered.length > 0) {
      const t = window.setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error("Print error:", e);
        }
      }, 900);

      return () => window.clearTimeout(t);
    }
  }, [loading, ordered.length, puppeteerMode]);

  /* ============================
     E) PUPPETEER PDF READY SIGNAL
  ============================ */
  useEffect(() => {
    if (!puppeteerMode) return;
    if (loading) return;
    if (!ordered.length) return;

    let cancelled = false;

    (async () => {
      try {
        // @ts-ignore
        if (document?.fonts?.ready) await (document as any).fonts.ready;
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (!cancelled) (document.body as any).dataset.pdfReady = "1";
      } catch {
        if (!cancelled) (document.body as any).dataset.pdfReady = "1";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [puppeteerMode, loading, ordered.length]);

  /* ============================
     F) LOADING / EMPTY
  ============================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg font-semibold">
        {isArabic ? "جاري التحضير…" : "Preparing…"}
      </div>
    );
  }

  if (!ordered.length) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg font-semibold text-red-600">
        {isArabic ? "لا توجد نتائج" : "No results found"}
      </div>
    );
  }

  /* ============================
     G) SWOT LISTS
  ============================ */
  const strengths = ordered.filter((c) => c.tier === "Strength");
  const opportunities = ordered.filter((c) => c.tier === "Opportunity");
  const threats = ordered.filter((c) => c.tier === "Threat");
  const weaknesses = ordered.filter((c) => c.tier === "Weakness");

  // ✅ identity fields (new server action returns these directly)
  const fullName =
    userMeta?.full_name ||
    userMeta?.profile?.full_name ||
    userMeta?.name ||
    "—";

  const company =
    userMeta?.company ||
    userMeta?.profile?.company ||
    "";

  const email =
    userMeta?.user_email ||
    userMeta?.email ||
    "—";

  const createdAt = userMeta?.created_at || null;
  const clientId = userMeta?.user_id || "—";

  /* ============================
     H) RENDER REPORT
  ============================ */
  return (
    <div dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"} className={isArabic ? "rtl" : "ltr"}>
      <button
        onClick={() => window.print()}
        className={`printbtn fixed top-4 ${isArabic ? "left-4" : "right-4"} z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg print:hidden`}
      >
        {isArabic ? "طباعة" : "Print"}
      </button>

      <div className="report-container">
        {/* ===== PAGE 1: COVER ===== */}
        <div className="page cover-page">
          <img src="/new levelup logo 3.png" className="cover-logo" alt="Logo" />

          <h1 className="cover-title">{isArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}</h1>
          <h2 className="cover-subtitle">{isArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}</h2>

          {/* USER INFO */}
          <div className="cover-user-info">
            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "الاسم" : "Name"}</span>
              <span className="cover-user-value">{fullName}</span>
            </div>

            {company ? (
              <div className="cover-user-line">
                <span className="cover-user-label">{isArabic ? "الشركة" : "Company"}</span>
                <span className="cover-user-value">{company}</span>
              </div>
            ) : null}

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
              <span className="cover-user-value">{email}</span>
            </div>

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "Client ID" : "Client ID"}</span>
              <span className="cover-user-value num">
                {clientId && clientId !== "—" ? String(clientId).slice(0, 8) : "—"}
              </span>
            </div>

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "معرف المحاولة" : "Attempt ID"}</span>
              <span className="cover-user-value num">{attemptId ? attemptId.slice(0, 8) : "—"}</span>
            </div>

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "التاريخ" : "Date"}</span>
              <span className="cover-user-value num">{formatReportDate(createdAt, isArabic)}</span>
            </div>
          </div>

          {/* SCORE */}
          <div className="cover-score-section">
            <Donut value={total} color="#22c55e" />
            <p className="cover-score-label">{isArabic ? "النتيجة الإجمالية" : "Overall Score"}</p>
            <p className="cover-score-percentage num">{clampPct(total)}%</p>

            <p className="cover-note">
              {isArabic ? "ملخص سريع لأدائك في 7 كفاءات أساسية." : "A fast snapshot of your 7 core competencies."}
            </p>

            <p className="cover-note-small">
              {isArabic
                ? "هذا التقرير يعكس نمطك السلوكي في الميدان — وليس معرفة نظرية."
                : "This report reflects your behavioral field pattern — not theoretical knowledge."}
            </p>
          </div>
        </div>

        {/* ===== PAGE 2: SUMMARY (FIRST 5) ===== */}
        <div className="page summary-page">
          <h2 className="section-title">{isArabic ? "ملخص الأداء" : "Performance Summary"}</h2>
          <p className="section-subtitle">
            {isArabic ? "النتائج مرتبة حسب الكفاءات الأساسية." : "Results ordered by the core competencies."}
          </p>

          <div className="competency-summary-grid">
            {firstFive.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const label = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
              const diag = meta ? (isArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
              const pct = clampPct(c.percentage);
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="competency-summary-card">
                  <div className="competency-summary-header">
                    <h3 className="competency-summary-label">{label}</h3>
                    <span className="competency-summary-tier" style={{ color }}>
                      {tierLabel(c.tier, isArabic)}
                    </span>
                  </div>

                  <p className="competency-summary-diagnostic">{diag}</p>

                  <div className="competency-summary-progress">
                    <div className="competency-summary-bar-track">
                      <div className="competency-summary-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>

                    <span className="competency-summary-percentage num">{pct}%</span>
                    <span className="competency-summary-score num">
                      {c.score}/{c.maxScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== PAGE 3: LAST 2 + SWOT ===== */}
        <div className="page summary-page">
          <h2 className="section-title">{isArabic ? "ملخص الأداء" : "Performance Summary"}</h2>
          <p className="section-subtitle">
            {isArabic ? "استكمال النتائج مع نظرة SWOT استراتيجية." : "Remaining results with a strategic SWOT view."}
          </p>

          <div className="competency-summary-grid">
            {lastTwo.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const label = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
              const diag = meta ? (isArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
              const pct = clampPct(c.percentage);
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="competency-summary-card">
                  <div className="competency-summary-header">
                    <h3 className="competency-summary-label">{label}</h3>
                    <span className="competency-summary-tier" style={{ color }}>
                      {tierLabel(c.tier, isArabic)}
                    </span>
                  </div>

                  <p className="competency-summary-diagnostic">{diag}</p>

                  <div className="competency-summary-progress">
                    <div className="competency-summary-bar-track">
                      <div className="competency-summary-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>

                    <span className="competency-summary-percentage num">{pct}%</span>
                    <span className="competency-summary-score num">
                      {c.score}/{c.maxScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="swot-section">
            <h2 className="section-title swot-title-inline">{isArabic ? "تحليل SWOT" : "SWOT Analysis"}</h2>
            <p className="section-subtitle">{isArabic ? "نظرة سريعة على الصورة الاستراتيجية." : "A quick strategic overview."}</p>

            <div className="swot-grid">
              <div className="swot-card swot-strength">
                <h3 className="swot-card-title">{isArabic ? "نقاط القوة" : "Strengths"}</h3>
                <ul className="swot-list">
                  {strengths.length ? (
                    strengths.map((c) => {
                      const key = normalizeCompetencyId(c.competencyId);
                      const meta = COMPETENCY_META[key];
                      return (
                        <li key={c.competencyId}>
                          • {meta ? (isArabic ? meta.labelAr : meta.labelEn) : key}{" "}
                          <span className="num">({clampPct(c.percentage)}%)</span>
                        </li>
                      );
                    })
                  ) : (
                    <li>{isArabic ? "لا يوجد" : "None"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card swot-opportunity">
                <h3 className="swot-card-title">{isArabic ? "الفرص" : "Opportunities"}</h3>
                <ul className="swot-list">
                  {opportunities.length ? (
                    opportunities.map((c) => {
                      const key = normalizeCompetencyId(c.competencyId);
                      const meta = COMPETENCY_META[key];
                      return (
                        <li key={c.competencyId}>
                          • {meta ? (isArabic ? meta.labelAr : meta.labelEn) : key}{" "}
                          <span className="num">({clampPct(c.percentage)}%)</span>
                        </li>
                      );
                    })
                  ) : (
                    <li>{isArabic ? "لا يوجد" : "None"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card swot-weakness">
                <h3 className="swot-card-title">{isArabic ? "نقاط الضعف" : "Weaknesses"}</h3>
                <ul className="swot-list">
                  {weaknesses.length ? (
                    weaknesses.map((c) => {
                      const key = normalizeCompetencyId(c.competencyId);
                      const meta = COMPETENCY_META[key];
                      return (
                        <li key={c.competencyId}>
                          • {meta ? (isArabic ? meta.labelAr : meta.labelEn) : key}{" "}
                          <span className="num">({clampPct(c.percentage)}%)</span>
                        </li>
                      );
                    })
                  ) : (
                    <li>{isArabic ? "لا يوجد" : "None"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card swot-threat">
                <h3 className="swot-card-title">{isArabic ? "التهديدات" : "Threats"}</h3>
                <ul className="swot-list">
                  {threats.length ? (
                    threats.map((c) => {
                      const key = normalizeCompetencyId(c.competencyId);
                      const meta = COMPETENCY_META[key];
                      return (
                        <li key={c.competencyId}>
                          • {meta ? (isArabic ? meta.labelAr : meta.labelEn) : key}{" "}
                          <span className="num">({clampPct(c.percentage)}%)</span>
                        </li>
                      );
                    })
                  ) : (
                    <li>{isArabic ? "لا يوجد" : "None"}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ===== PAGE 4: RECOMMENDATIONS (FIRST 4) ===== */}
        <div className="page recommendations-page">
          <h2 className="section-title">{isArabic ? "التوصيات المخصصة" : "Personalized Recommendations"}</h2>
          <p className="section-subtitle">
            {isArabic ? "خطوات عملية لتحسين أدائك في كل كفاءة." : "Practical steps to improve your performance in each competency."}
          </p>

          <div className="recommendations-grid">
            {firstFourForRecs.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const title = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;

              const recs = (getRecommendations(key, c.tier, reportLang) || []) as string[];
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="recommendation-card">
                  <h3 className="recommendation-card-title" style={{ color }}>
                    {title}
                    <span className="recommendation-card-tier"> ({tierLabel(c.tier, isArabic)})</span>
                  </h3>

                  <ul className="recommendation-list">
                    {recs.length ? (
                      recs.map((r, i) => <li key={i}>• {r}</li>)
                    ) : (
                      <li>
                        {isArabic
                          ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId)."
                          : "No recommendations (check competencyId)."}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== PAGE 5: RECOMMENDATIONS (LAST 3) + MRI UPSELL ===== */}
        <div className="page recommendations-page">
          <h2 className="section-title">{isArabic ? "التوصيات المخصصة (متابعة)" : "Personalized Recommendations (continued)"}</h2>
          <p className="section-subtitle">
            {isArabic
              ? "استكمل توصياتك، ثم انتقل إلى خطوة النقلة النوعية في مبيعاتك."
              : "Complete your recommendations, then step into your next level of sales performance."}
          </p>

          <div className="recommendations-grid">
            {lastThreeForRecs.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const title = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;

              const recs = (getRecommendations(key, c.tier, reportLang) || []) as string[];
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="recommendation-card">
                  <h3 className="recommendation-card-title" style={{ color }}>
                    {title}
                    <span className="recommendation-card-tier"> ({tierLabel(c.tier, isArabic)})</span>
                  </h3>

                  <ul className="recommendation-list">
                    {recs.length ? (
                      recs.map((r, i) => <li key={i}>• {r}</li>)
                    ) : (
                      <li>
                        {isArabic
                          ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId)."
                          : "No recommendations (check competencyId)."}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* === MRI Upsell Section (unchanged) === */}
          <div className="upsell-section">
            <h2 className="upsell-main-title">
              {isArabic
                ? "لقد حصلت على التقرير المجاني… الآن حان وقت النقلة الحقيقية"
                : "You Got the Free Report… Now Unlock the Real Transformation"}
            </h2>

            <p className="upsell-intro">
              {isArabic
                ? "لقد حصلت على المشهيات. الآن حان وقت الطبق الرئيسي والحلوى. إذا كان هذا التقرير قد فتح عينيك… فالـ MRI سيغير مسارك بالكامل."
                : "You’ve had the appetizer. Now it’s time for the main course and the dessert. If this free report opened your eyes… the MRI will change your entire trajectory."}
            </p>

            <div className="upsell-box">
              <h3 className="upsell-title">
                {isArabic ? "Outdoor Selling Skills MRI — التشخيص الأعمق والأدق" : "Outdoor Selling Skills MRI — The Deepest, Sharpest Diagnostic Ever Built"}
              </h3>

              <p className="upsell-subtext">
                {isArabic
                  ? "ليس كورس. ليس ويبينار. ليس كلام تحفيزي. هذا هو التشخيص الحقيقي الذي يحولك إلى محترف مبيعات خارجي من الفئة الأولى."
                  : "Not a course. Not a webinar. Not motivation. This is the scientific diagnostic that turns you into a top-tier outdoor sales performer."}
              </p>

              <ul className="upsell-features">
                <li>{isArabic ? "🧠 يقيس 12 كفاءة أساسية — (ضع أسماء الكفاءات هنا)" : "🧠 Measures 12 Core Competencies — (insert competency names here)"}</li>
                <li>{isArabic ? "📊 75 سؤالاً دقيقاً يكشف سلوكك الحقيقي في الميدان" : "📊 75 precision-engineered questions revealing your real field behavior"}</li>
                <li>{isArabic ? "📘 تقرير احترافي من 25 صفحة — تحليل عميق لكل نقطة قوة وضعف" : "📘 A 25-page professional report — deep analysis of every strength and gap"}</li>
                <li>{isArabic ? "📅 خطة عمل يومية لمدة 90 يوماً — خطوة بخطوة لمضاعفة مبيعاتك" : "📅 A 90-day day-by-day action plan — the exact steps to double your sales"}</li>
              </ul>

              <h4 className="upsell-bonus-title">
                {isArabic ? "وتحصل أيضاً على 5 هدايا لا تُقدّر بثمن" : "Plus 5 Bonuses That Outdoor Reps Would Kill For"}
              </h4>

              <ul className="upsell-bonuses">
                <li>{isArabic ? "1. أفضل 50 إجابة لأصعب 50 اعتراض" : "1. The 50 Best Answers to the 50 Hardest Objections"}</li>
                <li>{isArabic ? "2. كيف تعلمت البيع من لعب كرة القدم" : "2. How I Learned to Sell From Playing Soccer"}</li>
                <li>{isArabic ? "3. كيف تحفّز نفسك تحت الضغط" : "3. How to Motivate Yourself Under Pressure"}</li>
                <li>{isArabic ? "4. كيف تأخذ مواعيد مع كبار الشخصيات" : "4. How to Book Appointments With VIPs"}</li>
                <li>{isArabic ? "5. أفضل ممارسات إدارة الوقت لمندوبي المبيعات الخارجيين" : "5. Time-Management Mastery for Outdoor Sales"}</li>
              </ul>

              <p className="upsell-closer">
                {isArabic
                  ? "لا مزيد من الدورات. لا مزيد من الويبينارات. كل ما تحتاجه لمضاعفة مبيعاتك — مع د. كيفاح فياض."
                  : "No more courses. No more webinars. Everything you need to double your sales — with Dr. Kifah Fayad."}
              </p>

              <a href="#" className="upsell-cta" onClick={(e) => e.preventDefault()}>
                {isArabic ? "ابدأ رحلتك الآن — واجعل البيع لعبة تستمتع بها" : "Start Now — Turn Selling Into a Game You Enjoy"}
              </a>
            </div>

            <div className="report-footer">{isArabic ? "Dyad © 2026" : "Dyad © 2026"}</div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CSS (KEEP YOUR PRINT LOOK)
         ========================================================= */}
      <style jsx global>{`
        body { margin: 0; padding: 0; background: #ffffff; font-family: "Inter", sans-serif; }
        .rtl { direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        .num { direction: ltr !important; unicode-bidi: plaintext !important; }

        .report-container { width: 100%; max-width: 900px; margin: 0 auto; }
        .page { width: 100%; min-height: 100vh; padding: 40px 50px; box-sizing: border-box; page-break-after: always; }

        .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; }
        .cover-logo { width: 180px; margin-top: 20px; margin-bottom: 30px; }
        .cover-title { font-size: 36px; font-weight: 800; margin-bottom: 10px; }
        .cover-subtitle { font-size: 22px; font-weight: 500; color: #555; margin-bottom: 40px; }

        .cover-user-info { width: 100%; max-width: 420px; margin: 0 auto 40px auto; font-size: 16px; }
        .cover-user-line { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .cover-user-label { font-weight: 600; color: #444; }
        .cover-user-value { font-weight: 500; }

        .cover-score-section { margin-top: 20px; }
        .cover-score-label { margin-top: 10px; font-size: 18px; font-weight: 600; }
        .cover-score-percentage { font-size: 32px; font-weight: 800; margin-top: 5px; }
        .cover-note { margin-top: 15px; font-size: 15px; color: #444; }
        .cover-note-small { margin-top: 5px; font-size: 14px; color: #777; }

        .section-title { font-size: 28px; font-weight: 800; margin-bottom: 10px; }
        .section-subtitle { font-size: 16px; color: #555; margin-bottom: 30px; }

        .competency-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .competency-summary-card { padding: 18px 20px; border-radius: 12px; background: #fafafa; border: 1px solid #e5e7eb; }
        .competency-summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .competency-summary-label { font-size: 18px; font-weight: 700; }
        .competency-summary-tier { font-size: 15px; font-weight: 700; }
        .competency-summary-diagnostic { font-size: 14px; color: #555; margin-bottom: 12px; }
        .competency-summary-progress { display: flex; align-items: center; gap: 10px; }
        .competency-summary-bar-track { flex: 1; height: 10px; background: #e5e7eb; border-radius: 6px; overflow: hidden; }
        .competency-summary-bar-fill { height: 100%; border-radius: 6px; }
        .competency-summary-percentage { font-weight: 700; }
        .competency-summary-score { font-size: 13px; color: #666; }

        .swot-section { margin-top: 40px; }
        .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .swot-card { padding: 18px 20px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fafafa; }
        .swot-card-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
        .swot-list { font-size: 14px; color: #444; line-height: 1.6; }
        .swot-threat { background: #fff7ed; border-color: #fed7aa; }

        .recommendations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .recommendation-card { padding: 20px; border-radius: 12px; background: #fafafa; border: 1px solid #e5e7eb; }
        .recommendation-card-title { font-size: 18px; font-weight: 800; margin-bottom: 12px; }
        .recommendation-card-tier { font-size: 15px; font-weight: 600; }
        .recommendation-list { font-size: 14px; color: #444; line-height: 1.6; }

        .upsell-section { margin-top: 40px; padding: 25px; background: #f9fafb; border-radius: 14px; border: 1px solid #e5e7eb; }
        .upsell-main-title { font-size: 24px; font-weight: 800; margin-bottom: 15px; }
        .upsell-intro { font-size: 15px; margin-bottom: 20px; color: #444; }
        .upsell-box { padding: 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; }
        .upsell-title { font-size: 20px; font-weight: 800; margin-bottom: 10px; }
        .upsell-subtext { font-size: 15px; margin-bottom: 15px; color: #555; }
        .upsell-features, .upsell-bonuses { font-size: 14px; color: #444; line-height: 1.6; margin-bottom: 15px; }
        .upsell-closer { font-size: 15px; margin-top: 10px; margin-bottom: 20px; color: #333; }
        .upsell-cta { display: inline-block; padding: 12px 20px; background: #2563eb; color: white; border-radius: 8px; font-weight: 700; text-decoration: none; }
        .report-footer { margin-top: 30px; text-align: center; font-size: 14px; color: #777; }

        @media print {
          .printbtn { display: none !important; }
          .page { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
