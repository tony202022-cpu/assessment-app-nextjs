"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";

type Lang = "en" | "ar";

function safeLang(x: string | null): Lang {
  return x === "ar" ? "ar" : "en";
}

function safeSlug(x: any) {
  return String(x || "").toLowerCase().trim();
}

// Fallback competency counts ONLY if config.competency_ids is missing.
// You said: SCAN = 7 competencies, MRI = 15 competencies.
function fallbackCompetencyCount(slug: string) {
  const s = safeSlug(slug);
  if (s.endsWith("mri") || s === "mri") return 15;
  return 7;
}

export default function InstructionsPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLocale();

  const slug = useMemo(() => safeSlug(params?.slug), [params]);
  const urlLang = useMemo<Lang>(() => safeLang(searchParams.get("lang")), [searchParams]);
  const attemptId = searchParams.get("attemptId");

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState<any>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (language !== urlLang) setLanguage(urlLang);
  }, [hydrated, language, urlLang, setLanguage]);

  // Load assessment config by slug (single source of truth)
  useEffect(() => {
    const load = async () => {
      if (!slug) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select(
            "id, slug, status, title_en, title_ar, name_en, name_ar, timer_minutes, num_questions, competency_ids"
          )
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.warn("Instructions: config load error:", error);
        }

        if (!data || data.status !== "active") {
          // Go back to the entry page if slug is invalid/inactive
          router.replace(`/${encodeURIComponent(slug)}`);
          return;
        }

        setConf(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, router]);

  if (!hydrated) return null;
  if (!slug) return null;
  if (loading) return null;
  if (!conf) return null;

  const ar = (language || urlLang) === "ar";
  const dir = ar ? "rtl" : "ltr";

  const assessmentId = String(conf.id);
  const mins = Number(conf.timer_minutes || 0);
  const qCount = Number(conf.num_questions || 0);

  // Competency count: prefer competency_ids length if present, else fallback (SCAN=7, MRI=15)
  const competencyCount = Array.isArray(conf.competency_ids)
    ? conf.competency_ids.length
    : fallbackCompetencyCount(slug);

  // For copy styling only
  const isMRI = slug.endsWith("mri") || slug === "mri";
  const isScan = slug.endsWith("scan") || slug === "scan";
  const effectiveIsScan = !isMRI && isScan ? true : !isMRI;

  const goToQuiz = () => {
    const a = attemptId ? `&attemptId=${encodeURIComponent(attemptId)}` : "";
    router.replace(
      `/${encodeURIComponent(slug)}/quiz?assessmentId=${encodeURIComponent(assessmentId)}${a}&lang=${encodeURIComponent(
        urlLang
      )}`
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10
                 bg-gradient-to-br from-[#0b1220] via-[#0f1f3a] to-[#102a5a]"
      dir={dir}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white/10 backdrop-blur-xl shadow-2xl p-8 sm:p-10 space-y-8 border border-white/15">
        {/* TITLE */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {ar ? "تعليمات قبل البدء" : "Before You Begin"}
          </h1>
          <p className="text-white/80 text-base sm:text-lg">
            {effectiveIsScan
              ? ar
                ? "فحص احترافي سريع يعطيك صورة دقيقة عن مستواك الحالي."
                : "A fast professional scan that gives you a clear snapshot of your current level."
              : ar
              ? "تقييم تشخيصي متقدم لتحليل عميق ودقيق لأدائك المهني."
              : "An advanced diagnostic assessment designed for deep, precise performance analysis."}
          </p>
        </div>

        {/* INFO BOX */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-6 space-y-5 text-white/90">
          <div className="grid gap-4 sm:grid-cols-2 text-sm sm:text-base">
            <div>
              ⏱️ <strong>{ar ? "التقييم بزمن محدد:" : "Timed assessment:"}</strong>{" "}
              {mins > 0
                ? ar
                  ? `حوالي ${mins} دقيقة.`
                  : `About ${mins} minutes.`
                : effectiveIsScan
                ? ar
                  ? "حوالي 20 دقيقة."
                  : "About 20 minutes."
                : ar
                ? "حوالي 90 دقيقة."
                : "About 90 minutes."}
            </div>

            <div>
              ✅ <strong>{ar ? "عدد الأسئلة:" : "Questions:"}</strong>{" "}
              {qCount > 0 ? qCount : effectiveIsScan ? 30 : 75}
            </div>

            <div>
              🎯 <strong>{ar ? "عدد الكفاءات:" : "Competencies:"}</strong>{" "}
              {competencyCount}
            </div>

            <div>
              🧠 <strong>{ar ? "أسلوب الإجابة:" : "Answering style:"}</strong>{" "}
              {ar ? "تلقائي، دون تفكير مطوّل." : "Instinctive, no overthinking."}
            </div>

            <div>
              🔒 <strong>{ar ? "لا توجد إجابات صحيحة أو خاطئة." : "No right or wrong answers."}</strong>
            </div>

            <div>
              👤 <strong>{ar ? "نتائج خاصة" : "Private results"}</strong>
            </div>
          </div>
        </div>

        {/* RULES */}
        <div className="space-y-4 text-white/95 text-sm sm:text-base leading-relaxed">
          <p>
            {ar
              ? "هذا التقييم لا يعتمد على المعرفة النظرية، بل على ردود فعلك وسلوكك في مواقف واقعية."
              : "This assessment does not test theoretical knowledge — it measures how you react in real-world situations."}
          </p>

          <p>
            {ar
              ? "جميع الخيارات مصممة لتبدو منطقية، اختر ما تميل إليه فعليًا في الواقع."
              : "All answer options are intentionally realistic. Choose what you would truly do."}
          </p>

          {!effectiveIsScan && (
            <p className="text-amber-200 font-semibold">
              ⚠️ {ar ? "لا يمكن إيقاف أو إعادة التقييم بعد البدء." : "Once started, the assessment cannot be paused or restarted."}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button
            className="w-full py-5 text-lg font-bold rounded-2xl bg-amber-400 text-slate-900 hover:bg-amber-300 transition"
            onClick={goToQuiz}
          >
            {ar
              ? effectiveIsScan
                ? "ابدأ الفحص الآن"
                : "ابدأ التقييم المتقدم"
              : effectiveIsScan
              ? "Start the Scan Now"
              : "Start the Advanced Assessment"}
          </Button>
        </div>

        {/* FOOTNOTE */}
        <div className="text-center text-xs text-white/50">
          {ar ? "ستظهر نتائجك فور الانتهاء مع تقرير مفصل." : "Your results will appear immediately with a detailed report."}
        </div>
      </div>
    </div>
  );
}