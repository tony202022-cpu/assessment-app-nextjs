"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";

export default function WelcomePage() {
  const { language } = useLocale();
  const ar = language === "ar";

  return (
    <div
      lang={language}
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 flex items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-sm text-white/80 mb-2">
            {ar
              ? "By Dr. Kifah Fayad – Levelup Business Consulting"
              : "By Dr. Kifah Fayad – Levelup Business Consulting"}
          </div>

          {/* UPDATED ARABIC HEADLINE */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
            {ar
              ? "تشخيص لكفاءات ومهارات مندوبي المبيعات"
              : "Selling Skills SCAN™"}
          </h1>

          <div className="mt-2 text-white/90 text-base">
            {ar
              ? "Selling Skills SCAN"
              : "Sales SCAN for Outdoor Sales Professionals"}
          </div>

          <div className={`mt-5 grid grid-cols-3 gap-3 ${ar ? "text-right" : "text-left"}`}>
            
            {/* BOX 1 — UPDATED ARABIC TEXT */}
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">📊</div>
              <div className="text-sm font-bold">
                {ar ? "تحليل" : "Full Analysis"}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {ar ? "٧ كفاءات بيع للمندوبين" : "7 core areas"}
              </div>
            </div>

            {/* BOX 2 — INCREASED ARABIC FONT SIZE */}
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">🧠</div>
              <div className="text-sm font-bold">
                {ar ? "تقييم سلوكي" : "Behavioral"}
              </div>
              <div className={`${ar ? "text-sm" : "text-xs"} text-white/80 mt-1`}>
                {ar ? "مواقف واقعية" : "Real scenarios"}
              </div>
            </div>

            {/* BOX 3 — INCREASED ARABIC FONT SIZE */}
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">⏱️</div>
              <div className="text-sm font-bold">
                {ar ? "مؤقّت" : "Timed"}
              </div>
              <div className={`${ar ? "text-sm" : "text-xs"} text-white/80 mt-1`}>
                {ar ? "20 دقيقة" : "20 minutes"}
              </div>
            </div>

          </div>

          <p className="mt-5 text-white/90 text-sm leading-relaxed">
            {ar
              ? "هذا تقييم سلوكي، ليس اختبار معلومات. سيمنحك قراءة دقيقة لنقاط القوة والضعف وسلوكك تحت الضغط، ومؤشر أداء ميداني واقعي."
              : "This test measures your behavior and instant reaction, NOT your knowledge. You’ll get a clear read on strengths, weaknesses, stress behavior, and real field performance."}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold h-12 transition shadow-lg"
          >
            {ar ? "ابدأ التقييم الآن 🚀" : "Start the assessment 🚀"}
          </Link>

          <div className="mt-3 text-xs text-white/80">
            {ar
              ? "🔒 خصوصيتك محفوظة • 📄 تقرير فوري بعد الانتهاء"
              : "🔒 Private & secure • 📄 Instant report after completion"}
          </div>
        </div>
      </div>
    </div>
  );
}
