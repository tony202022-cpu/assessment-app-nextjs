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
    diagnosticAr: "قدرتك على البقاء مركزاً ومرناً ومستقراً عاطفياً أثناء تحديات العمل الميداني.",
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
    "destroying objections": "destroying_objections",
    "creating irresistible offers": "creating_irresistible_offers",
    "mastering closing": "mastering_closing",
    "follow-up discipline": "follow_up_discipline",
    "follow up discipline": "follow_up_discipline",

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

function safeTier(t: any): Tier {
  return t === "Strength" || t === "Opportunity" || t === "Threat" || t === "Weakness"
    ? t
    : "Opportunity";
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
  if (pct >= 80) return { border: "#16a34a", inner: "#bbf7d0", outer: "#16a34a" };
  if (pct >= 60) return { border: "#2563eb", inner: "#bfdbfe", outer: "#2563eb" };
  if (pct >= 40) return { border: "#d97706", inner: "#fed7aa", outer: "#d97706" };
  return { border: "#dc2626", inner: "#fecaca", outer: "#dc2626" };
}

function formatReportDate(dateValue: any, isArabic: boolean) {
  try {
    const d = dateValue ? new Date(dateValue) : new Date();
    return d.toLocaleDateString(isArabic ? "ar-AE" : "en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString(isArabic ? "ar-AE" : "en-AU");
  }
}

/** ✅ Presentation only: returns FINAL list from lib - CHANGED TO 3 BULLETS */
function getTierRecs(competencyKey: string, tier: Tier, lang: "ar" | "en") {
  return getRecommendations(competencyKey, tier, lang)?.slice(0, 3) || [];
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

  if (!attemptId) {
    return <div style={{ padding: 40, fontFamily: "system-ui" }}>Missing attemptId</div>;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, competency_results, total_percentage, language, created_at")
    .eq("id", attemptId)
    .single();

  if (error || !data) {
    return <div style={{ padding: 40, fontFamily: "system-ui" }}>Report not found</div>;
  }

  // ✅ Language resolution (URL param wins, fallback to DB, fallback ar)
  const dbLang = String((data as any).language || "").toLowerCase();
  const urlLang = langRaw === "en" ? "en" : langRaw === "ar" ? "ar" : null;
  const finalLang: "ar" | "en" = urlLang ? urlLang : dbLang === "en" ? "en" : "ar";
  const finalIsArabic = finalLang === "ar";

  // Profile + email
  const userId = String((data as any).user_id || "");
  let fullName: string | null = null;
  let company: string | null = null;
  let email: string | null = null;

  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, company")
      .eq("id", userId)
      .single();

    fullName = (prof as any)?.full_name || null;
    company = (prof as any)?.company || null;

    try {
      const { data: u } = await supabase.auth.admin.getUserById(userId);
      email = u?.user?.email || null;
    } catch {
      email = null;
    }
  }

  const displayName = fullName || (finalIsArabic ? "غير محدد" : "Not specified");
  const displayCompany = company && String(company).trim().length > 0 ? String(company) : null;
  const displayEmail = email || (finalIsArabic ? "غير محدد" : "Not specified");
  const reportDate = formatReportDate((data as any).created_at, finalIsArabic);

  // Results
  const rawResults = Array.isArray((data as any).competency_results)
    ? ((data as any).competency_results as any[])
    : [];

  const normalized: CompetencyResult[] = rawResults.map((r) => ({
    competencyId: normalizeCompetencyId(r?.competencyId),
    score: Number(r?.score) || 0,
    maxScore: Number(r?.maxScore) || 0,
    percentage: clampPct(r?.percentage),
    tier: safeTier(r?.tier),
  }));

  const byId = new Map<string, CompetencyResult>();
  normalized.forEach((r) => byId.set(r.competencyId, r));

  const orderedCore = COMPETENCY_ORDER.map((id) => byId.get(id)).filter(Boolean) as CompetencyResult[];
  const extras = normalized.filter((r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId));
  const results = [...orderedCore, ...extras];

  const dbTotal = Number((data as any).total_percentage);
  const totalPercentage =
    Number.isFinite(dbTotal) && dbTotal >= 0
      ? clampPct(dbTotal)
      : clampPct(results.reduce((s, r) => s + (r.percentage || 0), 0) / Math.max(1, results.length));

  const strengths = results.filter((r) => r.tier === "Strength");
  const opportunities = results.filter((r) => r.tier === "Opportunity");
  const threats = results.filter((r) => r.tier === "Threat");
  const weaknesses = results.filter((r) => r.tier === "Weakness");

  const circleColors = overallCircleColors(totalPercentage);
  const textDir = finalIsArabic ? "rtl" : "ltr";

  return (
    <>
      {/* ✅ PDF stylesheet (MUST be before pdf-root) */}
      <link rel="stylesheet" href="/pdf/pdf.css" />

      {/* ✅ Preload ONLY the fonts you actually have (per your folder screenshot) */}
      <link
        rel="preload"
        href="/fonts/Cairo-Regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/Cairo-Bold.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />

      <div className="pdf-root" dir={textDir} lang={finalLang} data-pdf-ready="0" suppressHydrationWarning>
        {/* ✅ Puppeteer readiness markers (BODY + ROOT), wait for fonts, then settle layout */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    document.body.setAttribute('data-pdf-ready','0');
    var root = document.querySelector('.pdf-root');
    if (root) root.setAttribute('data-pdf-ready','0');

    var done = function () {
      document.body.setAttribute('data-pdf-ready','1');
      if (root) root.setAttribute('data-pdf-ready','1');
    };

    var settle = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(done);
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(settle).catch(settle);
    } else {
      settle();
    }
  } catch (e) {
    try { document.body.setAttribute('data-pdf-ready','1'); } catch {}
    try {
      var r = document.querySelector('.pdf-root');
      if (r) r.setAttribute('data-pdf-ready','1');
    } catch {}
  }
})();`,
          }}
        />

        <div className="report">
          {/* PAGE 1: COVER */}
          <section className="page cover-page">
            <img src="/new levelup logo 3.png" className="cover-logo" alt="Logo" />

            <h1 className="cover-title">
              {finalIsArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}
            </h1>

            <h2 className="cover-subtitle">
              {finalIsArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}
            </h2>

            <div className="cover-user-info">
              <div className="cover-user-line">
                <span className="cover-user-label">{finalIsArabic ? "الاسم" : "Name"}</span>
                <span className={`cover-user-value ${finalIsArabic ? "rtl-value" : "ltr"}`}>{displayName}</span>
              </div>

              {displayCompany ? (
                <div className="cover-user-line">
                  <span className="cover-user-label">{finalIsArabic ? "الشركة" : "Company"}</span>
                  <span className="cover-user-value rtl-value">{displayCompany}</span>
                </div>
              ) : null}

              <div className="cover-user-line">
                <span className="cover-user-label">{finalIsArabic ? "البريد الإلكتروني" : "Email"}</span>
                <span className="cover-user-value ltr">{displayEmail}</span>
              </div>

              <div className="cover-user-line">
                <span className="cover-user-label">{finalIsArabic ? "تاريخ التقييم" : "Assessment Date"}</span>
                <span className="cover-user-value rtl-value">{reportDate}</span>
              </div>

              <div className="cover-user-line">
                <span className="cover-user-label">{finalIsArabic ? "معرف المحاولة" : "Attempt ID"}</span>
                <span className="cover-user-value ltr">{attemptId ? attemptId.slice(0, 8) : "—"}</span>
              </div>
            </div>

            <div className="cover-score-section">
              <div
                className="score-circle"
                style={{
                  border: `3px solid ${circleColors.border}`,
                  background: `radial-gradient(circle, ${circleColors.inner} 0%, ${circleColors.outer} 70%)`,
                }}
              >
                <span className="score-value num">{clampPct(totalPercentage)}%</span>
              </div>

              <p className="cover-score-label">{finalIsArabic ? "النتيجة الإجمالية" : "Overall Score"}</p>
            </div>

            <div className="cover-bottom">
              <div className="cover-visual">
                <img src="/sales-visual.jpg" alt="Field sales" className="cover-visual-img" />
              </div>
              <div className="footer">Dyad © 2026</div>
            </div>
          </section>

          {/* PAGE 2: PERFORMANCE SUMMARY */}
          <section className="page">
            <h2 className="section-title">{finalIsArabic ? "ملخص الأداء" : "Performance Summary"}</h2>

            <div className="summary-grid">
              {results.slice(0, 7).map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                const diag = meta ? (finalIsArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
                const pct = clampPct(c.percentage);
                const color = tierColor(c.tier);

                return (
                  <div key={c.competencyId} className="card">
                    <div className="card-head">
                      <h3 className="card-title rtl-text">{title}</h3>
                      <span className="pill" style={{ borderColor: color, color }}>
                        {tierLabel(c.tier, finalIsArabic)}
                      </span>
                    </div>

                    <p className="diag rtl-text">{diag}</p>

                    <div className="bar-row">
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="pct num">{pct}%</span>
                    </div>
                  </div>
                );
              })}

              <div className="card">
                <div className="card-head">
                  <h3 className="card-title rtl-text">
                    {finalIsArabic ? "ملخص الأداء الإجمالي" : "Overall Performance Summary"}
                  </h3>
                  <span className="pill" style={{ borderColor: circleColors.border, color: circleColors.border }}>
                    <span className="num">{clampPct(totalPercentage)}%</span>
                  </span>
                </div>

                <p className="diag rtl-text" style={{ marginTop: 4, marginBottom: 10 }}>
                  {finalIsArabic
                    ? "هذه النسبة تلخّص الأداء العام بناءً على نتائج الكفاءات."
                    : "This percentage summarizes your overall performance across competencies."}
                </p>

                <div className="swot-mini">
                  <div className="swot-mini-row">
                    <span className="swot-mini-label" style={{ color: "#16a34a" }}>
                      {finalIsArabic ? "قوة" : "Strengths"}:
                    </span>
                    <span className="swot-mini-value num">{strengths.length}</span>
                  </div>
                  <div className="swot-mini-row">
                    <span className="swot-mini-label" style={{ color: "#2563eb" }}>
                      {finalIsArabic ? "فرصة" : "Opportunities"}:
                    </span>
                    <span className="swot-mini-value num">{opportunities.length}</span>
                  </div>
                  <div className="swot-mini-row">
                    <span className="swot-mini-label" style={{ color: "#d97706" }}>
                      {finalIsArabic ? "تهديد" : "Threats"}:
                    </span>
                    <span className="swot-mini-value num">{threats.length}</span>
                  </div>
                  <div className="swot-mini-row">
                    <span className="swot-mini-label" style={{ color: "#dc2626" }}>
                      {finalIsArabic ? "ضعف" : "Weaknesses"}:
                    </span>
                    <span className="swot-mini-value num">{weaknesses.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="footer">Dyad © 2026</div>
          </section>

          {/* PAGE 3: RECOMMENDATIONS */}
          <section className="page">
            <h2 className="section-title">{finalIsArabic ? "التوصيات العملية" : "Action Recommendations"}</h2>

            <div className="recs-stack">
              {results.slice(0, 7).map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                const color = tierColor(c.tier);
                const recs = getTierRecs(key, c.tier, finalLang);

                return (
                  <div key={c.competencyId} className="rec-card rec-long">
                    <div className="rec-head">
                      <h3 className="rec-title rtl-text" style={{ color }}>
                        {title}
                      </h3>
                      <span className="pill" style={{ borderColor: color, color }}>
                        {tierLabel(c.tier, finalIsArabic)}
                      </span>
                    </div>

                    {recs.length ? (
                      <ul className="rec-list rtl-text">
                        {recs.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted rtl-text">
                        {finalIsArabic
                          ? "لا توجد توصيات متاحة لهذه الكفاءة حاليًا."
                          : "No recommendations available for this competency yet."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="footer">Dyad © 2026</div>
          </section>

          {/* LAST PAGE: SWOT + UPSELL */}
          <section className="page page-last">
            <h2 className="section-title">{finalIsArabic ? "SWOT + الخطوة التالية" : "SWOT + Next Step"}</h2>

            <h3 className="section-title" style={{ fontSize: 18, marginTop: 0 }}>
              {finalIsArabic ? "تحليل SWOT" : "SWOT Analysis"}
            </h3>

            <div className="swot-grid">
              <div className="swot-card swot-strength">
                <h4 className="swot-title rtl-text">{finalIsArabic ? "نقاط القوة" : "Strengths"}</h4>
                <ul className="swot-list rtl-text">
                  {(strengths.length ? strengths : []).map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  })}
                  {!strengths.length ? (
                    <li>
                      {finalIsArabic
                        ? "لا توجد نقاط قوة مصنّفة في هذه المحاولة."
                        : "No strengths classified in this attempt."}
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="swot-card swot-opportunity">
                <h4 className="swot-title rtl-text">{finalIsArabic ? "فرص التطوير" : "Opportunities"}</h4>
                <ul className="swot-list rtl-text">
                  {(opportunities.length ? opportunities : []).map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  })}
                  {!opportunities.length ? (
                    <li>
                      {finalIsArabic
                        ? "لا توجد فرص تطوير واضحة في هذه المحاولة."
                        : "No clear opportunities in this attempt."}
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="swot-card swot-weakness">
                <h4 className="swot-title rtl-text">{finalIsArabic ? "نقاط الضعف" : "Weaknesses"}</h4>
                <ul className="swot-list rtl-text">
                  {(weaknesses.length ? weaknesses : []).map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  })}
                  {!weaknesses.length ? (
                    <li>{finalIsArabic ? "لا توجد نقاط ضعف مصنّفة في هذه المحاولة." : "No weaknesses classified in this attempt."}</li>
                  ) : null}
                </ul>
              </div>

              <div className="swot-card swot-threat">
                <h4 className="swot-title rtl-text">{finalIsArabic ? "مخاطر محتملة" : "Threats"}</h4>
                <ul className="swot-list rtl-text">
                  {(threats.length ? threats : []).map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  })}
                  {!threats.length ? (
                    <li>{finalIsArabic ? "لا توجد مخاطر مصنّفة في هذه المحاولة." : "No threats classified in this attempt."}</li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="swot-to-upsell-spacer" />

            <div className="upsell-wrap">
              <h3 className="upsell-title-big rtl-text">
                {finalIsArabic ? "جاهز للمرحلة المتقدمة؟" : "Ready for the Advanced Level?"}
              </h3>

              <p className="upsell-intro rtl-text">
                {finalIsArabic
                  ? "هذا التقرير يعطيك صورة قوية… لكن التغيير الحقيقي يبدأ عندما تحوّل النتائج إلى خطة تنفيذ أسبوعية بأدوات وإشراف."
                  : "This report gives you a strong snapshot… but real change starts when you convert results into a weekly execution plan with tools and guidance."}
              </p>

              <div className="upsell-box">
                <h3 className="rtl-text">{finalIsArabic ? "برنامج Sales MRI المتقدم" : "Sales MRI Advanced Program"}</h3>
                <p className="rtl-text">
                  {finalIsArabic
                    ? "برنامج عملي لتحويل 7 كفاءات إلى سلوك يومي… مع أدوات ميدانية، تمارين، وتتّبع أداء."
                    : "A practical program that turns 7 competencies into daily behavior… with field tools, drills, and performance tracking."}
                </p>

                <div className="upsell-cols">
                  <ul className="upsell-ul rtl-text">
                    <li>{finalIsArabic ? "خطة تطبيق 30 يومًا" : "30-day execution plan"}</li>
                    <li>{finalIsArabic ? "أدوات ميدانية جاهزة" : "Ready field tools"}</li>
                    <li>{finalIsArabic ? "تحويل الضعف إلى قوة" : "Turn weakness into strength"}</li>
                  </ul>

                  <ul className="upsell-ul rtl-text">
                    <li>{finalIsArabic ? "مخرجات قابلة للقياس" : "Measurable outputs"}</li>
                    <li>{finalIsArabic ? "متابعة وتوجيه" : "Follow-up guidance"}</li>
                    <li>{finalIsArabic ? "أسلوب احترافي في الإغلاق" : "Professional closing behavior"}</li>
                  </ul>
                </div>

                <a className="upsell-cta" href={finalIsArabic ? "/ar/sales-mri" : "/en/sales-mri"}>
                  {finalIsArabic ? "ابدأ المرحلة المتقدمة الآن" : "Start the Advanced Program Now"}
                </a>
              </div>
            </div>

            <div className="footer">Dyad © 2026</div>
          </section>
        </div>
      </div>
    </>
  );
}
