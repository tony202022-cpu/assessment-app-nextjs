"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";
import { Download, Loader2, Share2, Check, TrendingUp, Lightbulb, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

function ResultsContent() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const { language } = useLocale();
  const ar = language === "ar";

  const [attempt, setAttempt] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [attRes, confRes] = await Promise.all([
        supabase.from("quiz_attempts").select("*").eq("id", attemptId).single(),
        getAssessmentConfig(slug as string)
      ]);
      setAttempt(attRes.data);
      setConfig(confRes);
      setLoading(false);
    };
    if (attemptId) load();
  }, [attemptId, slug]);

  const chartData = useMemo(() => {
    if (!attempt?.competency_results) return [];
    return attempt.competency_results.map((res: any) => ({
      subject: res.name,
      A: res.percentage,
      fullMark: 100,
    }));
  }, [attempt]);

  const swotData = useMemo(() => {
    if (!attempt?.competency_results) return { strengths: [], opportunities: [], weaknesses: [], threats: [] };
    
    const results = attempt.competency_results;
    return {
      strengths: results.filter((r: any) => r.tier === "Strength"),
      opportunities: results.filter((r: any) => r.tier === "Opportunity"),
      weaknesses: results.filter((r: any) => r.tier === "Weakness"),
      threats: results.filter((r: any) => r.tier === "Threat"),
    };
  }, [attempt]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      window.location.href = `/api/generate-pdf?attemptId=${attemptId}&lang=${language}`;
    } catch (error) {
      console.error("Download failed", error);
      toast.error(ar ? "فشل تحميل التقرير" : "Failed to download report");
    } finally {
      setTimeout(() => setDownloading(false), 3000);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(ar ? "تم نسخ الرابط!" : "Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!attempt) return <div className="p-10 text-center">Results not found</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
        {/* HERO SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold">
                <Check size={16} />
                {ar ? "اكتمل التقييم" : "Assessment Completed"}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                {ar ? "نتائجك لـ " : "Your Results for "} <br/>
                <span className="text-blue-600">{ar ? config?.name_ar : config?.name_en}</span>
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
              </div>
            </div>

            <div className="w-full max-w-[320px] aspect-square relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse opacity-50" />
              <div className="relative z-10 text-center">
                <div className="text-6xl font-black text-slate-900">{attempt.total_percentage}%</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
                  {ar ? "النتيجة الإجمالية" : "Overall Score"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VISUALIZATION SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* RADAR CHART */}
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
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
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

          {/* LIST VIEW */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-900">
              {ar ? "تفاصيل الكفاءات" : "Competency Breakdown"}
            </h3>
            <div className="space-y-5">
              {attempt.competency_results?.map((res: any) => (
                <div key={res.competencyId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">{res.name}</span>
                    <span className="text-xs font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                      {res.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000" 
                      style={{ width: `${res.percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SWOT ANALYSIS SECTION */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-900">
            {ar ? "تحليل SWOT الاستراتيجي" : "Strategic SWOT Analysis"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STRENGTHS */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <TrendingUp size={24} />
                <h4 className="text-lg font-bold">{ar ? "نقاط القوة" : "Strengths"}</h4>
              </div>
              <ul className="space-y-2">
                {swotData.strengths.length > 0 ? swotData.strengths.map((s: any) => (
                  <li key={s.competencyId} className="flex items-center gap-2 text-emerald-900 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {s.name}
                  </li>
                )) : <li className="text-emerald-600/60 text-sm italic">{ar ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>}
              </ul>
            </div>

            {/* OPPORTUNITIES */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-blue-700">
                <Lightbulb size={24} />
                <h4 className="text-lg font-bold">{ar ? "الفرص" : "Opportunities"}</h4>
              </div>
              <ul className="space-y-2">
                {swotData.opportunities.length > 0 ? swotData.opportunities.map((s: any) => (
                  <li key={s.competencyId} className="flex items-center gap-2 text-blue-900 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {s.name}
                  </li>
                )) : <li className="text-blue-600/60 text-sm italic">{ar ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>}
              </ul>
            </div>

            {/* WEAKNESSES */}
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertTriangle size={24} />
                <h4 className="text-lg font-bold">{ar ? "نقاط الضعف" : "Weaknesses"}</h4>
              </div>
              <ul className="space-y-2">
                {swotData.weaknesses.length > 0 ? swotData.weaknesses.map((s: any) => (
                  <li key={s.competencyId} className="flex items-center gap-2 text-amber-900 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {s.name}
                  </li>
                )) : <li className="text-amber-600/60 text-sm italic">{ar ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>}
              </ul>
            </div>

            {/* THREATS */}
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <ShieldAlert size={24} />
                <h4 className="text-lg font-bold">{ar ? "التهديدات" : "Threats"}</h4>
              </div>
              <ul className="space-y-2">
                {swotData.threats.length > 0 ? swotData.threats.map((s: any) => (
                  <li key={s.competencyId} className="flex items-center gap-2 text-rose-900 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {s.name}
                  </li>
                )) : <li className="text-rose-600/60 text-sm italic">{ar ? "لا توجد نتائج في هذه الفئة" : "No results in this category"}</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* UPSELL SECTION */}
        {config?.upsell_url && (
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-10 text-center text-white shadow-xl shadow-amber-100">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="inline-block p-3 bg-white/20 backdrop-blur-md rounded-2xl text-3xl mb-2">🚀</div>
              <h2 className="text-3xl font-black">
                {ar ? "هل تريد التحول الكامل؟" : "Ready for Complete Transformation?"}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                {ar 
                  ? "تقريرك المجاني كشف الأعراض. الآن حان وقت الفحص الكامل بالرنين المغناطيسي والحصول على خطة عمل مخصصة للوصول إلى القمة." 
                  : "Your free report revealed the symptoms. Now it's time for the full MRI scan and a personalized action plan to reach the summit."}
              </p>
              <Button asChild className="bg-white text-orange-600 hover:bg-slate-50 font-black px-10 py-8 text-xl rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95">
                <a href={config.upsell_url} target="_blank" rel="noreferrer">
                  {ar ? "ارتقِ بأدائك الآن" : "Upgrade Your Performance Now"}
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DynamicResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}