"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";

type AssessmentType = "scan" | "mri";

// ✅ your routes are /scan/* and /mri/*
function getAssessmentType(slug: string): AssessmentType {
  return slug === "mri" ? "mri" : "scan";
}

// ✅ DB truth (menu IDs)
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

function safeLang(x: string | null) {
  const v = String(x || "").toLowerCase().trim();
  return v === "ar" ? "ar" : "en";
}

export default function InstructionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { language, setLanguage } = useLocale();
  const { user, isLoading } = useSession();

  const langParamRaw = searchParams.get("lang"); // "en" | "ar" | null
  const urlLang = useMemo(() => safeLang(langParamRaw), [langParamRaw]);
  const ar = language === "ar";

  const [hydrated, setHydrated] = useState(false);

  // ✅ hydration + language sync
  useEffect(() => {
    setHydrated(true);

    // only accept en/ar
    if (urlLang !== language) {
      setLanguage(urlLang as "en" | "ar");
    }
  }, [urlLang, language, setLanguage]);

  // ✅ auth guard
  useEffect(() => {
    if (!hydrated || isLoading) return;

    if (!user) {
      router.replace(`/${slug}/start?lang=${urlLang}`);
    }
  }, [hydrated, isLoading, user, router, slug, urlLang]);

  if (!hydrated || isLoading || !user) return null;

  const type = getAssessmentType(slug);
  const isScan = type === "scan";

  // ✅ always pass assessmentId so the quiz can load deterministically
  const assessmentId = isScan ? SCAN_ASSESSMENT_ID : MRI_ASSESSMENT_ID;

  const goToQuiz = () => {
    // Force a deterministic URL even if the quiz page relies on query params
    router.push(`/${slug}/quiz?assessmentId=${encodeURIComponent(assessmentId)}&lang=${encodeURIComponent(urlLang)}`);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-[#0b1220] via-[#0f1f3a] to-[#102a5a]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white/10 backdrop-blur-xl shadow-xl p-8 space-y-6 border border-white/15">
        {/* TITLE */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-white">
          {ar ? "تعليمات قبل البدء" : "Before You Begin"}
        </h1>

        {/* SUBTITLE */}
        <p className="text-center text-white/90 text-base sm:text-lg font-medium">
          {isScan
            ? ar
              ? "فحص مهني سريع – يرجى القراءة بعناية"
              : "Quick professional scan — please read carefully"
            : ar
            ? "تقييم متقدم (MRI) – التزام كامل مطلوب"
            : "Advanced MRI assessment — full commitment required"}
        </p>

        {/* INSTRUCTIONS */}
        <div className="space-y-4 text-white/95 text-sm sm:text-base leading-relaxed">
          {isScan ? (
            <>
              <p>🎯 {ar ? "هذا الفحص يعطيك لمحة دقيقة عن مستواك الحالي." : "This scan gives you a clear snapshot of your current level."}</p>
              <p>⏱️ {ar ? "التقييم بزمن محدد، اتبع حدسك." : "The assessment is timed — follow your instinct."}</p>
              <p>🧠 {ar ? "اختر ما يعكس تصرفك الحقيقي." : "Choose what reflects your real behavior."}</p>
              <p>🔒 {ar ? "لا توجد إجابات صحيحة أو خاطئة." : "There are no right or wrong answers."}</p>
            </>
          ) : (
            <>
              <p>🎯 {ar ? "هذا تقييم احترافي متقدم للتحليل العميق." : "This is a deep professional assessment."}</p>
              <p>⏱️ {ar ? "لا يمكن إيقاف أو إعادة التقييم." : "The assessment cannot be paused or restarted."}</p>
              <p>🧠 {ar ? "أجب بصدق وتلقائية." : "Answer honestly and instinctively."}</p>
              <p>⚠️ {ar ? "أي مساعدة خارجية تقلل دقة النتائج." : "External help reduces result accuracy."}</p>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button
            className="w-full py-4 text-base sm:text-lg font-bold rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition"
            onClick={goToQuiz}
          >
            {ar
              ? isScan
                ? "ابدأ الفحص"
                : "ابدأ التقييم المتقدم"
              : isScan
              ? "Start Scan"
              : "Start Assessment"}
          </Button>

          {/* Helpful debug hint (invisible to users, but safe) */}
          <div className="mt-3 text-center text-xs text-white/60">
            {ar ? "معرّف التقييم:" : "Assessment ID:"}{" "}
            <span style={{ direction: "ltr", display: "inline-block" }}>{assessmentId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
