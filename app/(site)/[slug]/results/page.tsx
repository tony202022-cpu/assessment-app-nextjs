"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";

function ResultsContent() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const { language } = useLocale();
  const ar = language === "ar";

  const [attempt, setAttempt] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!attempt) return <div className="p-10 text-center">Results not found</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <h1 className="text-3xl font-black text-slate-900">
            {ar ? "نتائجك لـ " : "Your Results for "} {ar ? config?.name_ar : config?.name_en}
          </h1>
          <div className="mt-8 flex justify-center">
            <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-8 border-blue-600">
              <span className="text-5xl font-black text-slate-900">{attempt.total_percentage}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attempt.competency_results?.map((res: any) => (
            <div key={res.competencyId} className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-700">{res.name}</span>
                <span className="text-sm font-black text-blue-600">{res.percentage}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${res.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Upsell based on CSV */}
        {config?.upsell_url && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-amber-900">
              {ar ? "هل تريد التعمق أكثر؟" : "Want to go deeper?"}
            </h2>
            <p className="mt-2 text-amber-800">
              {ar ? "احصل على التقرير المتقدم وخطة عمل مخصصة." : "Get the advanced report and a personalized action plan."}
            </p>
            <Button className="mt-6 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 text-lg rounded-xl">
              <a href={config.upsell_url} target="_blank" rel="noreferrer">
                {ar ? "ارتقِ الآن 🚀" : "Upgrade Now 🚀"}
              </a>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DynamicResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}