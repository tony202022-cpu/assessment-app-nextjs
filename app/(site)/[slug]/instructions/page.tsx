"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";

const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

function safeLang(x: string | null) {
  return x === "ar" ? "ar" : "en";
}

export default function InstructionsPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLocale();

  const urlLang = useMemo(() => safeLang(searchParams.get("lang")), [searchParams]);
  const attemptId = searchParams.get("attemptId");

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (language !== urlLang) setLanguage(urlLang);
  }, [language, urlLang, setLanguage]);

  if (!hydrated) return null;

  const isScan = slug !== "mri";
  const assessmentId = isScan ? SCAN_ASSESSMENT_ID : MRI_ASSESSMENT_ID;
  const ar = language === "ar";

  const goToQuiz = () => {
    router.replace(
      `/${slug}/quiz?assessmentId=${assessmentId}&attemptId=${attemptId}&lang=${urlLang}`
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6
                 bg-gradient-to-br from-[#0b1220] via-[#0f1f3a] to-[#102a5a]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white/10 backdrop-blur-xl
                      shadow-2xl p-8 sm:p-10 space-y-8 border border-white/15">

        {/* TITLE */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {ar ? "تعليمات قبل البدء" : "Before You Begin"}
          </h1>
          <p className="text-white/80 text-base sm:text-lg">
            {isScan
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
              ⏱️{" "}
              <strong>
                {ar ? "التقييم بزمن محدد:" : "Timed assessment:"}
              </strong>{" "}
              {isScan
                ? ar ? "حوالي 20 دقيقة." : "About 20 minutes."
                : ar ? "حوالي 90 دقيقة." : "About 90 minutes."}
            </div>

            <div>
              🧠{" "}
              <strong>
                {ar ? "أسلوب الإجابة:" : "Answering style:"}
              </strong>{" "}
              {ar ? "تلقائي، دون تفكير مطوّل." : "Instinctive, no overthinking."}
            </div>

            <div>
              🔒{" "}
              <strong>
                {ar ? "لا توجد إجابات صحيحة أو خاطئة." : "No right or wrong answers."}
              </strong>
            </div>

            <div>
              🎯{" "}
              <strong>
                {ar ? "يقيس سلوكك الحقيقي" : "Measures real behavior"}
              </strong>
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

          {!isScan && (
            <p className="text-amber-200 font-semibold">
              ⚠️ {ar
                ? "لا يمكن إيقاف أو إعادة التقييم بعد البدء."
                : "Once started, the assessment cannot be paused or restarted."}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button
            className="w-full py-5 text-lg font-bold rounded-2xl
                       bg-amber-400 text-slate-900
                       hover:bg-amber-300 transition"
            onClick={goToQuiz}
          >
            {ar
              ? isScan
                ? "ابدأ الفحص الآن"
                : "ابدأ التقييم المتقدم"
              : isScan
              ? "Start the Scan Now"
              : "Start the Advanced Assessment"}
          </Button>
        </div>

        {/* FOOTNOTE */}
        <div className="text-center text-xs text-white/50">
          {ar
            ? "ستظهر نتائجك فور الانتهاء مع تقرير مفصل."
            : "Your results will appear immediately with a detailed report."}
        </div>
      </div>
    </div>
  );
}
