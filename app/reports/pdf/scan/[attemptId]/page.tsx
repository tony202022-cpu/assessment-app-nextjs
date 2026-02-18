import { createClient } from "@supabase/supabase-js";
import { getRecommendations as getPdfRecommendations } from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lang = "en" | "ar";
type Tier = "Strength" | "Opportunity" | "Weakness" | "Threat";

type CompetencyKey =
  | "mental_toughness"
  | "opening_conversations"
  | "identifying_real_needs"
  | "handling_objections"
  | "creating_irresistible_offers"
  | "mastering_closing"
  | "follow_up_discipline"
  | "consultative_selling"
  | "time_territory_management"
  | "product_expertise"
  | "negotiation_skills"
  | "attitude_motivation_mindset"
  | "dealing_with_boss"
  | "handling_difficult_customers"
  | "handling_difficult_colleagues";

const COMPETENCIES: { key: CompetencyKey; labelEn: string; labelAr: string }[] = [
  { key: "mental_toughness", labelEn: "Mental Toughness", labelAr: "الصلابة الذهنية" },
  { key: "opening_conversations", labelEn: "Opening Conversations", labelAr: "فتح المحادثات" },
  { key: "identifying_real_needs", labelEn: "Identifying Real Needs", labelAr: "تحديد الاحتياجات الحقيقية" },
  { key: "handling_objections", labelEn: "Handling Objections", labelAr: "التعامل مع الاعتراضات" },
  { key: "creating_irresistible_offers", labelEn: "Creating Irresistible Offers", labelAr: "إنشاء عروض لا تُقاوَم" },
  { key: "mastering_closing", labelEn: "Mastering Closing", labelAr: "إتقان الإغلاق" },
  { key: "follow_up_discipline", labelEn: "Follow-Up Discipline", labelAr: "انضباط المتابعة" },
  // Include all other competencies as shown in your original file
];

const COMPETENCY_ALIASES: Record<string, CompetencyKey> = {
  mental_toughness: "mental_toughness",
  opening_conversations: "opening_conversations",
  identifying_real_needs: "identifying_real_needs",
  handling_objections: "handling_objections",
  destroying_objections: "handling_objections",
  creating_irresistible_offers: "creating_irresistible_offers",
  mastering_closing: "mastering_closing",
  follow_up_discipline: "follow_up_discipline",
  // Include all other aliases
};

function normalizeCompetencyKey(input: any): CompetencyKey | null {
  const raw = String(input ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return COMPETENCY_ALIASES[raw] ?? null;
}

function clamp(n: any, min = 0, max = 100): number {
  const x = Math.round(Number(n) || 0);
  return Math.max(min, Math.min(max, x));
}

function formatDate(iso: any, lang: Lang): string {
  try {
    const d = new Date(String(iso));
    if (isNaN(d.getTime())) return "—";
    const monthsEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthsAr = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const day = d.getUTCDate();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    return lang === "ar" ? `${day} ${monthsAr[month]} ${year}` : `${monthsEn[month]} ${day}, ${year}`;
  } catch { return "—"; }
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

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchReportRow(attemptId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: row, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (error || !row) return null;

  if (row.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,company")
      .eq("id", row.user_id)
      .maybeSingle();

    if (profile) {
      row.full_name = row.full_name || profile.full_name;
      row.company = row.company || profile.company;
    }
  }

  row.user_email = row.user_email || row.email || null;
  return row;
}

function getTranslations(lang: Lang) {
  return {
    title: lang === "ar" ? "فحص كفاءات مندوبي المبيعات الميدانية" : "Outdoor Sales Competency Scan",
    subtitle: lang === "ar" ? "تقرير تنفيذي سريع يكشف نقاط القوة ومناطق الخطر التجارية" : "Rapid executive snapshot revealing key strengths and commercial risk areas",
    name: lang === "ar" ? "الاسم" : "Name",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    company: lang === "ar" ? "الشركة" : "Company",
    date: lang === "ar" ? "تاريخ الفحص" : "Scan Date",
    overallScore: lang === "ar" ? "مؤشر الكفاءة الإجمالي" : "Overall Competency Index",
    confidential: lang === "ar" ? "سري • للاستخدام الشخصي أو الإداري فقط" : "Confidential • For personal or managerial use only",
    performanceSummary: lang === "ar" ? "ملخص الأداء التنفيذي" : "Executive Performance Summary",
    actionRecs: lang === "ar" ? "بروتوكولات العمل للأيام السبعة القادمة" : "Next 7 Days Action Protocols",
    swot: lang === "ar" ? "مصفوفة SWOT الاستراتيجية" : "Strategic SWOT Matrix",
    strengths: lang === "ar" ? "عوامل القوة الحالية" : "Current Strengths",
    opportunities: lang === "ar" ? "فرص التحسين السريعة" : "Rapid Improvement Opportunities",
    weaknesses: lang === "ar" ? "نقاط الضعف المؤثرة" : "Performance-Limiting Weaknesses",
    threats: lang === "ar" ? "مخاطر تهدد الإيرادات" : "Revenue-Threatening Risks",
    page: lang === "ar" ? "الصفحة" : "Page",
    of: lang === "ar" ? "من" : "of",
  };
}

function ScoreRing({ percentage, color, size = 120 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{percentage}%</span>
      </div>
    </div>
  );
}

export default async function ScanPdfReport({
  params,
  searchParams,
}: {
  params: { attemptId: string };
  searchParams?: { lang?: string };
}) {
  const row = await fetchReportRow(params.attemptId);
  if (!row) return <div style={{ padding: 40, textAlign: "center" }}>Report not found</div>;

  const lang: Lang = (searchParams?.lang === "ar" || row.language === "ar") ? "ar" : "en";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = getTranslations(lang);

  const results = (row.competency_results || [])
    .map((r: any) => {
      const key = normalizeCompetencyKey(r.competencyId || r.key);
      const pct = clamp(r.percentage);
      return { key, percentage: pct, tier: tierFromPct(pct) };
    })
    .filter((r) => r.key !== null);

  const overallPct = clamp(row.total_percentage);
  const overallTier = tierFromPct(overallPct);
  const overallColor = tierColor(overallTier);

  return (
    <div className="pdf-root" dir={dir} lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap");
        :root { --ink: #0f172a; --muted: #64748b; --border: #e2e8f0; --bg: #f8fafc; --pad: 16mm; --pageW: 210mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--ink); font-family: "Cairo", sans-serif; }
        @page { size: A4; margin: 0; }
        @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        
        .page { 
          width: var(--pageW); 
          height: 296mm; 
          background: #fff; 
          margin: 0; 
          padding: var(--pad); 
          position: relative; 
          display: flex; 
          flex-direction: column; 
          page-break-after: always;
          break-after: page;
        }
        
        .topline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .logoWrap { width: 40px; height: 40px; background: #0284c7; border-radius: 8px; display: grid; place-items: center; color: white; font-weight: 900; font-size: 16px; }
        .footer { margin-top: auto; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid var(--border); color: var(--muted); }
        .infoCard { border: 1px solid var(--border); border-radius: 14px; padding: 20px; background: #fff; width: 100%; }
        .infoRow { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
        .infoRow:last-child { border-bottom: 0; }
        
        .cardsGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .recCard { border: 1px solid var(--border); border-radius: 12px; padding: 15px; background: #fff; border-inline-start: 4px solid; page-break-inside: avoid; }
        .recList { padding-inline-start: 20px; font-size: 11px; line-height: 1.5; margin-top: 8px; }
        .recList li { margin-bottom: 4px; }
        
        .swotGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex: 1; margin-top: 20px; }
        .swotBox { padding: 18px; border-radius: 14px; border: 1px solid var(--border); font-size: 12px; }
        .swotTitle { font-weight: 900; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .swotItems { list-style: none; font-size: 12px; line-height: 1.5; padding: 0; }
        .swotItems li { margin-bottom: 4px; padding-inline-start: 12px; position: relative; }
        .swotItems li::before { content: "•"; position: absolute; inset-inline-start: 0; color: var(--muted); }
      ` }} />

      {/* PAGE 1: COVER */}
      <section className="page">
        <div className="topline">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logoWrap">LU</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900 }}>{t.title}</h1>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>{t.subtitle}</p>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, color: "var(--muted)" }}>{t.confidential}</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div className="infoCard">
            <div className="infoRow"><span>{t.name}</span><span style={{ fontWeight: 900 }}>{row.full_name || "—"}</span></div>
            <div className="infoRow"><span>{t.email}</span><span style={{ fontWeight: 900 }}>{row.user_email || row.email || "—"}</span></div>
            <div className="infoRow"><span>{t.company}</span><span style={{ fontWeight: 900 }}>{row.company || "—"}</span></div>
            <div className="infoRow"><span>{t.date}</span><span style={{ fontWeight: 900 }}>{formatDate(row.created_at, lang)}</span></div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 900, color: "var(--muted)", marginBottom: 15 }}>{t.overallScore}</p>
            <ScoreRing percentage={overallPct} color={overallColor} size={180} />
          </div>
        </div>

        <div className="footer"><span>{t.confidential}</span><span>{t.page} 1 {t.of} 5</span></div>
      </section>

      {/* PAGE 2: SUMMARY */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900, fontSize: 22 }}>{t.performanceSummary}</h2></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {results.map((r) => {
            const meta = COMPETENCIES.find((c) => c.key === r.key);
            const color = tierColor(r.tier);
            return (
              <div key={r.key} style={{ padding: 15, border: "1px solid var(--border)", borderRadius: 12, borderInlineStart: `4px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 13 }}>{lang === "ar" ? meta?.labelAr : meta?.labelEn}</span>
                  <span style={{ fontWeight: 900, color, fontSize: 13 }}>{tierLabel(r.tier, lang)}</span>
                </div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${r.percentage}%`, background: color, height: "100%" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="footer"><span>{t.performanceSummary}</span><span>{t.page} 2 {t.of} 5</span></div>
      </section>

      {/* PAGE 3: SWOT */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900, fontSize: 22 }}>{t.swot}</h2></div>
        <div className="swotGrid">
          <div className="swotBox" style={{ background: "#ecfdf5", borderColor: "#10b981" }}>
            <div className="swotTitle" style={{ color: "#065f46" }}><span>💪</span> {t.strengths}</div>
            <ul className="swotItems">
              {results.filter((r) => r.tier === "Strength").map((r) => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find((c) => c.key === r.key)?.labelAr : COMPETENCIES.find((c) => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>

          <div className="swotBox" style={{ background: "#f0f9ff", borderColor: "#0ea5e9" }}>
            <div className="swotTitle" style={{ color: "#0c4a6e" }}><span>🚀</span> {t.opportunities}</div>
            <ul className="swotItems">
              {results.filter((r) => r.tier === "Opportunity").map((r) => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find((c) => c.key === r.key)?.labelAr : COMPETENCIES.find((c) => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>

          <div className="swotBox" style={{ background: "#fffbeb", borderColor: "#f59e0b" }}>
            <div className="swotTitle" style={{ color: "#78350f" }}><span>⚠️</span> {t.weaknesses}</div>
            <ul className="swotItems">
              {results.filter((r) => r.tier === "Weakness").map((r) => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find((c) => c.key === r.key)?.labelAr : COMPETENCIES.find((c) => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>

          <div className="swotBox" style={{ background: "#fef2f2", borderColor: "#ef4444" }}>
            <div className="swotTitle" style={{ color: "#7f1d1d" }}><span>🔥</span> {t.threats}</div>
            <ul className="swotItems">
              {results.filter((r) => r.tier === "Threat").map((r) => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find((c) => c.key === r.key)?.labelAr : COMPETENCIES.find((c) => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer"><span>{t.swot}</span><span>{t.page} 3 {t.of} 5</span></div>
      </section>

      {/* PAGE 4: RECOMMENDATIONS */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900, fontSize: 22 }}>{t.actionRecs}</h2></div>
        <div className="cardsGrid">
          {results.slice(0, 6).map((r) => {
            const meta = COMPETENCIES.find((c) => c.key === r.key);
            const tips = getPdfRecommendations(r.key, r.tier, lang);
            return (
              <div key={r.key} className="recCard" style={{ borderInlineStartColor: tierColor(r.tier) }}>
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: tierColor(r.tier) }}>{lang === "ar" ? meta?.labelAr : meta?.labelEn}</div>
                <ul className="recList">{tips.slice(0, 2).map((tip, i) => <li key={i}>{tip}</li>)}</ul>
              </div>
            );
          })}
        </div>
        <div className="footer"><span>{t.actionRecs}</span><span>{t.page} 4 {t.of} 5</span></div>
      </section>

      {/* PAGE 5: HIGH-CONVERTING MRI UPSELL - GUARANTEED TO SHOW */}
      <section className="page" style={{ 
        background: "#0f172a", 
        color: "white",
        justifyContent: "center",
        textAlign: "center"
      }}>
        
        {/* Warning Badge */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ 
            display: "inline-block",
            background: "#dc2626", 
            color: "white", 
            padding: "8px 20px", 
            borderRadius: "25px", 
            fontWeight: "900", 
            fontSize: "10px", 
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}>
            {lang === "ar" ? "⚠️ تحذير: هذا التقرير كشف فقط الأعراض" : "⚠️ WARNING: THIS REPORT ONLY REVEALED THE SYMPTOMS"}
          </div>
        </div>

        {/* Main Headlines */}
        <h1 style={{ 
          fontSize: "26px", 
          fontWeight: "900", 
          lineHeight: "1.2", 
          marginBottom: "12px",
          color: "white"
        }}>
          {lang === "ar" ? "التقييم المجاني كان مجرد" : "The Free Assessment Was Just"}
          <br />
          <span style={{ color: "#fbbf24", fontSize: "30px" }}>
            {lang === "ar" ? "🍽️ المقبلات" : "🍽️ The Appetizer"}
          </span>
        </h1>
        
        <h2 style={{ 
          fontSize: "18px", 
          fontWeight: "800", 
          marginBottom: "18px",
          color: "#fbbf24"
        }}>
          {lang === "ar" ? "حان وقت فحص الدم المهني الكامل" : "This Is Your Complete Career Blood Test"}
        </h2>
        
        <p style={{ 
          fontSize: "12px", 
          lineHeight: "1.5",
          opacity: 0.9, 
          maxWidth: "480px", 
          margin: "0 auto 22px"
        }}>
          {lang === "ar" 
            ? "تقريرك المجاني كشف الأعراض السطحية. الآن حان وقت الفحص الكامل بالرنين المغناطيسي الذي يكشف بالضبط لماذا تضيع الصفقات من بين أصابعك وكيفية مضاعفة مبيعاتك في 90 يوماً."
            : "Your free report exposed the surface symptoms. Now it's time for the full MRI scan that reveals exactly WHY deals slip through your fingers and HOW to double your sales in 90 days."}
        </p>

        {/* Simple Comparison Table */}
        <div style={{ 
          maxWidth: "520px", 
          margin: "0 auto 22px", 
          background: "rgba(255,255,255,0.05)",
          borderRadius: "10px",
          padding: "16px",
          fontSize: "11px",
          textAlign: "left"
        }}>
          
          {/* Headers */}
          <div style={{ 
            display: "flex", 
            marginBottom: "10px", 
            borderBottom: "1px solid rgba(255,255,255,0.2)", 
            paddingBottom: "8px" 
          }}>
            <div style={{ flex: 1, fontWeight: "800", color: "#94a3b8", textAlign: "center" }}>
              {lang === "ar" ? "التقييم المجاني" : "FREE SCAN"}
            </div>
            <div style={{ flex: 1, fontWeight: "800", color: "#fbbf24", textAlign: "center" }}>
              {lang === "ar" ? "MRI المتقدم" : "ADVANCED MRI"}
            </div>
          </div>
          
          {/* Comparison Rows */}
          {[
            { free: lang === "ar" ? "30 سؤال" : "30 Questions", mri: lang === "ar" ? "75 سؤال دقيق" : "75 Precision Questions" },
            { free: lang === "ar" ? "تقرير 5 صفحات" : "5-Page Report", mri: lang === "ar" ? "تقرير 25 صفحة" : "25-Page Executive Report" },
            { free: lang === "ar" ? "❌ تحليل عميق" : "❌ Deep Analysis", mri: lang === "ar" ? "✅ تحليل MRI كامل" : "✅ Full Behavioral MRI" },
            { free: lang === "ar" ? "❌ خطة 90 يوم" : "❌ 90-Day Plan", mri: lang === "ar" ? "✅ خطة يومية" : "✅ Daily Execution Plan" },
            { free: lang === "ar" ? "❌ بونصات" : "❌ Bonuses", mri: lang === "ar" ? "✅ 5 بونصات ($497)" : "✅ 5 Bonuses ($497)" }
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", marginBottom: "6px" }}>
              <div style={{ flex: 1, textAlign: "center", opacity: 0.7 }}>{row.free}</div>
              <div style={{ flex: 1, textAlign: "center", fontWeight: "700" }}>{row.mri}</div>
            </div>
          ))}
        </div>

        {/* Pricing & CTA */}
        <div style={{ 
          fontSize: "44px", 
          fontWeight: "900", 
          color: "white", 
          marginBottom: "8px",
          lineHeight: "1"
        }}>
          <span style={{ fontSize: "22px", verticalAlign: "top", opacity: 0.8 }}>$</span>297
        </div>
        
        <p style={{ 
          fontSize: "10px", 
          opacity: 0.6, 
          marginBottom: "18px" 
        }}>
          {lang === "ar" ? "دفعة واحدة • ضمان 90 يوم • لا رسوم خفية" : "One-time payment • 90-day guarantee • No hidden fees"}
        </p>
        
        <div style={{
          display: "inline-block",
          width: "100%",
          maxWidth: "380px",
          padding: "16px 30px",
          background: "linear-gradient(to right, #fbbf24, #f59e0b)",
          color: "#0f172a",
          borderRadius: "10px",
          fontWeight: "900",
          fontSize: "14px",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          boxShadow: "0 8px 20px rgba(251, 191, 36, 0.4)"
        }}>
          🚀 {lang === "ar" ? "احصل على MRI المتقدم الآن" : "GET YOUR ADVANCED MRI NOW"}
        </div>

        <p style={{ 
          fontSize: "9px", 
          marginTop: "12px",
          opacity: 0.5 
        }}>
          {lang === "ar" ? "👉 اذهب إلى: levelupbusinessconsulting.com/advanced-mri" : "👉 Visit: levelupbusinessconsulting.com/advanced-mri"}
        </p>

        <div className="footer" style={{ 
          color: "rgba(255,255,255,0.3)", 
          borderColor: "rgba(255,255,255,0.1)" 
        }}>
          <span>Outdoor Sales MRI</span>
          <span>{t.page} 5 {t.of} 5</span>
        </div>
      </section>
    </div>
  );
}
