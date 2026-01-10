"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";

export default function InstructionsPage() {
  const router = useRouter();
  const { language } = useLocale();
  const { user, isLoading } = useSession();
  const ar = language === "ar";

  const [hydrated, setHydrated] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (!hydrated) return;
    if (isLoading) return;

    if (!user) {
      redirectedRef.current = true;
      router.replace("/login");
    }
  }, [hydrated, isLoading, user, router]);

  if (!hydrated || isLoading) return null;
  if (!user) return null;

  return (
    <div
      lang={language}
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700"
    >
      <Header />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-white drop-shadow-lg">
            {ar ? "تعليمات التقييم" : "Assessment Instructions"}
          </h1>

{/* Instructions List */}
<div className="space-y-2 text-base sm:text-lg text-white/90 leading-snug">
  {ar ? (
    <>
      <p className="font-semibold">• ستشاهد مواقف وسيناريوهات عملية تتعلق بالمبيعات وخدمة العملاء.</p>
      <p className="font-semibold">• اختر الإجابة التي تعكس تصرفك الفعلي في العمل.</p>
      <p className="font-semibold">• لا توجد إجابات صحيحة أو خاطئة.</p>
      <p className="font-semibold">• أجب بسرعة وبشكل صادق.</p>
      <p className="font-semibold">• تأكد من وجود اتصال إنترنت مستقر.</p>

      {/* NEW ARABIC INSTRUCTION */}
      <p className="font-bold text-amber-300">
        • أجب بسرعة. إذا انتهى الوقت سيتم إرسال إجاباتك تلقائياً. الأسئلة غير المجابة تحصل على 0 نقاط وتؤثر سلباً على التقرير النهائي.
      </p>
    </>
  ) : (
    <>
      <p className="font-semibold">• You will see realistic sales and customer scenarios.</p>
      <p className="font-semibold">• Choose the option that reflects what you actually do at work.</p>
      <p className="font-semibold">• There are no right or wrong answers.</p>
      <p className="font-semibold">• Answer steadily and honestly.</p>
      <p className="font-semibold">• Make sure you have a stable internet connection.</p>

      {/* NEW ENGLISH INSTRUCTION */}
      <p className="font-bold text-amber-300">
        • Answer quickly. If time runs out, the system will auto‑submit your answers. Unanswered questions receive 0 points and negatively affect your final report.
      </p>
    </>
  )}
</div>


          {/* Start Button */}
          <div className="flex justify-center pt-2">
            <Button
              className="px-8 py-3 text-lg font-bold bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl shadow-lg transition-all duration-200"
              onClick={() => router.push("/quiz")}
            >
              {ar ? "بدء التقييم" : "Start Assessment"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
