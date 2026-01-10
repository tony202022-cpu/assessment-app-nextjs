// app/reports/pdf/[attemptId]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { getRecommendations } from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

type CompetencyResult = {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
};

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

function normalizeCompetencyId(id: string): string {
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
}

function clampPct(n: any) {
  const x = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, x));
}

function tierColor(tier: Tier) {
  if (tier === "Strength") return "#16a34a";
  if (tier === "Opportunity") return "#2563eb";
  if (tier === "Threat") return "#d97706";
  return "#dc2626";
}

function tierLabel(tier: Tier, isArabic: boolean) {
  if (!isArabic) return tier;
  if (tier === "Strength") return "قوة";
  if (tier === "Opportunity") return "فرصة";
  if (tier === "Threat") return "تهديد";
  return "ضعف";
}

function overallCircleColors(totalPercentage: number) {
  const pct = clampPct(totalPercentage);

  if (pct >= 80) {
    // Strength - green
    return {
      border: "#16a34a",
      inner: "#bbf7d0",
      outer: "#16a34a",
    };
  }
  if (pct >= 60) {
    // Opportunity - blue
    return {
      border: "#2563eb",
      inner: "#bfdbfe",
      outer: "#2563eb",
    };
  }
  if (pct >= 40) {
    // Threat - orange
    return {
      border: "#d97706",
      inner: "#fed7aa",
      outer: "#d97706",
    };
  }
  // Weakness - red
  return {
    border: "#dc2626",
    inner: "#fecaca",
    outer: "#dc2626",
  };
}

export default async function PdfReport({
  params,
  searchParams,
}: {
  params: { attemptId: string };
  searchParams: { lang?: string };
}) {
  const attemptId = String(params.attemptId || "").trim();
  const langRaw = String(searchParams?.lang || "").toLowerCase();
  const lang: "ar" | "en" = langRaw === "en" ? "en" : "ar";
  const isArabic = lang === "ar";

  if (!attemptId) {
    return (
      <html lang={lang} dir={isArabic ? "rtl" : "ltr"}>
        <body>
          <div style={{ padding: 40, fontFamily: "system-ui" }}>Missing attemptId</div>
        </body>
      </html>
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, competency_results, total_percentage, language")
    .eq("id", attemptId)
    .single();

  if (error || !data) {
    return (
      <html lang={lang} dir={isArabic ? "rtl" : "ltr"}>
        <body>
          <div style={{ padding: 40, fontFamily: "system-ui" }}>Report not found</div>
        </body>
      </html>
    );
  }

  const dbLang = String((data as any).language || "").toLowerCase();
  const finalLang: "ar" | "en" =
    langRaw === "en" || langRaw === "ar"
      ? lang
      : dbLang === "en"
      ? "en"
      : "ar";
  const finalIsArabic = finalLang === "ar";

  const rawResults = Array.isArray((data as any).competency_results)
    ? ((data as any).competency_results as any[])
    : [];

  const normalized: CompetencyResult[] = rawResults.map((r) => ({
    competencyId: normalizeCompetencyId(r?.competencyId),
    score: Number(r?.score) || 0,
    maxScore: Number(r?.maxScore) || 0,
    percentage: clampPct(r?.percentage),
    tier: (r?.tier as Tier) || "Opportunity",
  }));

  const map = new Map<string, CompetencyResult>();
  normalized.forEach((r) => map.set(r.competencyId, r));

  const orderedCore = COMPETENCY_ORDER.map((id) => map.get(id)).filter(
    Boolean,
  ) as CompetencyResult[];
  const extras = normalized.filter(
    (r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId),
  );
  const results = [...orderedCore, ...extras];

  const dbTotal = Number((data as any).total_percentage);
  const totalPercentage =
    Number.isFinite(dbTotal) && dbTotal >= 0
      ? clampPct(dbTotal)
      : clampPct(
          results.reduce((s, r) => s + (r.percentage || 0), 0) /
            Math.max(1, results.length),
        );

  const strengths = results.filter((r) => r.tier === "Strength");
  const opportunities = results.filter((r) => r.tier === "Opportunity");
  const threats = results.filter((r) => r.tier === "Threat");
  const weaknesses = results.filter((r) => r.tier === "Weakness");

  // Splits for layout
  const firstFive = results.slice(0, 5);
  const lastTwo = results.slice(5, 7);
  const firstFourForRecs = results.slice(0, 4);
  const lastThreeForRecs = results.slice(4, 7);

  const circleColors = overallCircleColors(totalPercentage);

  return (
    <html lang={finalLang} dir={finalIsArabic ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <title>
          {finalIsArabic ? "تقرير التقييم" : "Assessment Report"}
        </title>

        {/* Cairo via Google Fonts (good for Puppeteer) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        <style>{`
          @page {
            size: A4;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
            font-family: "Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body[data-pdf-ready="1"] {}

          .report {
            width: 210mm;
            margin: 0 auto;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: stretch;
            background: linear-gradient(180deg, #f9fafb, #e5e7eb);
          }

          .page:last-child {
            page-break-after: auto;
          }

          /* RTL helpers */
          [dir="rtl"] {
            direction: rtl;
            text-align: right;
          }

          [dir="rtl"] .num,
          [dir="rtl"] .ltr {
            direction: ltr;
            unicode-bidi: isolate;
            text-align: left;
            display: inline-block;
          }

          [dir="rtl"] .competency-summary-card {
            text-align: right;
          }

          [dir="rtl"] .competency-summary-header {
            flex-direction: row;
          }

          [dir="rtl"] .competency-summary-progress {
            direction: rtl;
          }

          [dir="rtl"] .swot-list,
          [dir="rtl"] .recommendation-list,
          [dir="rtl"] .upsell-features {
            padding-right: 25px;
            padding-left: 0;
          }

          /* Cover page */
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

          .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
          }

          .score-value {
            font-size: 38px;
            font-weight: 800;
          }

          .cover-score-label {
            font-size: 18px;
            margin-top: 8px;
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

          /* Section titles */
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

          /* Summary page */
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

          /* SWOT */
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

          .swot-threat {
            background: #fff7ed;
            border-color: #fed7aa;
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

          /* Recommendations */
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

          /* Upsell */
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
          }

          .report-footer {
            margin-top: auto;
            padding-top: 20px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
        `}</style>
      </head>

      <body data-pdf-ready="1">
        <div className="report">
          {/* ===== PAGE 1: COVER ===== */}
          <section className="page cover-page">
            <img
              src="/new levelup logo 3.png"
              className="cover-logo"
              alt="Logo"
            />

            <h1 className="cover-title">
              {finalIsArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}
            </h1>

            <h2 className="cover-subtitle">
              {finalIsArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}
            </h2>

            {/* USER INFO (limited from DB: user_id + attemptId + date) */}
            <div className="cover-user-info">
              <div className="cover-user-line">
                <span className="cover-user-label">
                  {finalIsArabic ? "المستخدم" : "User"}
                </span>
                <span className="cover-user-value">
                  {String((data as any).user_id ?? "—")}
                </span>
              </div>

              <div className="cover-user-line">
                <span className="cover-user-label">
                  {finalIsArabic ? "معرف المحاولة" : "Attempt ID"}
                </span>
                <span className="cover-user-value num">
                  {attemptId ? attemptId.slice(0, 8) : "—"}
                </span>
              </div>

              <div className="cover-user-line">
                <span className="cover-user-label">
                  {finalIsArabic ? "التاريخ" : "Date"}
                </span>
                <span className="cover-user-value num">
                  {new Date().toLocaleDateString(
                    finalIsArabic ? "ar-AE" : "en-AU",
                  )}
                </span>
              </div>
            </div>

            {/* SCORE CIRCLE */}
            <div className="cover-score-section">
              <div
                className="score-circle"
                style={{
                  border: `3px solid ${circleColors.border}`,
                  background: `radial-gradient(circle, ${circleColors.inner} 0%, ${circleColors.outer} 70%)`,
                }}
              >
                <span className="score-value num">
                  {clampPct(totalPercentage)}%
                </span>
              </div>

              <p className="cover-score-label">
                {finalIsArabic ? "النتيجة الإجمالية" : "Overall Score"}
              </p>

              <p className="cover-note">
                {finalIsArabic
                  ? "ملخص سريع لأدائك في 7 كفاءات أساسية."
                  : "A fast snapshot of your 7 core competencies."}
              </p>

              <p className="cover-note-small">
                {finalIsArabic
                  ? "هذا التقرير يعكس نمطك السلوكي في الميدان — وليس معرفة نظرية."
                  : "This report reflects your behavioral field pattern — not theoretical knowledge."}
              </p>
            </div>
          </section>

          {/* ===== PAGE 2: SUMMARY (FIRST 5) ===== */}
          <section className="page summary-page">
            <h2 className="section-title">
              {finalIsArabic ? "ملخص الأداء" : "Performance Summary"}
            </h2>
            <p className="section-subtitle">
              {finalIsArabic
                ? "النتائج مرتبة حسب الكفاءات الأساسية."
                : "Results ordered by the core competencies."}
            </p>

            <div className="competency-summary-grid">
              {firstFive.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const label = meta
                  ? finalIsArabic
                    ? meta.labelAr
                    : meta.labelEn
                  : key;
                const diag = meta
                  ? finalIsArabic
                    ? meta.diagnosticAr
                    : meta.diagnosticEn
                  : "";
                const pct = clampPct(c.percentage);
                const color = tierColor(c.tier);

                return (
                  <div
                    key={c.competencyId}
                    className="competency-summary-card"
                  >
                    <div className="competency-summary-header">
                      <h3 className="competency-summary-label">{label}</h3>
                      <span
                        className="competency-summary-tier"
                        style={{ color }}
                      >
                        {tierLabel(c.tier, finalIsArabic)}
                      </span>
                    </div>
                    <p className="competency-summary-diagnostic">{diag}</p>
                    <div className="competency-summary-progress">
                      <div className="competency-summary-bar-track">
                        <div
                          className="competency-summary-bar-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="competency-summary-percentage num">
                        {pct}%
                      </span>
                      <span className="competency-summary-score num">
                        {c.score}/{c.maxScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== PAGE 3: LAST 2 + SWOT ===== */}
          <section className="page summary-page">
            <h2 className="section-title">
              {finalIsArabic ? "ملخص الأداء" : "Performance Summary"}
            </h2>
            <p className="section-subtitle">
              {finalIsArabic
                ? "استكمال النتائج مع نظرة SWOT استراتيجية."
                : "Remaining results with a strategic SWOT view."}
            </p>

            {/* Last 2 competencies */}
            <div className="competency-summary-grid">
              {lastTwo.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const label = meta
                  ? finalIsArabic
                    ? meta.labelAr
                    : meta.labelEn
                  : key;
                const diag = meta
                  ? finalIsArabic
                    ? meta.diagnosticAr
                    : meta.diagnosticEn
                  : "";
                const pct = clampPct(c.percentage);
                const color = tierColor(c.tier);

                return (
                  <div
                    key={c.competencyId}
                    className="competency-summary-card"
                  >
                    <div className="competency-summary-header">
                      <h3 className="competency-summary-label">{label}</h3>
                      <span
                        className="competency-summary-tier"
                        style={{ color }}
                      >
                        {tierLabel(c.tier, finalIsArabic)}
                      </span>
                    </div>
                    <p className="competency-summary-diagnostic">{diag}</p>
                    <div className="competency-summary-progress">
                      <div className="competency-summary-bar-track">
                        <div
                          className="competency-summary-bar-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="competency-summary-percentage num">
                        {pct}%
                      </span>
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
                {finalIsArabic ? "تحليل SWOT" : "SWOT Analysis"}
              </h2>
              <p className="section-subtitle">
                {finalIsArabic
                  ? "نظرة سريعة على الصورة الاستراتيجية."
                  : "A quick strategic overview."}
              </p>

              <div className="swot-grid">
                <div className="swot-card swot-strength">
                  <h3 className="swot-card-title">
                    {finalIsArabic ? "نقاط القوة" : "Strengths"}
                  </h3>
                  <ul className="swot-list">
                    {strengths.length ? (
                      strengths.map((c) => {
                        const key = normalizeCompetencyId(c.competencyId);
                        const meta = COMPETENCY_META[key];
                        const name = meta
                          ? finalIsArabic
                            ? meta.labelAr
                            : meta.labelEn
                          : key;
                        return (
                          <li key={c.competencyId}>
                            • {name}{" "}
                            <span className="num">
                              ({clampPct(c.percentage)}%)
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li>{finalIsArabic ? "لا يوجد" : "None"}</li>
                    )}
                  </ul>
                </div>

                <div className="swot-card swot-opportunity">
                  <h3 className="swot-card-title">
                    {finalIsArabic ? "الفرص" : "Opportunities"}
                  </h3>
                  <ul className="swot-list">
                    {opportunities.length ? (
                      opportunities.map((c) => {
                        const key = normalizeCompetencyId(c.competencyId);
                        const meta = COMPETENCY_META[key];
                        const name = meta
                          ? finalIsArabic
                            ? meta.labelAr
                            : meta.labelEn
                          : key;
                        return (
                          <li key={c.competencyId}>
                            • {name}{" "}
                            <span className="num">
                              ({clampPct(c.percentage)}%)
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li>{finalIsArabic ? "لا يوجد" : "None"}</li>
                    )}
                  </ul>
                </div>

                <div className="swot-card swot-weakness">
                  <h3 className="swot-card-title">
                    {finalIsArabic ? "نقاط الضعف" : "Weaknesses"}
                  </h3>
                  <ul className="swot-list">
                    {weaknesses.length ? (
                      weaknesses.map((c) => {
                        const key = normalizeCompetencyId(c.competencyId);
                        const meta = COMPETENCY_META[key];
                        const name = meta
                          ? finalIsArabic
                            ? meta.labelAr
                            : meta.labelEn
                          : key;
                        return (
                          <li key={c.competencyId}>
                            • {name}{" "}
                            <span className="num">
                              ({clampPct(c.percentage)}%)
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li>{finalIsArabic ? "لا يوجد" : "None"}</li>
                    )}
                  </ul>
                </div>

                <div className="swot-card swot-threat">
                  <h3 className="swot-card-title">
                    {finalIsArabic ? "التهديدات" : "Threats"}
                  </h3>
                  <ul className="swot-list">
                    {threats.length ? (
                      threats.map((c) => {
                        const key = normalizeCompetencyId(c.competencyId);
                        const meta = COMPETENCY_META[key];
                        const name = meta
                          ? finalIsArabic
                            ? meta.labelAr
                            : meta.labelEn
                          : key;
                        return (
                          <li key={c.competencyId}>
                            • {name}{" "}
                            <span className="num">
                              ({clampPct(c.percentage)}%)
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li>{finalIsArabic ? "لا يوجد" : "None"}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ===== PAGE 4: RECOMMENDATIONS (FIRST 4) ===== */}
          <section className="page recommendations-page">
            <h2 className="section-title">
              {finalIsArabic
                ? "التوصيات المخصصة (21)"
                : "Personalized Recommendations (21)"}
            </h2>
            <p className="section-subtitle">
              {finalIsArabic
                ? "ملاحظة: يتم عرض 3 توصيات لكل كفاءة وفق فئتك الحالية (قوة/فرصة/تهديد/ضعف) — المجموع 21 توصية."
                : "Note: You see 3 recommendations per competency based on your current tier (Strength/Opportunity/Threat/Weakness) — total 21 recommendations."}
            </p>

            <div className="recommendations-grid">
              {firstFourForRecs.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const title = meta
                  ? finalIsArabic
                    ? meta.labelAr
                    : meta.labelEn
                  : key;
                const recs = getRecommendations(key, c.tier, finalLang);
                const color = tierColor(c.tier);

                return (
                  <div
                    key={c.competencyId}
                    className="recommendation-card"
                  >
                    <h3
                      className="recommendation-card-title"
                      style={{ color }}
                    >
                      {title}
                      <span className="recommendation-card-tier">
                        {" "}
                        ({tierLabel(c.tier, finalIsArabic)})
                      </span>
                    </h3>
                    <ul className="recommendation-list">
                      {recs && recs.length ? (
                        recs.map((r: string, i: number) => (
                          <li key={i}>• {r}</li>
                        ))
                      ) : (
                        <li>
                          {finalIsArabic
                            ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId في قاعدة البيانات)."
                            : "No recs (check DB competencyId)."}
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== PAGE 5: RECOMMENDATIONS (LAST 3) + MRI UPSELL ===== */}
          <section className="page recommendations-page">
            <h2 className="section-title">
              {finalIsArabic
                ? "التوصيات المخصصة (متابعة)"
                : "Personalized Recommendations (continued)"}
            </h2>
            <p className="section-subtitle">
              {finalIsArabic
                ? "استكمل توصياتك، ثم انتقل إلى خطوة النقلة النوعية في مبيعاتك."
                : "Complete your recommendations, then step into your next level of sales performance."}
            </p>

            <div className="recommendations-grid">
              {lastThreeForRecs.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const title = meta
                  ? finalIsArabic
                    ? meta.labelAr
                    : meta.labelEn
                  : key;
                const recs = getRecommendations(key, c.tier, finalLang);
                const color = tierColor(c.tier);

                return (
                  <div
                    key={c.competencyId}
                    className="recommendation-card"
                  >
                    <h3
                      className="recommendation-card-title"
                      style={{ color }}
                    >
                      {title}
                      <span className="recommendation-card-tier">
                        {" "}
                        ({tierLabel(c.tier, finalIsArabic)})
                      </span>
                    </h3>
                    <ul className="recommendation-list">
                      {recs && recs.length ? (
                        recs.map((r: string, i: number) => (
                          <li key={i}>• {r}</li>
                        ))
                      ) : (
                        <li>
                          {finalIsArabic
                            ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId في قاعدة البيانات)."
                            : "No recs (check DB competencyId)."}
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* MRI Upsell */}
            <div className="upsell-section">
              <h2 className="upsell-main-title">
                {finalIsArabic
                  ? "لقد حصلت على التقرير المجاني… الآن حان وقت النقلة الحقيقية"
                  : "You Got the Free Report… Now Unlock the Real Transformation"}
              </h2>

              <p className="upsell-intro">
                {finalIsArabic
                  ? "لقد حصلت على المشهيات. الآن حان وقت الطبق الرئيسي والحلوى. إذا كان هذا التقرير قد فتح عينيك… فالـ MRI سيغير مسارك بالكامل."
                  : "You’ve had the appetizer. Now it’s time for the main course and the dessert. If this free report opened your eyes… the MRI will change your entire trajectory."}
              </p>

              <div className="upsell-box">
                <h3 className="upsell-title">
                  {finalIsArabic
                    ? "Outdoor Selling Skills MRI — التشخيص الأعمق والأدق"
                    : "Outdoor Selling Skills MRI — The Deepest, Sharpest Diagnostic Ever Built"}
                </h3>

                <p className="upsell-subtext">
                  {finalIsArabic
                    ? "ليس كورس. ليس ويبينار. ليس كلام تحفيزي. هذا هو التشخيص الحقيقي الذي يحولك إلى محترف مبيعات خارجي من الفئة الأولى."
                    : "Not a course. Not a webinar. Not motivation. This is the scientific diagnostic that turns you into a top‑tier outdoor sales performer."}
                </p>

                <ul className="upsell-features">
                  <li>
                    {finalIsArabic
                      ? "🧠 يقيس 12 كفاءة أساسية — (ضع أسماء الكفاءات هنا)"
                      : "🧠 Measures 12 Core Competencies — (insert competency names here)"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "📊 75 سؤالاً دقيقاً يكشف سلوكك الحقيقي في الميدان"
                      : "📊 75 precision‑engineered questions revealing your real field behavior"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "📘 تقرير احترافي من 25 صفحة — تحليل عميق لكل نقطة قوة وضعف"
                      : "📘 A 25‑page professional report — deep analysis of every strength and gap"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "📅 خطة عمل يومية لمدة 90 يوماً — خطوة بخطوة لمضاعفة مبيعاتك"
                      : "📅 A 90‑day day‑by‑day action plan — the exact steps to double your sales"}
                  </li>
                </ul>

                <h4 className="upsell-bonus-title">
                  {finalIsArabic
                    ? "وتحصل أيضاً على 5 هدايا لا تُقدّر بثمن"
                    : "Plus 5 Bonuses That Outdoor Reps Would Kill For"}
                </h4>

                <ul className="upsell-bonuses">
                  <li>
                    {finalIsArabic
                      ? "1. أفضل 50 إجابة لأصعب 50 اعتراض"
                      : "1. The 50 Best Answers to the 50 Hardest Objections"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "2. كيف تعلمت البيع من لعب كرة القدم"
                      : "2. How I Learned to Sell From Playing Soccer"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "3. كيف تحفّز نفسك تحت الضغط"
                      : "3. How to Motivate Yourself Under Pressure"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "4. كيف تأخذ مواعيد مع كبار الشخصيات"
                      : "4. How to Book Appointments With VIPs"}
                  </li>
                  <li>
                    {finalIsArabic
                      ? "5. أفضل ممارسات إدارة الوقت لمندوبي المبيعات الخارجيين"
                      : "5. Time‑Management Mastery for Outdoor Sales"}
                  </li>
                </ul>

                <p className="upsell-closer">
                  {finalIsArabic
                    ? "لا مزيد من الدورات. لا مزيد من الويبينارات. كل ما تحتاجه لمضاعفة مبيعاتك — مع د. كيفاح فياض."
                    : "No more courses. No more webinars. Everything you need to double your sales — with Dr. Kifah Fayad."}
                </p>
              </div>

              <div className="report-footer">
                {finalIsArabic ? "Dyad © 2026" : "Dyad © 2026"}
              </div>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
