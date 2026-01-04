"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { COMPETENCY_ORDER, COMPETENCY_META, CompId } from "@/lib/competencies"; // Import from shared file
import { getRecommendations } from "@/lib/pdf-recommendations"; // Import from shared file

/* =========================
   TYPES
========================= */
type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";
type Lang = "en" | "ar";

interface CompetencyResult {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
}

function tierAr(t: Tier) {
  const map: Record<Tier, string> = {
    Strength: "قوة",
    Opportunity: "فرصة",
    Threat: "تهديد",
    Weakness: "ضعف",
  };
  return map[t];
}

function tierColors(t: Tier) {
  switch (t) {
    case "Strength":
      return { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" };
    case "Opportunity":
      return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" };
    case "Threat":
      return { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" };
    case "Weakness":
      return { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" };
  }
}

/* =========================
   DONUT
========================= */
function Donut({ percentage, color = "#14B8A6" }: { percentage: number; color?: string }) {
  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percentage / 100);

  return (
    <div className="donutWrap">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donutText">{percentage}%</div>
    </div>
  );
}

/* =========================
   CARD (compact)
========================= */
function CompetencyCard({
  comp,
  lang,
}: {
  comp: CompetencyResult & { meta: (typeof COMPETENCY_META)[CompId] };
  lang: Lang;
}) {
  const colors = tierColors(comp.tier);
  const label = lang === "ar" ? comp.meta.labelAr : comp.meta.labelEn;
  const diagnostic = lang === "ar" ? comp.meta.diagnosticAr : comp.meta.diagnosticEn;
  const badge = lang === "ar" ? tierAr(comp.tier) : comp.tier;

  const recs = getRecommendations(comp.competencyId, comp.tier, lang).slice(0, 3);

  return (
    <div className="card" style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="cardTop">
        <div className="cardTitle">
          <span className="icon">{comp.meta.icon}</span>
          <span>{label}</span>
        </div>
        <div className="scoreBox">
          <div className="scorePct">{comp.percentage}%</div>
          <div className="scoreRaw">
            {comp.score}/{comp.maxScore}
          </div>
        </div>
      </div>

      <div className="barTrack">
        <div className="barFill" style={{ width: `${comp.percentage}%` }} />
      </div>

      <span className="badge" style={{ color: colors.text, borderColor: colors.border }}>
        {badge}
      </span>

      <div className="diagnostic">{diagnostic}</div>

      <ul className="recs">
        {recs.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   DEFINITIVE PDF EXPORTER
   (NO html2pdf pagination)
========================= */
async function exportPdfByCapturingEachPage(filename: string) {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(".pdfPage"));
  if (!pages.length) return;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // A4 in mm
  const pageW = 210;
  const pageH = 297;

  // Important: avoid capturing shadows outside page
  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];

    // Ensure the element is visible and not transformed
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#FFFFFF",
      scrollY: 0,
      windowWidth: pageEl.scrollWidth,
      windowHeight: pageEl.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // Calculate image dimensions to fit A4
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // If the canvas is slightly taller than A4 due to rounding, FORCE fit to A4 height
    // This prevents “extra page” behavior entirely.
    const finalH = Math.min(imgH, pageH);

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, imgW, finalH);
  }

  pdf.save(filename);
}

/* =========================
   MAIN
========================= */
export default function TestReportPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompetencyResult[]>([]);

  useEffect(() => {
    // Replace with your real fetch
    const fake: CompetencyResult[] = [
      { competencyId: "mental_toughness", score: 7, maxScore: 25, percentage: 28, tier: "Weakness" },
      { competencyId: "opening_conversations", score: 8, maxScore: 20, percentage: 40, tier: "Threat" },
      { competencyId: "identifying_real_needs", score: 11, maxScore: 20, percentage: 55, tier: "Opportunity" },
      { competencyId: "destroying_objections", score: 10, maxScore: 25, percentage: 40, tier: "Threat" },
      { competencyId: "creating_irresistible_offers", score: 12, maxScore: 20, percentage: 60, tier: "Opportunity" },
      { competencyId: "mastering_closing", score: 15, maxScore: 25, percentage: 60, tier: "Weakness" },
      { competencyId: "follow_up_discipline", score: 15, maxScore: 15, percentage: 100, tier: "Strength" },
    ];
    setResults(fake);
    setLoading(false);
  }, []);

  const totalPct = useMemo(() => {
    const raw = results.reduce((s, r) => s + r.score, 0);
    const max = results.reduce((s, r) => s + r.maxScore, 0);
    return max ? Math.round((raw / max) * 100) : 0;
  }, [results]);

  const ordered = useMemo(() => {
    return COMPETENCY_ORDER
      .map((id) => results.find((r) => r.competencyId === id))
      .filter(Boolean)
      .map((r) => ({
        ...(r as CompetencyResult),
        meta: COMPETENCY_META[(r as CompetencyResult).competencyId as CompId],
      }));
  }, [results]);

  const page3 = ordered.slice(0, 3);
  const page4 = ordered.slice(3, 6);
  const page5 = ordered.slice(6, 7);

  const today = new Date().toLocaleDateString(lang === "ar" ? "ar-AE" : "en-AU");

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Header />
        <main className="flex-grow flex items-center justify-center p-6">Loading…</main>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-grow p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-end gap-3 mb-6">
          <Button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            {lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          </Button>

          <Button
            onClick={() => exportPdfByCapturingEachPage(lang === "ar" ? "report-ar.pdf" : "report-en.pdf")}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {lang === "ar" ? "تحميل PDF (بدون صفحات فارغة)" : "Download PDF (no blank pages)"}
          </Button>
        </div>

        {/* =========================
            REPORT PAGES (5)
            IMPORTANT: no pagebreak divs, no break-after css
        ========================= */}
        <div className="pdfRoot">
          {/* PAGE 1 */}
          <section className="pdfPage">
            <div className="pageHeader">
              <div className="pageTag">{lang === "ar" ? "تقرير التقييم" : "Assessment Report"}</div>
              <div className="pageNumber">1 / 5</div>
            </div>

            <div className="cover">
              <div className="logoCircle">Logo</div>
              <h1 className="coverTitle">
                {lang === "ar" ? "فحص كفاءات قوة المبيعات الميدانية لديك" : "Your Outdoor Salesforce Competency Scan"}
              </h1>
              <p className="coverSub">
                {lang === "ar"
                  ? "تقرير بصري مختصر يوضح أين تربح — وأين تتسرب الصفقات."
                  : "A visual, executive-style report showing where you win — and where deals leak."}
              </p>

              <div className="infoGrid">
                <div className="infoCard">
                  <div className="infoLabel">{lang === "ar" ? "الاسم" : "Name"}</div>
                  <div className="infoValue">Test User</div>
                </div>
                <div className="infoCard">
                  <div className="infoLabel">Email</div>
                  <div className="infoValue">test@example.com</div>
                </div>
                <div className="infoCard">
                  <div className="infoLabel">{lang === "ar" ? "التاريخ" : "Date"}</div>
                  <div className="infoValue">{today}</div>
                </div>
              </div>

              <div className="center">
                <Donut percentage={totalPct} />
                <div className="note">
                  {lang === "ar" ? "درجتك الكلية" : "Your total score"}
                </div>
              </div>
            </div>

            <div className="pageFooter">{lang === "ar" ? "© تقرير خاص" : "© Private report"}</div>
          </section>

          {/* PAGE 2 */}
          <section className="pdfPage">
            <div className="pageHeader">
              <div className="pageTag">{lang === "ar" ? "ملخص الأداء" : "Performance Summary"}</div>
              <div className="pageNumber">2 / 5</div>
            </div>

            <div className="gradTitle">{lang === "ar" ? "نظرة شاملة" : "Overview"}</div>

            <div className="panel">
              {ordered.map((c) => (
                <div key={c.competencyId} className="barRow">
                  <div className="barRowTop">
                    <div className="barLabel">{lang === "ar" ? c.meta.labelAr : c.meta.labelEn}</div>
                    <div className="barPct">{c.percentage}%</div>
                  </div>
                  <div className="barTrack2">
                    <div className="barFill2" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pageFooter">{lang === "ar" ? "صفحة 2" : "Page 2"}</div>
          </section>
{/* SWOT (4 boxes) */}
<div className="swotGrid">
  <div className="swotBox swStrength">
    <div className="swTitle">{lang === "ar" ? "نقاط القوة" : "Strengths"}</div>
    {ordered.filter(c => c.tier === "Strength").length ? (
      ordered
        .filter((c) => c.tier === "Strength")
        .map((c) => (
          <div key={c.competencyId} className="swItem">
            • {lang === "ar" ? c.meta.labelAr : c.meta.labelEn} ({c.percentage}%)
          </div>
        ))
    ) : (
      <div className="swItem">{lang === "ar" ? "لا يوجد" : "None"}</div>
    )}
  </div>

  <div className="swotBox swOpp">
    <div className="swTitle">{lang === "ar" ? "الفرص" : "Opportunities"}</div>
    {ordered.filter(c => c.tier === "Opportunity").length ? (
      ordered
        .filter((c) => c.tier === "Opportunity")
        .map((c) => (
          <div key={c.competencyId} className="swItem">
            • {lang === "ar" ? c.meta.labelAr : c.meta.labelEn} ({c.percentage}%)
          </div>
        ))
    ) : (
      <div className="swItem">{lang === "ar" ? "لا يوجد" : "None"}</div>
    )}
  </div>

  <div className="swotBox swThreat">
    <div className="swTitle">{lang === "ar" ? "التهديدات" : "Threats"}</div>
    {ordered.filter(c => c.tier === "Threat").length ? (
      ordered
        .filter((c) => c.tier === "Threat")
        .map((c) => (
          <div key={c.competencyId} className="swItem">
            • {lang === "ar" ? c.meta.labelAr : c.meta.labelEn} ({c.percentage}%)
          </div>
        ))
    ) : (
      <div className="swItem">{lang === "ar" ? "لا يوجد" : "None"}</div>
    )}
  </div>

  <div className="swotBox swWeak">
    <div className="swTitle">{lang === "ar" ? "نقاط الضعف" : "Weaknesses"}</div>
    {ordered.filter(c => c.tier === "Weakness").length ? (
      ordered
        .filter((c) => c.tier === "Weakness")
        .map((c) => (
          <div key={c.competencyId} className="swItem">
            • {lang === "ar" ? c.meta.labelAr : c.meta.labelEn} ({c.percentage}%)
          </div>
        ))
    ) : (
      <div className="swItem">{lang === "ar" ? "لا يوجد" : "None"}</div>
    )}
  </div>
</div>

          {/* PAGE 3 (3 competencies) */}
          <section className="pdfPage">
            <div className="pageHeader">
              <div className="pageTag">{lang === "ar" ? "تفاصيل (1–3)" : "Details (1–3)"}</div>
              <div className="pageNumber">3 / 5</div>
            </div>

            <div className="gradTitle">{lang === "ar" ? "الكفاءات (1–3)" : "Competencies (1–3)"}</div>

            <div className="cardGrid">
              {page3.map((c) => (
                <CompetencyCard key={c.competencyId} comp={c} lang={lang} />
              ))}
            </div>

            <div className="pageFooter">{lang === "ar" ? "صفحة 3" : "Page 3"}</div>
          </section>

          {/* PAGE 4 (3 competencies) */}
          <section className="pdfPage">
            <div className="pageHeader">
              <div className="pageTag">{lang === "ar" ? "تفاصيل (4–6)" : "Details (4–6)"}</div>
              <div className="pageNumber">4 / 5</div>
            </div>

            <div className="gradTitle">{lang === "ar" ? "الكفاءات (4–6)" : "Competencies (4–6)"}</div>

            <div className="cardGrid">
              {page4.map((c) => (
                <CompetencyCard key={c.competencyId} comp={c} lang={lang} />
              ))}
            </div>

            <div className="pageFooter">{lang === "ar" ? "صفحة 4" : "Page 4"}</div>
          </section>

          {/* PAGE 5 (last + CTA) */}
          <section className="pdfPage">
            <div className="pageHeader">
              <div className="pageTag">{lang === "ar" ? "الخطوة التالية" : "Next Step"}</div>
              <div className="pageNumber">5 / 5</div>
            </div>

            <div className="gradTitle">{lang === "ar" ? "الكفاءة الأخيرة + عرض" : "Final competency + offer"}</div>

            <div className="cardGrid" style={{ marginBottom: "10mm" }}>
              {page5.map((c) => (
                <CompetencyCard key={c.competencyId} comp={c} lang={lang} />
              ))}
            </div>

            <div className="ctaBox">
              <div className="ctaTitle">
                {lang === "ar" ? "هل تريد خطة شخصية كاملة؟" : "Want a full personalized plan?"}
              </div>
              <div className="ctaSub">
                {lang === "ar"
                  ? "ترقية بسيطة تمنحك تشخيصاً أعمق + خطة 90 يوم."
                  : "A simple upgrade gives deeper insights + a 90-day plan."}
              </div>
              <div className="ctaUrl">[Insert_Your_Sales_Page_URL_Here]</div>
            </div>

            <div className="pageFooter">{lang === "ar" ? "نهاية التقرير" : "End of report"}</div>
          </section>
        </div>

        <div className="mt-16">
          <MadeWithDyad />
        </div>
      </main>

      {/* =========================
         CSS (NO page-break rules!)
      ========================= */}
      <style jsx global>{`
        .pdfRoot {
          background: #ffffff;
        }

        .pdfPage {
          width: 210mm;
          height: 297mm; /* FIXED height */
          padding: 14mm;
          box-sizing: border-box;
          background: #ffffff;
          position: relative;
          overflow: hidden; /* IMPORTANT: prevents accidental extra height */
        }

        .pageHeader {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 8mm;
        }

        .pageFooter {
          position: absolute;
          left: 14mm;
          right: 14mm;
          bottom: 8mm;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
        }

        .logoCircle {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          background: linear-gradient(to right, #14b8a6, #06b6d4);
          display: grid;
          place-items: center;
          color: white;
          font-weight: 900;
          margin: 0 auto 16px auto;
        }

        .cover {
          text-align: center;
        }

        .coverTitle {
          font-size: 30px;
          line-height: 1.15;
          margin: 0;
          font-weight: 950;
          color: #0f172a;
        }

        .coverSub {
          font-size: 14px;
          color: #475569;
          margin: 10px auto 16px auto;
          max-width: 170mm;
          line-height: 1.6;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin: 12px auto 10mm auto;
        }

        .infoCard {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .infoLabel {
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .infoValue {
          font-size: 13px;
          color: #0f172a;
          font-weight: 900;
        }

        .center {
          display: grid;
          place-items: center;
          gap: 8px;
          margin-top: 10mm;
        }

        .note {
          font-weight: 900;
          color: #0f172a;
        }

        .gradTitle {
          width: 100%;
          border-radius: 12px;
          padding: 12px 14px;
          color: white;
          font-weight: 950;
          font-size: 16px;
          background: linear-gradient(to right, #14b8a6, #06b6d4);
          margin-bottom: 10mm;
          text-align: center;
        }

        .panel {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10mm;
        }

        .barRowTop {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 900;
          color: #334155;
          margin-bottom: 4px;
        }

        .barTrack2 {
          width: 100%;
          height: 10px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .barFill2 {
          height: 100%;
          background: linear-gradient(to right, #14b8a6, #06b6d4);
        }

        .donutWrap {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto;
        }

        .donutText {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-weight: 1000;
          font-size: 26px;
          color: #0f172a;
        }

        .cardGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .card {
          border: 1px solid;
          border-radius: 14px;
          padding: 10px 12px;
          box-sizing: border-box;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 6px;
        }

        .cardTitle {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 1000;
          color: #0f172a;
          font-size: 14px;
        }

        .icon {
          font-size: 18px;
          line-height: 1;
        }

        .scoreBox {
          text-align: right;
          min-width: 60px;
        }

        .scorePct {
          font-weight: 1000;
          font-size: 16px;
          color: #0f172a;
        }

        .scoreRaw {
          font-size: 11px;
          color: #475569;
          font-weight: 800;
        }

        .barTrack {
          width: 100%;
          height: 10px;
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
          overflow: hidden;
          margin: 6px 0 8px 0;
        }

        .barFill {
          height: 100%;
          background: linear-gradient(to right, #14b8a6, #06b6d4);
          border-radius: 999px;
        }

        .badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 950;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid;
          margin-bottom: 6px;
          background: white;
        }

        .diagnostic {
          font-size: 12px;
          color: #334155;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .recs {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          color: #0f172a;
          display: grid;
          gap: 4px;
          font-weight: 800;
        }

        [dir="rtl"] .recs {
          padding-left: 0;
          padding-right: 18px;
        }

        .ctaBox {
          border-radius: 14px;
          padding: 12mm;
          color: white;
          background: linear-gradient(to right, #f97316, #dc2626);
          text-align: center;
        }

        .ctaTitle {
          font-weight: 1000;
          font-size: 18px;
          margin-bottom: 6px;
        }

        .ctaSub {
          font-weight: 900;
          font-size: 12px;
          opacity: 0.95;
          margin-bottom: 10px;
        }

        .ctaUrl {
          background: white;
          color: #7f1d1d;
          font-weight: 1000;
          border-radius: 12px;
          padding: 10px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}