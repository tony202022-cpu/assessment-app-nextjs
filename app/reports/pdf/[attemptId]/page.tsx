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

function normalizeCompetencyId(id: string): string {
  const clean = String(id || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  // map friendly/arabic labels (if DB ever stores them) -> keys
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

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // IMPORTANT: match your Results page table
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
  const finalLang: "ar" | "en" = langRaw === "en" || langRaw === "ar" ? lang : dbLang === "en" ? "en" : "ar";
  const finalIsArabic = finalLang === "ar";

  const rawResults = Array.isArray((data as any).competency_results) ? ((data as any).competency_results as any[]) : [];
  const normalized: CompetencyResult[] = rawResults.map((r) => ({
    competencyId: normalizeCompetencyId(r?.competencyId),
    score: Number(r?.score) || 0,
    maxScore: Number(r?.maxScore) || 0,
    percentage: clampPct(r?.percentage),
    tier: (r?.tier as Tier) || "Opportunity",
  }));

  // Stable ordering (always 7 in the intended order, plus extras if any)
  const map = new Map<string, CompetencyResult>();
  normalized.forEach((r) => map.set(r.competencyId, r));
  const orderedCore = COMPETENCY_ORDER.map((id) => map.get(id)).filter(Boolean) as CompetencyResult[];
  const extras = normalized.filter((r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId));
  const results = [...orderedCore, ...extras];

  // Total score: prefer DB total_percentage; otherwise compute.
  const dbTotal = Number((data as any).total_percentage);
  const totalPercentage =
    Number.isFinite(dbTotal) && dbTotal >= 0 ? clampPct(dbTotal) : clampPct(results.reduce((s, r) => s + (r.percentage || 0), 0) / Math.max(1, results.length));

  const strengths = results.filter((r) => r.tier === "Strength");
  const opportunities = results.filter((r) => r.tier === "Opportunity");
  const threats = results.filter((r) => r.tier === "Threat");
  const weaknesses = results.filter((r) => r.tier === "Weakness");

  return (
    <html lang={finalLang} dir={finalIsArabic ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <title>{finalIsArabic ? "تقرير التقييم" : "Assessment Report"}</title>

        {/* Cairo via Google Fonts (reliable for Puppeteer) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        <style>{`
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111827;
            font-family: "Cairo", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body[data-pdf-ready="1"] { }

          .report {
            width: 210mm;
            margin: 0 auto;
          }

          .page {
            width: 210mm;
            height: 297mm;
            padding: 18mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }

          .page:last-child { page-break-after: auto; }

          /* RTL basics */
          [dir="rtl"] { direction: rtl; text-align: right; }
          [dir="rtl"] .row { flex-direction: row-reverse; }
          [dir="rtl"] .muted { text-align: right; }

          /* Cover */
          .cover {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: #fff;
            border-radius: 16px;
            padding: 18mm;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .logo {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: #fff;
            color: #4f46e5;
            display: grid;
            place-items: center;
            font-size: 38px;
            font-weight: 800;
            margin-bottom: 18px;
          }

          .h1 { font-size: 34px; font-weight: 800; margin: 0 0 8px 0; }
          .h2 { font-size: 18px; opacity: .9; margin: 0 0 18px 0; }

          .bigScore {
            font-size: 64px;
            font-weight: 900;
            margin: 10px 0 4px 0;
            letter-spacing: .5px;
          }

          .muted { opacity: .9; font-size: 13px; margin: 0; }
          .metaRow { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; justify-content: center; }
          .pill {
            background: rgba(255,255,255,.16);
            border: 1px solid rgba(255,255,255,.22);
            padding: 8px 10px;
            border-radius: 999px;
            font-size: 12px;
          }

          /* Section */
          .title {
            font-size: 22px;
            font-weight: 800;
            color: #4f46e5;
            margin: 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e7ff;
            text-align: center;
          }

          .subtitle {
            margin: 0;
            color: #6b7280;
            font-size: 13px;
            text-align: center;
          }

          /* Summary cards */
          .grid1 { display: grid; grid-template-columns: 1fr; gap: 10px; }
          .card {
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            border-radius: 14px;
            padding: 12px;
          }

          .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
          .label { font-weight: 800; font-size: 14px; margin: 0; }
          .tier { font-weight: 800; font-size: 12px; margin: 0; }
          .diag { margin: 6px 0 10px 0; font-size: 12px; color: #4b5563; }

          .barTrack { height: 10px; background: #e5e7eb; border-radius: 999px; overflow: hidden; flex: 1; }
          .barFill { height: 100%; border-radius: 999px; }
          .pct { min-width: 46px; text-align: end; font-weight: 900; font-size: 12px; }

          /* Recommendations */
          .recs {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .recs ul { margin: 10px 0 0 0; padding: 0; list-style: none; }
          .recs li { margin-bottom: 8px; font-size: 13px; line-height: 1.55; }
          [dir="rtl"] .recs li { text-align: right; }

          /* SWOT */
          .swotGrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .swotCard {
            border-radius: 14px;
            padding: 12px;
            border: 1px solid #e5e7eb;
          }
          .swotCard h3 { margin: 0 0 8px 0; font-size: 14px; font-weight: 900; text-align: center; }
          .swotCard p { margin: 0 0 6px 0; font-size: 12px; }

          .swotS { background: #f0fdf4; border-color: #a7f3d0; }
          .swotO { background: #eff6ff; border-color: #bfdbfe; }
          .swotT { background: #fff7ed; border-color: #fed7aa; }
          .swotW { background: #fef2f2; border-color: #fecaca; }
        `}</style>
      </head>

      {/* The PDF service should wait for this attribute */}
      <body data-pdf-ready="1">
        <div className="report">
          {/* PAGE 1: COVER */}
          <section className="page">
            <div className="cover">
              <div className="logo">D</div>
              <h1 className="h1">{finalIsArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}</h1>
              <p className="h2">{finalIsArabic ? "تحليل شامل لأدائك في الميدان" : "A crisp report of your field performance"}</p>
              <div className="bigScore">{totalPercentage}%</div>
              <p className="muted">{finalIsArabic ? "النتيجة الإجمالية" : "Overall Score"}</p>

              <div className="metaRow">
                <div className="pill">{finalIsArabic ? "المحاولة" : "Attempt"}: {attemptId.slice(0, 8)}</div>
                <div className="pill">
                  {finalIsArabic ? "التاريخ" : "Date"}:{" "}
                  {new Date().toLocaleDateString(finalIsArabic ? "ar-AE" : "en-AU")}
                </div>
                <div className="pill">{finalIsArabic ? "المستخدم" : "User"}: {String((data as any).user_id ?? "—")}</div>
              </div>
            </div>
          </section>

          {/* PAGE 2: SUMMARY */}
          <section className="page">
            <div>
              <h2 className="title">{finalIsArabic ? "ملخص الأداء" : "Performance Summary"}</h2>
              <p className="subtitle">{finalIsArabic ? "النتائج مرتبة حسب الكفاءات الأساسية." : "Results ordered by core competencies."}</p>
            </div>

            <div className="grid1">
              {results.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const label = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                const diag = meta ? (finalIsArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
                const color = tierColor(c.tier);
                const pct = clampPct(c.percentage);

                return (
                  <div key={c.competencyId} className="card">
                    <div className="row">
                      <p className="label">{label}</p>
                      <p className="tier" style={{ color }}>
                        {tierLabel(c.tier, finalIsArabic)}
                      </p>
                    </div>
                    <p className="diag">{diag}</p>
                    <div className="row">
                      <div className="barTrack">
                        <div className="barFill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="pct">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* PAGE 3: SWOT */}
          <section className="page">
            <div>
              <h2 className="title">{finalIsArabic ? "تحليل SWOT" : "SWOT Analysis"}</h2>
              <p className="subtitle">{finalIsArabic ? "نظرة سريعة على الصورة الاستراتيجية." : "A quick strategic overview."}</p>
            </div>

            <div className="swotGrid">
              <div className="swotCard swotS">
                <h3>{finalIsArabic ? "نقاط القوة" : "Strengths"}</h3>
                {strengths.length ? strengths.map((c) => {
                  const key = normalizeCompetencyId(c.competencyId);
                  const meta = COMPETENCY_META[key];
                  const name = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                  return <p key={c.competencyId}>• {name} ({clampPct(c.percentage)}%)</p>;
                }) : <p>{finalIsArabic ? "لا يوجد" : "None"}</p>}
              </div>

              <div className="swotCard swotO">
                <h3>{finalIsArabic ? "الفرص" : "Opportunities"}</h3>
                {opportunities.length ? opportunities.map((c) => {
                  const key = normalizeCompetencyId(c.competencyId);
                  const meta = COMPETENCY_META[key];
                  const name = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                  return <p key={c.competencyId}>• {name} ({clampPct(c.percentage)}%)</p>;
                }) : <p>{finalIsArabic ? "لا يوجد" : "None"}</p>}
              </div>

              <div className="swotCard swotW">
                <h3>{finalIsArabic ? "نقاط الضعف" : "Weaknesses"}</h3>
                {weaknesses.length ? weaknesses.map((c) => {
                  const key = normalizeCompetencyId(c.competencyId);
                  const meta = COMPETENCY_META[key];
                  const name = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                  return <p key={c.competencyId}>• {name} ({clampPct(c.percentage)}%)</p>;
                }) : <p>{finalIsArabic ? "لا يوجد" : "None"}</p>}
              </div>

              <div className="swotCard swotT">
                <h3>{finalIsArabic ? "التهديدات" : "Threats"}</h3>
                {threats.length ? threats.map((c) => {
                  const key = normalizeCompetencyId(c.competencyId);
                  const meta = COMPETENCY_META[key];
                  const name = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                  return <p key={c.competencyId}>• {name} ({clampPct(c.percentage)}%)</p>;
                }) : <p>{finalIsArabic ? "لا يوجد" : "None"}</p>}
              </div>
            </div>
          </section>

          {/* PAGE 4: RECOMMENDATIONS */}
          <section className="page">
            <div>
              <h2 className="title">{finalIsArabic ? "التوصيات المخصصة (21)" : "Personalized Recommendations (21)"}</h2>
              <p className="subtitle">
                {finalIsArabic
                  ? "3 توصيات لكل كفاءة حسب فئتك الحالية — المجموع 21."
                  : "3 recommendations per competency based on your tier — total 21."}
              </p>
            </div>

            <div className="recs">
              {results.map((c) => {
                const key = normalizeCompetencyId(c.competencyId);
                const meta = COMPETENCY_META[key];
                const title = meta ? (finalIsArabic ? meta.labelAr : meta.labelEn) : key;
                const color = tierColor(c.tier);
                const recs = getRecommendations(key, c.tier, finalLang);

                return (
                  <div key={c.competencyId} className="card">
                    <div className="row">
                      <p className="label" style={{ color }}>
                        {title} <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.9 }}>
                          ({tierLabel(c.tier, finalIsArabic)})
                        </span>
                      </p>
                    </div>

                    <ul>
                      {recs?.length ? recs.map((r: string, i: number) => <li key={i}>• {r}</li>) : (
                        <li>{finalIsArabic ? "لا توجد توصيات لهذه الكفاءة." : "No recommendations."}</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
