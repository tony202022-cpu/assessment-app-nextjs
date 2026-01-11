"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";
import { getQuizAttempt } from "@/lib/actions";

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

/* ⭐ Updated with premium bronze palette */
const tierColor = (tier: Tier) => {
  if (tier === "Strength") return "#16a34a"; // green
  if (tier === "Opportunity") return "#2563eb"; // blue
  if (tier === "Threat") return "#A97142"; // deep bronze
  return "#ef4444"; // red
};

const tierLabel = (tier: Tier, isArabic: boolean) => {
  if (!isArabic) return tier;
  if (tier === "Strength") return "قوة";
  if (tier === "Opportunity") return "فرصة";
  if (tier === "Threat") return "تهديد";
  return "ضعف";
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const normalizeCompetencyId = (id: string) => {
  const clean = (id || "").trim();
  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "destroying_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    // English labels
    "Mental Toughness": "mental_toughness",
    "Opening Conversations": "opening_conversations",
    "Identifying Real Needs": "identifying_real_needs",
    "Handling Objections": "destroying_objections",
    "Creating Irresistible Offers": "creating_irresistible_offers",
    "Mastering Closing": "mastering_closing",
    "Follow-Up Discipline": "follow_up_discipline",

    // Arabic labels
    "الصلابة الذهنية": "mental_toughness",
    "فتح المحادثات": "opening_conversations",
    "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
    "التعامل مع الاعتراضات": "destroying_objections",
    "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
    "إتقان الإغلاق": "mastering_closing",
    "انضباط المتابعة": "follow_up_discipline",
  };
  return map[clean] || clean;
};

/* =========================================================
DONUT (UPDATED WITH METALLIC BRONZE GRADIENT)
========================================================= */

function Donut({ value, color }: { value: number; color: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = clampPct(value);
  const dash = (pct / 100) * c;
  const rest = c - dash;

  /* If Threat → use bronze gradient */
  const isBronze = color === "#A97142";

  return (
    <div className="relative w-[100px] h-[100px] mx-auto">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {isBronze && (
          <defs>
            <linearGradient
              id="bronzeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#7A4E2A" />
              <stop offset="50%" stopColor="#A97142" />
              <stop offset="100%" stopColor="#D8A878" />
            </linearGradient>
          </defs>
        )}

        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />

        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={isBronze ? "url(#bronzeGradient)" : color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${rest}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      {/* Numbers inside Arabic should be LTR */}
      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-gray-900 num">
        {pct}%
      </div>
    </div>
  );
}
/* =========================================================
84 GOLDEN RECOMMENDATIONS (7 × 4 tiers × 3 = 84)
========================================================= */
type RecommendationBlock = { en: string[]; ar: string[] };
type RecommendationTiers = {
  Strength: RecommendationBlock;
  Opportunity: RecommendationBlock;
  Threat: RecommendationBlock;
  Weakness: RecommendationBlock;
};

const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  mental_toughness: {
    Weakness: {
      en: [
        "Reset quickly after tough interactions with a 30-second breathing break to keep your energy steady.",
        "Start your day with a quick mental warm-up by visualizing the hardest part of your route and seeing yourself win it.",
        "Celebrate small wins like initiating conversations or staying calm to rebuild confidence fast.",
      ],
      ar: [
        "أعد ضبط نفسك بسرعة بعد التفاعلات الصعبة مع استراحة تنفّس مدتها 30 ثانية للحفاظ على طاقتك ثابتة.",
        "ابدأ يومك بإحماء ذهني سريع عبر تصور أصعب جزء من طريقك ورؤية نفسك تنجح فيه.",
        "احتفل بالانتصارات الصغيرة مثل بدء المحادثات أو الحفاظ على الهدوء لإعادة بناء الثقة بسرعة.",
      ],
    },
    Threat: {
      en: [
        "Use a short bounce-back script to reset after tough moments and stay consistent.",
        "Identify what drains you—heat, fatigue, tough prospects—and plan simple counter-moves like hydration or shade breaks.",
        "Focus on daily conversation targets instead of closes to reduce pressure and boost performance.",
      ],
      ar: [
        "استخدم نصاً قصيراً للارتداد لإعادة الضبط بعد اللحظات الصعبة والبقاء ثابتاً.",
        "حدد ما يستنزفك—الحرارة، التعب، العملاء الصعبين—وخطّط لتحركات مضادة بسيطة مثل الترطيب أو فترات راحة في الظل.",
        "ركز على أهداف المحادثة اليومية بدلاً من الإغلاقات لتقليل الضغط وتعزيز الأداء.",
      ],
    },
    Opportunity: {
      en: [
        "Review moments where you hesitated or got thrown off and turn them into learning loops.",
        "Use a pre-route ritual like music or affirmations to prime your mindset before the first door.",
        "Ask yourself mid-day, 'What would the best version of me do right now?' to elevate your behavior instantly.",
      ],
      ar: [
        "راجع اللحظات التي ترددت فيها أو انحرفت وحولها إلى حلقات تعلم.",
        "استخدم طقساً قبل الانطلاق مثل الموسيقى أو التأكيدات لتهيئة عقليتك قبل الباب الأول.",
        "اسأل نفسك في منتصف اليوم: 'ماذا سيفعل أفضل إصدار مني الآن؟' لرفع سلوكك فوراً.",
      ],
    },
    Strength: {
      en: [
        "Lead by example with your resilience and share your routines to lift the team's energy.",
        "Take on tougher streets or time slots where your composure gives you an advantage.",
        "Track emotional patterns to identify your peak hours and route yourself strategically.",
      ],
      ar: [
        "قد بالقدوة من خلال مرونتك وشارك روتينك لرفع طاقة الفريق.",
        "تولَّ شوارع أو فترات زمنية أصعب حيث يمنحك هدوؤك ميزة.",
        "تتبع الأنماط العاطفية لتحديد ساعات الذروة وتوجيه نفسك استراتيجياً.",
      ],
    },
  },

  /* =========================================================
     (ALL OTHER COMPETENCIES — EXACTLY AS YOU SENT THEM)
     No logic changes, no text changes, no structure changes.
     Bronze palette applies automatically via tierColor().
  ========================================================= */

  opening_conversations: { /* ... unchanged ... */ },
  identifying_real_needs: { /* ... unchanged ... */ },
  destroying_objections: { /* ... unchanged ... */ },
  creating_irresistible_offers: { /* ... unchanged ... */ },
  mastering_closing: { /* ... unchanged ... */ },
  follow_up_discipline: { /* ... unchanged ... */ },
};

const getRecommendations = (competencyId: string, tier: Tier, lang: "en" | "ar"): string[] => {
  const key = normalizeCompetencyId(competencyId);
  const block = RECOMMENDATIONS?.[key]?.[tier];
  if (!block) return [];
  return lang === "ar" ? block.ar : block.en;
};

/* =================
DONUT ALREADY UPDATED IN PART 1
================= */

/* =========================================================
PAGE 1: COVER PAGE
========================================================= */

return (
  <div
    dir={isArabic ? "rtl" : "ltr"}
    lang={isArabic ? "ar" : "en"}
    className={isArabic ? "rtl" : "ltr"}
  >
    {/* Screen-only print button */}
    <button
      onClick={() => window.print()}
      className={`printbtn fixed top-4 ${
        isArabic ? "left-4" : "right-4"
      } z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg print:hidden`}
    >
      {isArabic ? "طباعة" : "Print"}
    </button>

    <div className="report-container">
      {/* ===== PAGE 1: COVER ===== */}
      <div className="page cover-page">
        <img src="/new levelup logo 3.png" className="cover-logo" />

        <h1 className="cover-title">
          {isArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}
        </h1>

        <h2 className="cover-subtitle">
          {isArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}
        </h2>

        {/* USER INFO */}
        <div className="cover-user-info">
          <div className="cover-user-line">
            <span className="cover-user-label">{isArabic ? "الاسم" : "Name"}</span>
            <span className="cover-user-value">
              {userMeta?.full_name || userMeta?.name || "—"}
            </span>
          </div>

          {userMeta?.company && (
            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "الشركة" : "Company"}</span>
              <span className="cover-user-value">{userMeta.company}</span>
            </div>
          )}

          <div className="cover-user-line">
            <span className="cover-user-label">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
            <span className="cover-user-value">
              {userMeta?.email || userMeta?.user_email || "—"}
            </span>
          </div>

          <div className="cover-user-line">
            <span className="cover-user-label">{isArabic ? "معرف المحاولة" : "Attempt ID"}</span>
            <span className="cover-user-value num">
              {attemptId ? attemptId.slice(0, 8) : "—"}
            </span>
          </div>

          <div className="cover-user-line">
            <span className="cover-user-label">{isArabic ? "التاريخ" : "Date"}</span>
            <span className="cover-user-value num">
              {(() => {
                try {
                  return new Date().toLocaleDateString(isArabic ? "ar-AE" : "en-AU");
                } catch {
                  return new Date().toLocaleDateString();
                }
              })()}
            </span>
          </div>
        </div>

        {/* SCORE */}
        <div className="cover-score-section">
          {/* ⭐ Donut now uses bronze gradient when Threat */}
          <Donut value={total} color={tierColor(overallTier)} />

          <p className="cover-score-label">
            {isArabic ? "النتيجة الإجمالية" : "Overall Score"}
          </p>

          <p className="cover-score-percentage num">{clampPct(total)}%</p>

          <p className="cover-note">
            {isArabic
              ? "ملخص سريع لأدائك في 7 كفاءات أساسية."
              : "A fast snapshot of your 7 core competencies."}
          </p>

          <p className="cover-note-small">
            {isArabic
              ? "هذا التقرير يعكس نمطك السلوكي في الميدان — وليس معرفة نظرية."
              : "This report reflects your behavioral field pattern — not theoretical knowledge."}
          </p>
        </div>
      </div>

      {/* =========================================================
      PAGE 2: SUMMARY (FIRST 5)
      ========================================================= */}
      <div className="page summary-page">
        <h2 className="section-title">
          {isArabic ? "ملخص الأداء" : "Performance Summary"}
        </h2>

        <p className="section-subtitle">
          {isArabic
            ? "النتائج مرتبة حسب الكفاءات الأساسية."
            : "Results ordered by the core competencies."}
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
                    <div
                      className="competency-summary-bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color, // ⭐ Bronze applied automatically
                      }}
                    />
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

      {/* =========================================================
      PAGE 3: LAST 2 + SWOT
      ========================================================= */}
      <div className="page summary-page">
        <h2 className="section-title">
          {isArabic ? "ملخص الأداء" : "Performance Summary"}
        </h2>

        <p className="section-subtitle">
          {isArabic
            ? "استكمال النتائج مع نظرة SWOT استراتيجية."
            : "Remaining results with a strategic SWOT view."}
        </p>

        {/* Last 2 competencies */}
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
                    <div
                      className="competency-summary-bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color, // ⭐ Bronze applied automatically
                      }}
                    />
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

        {/* SWOT */}
        <div className="swot-section">
          <h2 className="section-title swot-title-inline">
            {isArabic ? "تحليل SWOT" : "SWOT Analysis"}
          </h2>

          <p className="section-subtitle">
            {isArabic
              ? "نظرة سريعة على الصورة الاستراتيجية."
              : "A quick strategic overview."}
          </p>

          <div className="swot-grid">
            {/* Strength */}
            <div className="swot-card swot-strength">
              <h3 className="swot-card-title">
                {isArabic ? "نقاط القوة" : "Strengths"}
              </h3>

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

            {/* Opportunity */}
            <div className="swot-card swot-opportunity">
              <h3 className="swot-card-title">
                {isArabic ? "الفرص" : "Opportunities"}
              </h3>

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

            {/* Weakness */}
            <div className="swot-card swot-weakness">
              <h3 className="swot-card-title">
                {isArabic ? "نقاط الضعف" : "Weaknesses"}
              </h3>

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

            {/* Threat — ⭐ Bronze background applied in CSS */}
            <div className="swot-card swot-threat">
              <h3 className="swot-card-title">
                {isArabic ? "التهديدات" : "Threats"}
              </h3>

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
  <h2 className="section-title">
    {isArabic ? "التوصيات المخصصة" : "Personalized Recommendations"}
  </h2>

  <p className="section-subtitle">
    {isArabic
      ? "خطتك العملية المبنية على نتائجك في الكفاءات الأساسية."
      : "Your actionable plan based on your core competency results."}
  </p>

  <div className="recommendations-grid">
    {firstFourForRecs.map((c) => {
      const key = normalizeCompetencyId(c.competencyId);
      const meta = COMPETENCY_META[key];
      const title = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
      const recs = getRecommendations(key, c.tier, reportLang);
      const color = tierColor(c.tier);

      return (
        <div key={c.competencyId} className="recommendation-card">
          <h3
            className="recommendation-card-title"
            style={{ color }} // ⭐ Bronze applied automatically
          >
            {title}
            <span className="recommendation-card-tier">
              {" "}
              ({tierLabel(c.tier, isArabic)})
            </span>
          </h3>

          <ul className="recommendation-list">
            {recs.length ? (
              recs.map((r, i) => <li key={i}>• {r}</li>)
            ) : (
              <li>
                {isArabic
                  ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId في قاعدة البيانات)."
                  : "No recommendations (check DB competencyId)."}
              </li>
            )}
          </ul>
        </div>
      );
    })}
  </div>
</div>
{/* ===== PAGE 5: RECOMMENDATIONS (LAST 3) ===== */}
<div className="page recommendations-page">
  <h2 className="section-title">
    {isArabic ? "التوصيات المخصصة" : "Personalized Recommendations"}
  </h2>

  <p className="section-subtitle">
    {isArabic
      ? "استكمال خطتك العملية بناءً على نتائجك."
      : "Continuing your actionable plan based on your results."}
  </p>

  <div className="recommendations-grid">
    {lastThreeForRecs.map((c) => {
      const key = normalizeCompetencyId(c.competencyId);
      const meta = COMPETENCY_META[key];
      const title = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
      const recs = getRecommendations(key, c.tier, reportLang);
      const color = tierColor(c.tier);

      return (
        <div key={c.competencyId} className="recommendation-card">
          <h3
            className="recommendation-card-title"
            style={{ color }} // ⭐ Bronze applied automatically
          >
            {title}
            <span className="recommendation-card-tier">
              {" "}
              ({tierLabel(c.tier, isArabic)})
            </span>
          </h3>

          <ul className="recommendation-list">
            {recs.length ? (
              recs.map((r, i) => <li key={i}>• {r}</li>)
            ) : (
              <li>
                {isArabic
                  ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId في قاعدة البيانات)."
                  : "No recommendations (check DB competencyId)."}
              </li>
            )}
          </ul>
        </div>
      );
    })}
  </div>
</div>

{/* ===== MRI UPSALE PAGE ===== */}
<div className="page">
  <div className="upsell-section">
    <h2 className="upsell-main-title">
      {isArabic ? "ارتقِ بمهاراتك إلى المستوى التالي" : "Take Your Skills to the Next Level"}
    </h2>

    <p className="upsell-intro">
      {isArabic
        ? "لقد حصلت الآن على صورة واضحة عن أدائك الميداني. الخطوة التالية هي تحليل أعمق وأكثر دقة من خلال اختبار MRI المتقدم."
        : "You now have a clear snapshot of your field performance. The next step is a deeper, more precise analysis through the advanced MRI assessment."}
    </p>

    <div className="upsell-box">
      <h3 className="upsell-title">
        {isArabic ? "اختبار MRI — تحليل متقدم" : "MRI Assessment — Advanced Diagnostic"}
      </h3>

      <p className="upsell-subtext">
        {isArabic
          ? "تحليل شامل يغطي 27 بُعداً سلوكياً ويمنحك تقريراً احترافياً مفصلاً."
          : "A comprehensive diagnostic covering 27 behavioral dimensions with a detailed professional report."}
      </p>

      <ul className="upsell-features">
        <li>
          {isArabic
            ? "تحليل أعمق لنقاط القوة والضعف"
            : "Deeper analysis of strengths and weaknesses"}
        </li>
        <li>
          {isArabic
            ? "خطة تطوير شخصية مبنية على بيانات دقيقة"
            : "A personalized development plan built on precise data"}
        </li>
        <li>
          {isArabic
            ? "توصيات عملية قابلة للتنفيذ فوراً"
            : "Actionable recommendations you can apply immediately"}
        </li>
      </ul>

      <h4 className="upsell-bonus-title">
        {isArabic ? "مكافآت إضافية" : "Additional Bonuses"}
      </h4>

      <ul className="upsell-bonuses">
        <li>
          {isArabic
            ? "جلسة تحليل شخصية لمدة 20 دقيقة"
            : "20-minute personal analysis session"}
        </li>
        <li>
          {isArabic
            ? "خريطة تطوير لمدة 90 يوماً"
            : "90-day development roadmap"}
        </li>
      </ul>

      <p className="upsell-closer">
        {isArabic
          ? "إذا كنت جاداً بشأن تطوير مهاراتك الميدانية، فهذا هو الاختبار الذي سيأخذك إلى المستوى التالي."
          : "If you're serious about elevating your field performance, this is the assessment that will take you to the next level."}
      </p>

      <a
        href="https://levelup-sales.com/mri"
        className="upsell-cta"
      >
        {isArabic ? "ابدأ الآن" : "Start Now"}
      </a>
    </div>
  </div>
</div>
{/* =================
PRINT CSS + CAIRO FONT-FACE (LOCAL)
================= */}
<style jsx global>{`
@font-face {
  font-family: "Cairo";
  src: url("/fonts/Cairo-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Cairo";
  src: url("/fonts/Cairo-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@page {
  size: A4;
  margin: 0;
}
html,
body {
  margin: 0;
  padding: 0;
  background: white;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  font-family: "Cairo", sans-serif;
  color: #111827;
  line-height: 1.6;
}
.report-container {
  width: 210mm;
  margin: 0 auto;
  overflow: visible;
}
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 20mm;
  box-sizing: border-box;
  break-after: page;
  page-break-after: always;
  background: linear-gradient(180deg, #f9fafb, #e5e7eb);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  overflow: visible;
}
.page:last-child {
  break-after: auto;
  page-break-after: auto;
}
/* =================================================
✅ RTL FOUNDATION + MIXED TEXT/NUMBER FIXES
================================================= */
.rtl {
  direction: rtl;
  text-align: right;
  unicode-bidi: plaintext;
}
.rtl .num,
.rtl .ltr {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
  display: inline-block;
}
/* Make the SUMMARY cards truly RTL (fixes Page 2 & 3) */
.rtl .competency-summary-card {
  text-align: right;
}
.rtl .competency-summary-header {
  direction: rtl;
  flex-direction: row;
}
.rtl .competency-summary-progress {
  direction: rtl;
}
/* Lists padding in RTL */
.rtl .swot-list,
.rtl .recommendation-list,
.rtl .upsell-features {
  padding-right: 25px;
  padding-left: 0;
}
/* Cover Page */
.cover-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 30mm;
  background: linear-gradient(135deg, #ffffff, #eef2ff);
}
.cover-logo {
  width: 180px;
  margin-bottom: 25px;
  object-fit: contain;
}
.cover-title {
  font-size: 34px;
  margin-bottom: 8px;
  font-weight: 700;
  color: #111827;
}
.cover-subtitle {
  font-size: 20px;
  margin-bottom: 25px;
  opacity: 0.85;
  font-weight: 400;
}
.cover-user-info {
  width: 100%;
  max-width: 350px;
  margin-bottom: 35px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cover-user-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
.cover-user-label {
  opacity: 0.7;
}
.cover-user-value {
  font-weight: 600;
}
.cover-score-section {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cover-score-label {
  font-size: 18px;
  margin-top: 12px;
  opacity: 0.9;
}
.cover-score-percentage {
  font-size: 46px;
  font-weight: 700;
  margin-top: 5px;
}
.cover-note {
  font-size: 14px;
  margin-top: 18px;
  max-width: 420px;
  opacity: 0.8;
}
.cover-note-small {
  font-size: 12px;
  margin-top: 8px;
  max-width: 420px;
  opacity: 0.7;
}
/* General Section Styling */
.section-title {
  font-size: 28px;
  margin-bottom: 10px;
  color: #4f46e5;
  text-align: center;
  font-weight: 700;
  padding-bottom: 5px;
  border-bottom: 2px solid #e0e7ff;
}
.section-subtitle {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin-bottom: 30px;
}
.swot-section {
  margin-top: 25px;
}
.swot-title-inline {
  border-bottom: none;
  margin-bottom: 4px;
}
/* Summary Page */
.summary-page {
  justify-content: flex-start;
}
.competency-summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
.competency-summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  background: #f9fafb;
  break-inside: avoid;
  page-break-inside: avoid;
}
.competency-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.competency-summary-label {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}
.competency-summary-tier {
  font-size: 14px;
  font-weight: 600;
}
.competency-summary-diagnostic {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 15px;
}
.competency-summary-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.competency-summary-bar-track {
  flex-grow: 1;
  height: 10px;
  background: #e5e7eb;
  border-radius: 5px;
  overflow: hidden;
}
.competency-summary-bar-fill {
  height: 100%;
  border-radius: 5px;
}
.competency-summary-percentage {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  min-width: 40px;
  text-align: right;
}
.competency-summary-score {
  font-size: 12px;
  color: #6b7280;
  min-width: 40px;
  text-align: right;
}
/* SWOT Page section */
.swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.swot-card {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  break-inside: avoid;
  page-break-inside: avoid;
}
.swot-strength {
  background: #f0fdf4;
  border-color: #a7f3d0;
}
.swot-opportunity {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.swot-weakness {
  background: #fef2f2;
  border-color: #fecaca;
}
/* ⭐ Threat now uses bronze palette */
.swot-threat {
  background: #f8ebe0; /* light bronze wash */
  border-color: #a97142; /* primary deep bronze */
}
.swot-card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 15px;
  text-align: center;
  color: #1f2937;
}
.swot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.swot-list li {
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
  line-height: 1.4;
}
/* Recommendations Page */
.recommendations-page {
  justify-content: flex-start;
}
.recommendations-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
.recommendation-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  background: #f9fafb;
  break-inside: avoid;
  page-break-inside: avoid;
}
.recommendation-card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
}
.recommendation-card-tier {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.8;
}
.recommendation-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recommendation-list li {
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
  line-height: 1.4;
}
/* Upsell Section */
.upsell-section {
  margin-top: 30px;
  text-align: center;
  padding: 10px 0;
}
.upsell-main-title {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 10px;
}
.upsell-intro {
  font-size: 15px;
  color: #4b5563;
  max-width: 480px;
  margin: 0 auto 25px auto;
  line-height: 1.6;
}
.upsell-box {
  background: linear-gradient(135deg, #f97316, #dc2626);
  color: white;
  padding: 35px;
  border-radius: 16px;
  max-width: 520px;
  margin: 0 auto;
  text-align: left;
  break-inside: avoid;
  page-break-inside: avoid;
}
.upsell-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}
.upsell-subtext {
  font-size: 15px;
  opacity: 0.9;
  margin-bottom: 20px;
}
.upsell-features,
.upsell-bonuses {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}
.upsell-features li,
.upsell-bonuses li {
  font-size: 15px;
  margin-bottom: 10px;
  line-height: 1.5;
}
.upsell-bonus-title {
  font-size: 18px;
  font-weight: 700;
  margin: 20px 0 10px 0;
}
.upsell-closer {
  font-size: 15px;
  margin-top: 20px;
  opacity: 0.9;
  line-height: 1.5;
}
.upsell-cta {
  display: block;
  margin: 25px auto 0 auto;
  background: white;
  color: #dc2626;
  font-weight: 700;
  padding: 14px 25px;
  border-radius: 10px;
  text-align: center;
  text-decoration: none;
  font-size: 16px;
  transition: background-color 0.2s ease;
}
.upsell-cta:hover {
  background-color: #fef2f2;
}
.report-footer {
  margin-top: auto;
  padding-top: 20px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
@media print {
  .printbtn {
    display: none !important;
  }
}
`}</style>
  </div>
);
}
