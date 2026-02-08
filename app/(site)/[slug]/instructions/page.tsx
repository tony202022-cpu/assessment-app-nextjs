"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";

type AssessmentType = "scan" | "mri";

// ✅ your routes are /scan/* and /mri/*
function getAssessmentType(slug: string): AssessmentType {
  return slug === "mri" ? "mri" : "scan";
}

export default function InstructionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { language, setLanguage } = useLocale();
  const { user, isLoading } = useSession();

  const langParam = searchParams.get("lang"); // "en" | "ar" | null
  const ar = language === "ar";

  const [hydrated, setHydrated] = useState(false);

  // ✅ hydration + language sync
  useEffect(() => {
    setHydrated(true);

    if (langParam && langParam !== language) {
      setLanguage(langParam as "en" | "ar");
    }
  }, [langParam, language, setLanguage]);

  // ✅ auth guard
  useEffect(() => {
    if (!hydrated || isLoading) return;

    if (!user) {
      router.replace(`/${slug}/start?lang=${langParam || "en"}`);
    }
  }, [hydrated, isLoading, user, router, slug, langParam]);

  if (!hydrated || isLoading || !user) return null;

  const type = getAssessmentType(slug);
  const isScan = type === "scan";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-[#1a5cff] via-[#2f7bff] to-[#3b82f6]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white/15 backdrop-blur-xl shadow-xl p-8 space-y-6">
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
            className="w-full py-4 text-base sm:text-lg font-bold rounded-xl bg-black text-white hover:bg-slate-900 transition"
            onClick={() => router.push(`/${slug}/quiz?lang=${langParam || "en"}`)}
          >
            {ar
              ? isScan
                ? "ابدأ الفحص"
                : "ابدأ التقييم المتقدم"
              : isScan
              ? "Start Scan"
              : "Start Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
