import { createClient } from "@supabase/supabase-js";
import { getRecommendations as getPdfRecommendations } from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ======================================================
// OUTDOOR SALES SCAN PDF REPORT
// Safe full-file replacement.
// Does not touch Supabase schema, quiz logic, scoring, login, timer, or randomization.
// ======================================================

const MRI_CHECKOUT_URL = "PASTE_NEW_ZENLER_MRI_LINK_HERE";
const MRI_REGULAR_PRICE = 297;
const MRI_LAUNCH_PRICE = 149;

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

  "mental toughness": "mental_toughness",
  "opening conversations": "opening_conversations",
  "identifying real needs": "identifying_real_needs",
  "handling objections": "handling_objections",
  "destroying objections": "handling_objections",
  "creating irresistible offers": "creating_irresistible_offers",
  "mastering closing": "mastering_closing",
  "follow-up discipline": "follow_up_discipline",
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

    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    const day = d.getUTCDate();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();

    return lang === "ar" ? `${day} ${monthsAr[month]} ${year}` : `${monthsEn[month]} ${day}, ${year}`;
  } catch {
    return "—";
  }
}

// IMPORTANT: Standardized tier logic.
// Strength: 75+
// Opportunity: 50–74
// Threat: 30–49
// Weakness: 0–29
function tierFromPct(pct: number): Tier {
  if (pct >= 75) return "Strength";
  if (pct >= 50) return "Opportunity";
  if (pct >= 30) return "Threat";
  return "Weakness";
}

function tierLabel(tier: Tier, lang: Lang): string {
  const labels: Record<Tier, { en: string; ar: string }> = {
    Strength: { en: "Strength", ar: "قوة" },
    Opportunity: { en: "Opportunity", ar: "فرصة" },
    Threat: { en: "Threat", ar: "تهديد" },
    Weakness: { en: "Weakness", ar: "ضعف" },
  };
  return labels[tier][lang];
}

function tierColor(tier: Tier): string {
  const colors: Record<Tier, string> = {
    Strength: "#059669",
    Opportunity: "#0284c7",
    Threat: "#d97706",
    Weakness: "#dc2626",
  };
  return colors[tier];
}

function tierBg(tier: Tier): string {
  const colors: Record<Tier, string> = {
    Strength: "#ecfdf5",
    Opportunity: "#f0f9ff",
    Threat: "#fffbeb",
    Weakness: "#fef2f2",
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
    title: lang === "ar" ? "فحص كفاءات المبيعات الميدانية" : "Outdoor Sales Competency Scan",
    subtitle:
      lang === "ar"
        ? "فحص دم مهني سريع يكشف مؤشرات القوة والتسريب والخطر في الأداء البيعي"
        : "A professional sales blood test revealing strength signals, leakage points, and commercial risks",

    name: lang === "ar" ? "الاسم" : "Name",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    company: lang === "ar" ? "الشركة" : "Company",
    date: lang === "ar" ? "تاريخ الفحص" : "Scan Date",

    overallScore: lang === "ar" ? "مؤشر الصحة البيعية العام" : "Overall Sales Health Index",
    confidential: lang === "ar" ? "سري • للاستخدام الشخصي أو الإداري فقط" : "Confidential • For personal or managerial use only",

    performanceSummary: lang === "ar" ? "لوحة المؤشرات السبعة" : "Seven-Marker Sales Blood Panel",
    performanceSummarySub:
      lang === "ar"
        ? "كل نتيجة ليست رقمًا فقط؛ إنها إشارة لسلوك يظهر تحت ضغط البيع الحقيقي."
        : "Each score is not just a number; it is a signal of behavior under real sales pressure.",

    actionRecs: lang === "ar" ? "بروتوكولات العمل للأيام السبعة القادمة" : "Next 7 Days Action Protocols",
    swot: lang === "ar" ? "مصفوفة SWOT الاستراتيجية" : "Strategic SWOT Matrix",

    strengths: lang === "ar" ? "عوامل القوة الحالية" : "Current Strengths",
    opportunities: lang === "ar" ? "فرص التحسين السريعة" : "Rapid Improvement Opportunities",
    threats: lang === "ar" ? "مخاطر تهدد الإيرادات" : "Revenue-Threatening Risks",
    weaknesses: lang === "ar" ? "نقاط الضعف المؤثرة" : "Performance-Limiting Weaknesses",

    page: lang === "ar" ? "الصفحة" : "Page",
    of: lang === "ar" ? "من" : "of",

    mriWarning:
      lang === "ar"
        ? "⚠️ هذا الفحص كشف الإشارات وليس التشخيص الكامل"
        : "⚠️ THIS SCAN REVEALED THE SIGNALS, NOT THE FULL DIAGNOSIS",

    mriHeadline:
      lang === "ar"
        ? "الفحص كشف الإشارة. أما الـ MRI فيكشف السبب."
        : "Your Scan Shows the Signal. The MRI Reveals the Cause.",

    mriSubheadline:
      lang === "ar"
        ? "حان وقت التشخيص المهني الكامل"
        : "This Is the Complete Professional Diagnostic",

    mriBody:
      lang === "ar"
        ? "تقريرك المجاني كشف مؤشرات الأداء الظاهرة عبر 7 مناطق بيعية أساسية. لكن الإشارة ليست التشخيص الكامل. تقرير Outdoor Sales MRI المتقدم يدخل بعمق عبر 15 كفاءة ليكشف الأسباب المخفية خلف ضعف المتابعة، تعثر الصفقات، فقدان الزخم، وعدم ثبات الإغلاق — ثم يمنحك خارطة طريق تنفيذية لمدة 90 يومًا."
        : "Your free scan exposed visible performance signals across 7 core sales areas. But a signal is not the full diagnosis. The Advanced Outdoor Sales MRI goes deeper across 15 competencies to reveal the hidden causes behind weak follow-up, stalled deals, lost momentum, and inconsistent closing — then gives you a 90-day execution roadmap.",

    regularPrice: lang === "ar" ? "السعر الرسمي" : "Regular Price",
    launchPrice: lang === "ar" ? "سعر الإطلاق لفترة محدودة" : "Limited Launch Price",
    oneTime: lang === "ar" ? "دفعة واحدة • لا رسوم خفية" : "One-time payment • No hidden fees",
    cta: lang === "ar" ? `افتح تقرير MRI المتقدم — $${MRI_LAUNCH_PRICE}` : `UNLOCK THE ADVANCED MRI — $${MRI_LAUNCH_PRICE}`,
    placeholderNote:
      lang === "ar"
        ? "👉 سيتم ربط هذا الزر لاحقًا برابط الدفع في New Zenler"
        : "👉 This button will be connected to your New Zenler checkout link",

    freeScan: lang === "ar" ? "الفحص المجاني" : "FREE SCAN",
    advancedMri: lang === "ar" ? "MRI المتقدم" : "ADVANCED MRI",
  };
}

function getCompetencyLabel(key: CompetencyKey | null, lang: Lang) {
  if (!key) return "—";
  const meta = COMPETENCIES.find((c) => c.key === key);
  if (!meta) return key.replace(/_/g, " ");
  return lang === "ar" ? meta.labelAr : meta.labelEn;
}

function cleanTip(tip: string) {
  return String(tip || "")
    .replace(/\*\*/g, "")
    .replace(/^[•●▪◦✔✓✅✦★☆▶►→⚡📊📋🧠🔍🎯💡📞🛡️📝📌🧩🧭🧪📈🔬🚨⏸️🎙️🤝🔧\s]+/, "")
    .replace(/^\d{1,2}[.)\-:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
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

  if (!row) {
    return <div style={{ padding: 40, textAlign: "center" }}>Report not found</div>;
  }

  const lang: Lang = searchParams?.lang === "ar" || row.language === "ar" ? "ar" : "en";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = getTranslations(lang);

  const results = (row.competency_results || [])
    .map((r: any) => {
      const key = normalizeCompetencyKey(r.competencyId || r.key);
      const percentage = clamp(r.percentage);
      return { key, percentage, tier: tierFromPct(percentage) };
    })
    .filter((r: { key: CompetencyKey | null; percentage: number; tier: Tier }) => r.key !== null) as {
    key: CompetencyKey;
    percentage: number;
    tier: Tier;
  }[];

  const sortedResults = [...results].sort((a, b) => b.percentage - a.percentage);

  const overallPct = clamp(row.total_percentage);
  const overallTier = tierFromPct(overallPct);
  const overallColor = tierColor(overallTier);

  const strengths = results.filter((r) => r.tier === "Strength");
  const opportunities = results.filter((r) => r.tier === "Opportunity");
  const threats = results.filter((r) => r.tier === "Threat");
  const weaknesses = results.filter((r) => r.tier === "Weakness");

  const priorityResults = [...results]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 6);

  return (
    <div className="pdf-root" dir={dir} lang={lang}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap");

            :root {
              --ink: #0f172a;
              --muted: #64748b;
              --border: #e2e8f0;
              --bg: #f8fafc;
              --pad: 16mm;
              --pageW: 210mm;
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              background: var(--bg);
              color: var(--ink);
              font-family: "Cairo", Arial, sans-serif;
            }

            @page {
              size: A4;
              margin: 0;
            }

            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }

            .page {
              width: var(--pageW);
              min-height: 296mm;
              background: #fff;
              margin: 0 auto;
              padding: var(--pad);
              position: relative;
              display: flex;
              flex-direction: column;
              page-break-after: always;
              break-after: page;
            }

            .topline {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 20px;
            }

            .logoWrap {
              width: 44px;
              height: 44px;
              background: #0284c7;
              border-radius: 10px;
              display: grid;
              place-items: center;
              color: white;
              font-weight: 900;
              font-size: 16px;
              flex-shrink: 0;
            }

            .footer {
              margin-top: auto;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              gap: 16px;
              font-size: 11px;
              border-top: 1px solid var(--border);
              color: var(--muted);
            }

            .infoCard {
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 22px;
              background: #fff;
              width: 100%;
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
            }

            .infoRow {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 11px 0;
              border-bottom: 1px dashed #e5e7eb;
              font-size: 13px;
            }

            .infoRow:last-child {
              border-bottom: 0;
            }

            .cardsGrid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 20px;
            }

            .recCard {
              border: 1px solid var(--border);
              border-radius: 14px;
              padding: 15px;
              background: #fff;
              border-inline-start: 5px solid;
              page-break-inside: avoid;
              box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
            }

            .recList {
              padding-inline-start: 20px;
              font-size: 11px;
              line-height: 1.55;
              margin-top: 8px;
            }

            .recList li {
              margin-bottom: 5px;
            }

            .swotGrid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              flex: 1;
              margin-top: 20px;
            }

            .swotBox {
              padding: 18px;
              border-radius: 16px;
              border: 1px solid var(--border);
              font-size: 12px;
              page-break-inside: avoid;
            }

            .swotTitle {
              font-weight: 900;
              font-size: 16px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .swotExplain {
              font-size: 11px;
              line-height: 1.5;
              color: #475569;
              margin-bottom: 10px;
            }

            .swotItems {
              list-style: none;
              font-size: 12px;
              line-height: 1.5;
              padding: 0;
            }

            .swotItems li {
              margin-bottom: 6px;
              padding-inline-start: 12px;
              position: relative;
              font-weight: 700;
            }

            .swotItems li::before {
              content: "•";
              position: absolute;
              inset-inline-start: 0;
              color: var(--muted);
            }

            .comparisonRow {
              display: flex;
              margin-bottom: 7px;
              gap: 8px;
            }

            .comparisonCell {
              flex: 1;
              text-align: center;
              padding: 5px 6px;
              border-radius: 6px;
            }

            a.ctaButton {
              display: inline-block;
              width: 100%;
              max-width: 430px;
              padding: 16px 30px;
              background: linear-gradient(to right, #fbbf24, #f59e0b);
              color: #0f172a;
              border-radius: 12px;
              font-weight: 900;
              font-size: 14px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4);
              text-decoration: none;
            }
          `,
        }}
      />

      {/* PAGE 1: COVER */}
      <section className="page">
        <div className="topline">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logoWrap">LU</div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 900 }}>{t.title}</h1>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{t.subtitle}</p>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, color: "var(--muted)", textAlign: lang === "ar" ? "left" : "right" }}>
            {t.confidential}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div className="infoCard">
            <div className="infoRow">
              <span>{t.name}</span>
              <span style={{ fontWeight: 900 }}>{row.full_name || "—"}</span>
            </div>
            <div className="infoRow">
              <span>{t.email}</span>
              <span style={{ fontWeight: 900, direction: "ltr", unicodeBidi: "isolate" }}>{row.user_email || row.email || "—"}</span>
            </div>
            <div className="infoRow">
              <span>{t.company}</span>
              <span style={{ fontWeight: 900 }}>{row.company || "—"}</span>
            </div>
            <div className="infoRow">
              <span>{t.date}</span>
              <span style={{ fontWeight: 900 }}>{formatDate(row.created_at, lang)}</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 900, color: "var(--muted)", marginBottom: 15 }}>{t.overallScore}</p>
            <ScoreRing percentage={overallPct} color={overallColor} size={180} />

            <div
              style={{
                marginTop: 18,
                display: "inline-block",
                padding: "8px 18px",
                borderRadius: 999,
                background: tierBg(overallTier),
                color: overallColor,
                fontWeight: 900,
                border: `2px solid ${overallColor}`,
                fontSize: 13,
              }}
            >
              {tierLabel(overallTier, lang)}
            </div>
          </div>
        </div>

        <div className="footer">
          <span>{t.confidential}</span>
          <span>{t.page} 1 {t.of} 5</span>
        </div>
      </section>

      {/* PAGE 2: SUMMARY */}
      <section className="page">
        <div className="topline">
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 23 }}>{t.performanceSummary}</h2>
            <p style={{ marginTop: 5, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{t.performanceSummarySub}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {sortedResults.map((r) => {
            const color = tierColor(r.tier);
            const label = getCompetencyLabel(r.key, lang);

            return (
              <div
                key={r.key}
                style={{
                  padding: 15,
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  borderInlineStart: `5px solid ${color}`,
                  background: tierBg(r.tier),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 900, color, fontSize: 13 }}>
                    {r.percentage}% • {tierLabel(r.tier, lang)}
                  </span>
                </div>
                <div style={{ height: 9, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: `${r.percentage}%`, background: color, height: "100%" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="footer">
          <span>{t.performanceSummary}</span>
          <span>{t.page} 2 {t.of} 5</span>
        </div>
      </section>

      {/* PAGE 3: SWOT */}
      <section className="page">
        <div className="topline">
          <h2 style={{ fontWeight: 900, fontSize: 23 }}>{t.swot}</h2>
        </div>

        <div className="swotGrid">
          <SwotBox
            title={t.strengths}
            icon="💪"
            color="#059669"
            bg="#ecfdf5"
            rows={strengths}
            lang={lang}
            explanation={
              lang === "ar"
                ? "هذه المناطق يمكن استخدامها كرافعة لبناء أداء أكثر ثباتًا."
                : "These areas can be used as leverage to build more consistent performance."
            }
          />

          <SwotBox
            title={t.opportunities}
            icon="🚀"
            color="#0284c7"
            bg="#f0f9ff"
            rows={opportunities}
            lang={lang}
            explanation={
              lang === "ar"
                ? "هذه المناطق فيها أساس جيد لكنها تحتاج إلى ممارسة منظمة حتى تتحول إلى قوة."
                : "These areas have a useful foundation but need structured practice before they become strengths."
            }
          />

          <SwotBox
            title={t.threats}
            icon="⚠"
            color="#d97706"
            bg="#fffbeb"
            rows={threats}
            lang={lang}
            explanation={
              lang === "ar"
                ? "هذه إشارات إنذار قد تسبب تسريبًا في الفرص والمتابعة إذا تُركت دون علاج."
                : "These are warning signals that may create opportunity and follow-up leakage if left untreated."
            }
          />

          <SwotBox
            title={t.weaknesses}
            icon="🔥"
            color="#dc2626"
            bg="#fef2f2"
            rows={weaknesses}
            lang={lang}
            explanation={
              lang === "ar"
                ? "هذه فجوات واضحة تحتاج إلى تدخل مباشر ومنهجي."
                : "These are clear gaps that require direct and structured correction."
            }
          />
        </div>

        <div className="footer">
          <span>{t.swot}</span>
          <span>{t.page} 3 {t.of} 5</span>
        </div>
      </section>

      {/* PAGE 4: RECOMMENDATIONS */}
      <section className="page">
        <div className="topline">
          <h2 style={{ fontWeight: 900, fontSize: 23 }}>{t.actionRecs}</h2>
        </div>

        <div className="cardsGrid">
          {priorityResults.map((r) => {
            const label = getCompetencyLabel(r.key, lang);
            const tips = getPdfRecommendations(r.key, r.tier, lang).map(cleanTip).filter(Boolean);
            const color = tierColor(r.tier);

            return (
              <div key={r.key} className="recCard" style={{ borderInlineStartColor: color, background: tierBg(r.tier) }}>
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color }}>
                  {label} — {r.percentage}%
                </div>
                <ul className="recList">
                  {tips.slice(0, 2).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="footer">
          <span>{t.actionRecs}</span>
          <span>{t.page} 4 {t.of} 5</span>
        </div>
      </section>

      {/* PAGE 5: MRI UPSELL */}
      <section
        className="page"
        style={{
          background: "#0f172a",
          color: "white",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              display: "inline-block",
              background: "#dc2626",
              color: "white",
              padding: "8px 20px",
              borderRadius: "25px",
              fontWeight: 900,
              fontSize: "10px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {t.mriWarning}
          </div>
        </div>

        <h1
          style={{
            fontSize: "26px",
            fontWeight: 900,
            lineHeight: 1.2,
            marginBottom: "12px",
            color: "white",
          }}
        >
          {t.mriHeadline}
        </h1>

        <h2
          style={{
            fontSize: "18px",
            fontWeight: 800,
            marginBottom: "18px",
            color: "#fbbf24",
          }}
        >
          {t.mriSubheadline}
        </h2>

        <p
          style={{
            fontSize: "12px",
            lineHeight: 1.55,
            opacity: 0.92,
            maxWidth: "520px",
            margin: "0 auto 22px",
          }}
        >
          {t.mriBody}
        </p>

        <div
          style={{
            maxWidth: "540px",
            margin: "0 auto 22px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "11px",
            textAlign: "left",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              marginBottom: "10px",
              borderBottom: "1px solid rgba(255,255,255,0.2)",
              paddingBottom: "8px",
            }}
          >
            <div style={{ flex: 1, fontWeight: 900, color: "#94a3b8", textAlign: "center" }}>
              {t.freeScan}
            </div>
            <div style={{ flex: 1, fontWeight: 900, color: "#fbbf24", textAlign: "center" }}>
              {t.advancedMri}
            </div>
          </div>

          {[
            {
              free: lang === "ar" ? "30 سؤال" : "30 Questions",
              mri: lang === "ar" ? "75 سؤالًا دقيقًا" : "75 Precision Questions",
            },
            {
              free: lang === "ar" ? "7 مؤشرات أساسية" : "7 Core Markers",
              mri: lang === "ar" ? "15 كفاءة متقدمة" : "15 Advanced Competencies",
            },
            {
              free: lang === "ar" ? "تقرير مختصر" : "Snapshot Report",
              mri: lang === "ar" ? "تقرير تنفيذي متقدم" : "Advanced Executive Report",
            },
            {
              free: lang === "ar" ? "مؤشرات أولية" : "Surface Signals",
              mri: lang === "ar" ? "تشخيص الأسباب المخفية" : "Hidden Cause Diagnosis",
            },
            {
              free: lang === "ar" ? "خطة سريعة" : "Fast Action Tips",
              mri: lang === "ar" ? "خارطة طريق 90 يومًا" : "90-Day Execution Roadmap",
            },
          ].map((row, i) => (
            <div key={i} className="comparisonRow">
              <div className="comparisonCell" style={{ opacity: 0.72 }}>
                {row.free}
              </div>
              <div className="comparisonCell" style={{ fontWeight: 800, color: "white" }}>
                {row.mri}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              fontSize: "13px",
              opacity: 0.65,
              textDecoration: "line-through",
              marginBottom: "4px",
              fontWeight: 700,
            }}
          >
            {t.regularPrice} ${MRI_REGULAR_PRICE}
          </div>

          <div
            style={{
              fontSize: "46px",
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: "22px", verticalAlign: "top", opacity: 0.8 }}>$</span>
            {MRI_LAUNCH_PRICE}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#fbbf24",
              fontWeight: 800,
              marginTop: "6px",
            }}
          >
            {t.launchPrice}
          </div>
        </div>

        <p
          style={{
            fontSize: "10px",
            opacity: 0.68,
            marginBottom: "18px",
          }}
        >
          {t.oneTime}
        </p>

        <a
          href={MRI_CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ctaButton"
        >
          🚀 {t.cta}
        </a>

        <p
          style={{
            fontSize: "9px",
            marginTop: "12px",
            opacity: 0.55,
          }}
        >
          {t.placeholderNote}
        </p>

        <div
          className="footer"
          style={{
            color: "rgba(255,255,255,0.35)",
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <span>Outdoor Sales MRI</span>
          <span>{t.page} 5 {t.of} 5</span>
        </div>
      </section>
    </div>
  );
}

function SwotBox({
  title,
  icon,
  color,
  bg,
  rows,
  lang,
  explanation,
}: {
  title: string;
  icon: string;
  color: string;
  bg: string;
  rows: { key: CompetencyKey; percentage: number; tier: Tier }[];
  lang: Lang;
  explanation: string;
}) {
  return (
    <div className="swotBox" style={{ background: bg, borderColor: color }}>
      <div className="swotTitle" style={{ color }}>
        <span>{icon}</span> {title}
      </div>

      <p className="swotExplain">{explanation}</p>

      <ul className="swotItems">
        {rows.length ? (
          rows.map((r) => (
            <li key={r.key}>
              {getCompetencyLabel(r.key, lang)} <span style={{ fontWeight: 900 }}>({r.percentage}%)</span>
            </li>
          ))
        ) : (
          <li>{lang === "ar" ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>
        )}
      </ul>
    </div>
  );
}