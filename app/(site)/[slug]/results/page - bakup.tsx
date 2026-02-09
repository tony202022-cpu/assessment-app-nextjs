// FILE: app/(site)/[slug]/results/page.tsx
"use client";

import { getRecommendations } from "@/lib/pdf-recommendations";
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";
import {
  Download,
  Loader2,
  Share2,
  Check,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  ShieldAlert,
  Gift,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// ✅ DB truth (menu IDs)
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

// ✅ Client-side competency label registry (render-time translation)
const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation", ar: "عقلية التحفيز والموقف" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
};

// ✅ Robust menu detection
function isProbablyMRI(
  routeSlug?: string,
  attemptAssessmentId?: string | null,
  configType?: string | null
) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();

  if (s === "mri") return true;
  if (a.includes("mri")) return true;
  if (c === "mri") return true;
  if (a === MRI_ASSESSMENT_ID) return true;

  return false;
}

function isProbablyScan(
  routeSlug?: string,
  attemptAssessmentId?: string | null,
  configType?: string | null
) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();

  if (s === "scan") return true;
  if (a.includes("scan")) return true;
  if (c === "scan") return true;
  if (a === SCAN_ASSESSMENT_ID) return true;

  return false;
}

function ResultsContent() {
  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug;

  const searchParams = useSearchParams();
  const attemptId = (searchParams.get("attemptId") || "").trim();
  const langParam = (searchParams.get("lang") || "").trim();

  const { language, setLanguage } = useLocale();

  // ✅ Keep UI language synced to URL
  useEffect(() => {
    if (langParam === "ar" || langParam === "en") {
      if (langParam !== language) setLanguage(langParam);
    }
  }, [langParam, language, setLanguage]);

  const ar = language === "ar";

  const [attempt, setAttempt] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!attemptId) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      const attRes = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();

      if (cancelled) return;

      const att = attRes.data ?? null;
      setAttempt(att);

      try {
        const conf = await getAssessmentConfig(routeSlug);
        if (!cancelled) setConfig(conf);
      } catch {
        if (!cancelled) setConfig(null);
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, routeSlug]);

  const isMri = isProbablyMRI(routeSlug, attempt?.assessment_id, config?.type);
  const isScan = isProbablyScan(routeSlug, attempt?.assessment_id, config?.type) && !isMri;

  // ✅ Translate competency labels at render time
  const getCompetencyLabel = (res: any) => {
    const id = String(res?.competencyId || "").trim();
    const meta = id ? COMPETENCY_LABELS[id] : null;
    if (meta) return ar ? meta.ar : meta.en;
    return String(res?.name || id || "");
  };

  const chartData = useMemo(() => {
    const rows = attempt?.competency_results || [];
    return rows.map((res: any) => ({
      subject: getCompetencyLabel(res),
      A: Number(res?.percentage ?? 0),
      fullMark: 100,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ar]);

  const swotData = useMemo(() => {
    const results = attempt?.competency_results || [];
    return {
      strengths: results.filter((r: any) => r?.tier === "Strength"),
      opportunities: results.filter((r: any) => r?.tier === "Opportunity"),
      weaknesses: results.filter((r: any) => r?.tier === "Weakness"),
      threats: results.filter((r: any) => r?.tier === "Threat"),
    };
  }, [attempt]);

  const handleDownload = () => {
    if (!attemptId) return;
    setDownloading(true);

    try {
      window.location.href = `/api/generate-pdf?attemptId=${encodeURIComponent(
        attemptId
      )}&lang=${encodeURIComponent(language)}`;
    } catch (error) {
      console.error("Download failed", error);
      toast.error(ar ? "فشل تحميل التقرير" : "Failed to download report");
    } finally {
      setTimeout(() => setDownloading(false), 2500);
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(ar ? "تم نسخ الرابط!" : "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(ar ? "تعذر نسخ الرابط" : "Failed to copy link");
    }
  };

  const goToFullReport = () => {
    if (!attemptId) return;
    window.location.href = `/${routeSlug}/report?attemptId=${encodeURIComponent(
      attemptId
    )}&lang=${encodeURIComponent(language)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!attemptId) {
    return <div className="p-10 text-center">Missing attemptId</div>;
  }

  if (!attempt) {
    return (
      <div className="p-10 text-center">
        {ar ? "النتائج غير موجودة" : "Results not found"}
      </div>
    );
  }

  const assessmentName = ar ? config?.name_ar : config?.name_en;
  const showUpsell = isScan && !!config?.upsell_url;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
        {/* HERO */}
        <div className="bg-white rounded-3xl shadow-sm border p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold">
                <Check size={16} />
                {ar ? "اكتمل التقييم" : "Assessment Completed"}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                {ar ? "نتائجك لـ " : "Your Results for "}
                <br />
                <span className="text-blue-600">
                  {assessmentName || (isMri ? "MRI" : isScan ? "Scan" : "Assessment")}
                </span>
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-6 rounded-2xl flex gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  {downloading ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                  {ar ? "تحميل تقرير PDF" : "Download PDF Report"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-slate-200 text-slate-600 font-bold px-6 py-6 rounded-2xl flex gap-2 hover:bg-slate-50 transition-all active:scale-95"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Share2 size={20} />}
                  {ar ? "مشاركة النتائج" : "Share Results"}
                </Button>

                {/* Web report button (Scan + MRI) — SINGLE BUTTON ONLY */}
                <Button
                  onClick={goToFullReport}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-6 rounded-2xl flex gap-2 shadow-lg transition-all active:scale-95"
                >
                  {isMri ? <Sparkles size={20} /> : <FileText size={20} />}
                  {isMri
                    ? ar
                      ? "عرض تقرير MRI الكامل"
                      : "View Full MRI Report"
                    : ar
                    ? "عرض تقرير الويب الكامل"
                    : "View Full Web Report"}
                </Button>
              </div>

              <div className="text-sm text-slate-600 leading-relaxed">
                {isMri ? (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="text-indigo-600" size={18} />
                    {ar
                      ? "هذا تقرير MRI المتقدم — يشمل مخرجات إضافية وخطة تنفيذ."
                      : "This is the advanced MRI report — includes extra deliverables and an execution plan."}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <FileText className="text-slate-700" size={18} />
                    {ar
                      ? "هذا تقرير Scan المجاني — يتضمن توصيات عملية سريعة."
                      : "This is the free Scan report — includes quick practical recommendations."}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full max-w-[320px] aspect-square relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse opacity-50" />
              <div className="relative z-10 text-center">
                <div className="text-6xl font-black text-slate-900">
                  {Number(attempt.total_percentage ?? 0)}%
                </div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
                  {ar ? "النتيجة الإجمالية" : "OVERALL SCORE"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VISUALS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* RADAR */}
          <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-8">
              {ar ? "مخطط الكفاءات" : "Competency Profile"}
            </h3>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BREAKDOWN */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-900">
              {ar ? "تفاصيل الكفاءات" : "Competency Breakdown"}
            </h3>

            <div className="space-y-5">
              {(attempt.competency_results || []).map((res: any) => (
                <div key={res.competencyId || res.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">
                      {getCompetencyLabel(res)}
                    </span>
                    <span className="text-xs font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                      {Number(res.percentage ?? 0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-1000"
                      style={{ width: `${Number(res.percentage ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SWOT */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-900">
            {ar ? "تحليل SWOT الاستراتيجي" : "Strategic SWOT Analysis"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SwotCard
              ar={ar}
              titleAr="نقاط القوة"
              titleEn="Strengths"
              icon={<TrendingUp size={24} />}
              colorClass="bg-emerald-50 border-emerald-100 text-emerald-700"
              items={swotData.strengths}
              getLabel={getCompetencyLabel}
            />
            <SwotCard
              ar={ar}
              titleAr="الفرص"
              titleEn="Opportunities"
              icon={<Lightbulb size={24} />}
              colorClass="bg-blue-50 border-blue-100 text-blue-700"
              items={swotData.opportunities}
              getLabel={getCompetencyLabel}
            />
            <SwotCard
              ar={ar}
              titleAr="نقاط الضعف"
              titleEn="Weaknesses"
              icon={<AlertTriangle size={24} />}
              colorClass="bg-amber-50 border-amber-100 text-amber-700"
              items={swotData.weaknesses}
              getLabel={getCompetencyLabel}
            />
            <SwotCard
              ar={ar}
              titleAr="التهديدات"
              titleEn="Threats"
              icon={<ShieldAlert size={24} />}
              colorClass="bg-rose-50 border-rose-100 text-rose-700"
              items={swotData.threats}
              getLabel={getCompetencyLabel}
            />
          </div>
        </div>

{/* SCAN RECOMMENDATIONS */}
{isScan && (
  <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-8">
    <h3 className="text-2xl font-black text-slate-900">
      {ar ? "التوصيات العملية" : "Practical Recommendations"}
    </h3>

    {(attempt.competency_results || []).map((res: any) => {
      const recs = getRecommendations(res.competencyId, res.tier, language);
      if (!recs.length) return null;

      return (
        <div key={res.competencyId} className="space-y-3">
          <h4 className="font-bold text-slate-900">
            {getCompetencyLabel(res)}
          </h4>

          <ul className="list-disc list-inside text-slate-700 space-y-1">
            {recs.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      );
    })}
  </div>
)}

        {/* MRI Bonuses */}
        {isMri && (
          <div className="bg-white rounded-3xl border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <Gift className="text-indigo-600" size={26} />
              <h3 className="text-2xl font-black text-slate-900">
                {ar ? "البونصات والمخرجات الإضافية" : "Bonuses & Extra Deliverables"}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl border p-5 bg-slate-50">
                <div className="font-black text-slate-900 mb-2">
                  {ar ? "خطة 90 يوم" : "90-Day Action Plan"}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  {ar
                    ? "خطة تنفيذ يومية مبنية على نتائج كفاءاتك."
                    : "Daily execution plan based on your competency results."}
                </div>
              </div>

              <div className="rounded-2xl border p-5 bg-slate-50">
                <div className="font-black text-slate-900 mb-2">{ar ? "5 بونصات" : "5 Bonuses"}</div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  {ar ? "ملفات وأدوات قابلة للتطبيق مباشرة." : "Practical files and tools you can use immediately."}
                </div>
              </div>

              <div className="rounded-2xl border p-5 bg-slate-50">
                <div className="font-black text-slate-900 mb-2">{ar ? "عرض Bump" : "Bump Offer"}</div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  {ar ? "مقعد مجاني في دورة 3 أيام (اختياري)." : "Free seat in a 3-day course (optional)."}
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-600">
              {ar
                ? "ملاحظة: سنربط التحميلات داخل تقرير MRI النهائي لاحقًا."
                : "Note: We’ll wire actual downloads into the final MRI report later."}
            </div>
          </div>
        )}

        {/* Scan Upsell */}
        {showUpsell && (
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-10 text-center text-white shadow-xl shadow-amber-100">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="inline-block p-3 bg-white/20 backdrop-blur-md rounded-2xl text-3xl mb-2">
                🚀
              </div>
              <h2 className="text-3xl font-black">
                {ar ? "هل تريد التحول الكامل؟" : "Ready for Complete Transformation?"}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                {ar
                  ? "تقريرك المجاني كشف الأعراض. الآن حان وقت تقرير MRI الكامل وخطة التنفيذ."
                  : "Your free report revealed the symptoms. Now it’s time for the full MRI and execution plan."}
              </p>
              <Button
                asChild
                className="bg-white text-orange-600 hover:bg-slate-50 font-black px-10 py-8 text-xl rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <a href={config.upsell_url} target="_blank" rel="noreferrer">
                  {ar ? "ارتقِ بأدائك الآن" : "Upgrade Now"}
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SwotCard({
  ar,
  titleAr,
  titleEn,
  icon,
  colorClass,
  items,
  getLabel,
}: {
  ar: boolean;
  titleAr: string;
  titleEn: string;
  icon: React.ReactNode;
  colorClass: string;
  items: any[];
  getLabel: (x: any) => string;
}) {
  return (
    <div className={`border rounded-3xl p-6 space-y-4 ${colorClass}`}>
      <div className="flex items-center gap-3">
        {icon}
        <h4 className="text-lg font-bold">{ar ? titleAr : titleEn}</h4>
      </div>

      <ul className="space-y-2 text-slate-900">
        {items?.length ? (
          items.map((s: any) => (
            <li key={s.competencyId || s.name} className="flex items-center gap-2 text-sm font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {getLabel(s)}
            </li>
          ))
        ) : (
          <li className="text-sm italic opacity-60">{ar ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>
        )}
      </ul>
    </div>
  );
}

export default function DynamicResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
