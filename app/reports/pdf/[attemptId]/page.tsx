// app/reports/pdf/[attemptId]/page.tsx
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getRecommendations } from "@/lib/pdf-recommendations";
import "../pdf.css";

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

function isPdfRender() {
  const h = headers();
  const ua = h.get("user-agent") || "";
  return (
    ua.includes("Headless") ||
    ua.includes("Chrome") ||
    h.get("x-pdf-render") === "1"
  );
}

function getTierRecs(competencyKey: string, tier: Tier, lang: "ar" | "en") {
  return getRecommendations(competencyKey, tier, lang)?.slice(0, 3) || [];
}

function getOverallScoreRecs(totalPercentage: number, lang: "ar" | "en") {
  const pct = clampPct(totalPercentage);
  
  if (lang === "ar") {
    if (pct >= 80) {
      return [
        "أداء متميز! ركز على تعزيز نقاط قوتك لتصبح مرجعاً في فريقك.",
        "شارك استراتيجياتك الناجحة مع الزملاء لرفع مستوى الفريق كاملاً.",
        "فكر في تدريب الآخرين لتعزيز مهاراتك القيادية."
      ];
    } else if (pct >= 60) {
      return [
        "أداء جيد مع إمكانية تحسين واضحة. ركز على تحويل الفرص إلى نقاط قوة.",
        "اختر كفاءتين لتحسينهما أولاً وركز عليهما لمدة 30 يوماً.",
        "اطلب تغذية راجعة من زملائك في المناطق التي تحتاج تحسين."
      ];
    } else if (pct >= 40) {
      return [
        "هناك مجال كبير للتحسين. ابدأ بأضعف 3 كفاءات وركز عليها.",
        "خصص 30 دقيقة يومياً لممارسة مهارة واحدة تحتاج تحسين.",
        "اطلب المساعدة من مرشد أو مدرب متخصص في المبيعات."
      ];
    } else {
      return [
        "الأداء بحاجة لتحسين عاجل. ابدأ ببرنامج تطوير مكثف.",
        "ركز على أساسيات المبيعات أولاً قبل المهارات المتقدمة.",
        "فكر في برنامج تدريبي متخصص لإعادة بناء المهارات الأساسية."
      ];
    }
  } else {
    if (pct >= 80) {
      return [
        "Outstanding performance! Focus on strengthening your strengths to become a team reference.",
        "Share your successful strategies with colleagues to elevate the entire team's performance.",
        "Consider mentoring others to enhance your leadership skills."
      ];
    } else if (pct >= 60) {
      return [
        "Good performance with clear improvement potential. Focus on converting opportunities into strengths.",
        "Select two competencies to improve first and focus on them for 30 days.",
        "Request feedback from colleagues in areas needing improvement."
      ];
    } else if (pct >= 40) {
      return [
        "Significant room for improvement. Start with your 3 weakest competencies and focus there.",
        "Dedicate 30 minutes daily to practice one skill needing improvement.",
        "Seek help from a mentor or sales coach specializing in your weak areas."
      ];
    } else {
      return [
        "Performance needs urgent improvement. Begin an intensive development program.",
        "Focus on sales fundamentals before advanced skills.",
        "Consider a specialized training program to rebuild core competencies."
      ];
    }
  }
}

function PdfShell({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body data-pdf-ready="1">{children}</body>
    </html>
  );
}


export default async function PdfReport({
  params,
  searchParams,
}: {
  params: { attemptId?: string };
  searchParams?: { lang?: string };
}) {

  const attemptId = String(params.attemptId || "").trim();
  const langRaw = String(searchParams?.lang || "").toLowerCase();

if (!attemptId) {
  return (
    <PdfShell>
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        Missing attemptId
      </div>
    </PdfShell>
  );
}


  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  return (
    <PdfShell>
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        Missing env vars
      </div>
    </PdfShell>
  );
}

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, competency_results, total_percentage, language, created_at")
    .eq("id", attemptId)
    .single();

if (error || !data) {
  return (
    <PdfShell>
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        Report not found
      </div>
    </PdfShell>
  );
}


  const dbLang = String((data as any).language || "").toLowerCase();
  const urlLang = langRaw === "en" ? "en" : langRaw === "ar" ? "ar" : null;
  const finalLang: "ar" | "en" = urlLang ? urlLang : dbLang === "en" ? "en" : "ar";
  const finalIsArabic = finalLang === "ar";

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

  const COVER_TITLE_EN = "Field Sales Assessment";
  const COVER_SUBTITLE_EN = "Field Competency Analysis";
  const COVER_TITLE_AR = "تقييم المبيعات الميدانية";
  const COVER_SUBTITLE_AR = "تحليل كفاءات ميدانية";

  const coverTitle = finalIsArabic ? COVER_TITLE_AR : COVER_TITLE_EN;
const coverSubtitle = finalIsArabic ? COVER_SUBTITLE_AR : COVER_SUBTITLE_EN;

return (
  <PdfShell>
    <div
      className="pdf-root"
      dir={textDir}
      lang={finalLang}
      data-render="pdf"
      suppressHydrationWarning
    >
      <div className="report">
        {/* existing content continues unchanged */}

        {/* PAGE 1: COVER */}
        <section className="page cover-page">
          <div className="cover-bg" aria-hidden="true">
            <img src="/sales-visual.jpg" alt="" className="cover-bg-img" />
            <div className="cover-bg-overlay" />
          </div>

          <div className="cover-inner">
            <img src="/new levelup logo 3.png" className="cover-logo" alt="Logo" />

            <div className="cover-head">
              <h1 className="cover-title">{coverTitle}</h1>
              <h2 className="cover-subtitle">{coverSubtitle}</h2>
            </div>

            <div className="cover-layout">
              <div className="cover-info-slot">
                <div className="cover-user-info">
                  <div className="cover-user-line">
                    <span className="cover-user-label">{finalIsArabic ? "الاسم" : "Name"}</span>
                    <span className="cover-user-value rtl-value">{displayName}</span>
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
              </div>

              <div className="cover-score-slot">
                <div
                  className="score-circle"
                  style={{
                    border: `3px solid ${circleColors.border}`,
                    background: `radial-gradient(circle, ${circleColors.inner} 0%, ${circleColors.outer} 70%)`,
                  }}
                >
                  <span className="score-value num">{clampPct(totalPercentage)}%</span>
                </div>

                <div className="cover-score-label">
                  {finalIsArabic ? "النتيجة الإجمالية" : "Overall Score"}
                </div>
              </div>

              <div className="cover-bottom-slot" />
            </div>

            <div className="cover-footer">
              <div className="footer">Dyad © 2026</div>
            </div>
          </div>
        </section>

        {/* PAGE 2: PERFORMANCE SUMMARY */}
        <section className="page page-2">
          <h2 className="section-title">
            {finalIsArabic ? "ملخص الأداء" : "Performance Summary"}
          </h2>

          <div className="competency-grid">
            {results.slice(0, 7).map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
              const diag = meta ? (finalIsArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
              const pct = clampPct(c.percentage);
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="competency-card">
                  <div className="competency-header">
                    <h3 className="competency-title rtl-text">{title}</h3>
                    <span className="tier-pill" style={{ borderColor: color, color }}>
                      {tierLabel(c.tier, finalIsArabic)}
                    </span>
                  </div>
                  <p className="competency-desc rtl-text clamp-2">{diag}</p>
                  <div className="competency-bar-row">
                    <div className="competency-bar-track">
                      <div className="competency-bar-fill" style={{ 
                        width: `${pct}%`, 
                        backgroundColor: color 
                      }} />
                    </div>
                    <span className="competency-pct num">{pct}%</span>
                  </div>
                </div>
              );
            })}
            
            <div className="competency-card overall-card">
              <div className="competency-header">
                <h3 className="competency-title rtl-text">
                  {finalIsArabic ? "الملخص الإجمالي" : "Overall Summary"}
                </h3>
                <span className="tier-pill" style={{ borderColor: circleColors.border, color: circleColors.border }}>
                  <span className="num">{clampPct(totalPercentage)}%</span>
                </span>
              </div>
              <p className="competency-desc rtl-text clamp-2" style={{ marginTop: 4 }}>
                {finalIsArabic
                  ? "لمحة سريعة عن أدائك عبر الكفاءات الأساسية."
                  : "A quick snapshot of your performance across core competencies."}
              </p>
              <div className="overall-counts">
                <div className="overall-count" style={{ color: "#16a34a" }}>
                  <span className="overall-count-label">{finalIsArabic ? "قوة" : "Strengths"}</span>
                  <span className="overall-count-value num">{strengths.length}</span>
                </div>
                <div className="overall-count" style={{ color: "#2563eb" }}>
                  <span className="overall-count-label">{finalIsArabic ? "فرص" : "Opportunities"}</span>
                  <span className="overall-count-value num">{opportunities.length}</span>
                </div>
                <div className="overall-count" style={{ color: "#d97706" }}>
                  <span className="overall-count-label">{finalIsArabic ? "تهديد" : "Threats"}</span>
                  <span className="overall-count-value num">{threats.length}</span>
                </div>
                <div className="overall-count" style={{ color: "#dc2626" }}>
                  <span className="overall-count-label">{finalIsArabic ? "ضعف" : "Weaknesses"}</span>
                  <span className="overall-count-value num">{weaknesses.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer">Dyad © 2026</div>
        </section>

        {/* PAGE 3: RECOMMENDATIONS - 3x3 GRID */}
        <section className="page page-3">
          <h2 className="section-title">
            {finalIsArabic ? "التوصيات العملية" : "Action Recommendations"}
          </h2>

          <div className="recommendations-grid">
            {/* ALL 7 competencies in 3x3 grid */}
            {results.slice(0, 7).map((c, index) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
              const color = tierColor(c.tier);
              const recs = getTierRecs(key, c.tier, finalLang);

              return (
                <div 
                  key={c.competencyId} 
                  className="recommendation-card card-hover"
                  data-tier={c.tier}
                  style={{
                    /* Position Follow-Up Discipline in bottom left */
                    gridColumn: index === 6 ? 1 : 'auto',
                    gridRow: index === 6 ? 3 : 'auto'
                  }}
                >
                  <div className="recommendation-header">
                    <h3 className="recommendation-title rtl-text">
                      {title}
                    </h3>
                    <span className="tier-pill" style={{ borderColor: color, color }}>
                      {tierLabel(c.tier, finalIsArabic)}
                    </span>
                  </div>

                  {recs.length ? (
                    <ul className="recommendation-list rtl-text">
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
            
            {/* OVERALL SCORE RECOMMENDATIONS - spans 2 columns */}
            <div className="recommendation-card overall-rec-card card-hover" style={{
              gridColumn: "2 / span 2",
              gridRow: 3
            }}>
              <div className="recommendation-header">
                <h3 className="recommendation-title rtl-text">
                  {finalIsArabic 
                    ? `توصيات للنتيجة الإجمالية (${clampPct(totalPercentage)}%)`
                    : `Overall Score (${clampPct(totalPercentage)}%)`
                  }
                </h3>
              </div>
              <ul className="recommendation-list rtl-text">
                {getOverallScoreRecs(totalPercentage, finalLang).map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer">Dyad © 2026</div>
        </section>

        {/* PAGE 4: SWOT + UPSELL */}
        <section className="page page-4 page-last">
          <div className="swot-section">
            <div className="swot-header">
              <h2 className="text-gradient">
                {finalIsArabic ? "تحليل SWOT" : "SWOT Analysis"}
              </h2>
              <p className="rtl-text">
                {finalIsArabic
                  ? "تحليل شامل لنقاط القوة، الضعف، الفرص، والتهديدات لمسارك المهني"
                  : "Comprehensive analysis of strengths, weaknesses, opportunities, and threats for your career path"}
              </p>
            </div>

            <div className="swot-grid-enhanced">
              <div className="swot-card-enhanced swot-strength card-hover">
                <div className="swot-icon">S</div>
                <h4 className="swot-title-enhanced rtl-text">
                  {finalIsArabic ? "نقاط القوة" : "Strengths"}
                </h4>
                <ul className="swot-list-enhanced rtl-text">
                  {strengths.length ? strengths.map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  }) : (
                    <li>{finalIsArabic ? "لا توجد نقاط قوة محددة" : "No specific strengths identified"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card-enhanced swot-weakness card-hover">
                <div className="swot-icon">W</div>
                <h4 className="swot-title-enhanced rtl-text">
                  {finalIsArabic ? "نقاط الضعف" : "Weaknesses"}
                </h4>
                <ul className="swot-list-enhanced rtl-text">
                  {weaknesses.length ? weaknesses.map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  }) : (
                    <li>{finalIsArabic ? "لا توجد نقاط ضعف محددة" : "No specific weaknesses identified"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card-enhanced swot-opportunity card-hover">
                <div className="swot-icon">O</div>
                <h4 className="swot-title-enhanced rtl-text">
                  {finalIsArabic ? "الفرص" : "Opportunities"}
                </h4>
                <ul className="swot-list-enhanced rtl-text">
                  {opportunities.length ? opportunities.map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  }) : (
                    <li>{finalIsArabic ? "لا توجد فرص محددة" : "No specific opportunities identified"}</li>
                  )}
                </ul>
              </div>

              <div className="swot-card-enhanced swot-threat card-hover">
                <div className="swot-icon">T</div>
                <h4 className="swot-title-enhanced rtl-text">
                  {finalIsArabic ? "التهديدات" : "Threats"}
                </h4>
                <ul className="swot-list-enhanced rtl-text">
                  {threats.length ? threats.map((r) => {
                    const key = normalizeCompetencyId(r.competencyId);
                    const meta = COMPETENCY_META[key];
                    const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                    return <li key={r.competencyId}>{title}</li>;
                  }) : (
                    <li>{finalIsArabic ? "لا توجد تهديدات محددة" : "No specific threats identified"}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="upsell-section-premium">
            <span className="upsell-badge">
              {finalIsArabic ? "المرحلة التالية" : "Next Level"}
            </span>
            <h3 className="upsell-title-premium rtl-text">
              {finalIsArabic ? "جاهز للتحول المهني الحقيقي؟" : "Ready for Real Professional Transformation?"}
            </h3>
            
            <p className="upsell-subtitle rtl-text">
              {finalIsArabic
                ? "هذا التقرير هو البداية فقط. برنامج Sales MRI المتقدم يحول هذه الرؤى إلى خطة تنفيذ يومية مع أدوات عملية، متابعة شخصية، ونتائج قابلة للقياس."
                : "This report is just the beginning. The Sales MRI Advanced Program turns these insights into a daily execution plan with practical tools, personal guidance, and measurable results."}
            </p>

            <div className="upsell-features-premium">
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">📊</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "75 سؤال تقييم متعمق" : "75 In-depth Assessment Questions"}
                </div>
              </div>
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">🎯</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "12 كفاءة متقدمة" : "12 Advanced Competencies"}
                </div>
              </div>
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">🎁</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "5 مكافآت حصرية" : "5 Exclusive Bonuses"}
                </div>
              </div>
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">📈</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "خطة عمل مخصصة" : "Customized Action Plan"}
                </div>
              </div>
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">🛠️</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "أدوات ميدانية جاهزة" : "Ready Field Tools"}
                </div>
              </div>
              <div className="upsell-feature-item">
                <div className="upsell-feature-icon">🏆</div>
                <div className="upsell-feature-text rtl-text">
                  {finalIsArabic ? "شهادة إنجاز معتمدة" : "Certified Achievement Certificate"}
                </div>
              </div>
            </div>

            <a 
              className="upsell-cta-premium" 
              href={finalIsArabic ? "/ar/sales-mri" : "/en/sales-mri"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {finalIsArabic ? "ابدأ رحلة التحول الآن" : "Start Your Transformation Journey"}
            </a>
          </div>

          <div className="footer">Dyad © 2026</div>
        </section>
      </div>
    </div>
  );
}