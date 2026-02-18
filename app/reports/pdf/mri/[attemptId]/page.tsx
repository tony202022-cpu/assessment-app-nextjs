import "server-only";
import { createClient } from "@supabase/supabase-js";
import React from "react";

// ============================================================================
// DYAD PREMIUM $199 MRI REPORT - HIGH CONTRAST & MOBILE-FIRST
// Complete 25-page executive diagnostic with perfect PDF pagination
// ============================================================================

const EXECUTIVE_DESIGN = {
  colors: {
    // High Contrast Color System for Maximum Readability
    navy: "#0F172A",           // Almost black for text
    blue: "#1E3A8A",           // Strong blue for accents
    gold: "#B45309",           // Darker gold for text contrast
    goldBright: "#F59E0B",     // Bright gold for backgrounds
    
    // Clean Backgrounds
    white: "#FFFFFF",
    cream: "#FFFBEB",
    lightGray: "#F8FAFC",
    
    // High Contrast Tier Colors
    strength: "#059669",       // Strong emerald
    opportunity: "#2563EB",    // Strong royal blue
    threat: "#DC2626",         // Strong red
    weakness: "#991B1B",       // Deep red
    
    // Subtle Backgrounds (maintain contrast)
    strengthBg: "#F0FDF4",
    opportunityBg: "#EFF6FF",
    threatBg: "#FEF2F2",
    weaknessBg: "#FEF2F2",
    
    border: "#E2E8F0",
  },
} as const;

// ============================================================================
// YOUR ACTUAL PREMIUM BONUSES ($1,485 Total Value)
// ============================================================================
const BONUSES_CONFIG = [
  {
    id: 1,
    titleEn: "The 50 Best Answers to the 50 Hardest Objections",
    titleAr: "أفضل 50 إجابة لأصعب 50 اعتراض بيعي",
    descEn: "Never be stumped by 'Your price is too high' again. Master every objection with proven responses that close deals.",
    descAr: "لن تقف عاجزاً أمام 'سعرك مرتفع' مرة أخرى. أتقن كل اعتراض بإجابات مثبتة تغلق الصفقات.",
    value: 297,
    link: "https://dyad.sh/bonuses/50-objections", // ← Replace with your actual link
  },
  {
    id: 2,
    titleEn: "How I Learned to Sell from Playing Soccer",
    titleAr: "كيف تعلمت البيع من لعب كرة القدم",
    descEn: "The mental toughness secrets of elite athletes applied directly to high-pressure sales situations.",
    descAr: "أسرار الصلابة الذهنية للرياضيين النخبة مطبقة مباشرة على مواقف المبيعات عالية الضغط.",
    value: 197,
    link: "https://dyad.sh/bonuses/soccer-sales", // ← Replace with your actual link
  },
  {
    id: 3,
    titleEn: "How to Motivate Yourself Under Pressure",
    titleAr: "كيف تحفز نفسك تحت الضغط",
    descEn: "The exact words to say to yourself when you're about to quit. Self-coaching scripts for resilience.",
    descAr: "الكلمات الدقيقة التي تقولها لنفسك عندما توشك على الاستسلام. نصوص التدريب الذاتي للمرونة.",
    value: 197,
    link: "https://dyad.sh/bonuses/self-motivation", // ← Replace with your actual link
  },
  {
    id: 4,
    titleEn: "How to Book Appointments with VIPs",
    titleAr: "كيف تحجز مواعيد مع كبار الشخصيات",
    descEn: "The script that gets CEOs to say 'Yes' in 30 seconds. Access decision-makers instantly with proven frameworks.",
    descAr: "النص الذي يجعل المدراء التنفيذيين يقولون 'نعم' في 30 ثانية. الوصول الفوري لصناع القرار بأطر مثبتة.",
    value: 297,
    link: "https://dyad.sh/bonuses/vip-booking", // ← Replace with your actual link
  },
  {
    id: 5,
    titleEn: "Time-Management Mastery for Outdoor Sales",
    titleAr: "إتقان إدارة الوقت للمبيعات الخارجية",
    descEn: "How to sell more in 4 hours than most reps do in 40. The productivity multiplier system that transforms territories.",
    descAr: "كيف تبيع في 4 ساعات أكثر مما يبيعه معظم المندوبين في 40. نظام مضاعف الإنتاجية الذي يحول المناطق.",
    value: 497,
    link: "https://dyad.sh/bonuses/time-mastery", // ← Replace with your actual link
    highlight: true,
  },
];

const TOTAL_BONUS_VALUE = BONUSES_CONFIG.reduce((sum, b) => sum + b.value, 0);

// ============================================================================
// MOBILE-FIRST RESPONSIVE STYLES + PERFECT PDF PAGINATION
// ============================================================================
const ExecutiveStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap');
      
      /* PDF Settings - Perfect Pagination */
      @page { margin: 0; size: A4 portrait; }
      
      body, html { 
        margin: 0; 
        padding: 0; 
        background: white;
        font-size: 16px;
        line-height: 1.6;
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
      }
      
      * { 
        box-sizing: border-box; 
        max-width: 100%;
      }
      
      /* Perfect Page Break System */
      .page-section {
        min-height: 100vh;
        page-break-after: always;
        break-after: page;
        padding: 40px;
        background: white;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      
      .avoid-break { 
        page-break-inside: avoid; 
        break-inside: avoid;
      }
      
      /* Mobile Responsive */
      @media screen and (max-width: 768px) {
        .page-section { 
          padding: 20px; 
          min-height: auto;
          page-break-after: auto;
        }
        .mobile-stack { 
          grid-template-columns: 1fr !important; 
          gap: 20px !important;
        }
        .mobile-text-lg { font-size: 18px !important; }
        .mobile-text-xl { font-size: 28px !important; }
        .mobile-score { 
          width: 100px !important; 
          height: 100px !important; 
        }
        .mobile-score-inner {
          width: 80px !important;
          height: 80px !important;
        }
        .mobile-score-text { font-size: 24px !important; }
      }
      
      /* PDF Print Optimizations */
      @media print {
        .no-print { display: none !important; }
        .page-section { 
          min-height: 100vh;
          page-break-after: always;
          padding: 30px;
        }
        body { font-size: 14px; }
        * { 
          overflow: visible !important;
          max-width: 100% !important;
        }
      }
      
      /* Link Styling */
      a {
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      a:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
    `
  }} />
);

// Helper Functions
function getTierStyling(pct: number, thresholds?: any) {
  const t = thresholds || { strength: 75, opportunity: 50, threat: 30, weakness: 0 };
  if (pct >= t.strength) return { 
    color: EXECUTIVE_DESIGN.colors.strength, 
    bg: EXECUTIVE_DESIGN.colors.strengthBg, 
    labelEn: "Strength", 
    labelAr: "نقطة قوة" 
  };
  if (pct >= t.opportunity) return { 
    color: EXECUTIVE_DESIGN.colors.opportunity, 
    bg: EXECUTIVE_DESIGN.colors.opportunityBg, 
    labelEn: "Opportunity", 
    labelAr: "فرصة تطوير" 
  };
  if (pct >= t.threat) return { 
    color: EXECUTIVE_DESIGN.colors.threat, 
    bg: EXECUTIVE_DESIGN.colors.threatBg, 
    labelEn: "Threat", 
    labelAr: "تهديد" 
  };
  return { 
    color: EXECUTIVE_DESIGN.colors.weakness, 
    bg: EXECUTIVE_DESIGN.colors.weaknessBg, 
    labelEn: "Weakness", 
    labelAr: "نقطة ضعف" 
  };
}

function formatExecutiveDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  // Force Gregorian calendar for both languages
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  });
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ============================================================================
// FIXED: PDF DOWNLOAD LINK (No Client Component Error)
// ============================================================================
const PDFDownloadLink = ({ attemptId, lang, ar }: { attemptId: string; lang: string; ar: boolean }) => (
  <a
    href={`/api/generate-pdf?attemptId=${attemptId}&lang=${lang}`}
    className="no-print"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 1000,
      background: `linear-gradient(135deg, ${EXECUTIVE_DESIGN.colors.gold} 0%, ${EXECUTIVE_DESIGN.colors.goldBright} 100%)`,
      color: "white",
      padding: "14px 24px",
      borderRadius: "12px",
      fontWeight: 800,
      fontSize: "14px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      textDecoration: "none",
    }}
  >
    <span style={{ fontSize: "16px" }}>📄</span>
    {ar ? "تحميل PDF" : "Download PDF"}
  </a>
);

// ============================================================================
// PAGE 1: HIGH CONTRAST COVER WITH PROMINENT DATE & EMAIL
// ============================================================================
const CoverPage = ({ attempt, config, ar }: any) => {
  const userName = attempt.full_name || (ar ? "مشارك" : "Participant");
  const userEmail = attempt.user_email || attempt.email || "";
  const company = attempt.company || "";
  const totalScore = attempt.total_percentage ?? 0;
  const testDate = formatExecutiveDate(attempt.completed_at || attempt.created_at || new Date());
  const tier = getTierStyling(totalScore, config.tier_thresholds);

  return (
    <section className="page-section" style={{
      background: `linear-gradient(135deg, ${EXECUTIVE_DESIGN.colors.lightGray} 0%, ${EXECUTIVE_DESIGN.colors.cream} 100%)`,
      justifyContent: "space-between",
    }}>
      
      {/* Header with Very Prominent Date */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "40px"
      }}>
        <div style={{
          background: EXECUTIVE_DESIGN.colors.navy,
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 800,
          fontSize: "14px",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          {ar ? "تقرير تنفيذي سري" : "Executive Report"}
        </div>
        
        {/* VERY PROMINENT TEST DATE - Fixed Gregorian */}
        <div style={{
          background: EXECUTIVE_DESIGN.colors.gold,
          color: "white",
          padding: "20px 35px",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(180, 69, 9, 0.4)",
          border: "4px solid white",
        }}>
          <div style={{
            fontSize: "12px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: "6px",
            opacity: 0.9
          }}>
            {ar ? "تاريخ التقييم" : "Assessment Date"}
          </div>
          <div style={{
            fontSize: "18px",
            fontWeight: 900,
            letterSpacing: "0.5px"
          }}>
            {testDate}
          </div>
        </div>
      </div>

      {/* Hero Section - High Contrast */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "center",
        textAlign: "center"
      }}>
        <div style={{ 
          width: "100px", 
          height: "8px", 
          background: EXECUTIVE_DESIGN.colors.gold, 
          margin: "0 auto 40px auto",
          borderRadius: "4px"
        }} />
        
        <h1 className="mobile-text-xl" style={{
          fontSize: "64px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.navy,
          lineHeight: 1.0,
          marginBottom: "30px"
        }}>
          {ar ? (
            <>
              تشخيص MRI
              <br />
              <span style={{ color: EXECUTIVE_DESIGN.colors.gold }}>للمبيعات الخارجية</span>
            </>
          ) : (
            <>
              Outdoor Sales
              <br />
              <span style={{ color: EXECUTIVE_DESIGN.colors.gold }}>MRI Diagnostic</span>
            </>
          )}
        </h1>
        
        <p className="mobile-text-lg" style={{
          fontSize: "22px",
          color: EXECUTIVE_DESIGN.colors.navy,
          maxWidth: "800px",
          margin: "0 auto 60px auto",
          lineHeight: 1.5,
          opacity: 0.8,
          fontWeight: 500
        }}>
          {ar
            ? `تقرير استراتيجي شامل مع خطة تنفيذية لمدة 90 يوماً وموارد حصرية بقيمة $${TOTAL_BONUS_VALUE.toLocaleString()}`
            : `Comprehensive strategic report with 90-day execution plan and exclusive resources worth $${TOTAL_BONUS_VALUE.toLocaleString()}`}
        </p>

        {/* High Contrast Score Display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "40px",
          background: "white",
          padding: "40px",
          borderRadius: "24px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.1)",
          border: `3px solid ${EXECUTIVE_DESIGN.colors.border}`,
          maxWidth: "700px",
          margin: "0 auto"
        }}>
          <div className="mobile-score" style={{
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: `conic-gradient(${tier.color} ${totalScore * 3.6}deg, ${EXECUTIVE_DESIGN.colors.border} ${totalScore * 3.6}deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <div className="mobile-score-inner" style={{
              width: "130px",
              height: "130px",
              borderRadius: "50%",
              background: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <div className="mobile-score-text" style={{ 
                fontSize: "48px", 
                fontWeight: 900, 
                color: tier.color, 
                lineHeight: 1 
              }}>
                {totalScore}
              </div>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: 700, 
                color: EXECUTIVE_DESIGN.colors.navy, 
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginTop: "4px"
              }}>
                {ar ? "النقاط" : "Score"}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, textAlign: ar ? "right" : "left" }}>
            <div style={{ 
              fontSize: "28px", 
              fontWeight: 900, 
              color: tier.color, 
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              {ar ? tier.labelAr : tier.labelEn}
            </div>
            <div style={{ 
              fontSize: "18px", 
              color: EXECUTIVE_DESIGN.colors.navy, 
              lineHeight: 1.5,
              fontWeight: 600
            }}>
              {ar
                ? "تحليل شامل للكفاءات الاستراتيجية مع توصيات تنفيذية دقيقة للنمو المهني المتسارع."
                : "Comprehensive strategic competency analysis with precise actionable recommendations for accelerated professional growth."}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Identity with Prominent Email */}
      <div style={{
        borderTop: `3px solid ${EXECUTIVE_DESIGN.colors.border}`,
        paddingTop: "30px",
        display: "grid",
        gridTemplateColumns: company ? "2fr 1fr" : "1fr",
        gap: "30px"
      }}>
        <div>
          <div style={{ 
            fontSize: "12px", 
            color: EXECUTIVE_DESIGN.colors.gold, 
            textTransform: "uppercase", 
            fontWeight: 800,
            letterSpacing: "1.5px",
            marginBottom: "10px" 
          }}>
            {ar ? "مُعد لـ" : "Prepared For"}
          </div>
          
          {/* Name + Email Prominent Display */}
          <div style={{ marginBottom: "15px" }}>
            <div style={{ 
              fontSize: "32px", 
              fontWeight: 900, 
              color: EXECUTIVE_DESIGN.colors.navy,
              marginBottom: "8px",
              lineHeight: 1.1
            }}>
              {userName}
            </div>
            {userEmail && (
              <div style={{ 
                fontSize: "18px", 
                color: EXECUTIVE_DESIGN.colors.blue, 
                fontWeight: 700,
                fontFamily: "monospace",
                background: EXECUTIVE_DESIGN.colors.cream,
                padding: "8px 16px",
                borderRadius: "8px",
                border: `2px solid ${EXECUTIVE_DESIGN.colors.border}`,
                display: "inline-block"
              }}>
                {userEmail}
              </div>
            )}
          </div>
          
          {company && (
            <div style={{ 
              fontSize: "18px", 
              color: EXECUTIVE_DESIGN.colors.navy, 
              fontWeight: 600,
              opacity: 0.8
            }}>
              {company}
            </div>
          )}
        </div>
      </div>

      {/* Branding */}
      <div style={{
        marginTop: "30px",
        textAlign: "center",
        fontSize: "16px",
        color: EXECUTIVE_DESIGN.colors.navy,
        fontWeight: 600
      }}>
        {ar ? "مُقدم من" : "Powered by"}{" "}
        <span style={{ 
          color: EXECUTIVE_DESIGN.colors.gold, 
          fontWeight: 900,
          fontSize: "18px"
        }}>
          DYAD
        </span>
      </div>
    </section>
  );
};

// ============================================================================
// PAGE 2: SWOT 4-QUADRANT MATRIX
// ============================================================================
const SwotMatrixPage = ({ scores, titleById, config, ar }: any) => {
  const t = config.tier_thresholds || { strength: 75, opportunity: 50, threat: 30, weakness: 0 };
  
  // Categorize competencies into SWOT quadrants
  const categorized = { strength: [], opportunity: [], threat: [], weakness: [] } as any;

  scores.forEach((s: any) => {
    const pct = Number(s.percentage ?? 0);
    const titleMeta = titleById.get(s.competencyId) || {};
    const title = ar ? (titleMeta.ar || s.competencyId) : (titleMeta.en || s.competencyId);
    const item = { title, pct };
    
    if (pct >= t.strength) categorized.strength.push(item);
    else if (pct >= t.opportunity) categorized.opportunity.push(item);
    else if (pct >= t.threat) categorized.threat.push(item);
    else categorized.weakness.push(item);
  });

  // Sort each category appropriately
  Object.keys(categorized).forEach(k => {
    categorized[k].sort((a: any, b: any) => b.pct - a.pct);
  });

  const quadrants = [
    { 
      key: "strength", 
      title: ar ? "نقاط القوة" : "STRENGTHS", 
      desc: ar ? "الميزات التنافسية الأساسية" : "Core competitive advantages",
      color: EXECUTIVE_DESIGN.colors.strength, 
      bg: EXECUTIVE_DESIGN.colors.strengthBg, 
      items: categorized.strength 
    },
    { 
      key: "opportunity", 
      title: ar ? "فرص النمو" : "OPPORTUNITIES", 
      desc: ar ? "مجالات التطوير عالية العائد" : "High-ROI development areas",
      color: EXECUTIVE_DESIGN.colors.opportunity, 
      bg: EXECUTIVE_DESIGN.colors.opportunityBg, 
      items: categorized.opportunity 
    },
    { 
      key: "threat", 
      title: ar ? "التهديدات" : "THREATS", 
      desc: ar ? "نقاط تتطلب اهتماماً فورياً" : "Areas requiring immediate attention",
      color: EXECUTIVE_DESIGN.colors.threat, 
      bg: EXECUTIVE_DESIGN.colors.threatBg, 
      items: categorized.threat 
    },
    { 
      key: "weakness", 
      title: ar ? "نقاط الضعف" : "WEAKNESSES", 
      desc: ar ? "فجوات حرجة تؤثر على الأداء" : "Critical performance gaps",
      color: EXECUTIVE_DESIGN.colors.weakness, 
      bg: EXECUTIVE_DESIGN.colors.weaknessBg, 
      items: categorized.weakness 
    },
  ];

  return (
    <section className="page-section">
      
      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "40px",
        borderBottom: `4px solid ${EXECUTIVE_DESIGN.colors.gold}`,
        paddingBottom: "20px"
      }}>
        <h2 style={{
          fontSize: "40px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.navy,
          marginBottom: "15px",
          lineHeight: 1.1
        }}>
          {ar ? "مصفوفة التحليل الاستراتيجي" : "Strategic SWOT Matrix"}
        </h2>
        <p style={{
          fontSize: "20px",
          color: EXECUTIVE_DESIGN.colors.navy,
          margin: 0,
          opacity: 0.7
        }}>
          {ar ? "توزيع الكفاءات عبر الفئات الاستراتيجية الأربع" : "Competency distribution across four strategic categories"}
        </p>
      </div>

      {/* 4-Quadrant Grid */}
      <div className="mobile-stack" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "25px",
        marginBottom: "40px",
        flex: 1
      }}>
        {quadrants.map((q) => (
          <div key={q.key} className="avoid-break" style={{
            background: "white",
            border: `4px solid ${q.color}`,
            borderRadius: "16px",
            overflow: "hidden",
            minHeight: "350px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
          }}>
            
            {/* Quadrant Header */}
            <div style={{
              background: q.color,
              color: "white",
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{
                fontSize: "20px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px"
              }}>
                {q.title}
              </div>
              <div style={{
                fontSize: "14px",
                opacity: 0.9,
                marginBottom: "15px"
              }}>
                {q.desc}
              </div>
              <div style={{
                background: "white",
                color: q.color,
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "20px",
                margin: "0 auto"
              }}>
                {q.items.length}
              </div>
            </div>

            {/* Quadrant Content */}
            <div style={{ padding: "20px", flex: 1, background: q.bg }}>
              {q.items.length === 0 ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100px",
                  fontSize: "16px",
                  color: EXECUTIVE_DESIGN.colors.navy,
                  fontStyle: "italic",
                  textAlign: "center",
                  opacity: 0.6
                }}>
                  {ar ? "لا توجد كفاءات في هذه الفئة" : "No competencies in this category"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {q.items.map((item: any, idx: number) => (
                    <div key={idx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "15px",
                      background: "white",
                      borderRadius: "10px",
                      border: `2px solid ${q.color}30`,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }}>
                      <div style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: q.color,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        flex: 1,
                        fontSize: "15px",
                        color: EXECUTIVE_DESIGN.colors.navy,
                        fontWeight: 700,
                        lineHeight: 1.3
                      }}>
                        {item.title}
                      </div>
                      <div style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: q.color,
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {item.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Summary */}
      <div style={{
        padding: "30px",
        background: `linear-gradient(135deg, ${EXECUTIVE_DESIGN.colors.navy} 0%, ${EXECUTIVE_DESIGN.colors.blue} 100%)`,
        borderRadius: "16px",
        color: "white",
        textAlign: "center"
      }}>
        <h4 style={{
          fontSize: "24px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.goldBright,
          margin: "0 0 15px 0",
          textTransform: "uppercase"
        }}>
          {ar ? "الخلاصة الاستراتيجية" : "Strategic Summary"}
        </h4>
        <p style={{
          fontSize: "18px",
          margin: 0,
          lineHeight: 1.6,
          opacity: 0.95
        }}>
          {ar
            ? `تحليل SWOT يكشف ${categorized.strength.length} نقطة قوة تحمي موقعك، ${categorized.opportunity.length} فرصة للنمو، ${categorized.threat.length} تهديد يتطلب انتباهاً، و${categorized.weakness.length} نقطة ضعف حرجة تحتاج تدخلاً فورياً.`
            : `SWOT analysis reveals ${categorized.strength.length} strengths protecting your position, ${categorized.opportunity.length} growth opportunities, ${categorized.threat.length} threats requiring attention, and ${categorized.weakness.length} critical weaknesses needing immediate intervention.`}
        </p>
      </div>

      {/* Page Footer */}
      <div style={{
        marginTop: "30px",
        paddingTop: "20px",
        borderTop: `1px solid ${EXECUTIVE_DESIGN.colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        color: EXECUTIVE_DESIGN.colors.navy,
        fontWeight: 600
      }}>
        <span>{ar ? "مصفوفة SWOT الاستراتيجية" : "Strategic SWOT Matrix"}</span>
        <span>{ar ? "صفحة 2 من 25" : "Page 2 of 25"}</span>
      </div>
    </section>
  );
};

// ============================================================================
// PAGES 3+: FULL-PAGE COMPETENCY ANALYSIS (NO BULLETS - PROFESSIONAL ICONS)
// ============================================================================
const CompetencyPage = ({ data, config, ar, pageNum }: any) => {
  const { competency, score } = data;
  const pct = Number(score.percentage ?? 0);
  const tier = getTierStyling(pct, config.tier_thresholds);
  
  const title = ar ? (competency.title?.ar || competency.id) : (competency.title?.en || competency.id);
  const dd = competency.deep_dive || {};
  
  // Get tier key for interpretation
  const tierKey = pct >= 75 ? "strength" : pct >= 50 ? "opportunity" : pct >= 30 ? "threat" : "weakness";
  
  const interpretation = (ar ? dd?.interpretation?.[tierKey]?.ar : dd?.interpretation?.[tierKey]?.en) || "";
  const behaviors = (ar ? dd?.signals?.behavior?.ar : dd?.signals?.behavior?.en) || [];
  const risks = (ar ? dd?.risks_if_untreated?.ar : dd?.risks_if_untreated?.en) || [];

  return (
    <section className="page-section">
      
      {/* Page Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `4px solid ${tier.color}`,
        paddingBottom: "25px",
        marginBottom: "35px"
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            color: tier.color,
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "16px",
            letterSpacing: "1px",
            marginBottom: "10px"
          }}>
            {ar ? tier.labelAr : tier.labelEn}
          </div>
          <h1 style={{
            fontSize: "36px",
            fontWeight: 900,
            color: EXECUTIVE_DESIGN.colors.navy,
            margin: 0,
            lineHeight: 1.2
          }}>
            {title}
          </h1>
        </div>
        
        <div style={{
          fontSize: "56px",
          fontWeight: 900,
          color: "white",
          background: tier.color,
          padding: "20px 30px",
          borderRadius: "16px",
          minWidth: "140px",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>
          {pct}%
        </div>
      </div>

      {/* Strategic Interpretation */}
      {interpretation && (
        <div className="avoid-break" style={{ marginBottom: "35px" }}>
          <div style={{
            background: `linear-gradient(135deg, ${EXECUTIVE_DESIGN.colors.navy} 0%, ${EXECUTIVE_DESIGN.colors.blue} 100%)`,
            color: "white",
            padding: "25px",
            borderRadius: "16px",
            border: `3px solid ${EXECUTIVE_DESIGN.colors.gold}`
          }}>
            <h3 style={{
              fontSize: "20px",
              fontWeight: 800,
              color: EXECUTIVE_DESIGN.colors.goldBright,
              margin: "0 0 15px 0",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              {ar ? "التحليل الاستراتيجي" : "Strategic Analysis"}
            </h3>
            <p style={{
              fontSize: "18px",
              lineHeight: 1.7,
              margin: 0,
              opacity: 0.95
            }}>
              {interpretation}
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Content */}
      <div className="mobile-stack" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "35px",
        flex: 1
      }}>
        
        {/* Behavioral Indicators (NO BULLETS - Professional Icons) */}
        <div className="avoid-break">
          <h3 style={{
            fontSize: "22px",
            fontWeight: 800,
            color: EXECUTIVE_DESIGN.colors.navy,
            marginBottom: "20px",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            {ar ? "المؤشرات السلوكية" : "Behavioral Indicators"}
          </h3>
          
          <div style={{
            background: EXECUTIVE_DESIGN.colors.lightGray,
            padding: "25px",
            borderRadius: "12px",
            border: `2px solid ${EXECUTIVE_DESIGN.colors.border}`
          }}>
            {behaviors.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {behaviors.map((behavior: string, i: number) => (
                  <div key={i} style={{ 
                    display: "flex", 
                    gap: "15px", 
                    alignItems: "flex-start",
                    padding: "15px",
                    background: "white",
                    borderRadius: "10px",
                    border: `1px solid ${tier.color}40`,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <span style={{ 
                      color: tier.color, 
                      fontSize: "18px", 
                      fontWeight: "900", 
                      minWidth: "20px",
                      marginTop: "2px"
                    }}>✓</span>
                    <span style={{
                      fontSize: "16px",
                      color: EXECUTIVE_DESIGN.colors.navy,
                      lineHeight: 1.5,
                      fontWeight: 500
                    }}>
                      {behavior}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{
                fontSize: "16px",
                color: EXECUTIVE_DESIGN.colors.navy,
                margin: 0,
                fontStyle: "italic",
                textAlign: "center",
                padding: "30px",
                opacity: 0.6
              }}>
                {ar ? "لا توجد مؤشرات سلوكية محددة" : "No specific behavioral indicators available"}
              </p>
            )}
          </div>
        </div>

        {/* Commercial Risks (NO BULLETS - Warning Icons) */}
        <div className="avoid-break">
          <h3 style={{
            fontSize: "22px",
            fontWeight: 800,
            color: EXECUTIVE_DESIGN.colors.weakness,
            marginBottom: "20px",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            {ar ? "المخاطر التجارية" : "Commercial Risks"}
          </h3>
          
          <div style={{
            background: EXECUTIVE_DESIGN.colors.weaknessBg,
            padding: "25px",
            borderRadius: "12px",
            border: `2px solid ${EXECUTIVE_DESIGN.colors.weakness}`
          }}>
            {risks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {risks.map((risk: string, i: number) => (
                  <div key={i} style={{ 
                    display: "flex", 
                    gap: "15px", 
                    alignItems: "flex-start",
                    padding: "15px",
                    background: "white",
                    borderRadius: "10px",
                    border: `1px solid ${EXECUTIVE_DESIGN.colors.weakness}60`,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <span style={{ 
                      color: EXECUTIVE_DESIGN.colors.weakness, 
                      fontSize: "18px", 
                      fontWeight: "900", 
                      minWidth: "20px",
                      marginTop: "2px"
                    }}>⚠</span>
                    <span style={{
                      fontSize: "16px",
                      color: EXECUTIVE_DESIGN.colors.weakness,
                      fontWeight: 600,
                      lineHeight: 1.5
                    }}>
                      {risk}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{
                fontSize: "16px",
                color: EXECUTIVE_DESIGN.colors.navy,
                margin: 0,
                fontStyle: "italic",
                textAlign: "center",
                padding: "30px",
                opacity: 0.6
              }}>
                {ar ? "لا توجد مخاطر تجارية محددة" : "No specific commercial risks identified"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div style={{
        marginTop: "auto",
        paddingTop: "20px",
        borderTop: `1px solid ${EXECUTIVE_DESIGN.colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        color: EXECUTIVE_DESIGN.colors.navy,
        fontWeight: 600
      }}>
        <span>{ar ? "تحليل الكفاءة التفصيلي" : "Detailed Competency Analysis"}</span>
        <span>{ar ? `صفحة ${pageNum} من 25` : `Page ${pageNum} of 25`}</span>
      </div>
    </section>
  );
};

// ============================================================================
// 90-DAY EXECUTION PLAN PAGES (RESTORED FULL CONTENT)
// ============================================================================
const NinetyDayPlanPage = ({ scores, titleById, config, ar, monthNum }: any) => {
  const sortedByWeakness = [...scores].sort((a: any, b: any) => (a.percentage ?? 0) - (b.percentage ?? 0));
  const topPriorities = sortedByWeakness.slice(0, 3);

  const getCompetencyTitle = (id: string) => {
    const meta = titleById.get(id) || {};
    return ar ? (meta.ar || id) : (meta.en || id);
  };

  const months = [
    {
      number: 1,
      titleEn: "Month 1: Foundation & Critical Stabilization",
      titleAr: "الشهر الأول: الأساس والاستقرار الحرج",
      focusEn: "Primary Focus: " + (topPriorities[0] ? getCompetencyTitle(topPriorities[0].competencyId) : "Core Competency Development"),
      focusAr: "التركيز الأساسي: " + (topPriorities[0] ? getCompetencyTitle(topPriorities[0].competencyId) : "تطوير الكفاءة الأساسية"),
      objectiveEn: "Establish baseline performance metrics and begin intensive development of your most critical competency gap.",
      objectiveAr: "وضع مقاييس الأداء الأساسية وبدء التطوير المكثف لأهم فجوة في الكفاءات.",
      weeks: [
        {
          title: ar ? "الأسبوع 1-2: التقييم والتخطيط" : "Weeks 1-2: Assessment & Planning",
          tasks: ar ? [
            "وثّق أنماط الأداء الحالية وحدد المواقف المحفزة",
            "قِس مقاييس خط الأساس عبر 10 تفاعلات حقيقية",
            "أنشئ دفتر التطوير الشخصي والتزم بالتتبع اليومي",
            "ابحث عن 5 موارد خبراء للكفاءة المستهدفة"
          ] : [
            "Document current performance patterns and identify trigger situations",
            "Measure baseline metrics across 10 real customer interactions", 
            "Create personal development journal with daily tracking commitment",
            "Research 5 expert resources for target competency development"
          ]
        },
        {
          title: ar ? "الأسبوع 3-4: التطبيق المكثف" : "Weeks 3-4: Intensive Application",
          tasks: ar ? [
            "طبّق التقنيات الجديدة في بيئات آمنة منخفضة المخاطر",
            "مارس السيناريوهات مع الزملاء أو سجّل جلسات التدريب",
            "طبّق مهارة جديدة واحدة يومياً في تفاعلات حقيقية",
            "راجع النتائج واطلب ملاحظات من المدير والزملاء"
          ] : [
            "Apply new techniques in safe, low-stakes environments",
            "Practice scenarios with colleagues or record training sessions",
            "Apply one new skill daily in real customer interactions",
            "Review results and seek feedback from manager and peers"
          ]
        }
      ]
    },
    {
      number: 2,
      titleEn: "Month 2: Expansion & Skill Integration",
      titleAr: "الشهر الثاني: التوسع وتكامل المهارات",
      focusEn: "Secondary Focus: " + (topPriorities[1] ? getCompetencyTitle(topPriorities[1].competencyId) : "Skill Reinforcement"),
      focusAr: "التركيز الثانوي: " + (topPriorities[1] ? getCompetencyTitle(topPriorities[1].competencyId) : "تعزيز المهارات"),
      objectiveEn: "Reinforce Month 1 gains while developing your second priority competency for compound improvement.",
      objectiveAr: "تعزيز مكاسب الشهر الأول مع تطوير كفاءة الأولوية الثانية للتحسن المركب.",
      weeks: [
        {
          title: ar ? "الأسبوع 5-6: التطبيق المتقدم" : "Weeks 5-6: Advanced Application",
          tasks: ar ? [
            "طبّق كفاءة الشهر الأول في مواقف معقدة عالية المخاطر",
            "ابدأ التقييم والتعلم للكفاءة ذات الأولوية الثانية",
            "ادمج كلا الكفاءتين في تفاعل واحد صعب",
            "قِس الأثر التجاري: معدل الإغلاق وحجم الصفقة"
          ] : [
            "Apply Month 1 competency in complex, high-stakes situations",
            "Begin assessment and learning for second priority competency",
            "Combine both competencies in single challenging interactions",
            "Measure commercial impact: close rate, deal size, cycle time"
          ]
        },
        {
          title: ar ? "الأسبوع 7-8: اختبار الأداء" : "Weeks 7-8: Performance Testing",
          tasks: ar ? [
            "اختبر كلا الكفاءتين في سيناريوهات واقعية صعبة",
            "احصل على ملاحظات شاملة من المدير والعملاء",
            "وثّق التقدم واحتفل بإنجازات المعالم المهمة",
            "حدد الفجوات المتبقية وأنشئ حلولاً مستهدفة"
          ] : [
            "Test both competencies in challenging real-world scenarios",
            "Get comprehensive feedback from manager and customers",
            "Document progress and celebrate milestone achievements",
            "Identify remaining gaps and create targeted solutions"
          ]
        }
      ]
    },
    {
      number: 3,
      titleEn: "Month 3: Mastery & Long-term Sustainability",
      titleAr: "الشهر الثالث: الإتقان والاستدامة طويلة المدى",
      focusEn: "Integration Focus: " + (topPriorities[2] ? getCompetencyTitle(topPriorities[2].competencyId) : "System Integration"),
      focusAr: "تركيز التكامل: " + (topPriorities[2] ? getCompetencyTitle(topPriorities[2].competencyId) : "تكامل النظام"),
      objectiveEn: "Integrate all three priority competencies into a seamless, high-performance sales system.",
      objectiveAr: "دمج الكفاءات الثلاث ذات الأولوية في نظام مبيعات سلس وعالي الأداء.",
      weeks: [
        {
          title: ar ? "الأسبوع 9-10: التكامل الكامل" : "Weeks 9-10: Full Integration",
          tasks: ar ? [
            "طبّق الكفاءات الثلاث بسلاسة في كل تفاعل",
            "قِس الأثر التجاري الشامل والعائد على الاستثمار",
            "أنشئ دراسات حالة مفصلة للتحولات الناجحة",
            "شارك النتائج مع الإدارة واطلب الاعتراف بالأداء"
          ] : [
            "Apply all three competencies seamlessly in every interaction",
            "Measure comprehensive commercial impact and ROI",
            "Create detailed case studies of successful transformations",
            "Present results to management and request performance recognition"
          ]
        },
        {
          title: ar ? "الأسبوع 11-12: الاستدامة" : "Weeks 11-12: Sustainability",
          tasks: ar ? [
            "أنشئ أنظمة وعادات للحفاظ على المكاسب طويلة المدى",
            "حدد أولويات التطوير التالية للأيام 91-180",
            "احتفل بنجاح التحول والتزم بالتحسين المستمر",
            "حدد موعد تقييم المتابعة لتتبع التقدم المستمر"
          ] : [
            "Create systems and habits to maintain long-term gains",
            "Identify next development priorities for Days 91-180",
            "Celebrate transformation success and commit to continuous improvement",
            "Schedule follow-up assessment to track continued progress"
          ]
        }
      ]
    }
  ];

  const currentMonth = months[monthNum - 1];

  return (
    <section className="page-section">
      
      {/* Header */}
      <div style={{
        borderBottom: `4px solid ${EXECUTIVE_DESIGN.colors.gold}`,
        paddingBottom: "20px",
        marginBottom: "30px",
      }}>
        <div style={{
          fontSize: "14px",
          color: EXECUTIVE_DESIGN.colors.gold,
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontWeight: 800,
          marginBottom: "10px"
        }}>
          {ar ? "خطة التنفيذ لمدة 90 يوماً" : "90-Day Execution Plan"}
        </div>
        <h1 style={{
          fontSize: "36px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.navy,
          margin: "0 0 15px 0",
          lineHeight: 1.2
        }}>
          {ar ? currentMonth.titleAr : currentMonth.titleEn}
        </h1>
        <p style={{
          fontSize: "18px",
          color: EXECUTIVE_DESIGN.colors.navy,
          margin: 0,
          fontWeight: 600,
          opacity: 0.8
        }}>
          {ar ? currentMonth.focusAr : currentMonth.focusEn}
        </p>
      </div>

      {/* Month Objective */}
      <div style={{
        background: `linear-gradient(135deg, ${EXECUTIVE_DESIGN.colors.navy} 0%, ${EXECUTIVE_DESIGN.colors.blue} 100%)`,
        color: "white",
        padding: "25px",
        borderRadius: "16px",
        marginBottom: "30px",
        border: `3px solid ${EXECUTIVE_DESIGN.colors.gold}`
      }}>
        <h3 style={{
          fontSize: "20px",
          fontWeight: 800,
          color: EXECUTIVE_DESIGN.colors.goldBright,
          margin: "0 0 15px 0",
          textTransform: "uppercase"
        }}>
          {ar ? "هدف الشهر الاستراتيجي" : "Strategic Month Objective"}
        </h3>
        <p style={{
          fontSize: "18px",
          margin: 0,
          lineHeight: 1.7,
          opacity: 0.95
        }}>
          {ar ? currentMonth.objectiveAr : currentMonth.objectiveEn}
        </p>
      </div>

      {/* Weekly Breakdown */}
      <div style={{ display: "grid", gap: "25px", flex: 1 }}>
        {currentMonth.weeks.map((week: any, weekIdx: number) => (
          <div key={weekIdx} className="avoid-break" style={{
            background: "white",
            border: `2px solid ${EXECUTIVE_DESIGN.colors.navy}`,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            
            {/* Week Header */}
            <div style={{
              background: EXECUTIVE_DESIGN.colors.navy,
              color: "white",
              padding: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h4 style={{
                fontSize: "18px",
                fontWeight: 800,
                margin: 0,
                color: EXECUTIVE_DESIGN.colors.goldBright
              }}>
                {week.title}
              </h4>
              <div style={{
                background: EXECUTIVE_DESIGN.colors.gold,
                color: "white",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "16px"
              }}>
                {weekIdx + 1 + (monthNum - 1) * 2}
              </div>
            </div>
            
            {/* Week Tasks (NO BULLETS - Professional Checkmarks) */}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {week.tasks.map((task: string, taskIdx: number) => (
                  <div key={taskIdx} style={{ 
                    display: "flex", 
                    gap: "12px", 
                    alignItems: "flex-start",
                    padding: "12px",
                    background: EXECUTIVE_DESIGN.colors.lightGray,
                    borderRadius: "8px",
                    border: `1px solid ${EXECUTIVE_DESIGN.colors.border}`
                  }}>
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: EXECUTIVE_DESIGN.colors.gold,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: "2px"
                    }}>
                      ✓
                    </div>
                    <p style={{
                      fontSize: "16px",
                      color: EXECUTIVE_DESIGN.colors.navy,
                      margin: 0,
                      lineHeight: 1.6,
                      fontWeight: 500
                    }}>
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Page Footer */}
      <div style={{
        marginTop: "30px",
        paddingTop: "20px",
        borderTop: `1px solid ${EXECUTIVE_DESIGN.colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        color: EXECUTIVE_DESIGN.colors.navy,
        fontWeight: 600
      }}>
        <span>{ar ? "خطة التنفيذ لمدة 90 يوماً" : "90-Day Execution Plan"}</span>
        <span>{ar ? `صفحة ${17 + monthNum} من 25` : `Page ${17 + monthNum} of 25`}</span>
      </div>
    </section>
  );
};

// ============================================================================
// BONUSES PAGE WITH YOUR ACTUAL BONUSES & CLICKABLE LINKS
// ============================================================================
const BonusesPage = ({ ar }: any) => {
  return (
    <section className="page-section">
      
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{
          display: "inline-block",
          background: EXECUTIVE_DESIGN.colors.gold,
          color: "white",
          padding: "15px 40px",
          borderRadius: "30px",
          marginBottom: "25px",
          fontWeight: 900,
          fontSize: "16px",
          textTransform: "uppercase",
          letterSpacing: "1px",
          boxShadow: "0 4px 16px rgba(180, 69, 9, 0.3)"
        }}>
          {ar ? "المكافآت الحصرية" : "Exclusive Bonuses"}
        </div>
        
        <h2 style={{
          fontSize: "40px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.navy,
          marginBottom: "20px",
          lineHeight: 1.1
        }}>
          {ar ? "5 موارد تنفيذية متميزة" : "5 Premium Executive Resources"}
        </h2>
        
        <p style={{
          fontSize: "20px",
          color: EXECUTIVE_DESIGN.colors.navy,
          margin: 0,
          maxWidth: "700px",
          marginLeft: "auto",
          marginRight: "auto",
          opacity: 0.8
        }}>
          {ar
            ? "اضغط على أي مورد للوصول إليه فوراً - جميع الروابط نشطة ومباشرة"
            : "Click on any resource to access it immediately - all links are active and direct"}
        </p>
      </div>

      {/* Bonuses List with Clickable Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: "25px", marginBottom: "40px" }}>
        {BONUSES_CONFIG.map((bonus) => (
          <a
            key={bonus.id}
            href={bonus.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              display: "block",
            }}
          >
            <div className="avoid-break" style={{
              background: bonus.highlight 
                ? EXECUTIVE_DESIGN.colors.cream
                : "white",
              border: bonus.highlight 
                ? `4px solid ${EXECUTIVE_DESIGN.colors.gold}`
                : `2px solid ${EXECUTIVE_DESIGN.colors.border}`,
              padding: "30px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "30px",
              cursor: "pointer",
              boxShadow: bonus.highlight 
                ? "0 12px 32px rgba(180, 69, 9, 0.15)"
                : "0 4px 16px rgba(0,0,0,0.05)",
              transition: "all 0.2s ease"
            }}>
              
              {/* Bonus Number Badge */}
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: bonus.highlight 
                  ? EXECUTIVE_DESIGN.colors.gold 
                  : EXECUTIVE_DESIGN.colors.navy,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: 900,
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
              }}>
                {bonus.id}
              </div>
              
              {/* Bonus Content */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "flex-start", 
                  marginBottom: "12px",
                  gap: "25px"
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: 900,
                    color: EXECUTIVE_DESIGN.colors.navy,
                    flex: 1,
                    lineHeight: 1.2
                  }}>
                    {ar ? bonus.titleAr : bonus.titleEn}
                  </h3>
                  <span style={{
                    background: bonus.highlight 
                      ? EXECUTIVE_DESIGN.colors.gold 
                      : EXECUTIVE_DESIGN.colors.lightGray,
                    color: bonus.highlight 
                      ? "white" 
                      : EXECUTIVE_DESIGN.colors.navy,
                    padding: "8px 20px",
                    borderRadius: "25px",
                    fontSize: "16px",
                    fontWeight: 900,
                    whiteSpace: "nowrap"
                  }}>
                    ${bonus.value}
                  </span>
                </div>
                
                <p style={{
                  margin: 0,
                  fontSize: "18px",
                  color: EXECUTIVE_DESIGN.colors.navy,
                  lineHeight: 1.6,
                  fontWeight: 500
                }}>
                  {ar ? bonus.descAr : bonus.descEn}
                </p>
                
                {bonus.highlight && (
                  <div style={{
                    marginTop: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: EXECUTIVE_DESIGN.colors.gold,
                    fontSize: "16px",
                    fontWeight: 800
                  }}>
                    <span style={{ fontSize: "20px" }}>⭐</span>
                    <span>
                      {ar ? "الأعلى قيمة - اضغط للوصول الفوري" : "Highest Value - Click for Instant Access"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Total Value Summary */}
      <div className="avoid-break" style={{
        padding: "35px",
        background: EXECUTIVE_DESIGN.colors.strengthBg,
        border: `4px solid ${EXECUTIVE_DESIGN.colors.strength}`,
        borderRadius: "20px",
        textAlign: "center"
      }}>
        <h3 style={{
          fontSize: "32px",
          fontWeight: 900,
          color: EXECUTIVE_DESIGN.colors.strength,
          margin: "0 0 15px 0"
        }}>
          {ar ? `إجمالي القيمة المضافة: $${TOTAL_BONUS_VALUE.toLocaleString()}` : `Total Added Value: $${TOTAL_BONUS_VALUE.toLocaleString()}`}
        </h3>
        <p style={{
          fontSize: "18px",
          color: EXECUTIVE_DESIGN.colors.navy,
          margin: 0,
          fontWeight: 700
        }}>
          {ar
            ? "جميع هذه الموارد مضمنة مع تقريرك التنفيذي - استثمار استراتيجي حقيقي!"
            : "All these resources included with your executive report - genuine strategic investment!"}
        </p>
      </div>
    </section>
  );
};

// ============================================================================
// MAIN EXPORT - ERROR-FREE SERVER COMPONENT
// ============================================================================
export default async function PdfMriReportPage({ params, searchParams }: any) {
  const attemptId = (params.attemptId || "").trim();
  const lang = (searchParams?.lang || "en").toLowerCase() === "ar" ? "ar" : "en";
  const ar = lang === "ar";

  const supabase = getSupabaseAdmin();

  // Load attempt data
  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptErr) throw new Error(`Failed to load attempt: ${attemptErr.message}`);
  if (!attempt) return <div style={{ padding: 32 }}>Attempt not found.</div>;

  const assessmentId = (attempt as any).assessment_id as string | null;
  if (!assessmentId) return <div style={{ padding: 32 }}>Missing assessment_id.</div>;

  // Load assessment config
  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .select("id, config")
    .eq("id", assessmentId)
    .maybeSingle();

  if (assessErr) throw new Error(`Failed to load assessment config: ${assessErr.message}`);

  // Parse config safely
  let config: any = {};
  try {
    const rawConfig = (assessment as any)?.config;
    if (typeof rawConfig === "string") {
      config = JSON.parse(rawConfig);
    } else if (rawConfig && typeof rawConfig === "object") {
      config = rawConfig;
    }
  } catch (e) {
    console.error("CONFIG JSON PARSE FAILED", e);
    config = {};
  }

  // Build competency data
  const scores = (attempt as any).competency_scores || [];
  const catalog = Array.isArray(config?.model?.competencies) ? config.model.competencies : [];
  const titleById = new Map<string, { en?: string; ar?: string }>();
  for (const c of catalog) titleById.set(c.id, c.title || {});
  
  // Sort competencies by score (weakest first for development focus)
  const sortedScores = [...scores].sort((a: any, b: any) => (a.percentage ?? 0) - (b.percentage ?? 0));

  // Map scores to full competency data
  const competenciesWithData = sortedScores.map((s: any) => {
    const comp = catalog.find((c: any) => c.id === s.competencyId);
    return { 
      score: s, 
      competency: comp || { 
        id: s.competencyId, 
        title: { en: s.competencyId, ar: s.competencyId } 
      } 
    };
  });

  return (
    <>
      <ExecutiveStyles />
      <PDFDownloadLink attemptId={attemptId} lang={lang} ar={ar} />
      
      <div
        dir={ar ? "rtl" : "ltr"}
        style={{
          fontFamily: ar 
            ? '"Cairo", "IBM Plex Sans Arabic", system-ui, sans-serif' 
            : '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          color: EXECUTIVE_DESIGN.colors.navy,
          backgroundColor: EXECUTIVE_DESIGN.colors.white,
          lineHeight: 1.6
        }}
      >
        {/* Page 1: High Contrast Cover with Prominent Date & Email */}
        <CoverPage attempt={attempt} config={config} ar={ar} />
        
        {/* Page 2: SWOT 4-Quadrant Matrix */}
        <SwotMatrixPage scores={scores} titleById={titleById} config={config} ar={ar} />
        
        {/* Pages 3-17+: Full-Page Competency Analysis */}
        {competenciesWithData.map((data: any, index: number) => (
          <CompetencyPage
            key={data.score.competencyId}
            data={data}
            config={config}
            ar={ar}
            pageNum={index + 3}
          />
        ))}
        
        {/* Pages 18-20: 90-Day Execution Plan (3 months) */}
        {[1, 2, 3].map((monthNum) => (
          <NinetyDayPlanPage
            key={monthNum}
            scores={scores}
            titleById={titleById}
            config={config}
            ar={ar}
            monthNum={monthNum}
          />
        ))}
        
        {/* Final Page: Your Premium Bonuses */}
        <BonusesPage ar={ar} />
      </div>
    </>
  );
}
