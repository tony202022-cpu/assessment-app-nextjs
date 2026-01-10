"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getTranslation } from "@/lib/translations";
import { toast } from "sonner";
import { useSession } from "@/contexts/SessionContext";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { supabase } from "@/integrations/supabase/client";

/** ===== Types (match your schema) ===== */
type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";
interface CompetencyResult {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
}

/** ===== META (must match print-report page) ===== */
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
    diagnosticEn:
      "How effectively you initiate conversations and create positive first impressions.",
    diagnosticAr: "مدى فعالية بدء المحادثات وخلق انطباعات أولى إيجابية.",
  },
  identifying_real_needs: {
    labelEn: "Identifying Real Needs",
    labelAr: "تحديد الاحتياجات الحقيقية",
    diagnosticEn: "Your skill in uncovering the customer's true motivations and buying triggers.",
    diagnosticAr: "مهارتك في كشف الدوافع الحقيقة ومحفزات الشراء لدى العميل.",
  },
  destroying_objections: {
    labelEn: "Destroying Objections",
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

/** ===== UI Components (same as yours) ===== */
const DonutChart = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width="170" height="170" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="85" cy="85" r={radius} stroke="#e5e7eb" strokeWidth="14" fill="transparent" />
      <circle
        cx="85"
        cy="85"
        r={radius}
        stroke={color}
        strokeWidth="14"
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 85 85)"
      />
      <text
        x="85"
        y="85"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 28, fontWeight: 800, fill: "#111827", fontFamily: "Arial, sans-serif" }}
      >
        {clamped}%
      </text>
    </svg>
  );
};

const CompetencyBars = ({ results, language }: { results: CompetencyResult[]; language: string }) => {
  return (
    <div className="space-y-3">
      {results.map((c) => {
        const meta = COMPETENCY_META[c.competencyId];
        const label = language === "ar" ? meta?.labelAr : meta?.labelEn;

        return (
          <div key={c.competencyId}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">{label || c.competencyId}</p>
              <p className="text-sm font-bold text-gray-900">{Math.round(c.percentage)}%</p>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div className="h-3 bg-blue-600 rounded-full" style={{ width: `${c.percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function ResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const { language } = useLocale();
  const { user, isLoading: isSessionLoading } = useSession();

  const [competencyResults, setCompetencyResults] = useState<CompetencyResult[]>([]);
  const [totalPercentage, setTotalPercentage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /** ===== Fetch results ===== */
  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId) return;

      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("competency_results,total_percentage")
        .eq("id", attemptId)
        .single();

      if (error || !data) {
        console.error("Supabase error:", error);
        toast.error(language === "ar" ? "خطأ في تحميل النتائج" : "Error loading results");
        setLoading(false);
        return;
      }

      const parsed = (data.competency_results || []) as CompetencyResult[];
      setCompetencyResults(parsed);
      setTotalPercentage(typeof data.total_percentage === "number" ? data.total_percentage : null);
      setLoading(false);
    };

    fetchResults();
  }, [attemptId, language]);

  /** ===== Ordering + computed total ===== */
  const orderedResults = useMemo(() => {
    const map = new Map<string, CompetencyResult>();
    competencyResults.forEach((r) => map.set(r.competencyId, r));

    const ordered = COMPETENCY_ORDER.map((id) => map.get(id)).filter(Boolean) as CompetencyResult[];
    const extras = competencyResults.filter((r) => !COMPETENCY_ORDER.includes(r.competencyId as any));
    return [...ordered, ...extras];
  }, [competencyResults]);

  const computedTotal = useMemo(() => {
    if (typeof totalPercentage === "number" && !Number.isNaN(totalPercentage)) return totalPercentage;
    if (!orderedResults.length) return 0;
    const avg =
      orderedResults.reduce((s, c) => s + (Number(c.percentage) || 0), 0) / orderedResults.length;
    return Math.round(avg);
  }, [orderedResults, totalPercentage]);

  /** ===== SWOT buckets ===== */
  const strengths = useMemo(
    () => orderedResults.filter((c) => c.tier === "Strength"),
    [orderedResults]
  );
  const opportunities = useMemo(
    () => orderedResults.filter((c) => c.tier === "Opportunity"),
    [orderedResults]
  );
  const threats = useMemo(
    () => orderedResults.filter((c) => c.tier === "Threat"),
    [orderedResults]
  );
  const weaknesses = useMemo(
    () => orderedResults.filter((c) => c.tier === "Weakness"),
    [orderedResults]
  );

  /** ===== PDF ===== */
  const handleDownloadPDF = () => {
    if (!attemptId) return;

    const url =
      `https://dyad-pdf-service.vercel.app/api/generate-pdf` +
      `?attemptId=${encodeURIComponent(attemptId)}` +
      `&lang=${encodeURIComponent(language)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  /** ===== Render states ===== */
  if (loading || isSessionLoading) {
    return (
      <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p>{getTranslation("loading", language)}</p>
          </div>
        </main>
        <MadeWithDyad />
      </div>
    );
  }

  if (!orderedResults.length) {
    return (
      <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-xl mb-4">
              {language === "ar" ? "لم يتم العثور على نتائج" : "No results found"}
            </p>
            <Button onClick={() => router.push("/")}>{getTranslation("backToHome", language)}</Button>
          </div>
        </main>
        <MadeWithDyad />
      </div>
    );
  }

  /** ===== UI (same structure, centered header) ===== */
  return (
    <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {language === "ar" ? "تقرير أدائك" : "Your Performance Report"}
              </h1>
              <p className="text-gray-600">
                {language === "ar"
                  ? "تحليل كفاءات المبيعات الميدانية"
                  : "Field sales competency analysis"}
              </p>
            </div>

            <div className="flex justify-center mt-4">
              <Button
                onClick={handleDownloadPDF}
                className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                size="lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {language === "ar" ? "تحميل PDF" : "Download PDF"}
              </Button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-extrabold text-gray-900 text-center">
              {language === "ar" ? "ملخص الأداء" : "Performance Summary"}
            </h2>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <DonutChart percentage={computedTotal} color="#22c55e" />
                <p className="text-center mt-2 text-sm text-gray-600">
                  {language === "ar" ? "المجموع الكلي" : "Total Score"}:{" "}
                  <span className="font-extrabold text-gray-900">{computedTotal}%</span>
                </p>
              </div>

              <div>
                <CompetencyBars results={orderedResults} language={language} />
              </div>
            </div>
          </div>

          {/* SWOT Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-extrabold text-green-700 mb-2">
                {language === "ar" ? "نقاط القوة" : "Strengths"}
              </h3>
              {strengths.length ? (
                strengths.map((c) => {
                  const meta = COMPETENCY_META[c.competencyId];
                  return (
                    <p key={c.competencyId} className="text-green-900">
                      • {(language === "ar" ? meta?.labelAr : meta?.labelEn) + ` (${Math.round(c.percentage)}%)`}
                    </p>
                  );
                })
              ) : (
                <p className="text-green-900">{language === "ar" ? "لا يوجد" : "None"}</p>
              )}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-extrabold text-blue-700 mb-2">
                {language === "ar" ? "الفرص" : "Opportunities"}
              </h3>
              {opportunities.length ? (
                opportunities.map((c) => {
                  const meta = COMPETENCY_META[c.competencyId];
                  return (
                    <p key={c.competencyId} className="text-blue-900">
                      • {(language === "ar" ? meta?.labelAr : meta?.labelEn) + ` (${Math.round(c.percentage)}%)`}
                    </p>
                  );
                })
              ) : (
                <p className="text-blue-900">{language === "ar" ? "لا يوجد" : "None"}</p>
              )}
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-extrabold text-orange-700 mb-2">
                {language === "ar" ? "التهديدات" : "Threats"}
              </h3>
              {threats.length ? (
                threats.map((c) => {
                  const meta = COMPETENCY_META[c.competencyId];
                  return (
                    <p key={c.competencyId} className="text-orange-900">
                      • {(language === "ar" ? meta?.labelAr : meta?.labelEn) + ` (${Math.round(c.percentage)}%)`}
                    </p>
                  );
                })
              ) : (
                <p className="text-orange-900">{language === "ar" ? "لا يوجد" : "None"}</p>
              )}
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-extrabold text-red-700 mb-2">
                {language === "ar" ? "نقاط الضعف" : "Weaknesses"}
              </h3>
              {weaknesses.length ? (
                weaknesses.map((c) => {
                  const meta = COMPETENCY_META[c.competencyId];
                  return (
                    <p key={c.competencyId} className="text-red-900">
                      • {(language === "ar" ? meta?.labelAr : meta?.labelEn) + ` (${Math.round(c.percentage)}%)`}
                    </p>
                  );
                })
              ) : (
                <p className="text-red-900">{language === "ar" ? "لا يوجد" : "None"}</p>
              )}
            </div>
          </div>

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
           <div className="flex flex-col items-center justify-center text-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === "ar" ? "تقرير PDF كامل" : "Complete PDF Report"}
                </h3>
                <p className="text-gray-600">
 	 {language === "ar"
   	 ? "يتم إنشاء التقرير الكامل تلقائياً عبر خدمتنا الآمنة."
   	 : "Your full report is generated automatically via our secure service."}
	</p>
	</div>
              <Button
                onClick={handleDownloadPDF}
                className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                size="lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {language === "ar" ? "تحميل التقرير الكامل" : "Download Full Report"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <MadeWithDyad />
    </div>
  );
}
