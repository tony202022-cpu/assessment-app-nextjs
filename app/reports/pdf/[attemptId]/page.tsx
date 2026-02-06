// app/reports/pdf/[attemptId]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { getRecommendations as getPdfRecommendations } from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// TYPES
// ============================================================================

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

type CompetencyResult = {
  key: CompetencyKey;
  percentage: number;
  tier: Tier;
  recommendations?: string[];
};

type ReportRow = {
  id: string;
  user_id?: string | null;
  assessment_id?: string | null;
  created_at?: string | null;
  language?: string | null;
  total_percentage?: number | null;
  competency_results?: any[] | null;
  swot_analysis?: any | null;
  full_name?: string | null;
  name?: string | null;
  company?: string | null;
  user_email?: string | null;
  email?: string | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPETENCIES: { key: CompetencyKey; labelEn: string; labelAr: string }[] = [
  { key: "mental_toughness", labelEn: "Mental Toughness", labelAr: "الصلابة الذهنية" },
  { key: "opening_conversations", labelEn: "Opening Conversations", labelAr: "فتح المحادثات" },
  { key: "identifying_real_needs", labelEn: "Identifying Real Needs", labelAr: "تحديد الاحتياجات الحقيقية" },
  { key: "handling_objections", labelEn: "Handling Objections", labelAr: "التعامل مع الاعتراضات" },
  { key: "creating_irresistible_offers", labelEn: "Creating Irresistible Offers", labelAr: "إنشاء عروض لا تُقاوَم" },
  { key: "mastering_closing", labelEn: "Mastering Closing", labelAr: "إتقان الإغلاق" },
  { key: "follow_up_discipline", labelEn: "Follow-Up Discipline", labelAr: "انضباط المتابعة" },
  { key: "consultative_selling", labelEn: "Consultative Selling", labelAr: "المبيعات الاستشارية" },
  { key: "time_territory_management", labelEn: "Time & Territory Management", labelAr: "إدارة الوقت والمنطقة" },
  { key: "product_expertise", labelEn: "Product Expertise", labelAr: "الخبرة في المنتج" },
  { key: "negotiation_skills", labelEn: "Negotiation Skills", labelAr: "مهارات التفاوض" },
  { key: "attitude_motivation_mindset", labelEn: "Attitude & Motivation", labelAr: "عقلية التحفيز والموقف" },
  { key: "dealing_with_boss", labelEn: "Dealing with Boss", labelAr: "التعامل مع المدير" },
  { key: "handling_difficult_customers", labelEn: "Difficult Customers", labelAr: "التعامل مع العملاء الصعبين" },
  { key: "handling_difficult_colleagues", labelEn: "Difficult Colleagues", labelAr: "التعامل مع الزملاء الصعبين" },
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
  consultative_selling: "consultative_selling",
  time_territory_management: "time_territory_management",
  product_expertise: "product_expertise",
  negotiation_skills: "negotiation_skills",
  attitude_motivation_mindset: "attitude_motivation_mindset",
  dealing_with_boss: "dealing_with_boss",
  handling_difficult_customers: "handling_difficult_customers",
  handling_difficult_colleagues: "handling_difficult_colleagues",
};

// Registration CTA (Page 4)
const REGISTER_URL = "https://www.levelupbusinessconsulting.com/advanced-mri";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
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

async function fetchReportRow(attemptId: string): Promise<ReportRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data: row } = await supabase.from("quiz_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (row && row.user_id) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", row.user_id).maybeSingle();
    if (profile) {
      row.full_name = row.full_name || profile.full_name;
      row.company = row.company || profile.company;
    }
  }
  return row as ReportRow;
}

function getTranslations(lang: Lang) {
  return {
    title: lang === "ar" ? "تقرير تقييم المبيعات" : "Sales Assessment Report",
    subtitle: lang === "ar" ? "تحليل الكفاءات الميدانية" : "Field Competency Analysis",
    name: lang === "ar" ? "الاسم" : "Name",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    company: lang === "ar" ? "الشركة" : "Company",
    date: lang === "ar" ? "التاريخ" : "Date",
    overallScore: lang === "ar" ? "النتيجة الإجمالية" : "Overall Score",
    confidential: lang === "ar" ? "سري" : "Confidential",
    performanceSummary: lang === "ar" ? "ملخص الأداء" : "Performance Summary",
    actionRecs: lang === "ar" ? "توصيات عملية" : "Action Plan",
    swot: lang === "ar" ? "تحليل SWOT" : "SWOT Analysis",
    strengths: lang === "ar" ? "القوة" : "Strengths",
    opportunities: lang === "ar" ? "الفرص" : "Opportunities",
    weaknesses: lang === "ar" ? "الضعف" : "Weaknesses",
    threats: lang === "ar" ? "التهديدات" : "Threats",
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
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{percentage}%</span>
      </div>
    </div>
  );
}

export default async function Page({ params, searchParams }: { params: { attemptId: string }; searchParams?: { lang?: string } }) {
  const row = await fetchReportRow(params.attemptId);
  if (!row) return <div style={{ padding: 40, textAlign: "center" }}>Report not found</div>;

  const lang: Lang = (searchParams?.lang === "ar" || row.language === "ar") ? "ar" : "en";
  const t = getTranslations(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const results: CompetencyResult[] = (row.competency_results || []).map((r: any) => {
    const key = normalizeCompetencyKey(r.competencyId || r.key);
    const pct = clamp(r.percentage);
    return { key, percentage: pct, tier: tierFromPct(pct) };
  }).filter(r => r.key !== null) as CompetencyResult[];

  const overallPct = clamp(row.total_percentage);
  const overallTier = tierFromPct(overallPct);
  const overallColor = tierColor(overallTier);

  const showUpsell = row.assessment_id !== "mri";
  const totalPages = showUpsell ? 5 : 4;

  return (
    <div className="pdf-root" dir={dir} lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap");
        :root { --ink: #0f172a; --muted: #64748b; --border: #e2e8f0; --bg: #f8fafc; --pad: 16mm; --pageW: 210mm; --radius: 12px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--ink); font-family: "Cairo", sans-serif; }
        @page { size: A4; margin: 0; }
        .page { width: var(--pageW); height: 296mm; background: #fff; margin: 0 auto 10px; padding: var(--pad); border-radius: var(--radius); position: relative; display: flex; flex-direction: column; page-break-after: always; }
        .topline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .logoWrap { width: 40px; height: 40px; background: #0284c7; border-radius: 8px; display: grid; place-items: center; color: white; font-weight: 900; }
        .footer { margin-top: auto; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid var(--border); color: var(--muted); }
        .infoCard { border: 1px solid var(--border); border-radius: 14px; padding: 20px; background: #fff; width: 100%; }
        .infoRow { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
        .infoRow:last-child { border-bottom: 0; }
        .cardsGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .recCard { border: 1px solid var(--border); border-radius: 12px; padding: 15px; background: #fff; border-inline-start: 4px solid; }
        .recList { padding-inline-start: 20px; font-size: 12px; line-height: 1.6; margin-top: 10px; }
        .recList li { margin-bottom: 5px; }
        .swotGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex: 1; margin-top: 20px; }
        .swotBox { padding: 20px; border-radius: 16px; border: 1px solid var(--border); }
        .swotTitle { font-weight: 900; font-size: 18px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .swotItems { list-style: none; font-size: 13px; line-height: 1.6; }
        .swotItems li { margin-bottom: 6px; padding-inline-start: 12px; position: relative; }
        .swotItems li::before { content: "•"; position: absolute; inset-inline-start: 0; color: var(--muted); }
      `}} />

      {/* PAGE 1: COVER */}
      <section className="page">
        <div className="topline">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logoWrap">LU</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900 }}>{t.title}</h1>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t.subtitle}</p>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--muted)' }}>{t.confidential}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <div className="infoCard">
            <div className="infoRow"><span>{t.name}</span><span style={{ fontWeight: 900 }}>{row.full_name || "—"}</span></div>
            <div className="infoRow"><span>{t.email}</span><span style={{ fontWeight: 900 }}>{row.user_email || row.email || "—"}</span></div>
            <div className="infoRow"><span>{t.company}</span><span style={{ fontWeight: 900 }}>{row.company || "—"}</span></div>
            <div className="infoRow"><span>{t.date}</span><span style={{ fontWeight: 900 }}>{formatDate(row.created_at, lang)}</span></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 900, color: 'var(--muted)', marginBottom: 15 }}>{t.overallScore}</p>
            <ScoreRing percentage={overallPct} color={overallColor} size={180} />
          </div>
        </div>
        <div className="footer"><span>{t.confidential}</span><span>{t.page} 1 {t.of} {totalPages}</span></div>
      </section>

      {/* PAGE 2: SUMMARY */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900 }}>{t.performanceSummary}</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map(r => {
            const meta = COMPETENCIES.find(c => c.key === r.key);
            const color = tierColor(r.tier);
            return (
              <div key={r.key} style={{ padding: 15, border: '1px solid var(--border)', borderRadius: 12, borderInlineStart: `4px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 900 }}>{lang === "ar" ? meta?.labelAr : meta?.labelEn}</span>
                  <span style={{ fontWeight: 900, color }}>{tierLabel(r.tier, lang)}</span>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${r.percentage}%`, background: color, height: '100%' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="footer"><span>{t.performanceSummary}</span><span>{t.page} 2 {t.of} {totalPages}</span></div>
      </section>

      {/* PAGE 3: SWOT */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900 }}>{t.swot}</h2></div>
        <div className="swotGrid">
          <div className="swotBox" style={{ background: '#ecfdf5', borderColor: '#10b981' }}>
            <div className="swotTitle" style={{ color: '#065f46' }}><span>💪</span> {t.strengths}</div>
            <ul className="swotItems">
              {results.filter(r => r.tier === "Strength").map(r => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find(c => c.key === r.key)?.labelAr : COMPETENCIES.find(c => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>
          <div className="swotBox" style={{ background: '#f0f9ff', borderColor: '#0ea5e9' }}>
            <div className="swotTitle" style={{ color: '#0c4a6e' }}><span>🚀</span> {t.opportunities}</div>
            <ul className="swotItems">
              {results.filter(r => r.tier === "Opportunity").map(r => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find(c => c.key === r.key)?.labelAr : COMPETENCIES.find(c => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>
          <div className="swotBox" style={{ background: '#fffbeb', borderColor: '#f59e0b' }}>
            <div className="swotTitle" style={{ color: '#78350f' }}><span>⚠️</span> {t.weaknesses}</div>
            <ul className="swotItems">
              {results.filter(r => r.tier === "Weakness").map(r => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find(c => c.key === r.key)?.labelAr : COMPETENCIES.find(c => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>
          <div className="swotBox" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <div className="swotTitle" style={{ color: '#7f1d1d' }}><span>🔥</span> {t.threats}</div>
            <ul className="swotItems">
              {results.filter(r => r.tier === "Threat").map(r => (
                <li key={r.key}>{lang === "ar" ? COMPETENCIES.find(c => c.key === r.key)?.labelAr : COMPETENCIES.find(c => c.key === r.key)?.labelEn}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer"><span>{t.swot}</span><span>{t.page} 3 {t.of} {totalPages}</span></div>
      </section>

      {/* PAGE 4: RECOMMENDATIONS */}
      <section className="page">
        <div className="topline"><h2 style={{ fontWeight: 900 }}>{t.actionRecs}</h2></div>
        <div className="cardsGrid">
          {results.slice(0, 6).map(r => {
            const meta = COMPETENCIES.find(c => c.key === r.key);
            const tips = getPdfRecommendations(r.key, r.tier, lang);
            return (
              <div key={r.key} className="recCard" style={{ borderInlineStartColor: tierColor(r.tier) }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{lang === "ar" ? meta?.labelAr : meta?.labelEn}</div>
                <ul className="recList">{tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
              </div>
            );
          })}
        </div>
        <div className="footer"><span>{t.actionRecs}</span><span>{t.page} 4 {t.of} {totalPages}</span></div>
      </section>

      {/* PAGE 5: UPSELL */}
      {showUpsell && (
        <section className="page" style={{ background: '#0f172a', color: 'white' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 30 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900 }}>{lang === "ar" ? "هل تريد التحول الكامل؟" : "Want Complete Transformation?"}</h2>
            <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 500 }}>{lang === "ar" ? "التقييم المجاني كشف الأعراض. الآن حان وقت الفحص الكامل بالرنين المغناطيسي." : "The free assessment exposed the symptoms. Now it's time for the full MRI scan."}</p>
            <a href={REGISTER_URL} style={{ background: '#0284c7', color: 'white', padding: '16px 40px', borderRadius: 12, fontWeight: 900, textDecoration: 'none', fontSize: 18 }}>{lang === "ar" ? "احصل على التقييم المتقدم الآن" : "GET ADVANCED MRI NOW"}</a>
          </div>
          <div className="footer" style={{ borderColor: 'rgba(255,255,255,0.1)' }}><span>OutdoorSalesMRI</span><span>{t.page} 5 {t.of} 5</span></div>
        </section>
      )}
    </div>
  );
}