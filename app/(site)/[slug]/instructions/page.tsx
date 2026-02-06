"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";

export default function InstructionsPage() {
  const { slug } = useParams();
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
      router.replace(`/${slug}/login`);
    }
  }, [hydrated, isLoading, user, router, slug]);

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-white drop-shadow-lg">
            {ar ? "تعليمات هامة قبل التقييم" : "Assessment Instructions"}
          </h1>

          <div className="space-y-2 text-base sm:text-lg text-white/90 leading-snug">
            {ar ? (
              <>
                <p>• ستشاهد مواقف وسيناريوهات عملية تتعلق بالمبيعات.</p>
                <p>• اختر الإجابة التي تعكس تصرفك الفعلي.</p>
                <p>• لا توجد إجابات صحيحة أو خاطئة.</p>
                <p className="font-bold text-amber-300">• أجب بسرعة. إذا انتهى الوقت سيتم إرسال إجاباتك تلقائياً.</p>
              </>
            ) : (
              <>
                <p>• You will see realistic sales scenarios.</p>
                <p>• Choose the option that reflects what you actually do.</p>
                <p>• There are no right or wrong answers.</p>
                <p className="font-bold text-amber-300">• Answer quickly. If time runs out, the system will auto‑submit.</p>
              </>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button
              className="px-8 py-3 text-lg font-bold bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl shadow-lg"
              onClick={() => router.push(`/${slug}/quiz`)}
            >
              {ar ? "بدء التقييم" : "Start Assessment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}