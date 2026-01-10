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

  // Redirect ONLY in an effect (prevents flash/loop)
  useEffect(() => {
    if (redirectedRef.current) return;
    if (!hydrated) return;
    if (isLoading) return;

    if (!user) {
      redirectedRef.current = true;
      router.replace("/login");
    }
  }, [hydrated, isLoading, user, router]);

  // Safe guards to avoid UI flashes
  if (!hydrated || isLoading) return null;
  if (!user) return null;

  return (
    <div
      lang={language}
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-orange-50"
    >
      <Header />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-6 space-y-6">
          <h1 className="text-2xl font-extrabold text-center text-gray-800">
            {ar ? "تعليمات التقييم" : "Assessment Instructions"}
          </h1>

          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            {ar ? (
              <>
                <p>• ستشاهد مواقف وسيناريوهات عملية تتعلق بالمبيعات وخدمة العملاء.</p>
                <p>• اختر الإجابة التي تعكس تصرفك الفعلي في العمل.</p>
                <p>• لا توجد إجابات صحيحة أو خاطئة.</p>
                <p>• أجب بسرعة وبشكل صادق.</p>
                <p>• تأكد من وجود اتصال إنترنت مستقر.</p>
              </>
            ) : (
              <>
                <p>• You will see realistic sales and customer scenarios.</p>
                <p>• Choose the option that reflects what you actually do at work.</p>
                <p>• There are no right or wrong answers.</p>
                <p>• Answer steadily and honestly.</p>
                <p>• Make sure you have a stable internet connection.</p>
              </>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button className="px-8" onClick={() => router.push("/quiz")}>
              {ar ? "بدء التقييم" : "Start Assessment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
