"use client";

import React, { useMemo, useEffect } from "react";

// ────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────
type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

interface CompetencyResult {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
}

interface PrintReportClientProps {
  attempt: any;
  user: {
    userId: string | null;
    fullName: string | null;
    company: string | null;
    email: string | null;
  };
  lang: "ar" | "en";
}

// ────────────────────────────────────────────────
// COMPETENCY META
// ────────────────────────────────────────────────
const COMPETENCY_META: Record<
  string,
  { labelEn: string; labelAr: string; diagnosticEn: string; diagnosticAr: string }
> = {
  mental_toughness: {
    labelEn: "Mental Toughness",
    labelAr: "الصلابة الذهنية",
    diagnosticEn: "Your ability to stay focused, resilient, and emotionally stable during field challenges.",
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

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
const tierColor = (tier: Tier) => {
  if (tier === "Strength") return "#16a34a";
  if (tier === "Opportunity") return "#2563eb";
  if (tier === "Threat") return "#A97142";
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
  const clean = String(id || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
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
  return map[clean] || clean;
};

function formatReportDate(dateValue: any, isArabic: boolean) {
  try {
    const d = dateValue ? new Date(dateValue) : new Date();
    return d.toLocaleDateString(isArabic ? "ar-AE" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString(isArabic ? "ar-AE" : "en-GB");
  }
}

// ────────────────────────────────────────────────
// DONUT - FIXED TO PREVENT DOUBLE RENDERING
// ────────────────────────────────────────────────
function Donut({ value, color }: { value: number; color: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = clampPct(value);
  const dash = (pct / 100) * c;
  const rest = c - dash;

  return (
    <div className="relative w-[100px] h-[100px] mx-auto">
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
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

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────
export default function PrintReportClient({ attempt, user, lang }: PrintReportClientProps) {
  const isArabic = lang === "ar";

  // Extract data
  const competencyResults = (attempt?.competency_results || []) as CompetencyResult[];
  const totalPercentage = attempt?.total_percentage || 0;
  
  // User data
  const fullName = user?.fullName || (isArabic ? "غير محدد" : "Not specified");
  const company = user?.company || null;
  const email = user?.email || (isArabic ? "غير محدد" : "Not specified");
  const assessmentDate = formatReportDate(attempt?.created_at, isArabic);
  const attemptId = attempt?.id || "";

  // Process results
  const ordered = useMemo(() => {
    const normalized = competencyResults.map((r) => ({
      ...r,
      competencyId: normalizeCompetencyId((r as any).competencyId),
      percentage: clampPct((r as any).percentage),
    }));

    const map = new Map<string, CompetencyResult>();
    normalized.forEach((r) => map.set(r.competencyId, r));
    
    const orderedCore = COMPETENCY_ORDER.map((id) => map.get(id)).filter(Boolean) as CompetencyResult[];
    const extras = normalized.filter((r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId));
    
    return [...orderedCore, ...extras];
  }, [competencyResults]);

  const firstFive = useMemo(() => ordered.slice(0, 5), [ordered]);
  const lastTwo = useMemo(() => ordered.slice(5, 7), [ordered]);

  // SWOT
  const strengths = useMemo(() => ordered.filter((c) => c.tier === "Strength"), [ordered]);
  const opportunities = useMemo(() => ordered.filter((c) => c.tier === "Opportunity"), [ordered]);
  const threats = useMemo(() => ordered.filter((c) => c.tier === "Threat"), [ordered]);
  const weaknesses = useMemo(() => ordered.filter((c) => c.tier === "Weakness"), [ordered]);

  // Total score
  const computedTotal = useMemo(() => {
    if (typeof totalPercentage === "number" && !Number.isNaN(totalPercentage)) {
      return clampPct(totalPercentage);
    }
    if (!ordered.length) return 0;
    const avg = ordered.reduce((s, c) => s + (Number(c.percentage) || 0), 0) / ordered.length;
    return clampPct(avg);
  }, [ordered, totalPercentage]);

  // Mark PDF as ready for Puppeteer
  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.setAttribute('data-pdf-ready', '1');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div dir={isArabic ? "rtl" : "ltr"} lang={lang} className="print-report">
      <div className="report-container">
        {/* PAGE 1: COVER - FIXED NO DOUBLE DONUT */}
        <div className="page cover-page">
          <img src="/new levelup logo 3.png" className="cover-logo" alt="Logo" />

          <h1 className="cover-title">{isArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}</h1>

          <h2 className="cover-subtitle">
            {isArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}
          </h2>

          <div className="cover-user-info">
            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "الاسم" : "Name"}</span>
              <span className="cover-user-value font-semibold">{fullName}</span>
            </div>

            {company && (
              <div className="cover-user-line">
                <span className="cover-user-label">{isArabic ? "الشركة" : "Company"}</span>
                <span className="cover-user-value font-semibold">{company}</span>
              </div>
            )}

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
              <span className="cover-user-value">{email}</span>
            </div>

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "تاريخ التقييم" : "Assessment Date"}</span>
              <span className="cover-user-value num">{assessmentDate}</span>
            </div>

            <div className="cover-user-line">
              <span className="cover-user-label">{isArabic ? "معرف المحاولة" : "Attempt ID"}</span>
              <span className="cover-user-value num">{attemptId ? attemptId.slice(0, 8) : "—"}</span>
            </div>
          </div>

          <div className="cover-score-section">
            <Donut value={computedTotal} color="#22c55e" />
            <p className="cover-score-label">{isArabic ? "النتيجة الإجمالية" : "Overall Score"}</p>

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

        {/* PAGE 2: SUMMARY - FIRST 5 */}
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

        {/* PAGE 3: LAST 2 + SWOT */}
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

        {/* PAGE 4 & 5: WORLD-CLASS UPSELL - FIXED RTL */}
        <div className="page recommendations-page">
          <div className="upsell-section" dir={isArabic ? "rtl" : "ltr"}>
            <div className="upsell-header">
              <h2 className="upsell-main-title">
                {isArabic
                  ? "🎯 لقد حصلت على البداية... الآن حان وقت التحول الكامل"
                  : "🎯 You Got the Starter Kit... Now Unlock Complete Transformation"}
              </h2>
              
              <p className="upsell-subtitle">
                {isArabic
                  ? "تقريرك المجاني يكشف عن الصورة... برنامجنا المتقدم يمنحك الخريطة والأدوات للوصول إلى القمة"
                  : "Your free report reveals the picture... Our advanced program gives you the map and tools to reach the summit"}
              </p>
            </div>

            <div className="upsell-features">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3 className="feature-title">
                  {isArabic ? "تحليل متقدم مع مدرب خاص" : "Advanced Analysis with Personal Coach"}
                </h3>
                <p className="feature-desc">
                  {isArabic
                    ? "جلسة فردية ساعة واحدة لتحليل نقاط القوة والضعف مع خطة عمل مخصصة"
                    : "One-on-one 60-minute session to analyze strengths/weaknesses with personalized action plan"}
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3 className="feature-title">
                  {isArabic ? "حزم المهارات العملية" : "Practical Skill Bundles"}
                </h3>
                <p className="feature-desc">
                  {isArabic
                    ? "7 حزم تدريبية عملية تغطي كل كفاءة بمقاطع فيديو وأدوات قابلة للتطبيق فوراً"
                    : "7 practical training bundles covering each competency with videos and immediately applicable tools"}
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3 className="feature-title">
                  {isArabic ? "تتبع التقدم والنتائج" : "Progress Tracking & Results"}
                </h3>
                <p className="feature-desc">
                  {isArabic
                    ? "منصة متابعة لمدة 90 يومًا مع مقاييس أداء وتحسينات قابلة للقياس"
                    : "90-day tracking platform with performance metrics and measurable improvements"}
                </p>
              </div>
            </div>

            <div className="upsell-cta-box">
              <div className="pricing">
                <span className="old-price">{isArabic ? "٥٩٩ $" : "$599"}</span>
                <span className="current-price">{isArabic ? "٢٩٩ $" : "$299"}</span>
                <span className="discount">{isArabic ? "خصم 50%" : "50% OFF"}</span>
              </div>
              
              <div className="guarantee">
                <span className="guarantee-icon">✓</span>
                <span className="guarantee-text">
                  {isArabic ? "ضمان استرداد الأموال لمدة 30 يومًا" : "30-Day Money-Back Guarantee"}
                </span>
              </div>
              
              <a 
                href={isArabic ? "https://dyad.com/ar/upgrade" : "https://dyad.com/upgrade"} 
                className="upsell-cta-button"
                target="_blank" 
                rel="noopener noreferrer"
              >
                {isArabic ? "ارتقِ بأدائك الآن" : "Upgrade Your Performance Now"}
              </a>
              
              <p className="upsell-note">
                {isArabic
                  ? "يبدأ البرنامج فورًا بعد التسجيل. عدد الأماكن محدود."
                  : "Program starts immediately after enrollment. Limited spots available."}
              </p>
            </div>

            <div className="report-footer">
              <div className="footer-logo">
                <img src="/new levelup logo 3.png" alt="Dyad" className="footer-logo-img" />
              </div>
              <p className="footer-text">
                {isArabic 
                  ? "تقنيات ذكية لأداء مبيعات أفضل. جميع الحقوق محفوظة © 2026"
                  : "Smart tools for better sales performance. All rights reserved © 2026"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* ── RESET FOR PDF ── */
        body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        /* ── PAGE BASE ── */
        .page {
          padding: 60px 55px 80px !important;
          background: white;
          page-break-after: always;
          min-height: 29.7cm;
          position: relative;
        }
        
        /* ── COVER – premium & elegant ── */
        .cover-page {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          text-align: center;
          padding-top: 40px;
        }
        
        .cover-logo {
          width: 220px;
          margin-bottom: 60px;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.08));
        }
        
        .cover-title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -1px;
          background: linear-gradient(90deg, #1d4ed8, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px;
          line-height: 1.2;
        }
        
        .cover-subtitle {
          font-size: 22px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 60px;
          opacity: 0.9;
        }
        
        .cover-user-info {
          max-width: 500px;
          margin: 0 auto 70px;
          padding: 28px 36px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px -12px rgba(0,0,0,0.1);
          border: 1px solid rgba(229,231,235,0.8);
        }
        
        .cover-user-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 14px;
          font-size: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .cover-user-line:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .cover-score-section {
          margin-top: 40px;
        }
        
        .cover-score-label {
          font-size: 20px;
          font-weight: 700;
          margin: 16px 0 8px;
          color: #1f2937;
        }
        
        .cover-note {
          font-size: 14px;
          color: #6b7280;
          max-width: 500px;
          margin: 8px auto;
        }
        
        /* ── CARDS – premium depth ── */
        .competency-summary-card {
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid rgba(229,231,235,0.8);
          background: white;
          padding: 24px;
          page-break-inside: avoid;
        }
        
        .competency-summary-grid,
        .swot-grid {
          display: grid;
          gap: 24px;
          page-break-inside: avoid;
        }
        
        .competency-summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        /* Progress bar upgrade */
        .competency-summary-bar-track {
          height: 10px !important;
          border-radius: 5px;
          background: #f1f5f9;
          margin: 12px 0;
        }
        
        .competency-summary-bar-fill {
          border-radius: 5px;
          height: 100%;
        }
        
        /* Section titles – standout */
        .section-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 20px;
          text-align: center;
          color: #1e40af;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 12px;
          display: inline-block;
          width: 100%;
        }
        
        .section-subtitle {
          font-size: 16px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 32px;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }
        
        /* SWOT – stronger quadrants */
        .swot-card {
          padding: 24px;
          min-height: 200px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid rgba(229,231,235,0.8);
        }
        
        .swot-grid {
          grid-template-columns: repeat(2, 1fr);
          margin-top: 32px;
        }
        
        .swot-strength { 
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
          border-left: 5px solid #10b981; 
        }
        .swot-opportunity { 
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
          border-left: 5px solid #3b82f6; 
        }
        .swot-threat { 
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); 
          border-left: 5px solid #d97706; 
        }
        .swot-weakness { 
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); 
          border-left: 5px solid #ef4444; 
        }
        
        .swot-card-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1f2937;
        }
        
        .swot-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .swot-list li {
          margin-bottom: 8px;
          padding-left: 0;
        }
        
        /* ── WORLD-CLASS UPSELL SECTION ── */
        .upsell-section {
          margin-top: 50px;
          padding: 32px;
          background: linear-gradient(135deg, #fef3c7 0%, #fefce8 100%);
          border-radius: 20px;
          border: 2px solid #fbbf24;
          page-break-inside: avoid;
        }
        
        .upsell-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .upsell-main-title {
          font-size: 28px;
          font-weight: 900;
          color: #92400e;
          margin-bottom: 16px;
          line-height: 1.3;
        }
        
        .upsell-subtitle {
          font-size: 16px;
          color: #78350f;
          opacity: 0.9;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .upsell-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 32px 0;
        }
        
        .feature-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          text-align: center;
        }
        
        .feature-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        
        .feature-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .feature-desc {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .upsell-cta-box {
          background: white;
          padding: 28px;
          border-radius: 16px;
          text-align: center;
          margin-top: 32px;
          border: 2px dashed #fbbf24;
        }
        
        .pricing {
          margin-bottom: 20px;
        }
        
        .old-price {
          display: block;
          font-size: 18px;
          color: #9ca3af;
          text-decoration: line-through;
        }
        
        .current-price {
          display: block;
          font-size: 36px;
          font-weight: 900;
          color: #1f2937;
          margin: 8px 0;
        }
        
        .discount {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
        }
        
        .guarantee {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 16px 0;
          padding: 8px 16px;
          background: #f0fdf4;
          border-radius: 20px;
          color: #065f46;
        }
        
        .upsell-cta-button {
          display: inline-block;
          background: linear-gradient(90deg, #d97706, #f59e0b);
          color: white;
          font-weight: 700;
          padding: 16px 40px;
          border-radius: 50px;
          font-size: 18px;
          text-decoration: none;
          box-shadow: 0 8px 20px rgba(217,119,6,0.3);
          transition: all 0.3s;
          margin: 20px 0;
        }
        
        .upsell-note {
          font-size: 13px;
          color: #6b7280;
          margin-top: 16px;
          font-style: italic;
        }
        
        /* ── FOOTER ── */
        .report-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
        }
        
        .footer-logo {
          margin-bottom: 12px;
        }
        
        .footer-logo-img {
          height: 40px;
          opacity: 0.8;
        }
        
        .footer-text {
          font-size: 13px;
        }
        
        /* ── RTL SUPPORT ── */
        [dir="rtl"] .cover-user-line,
        [dir="rtl"] .competency-summary-header {
          flex-direction: row-reverse;
        }
        
        [dir="rtl"] .swot-card {
          border-left: none;
          border-right: 5px solid;
        }
        
        [dir="rtl"] .swot-strength { border-right-color: #10b981; }
        [dir="rtl"] .swot-opportunity { border-right-color: #3b82f6; }
        [dir="rtl"] .swot-threat { border-right-color: #d97706; }
        [dir="rtl"] .swot-weakness { border-right-color: #ef4444; }
        
        /* ── PRINT OPTIMIZATION ── */
        @media print {
          .page {
            padding: 40px 35px 60px !important;
          }
          a {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
        }
      `}</style>
    </div>
  );
}