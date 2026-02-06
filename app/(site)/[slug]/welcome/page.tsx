"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";

export default function DynamicWelcomePage() {
  const { slug } = useParams();
  const { language } = useLocale();
  const ar = language === "ar";
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    getAssessmentConfig(slug as string).then(setConfig);
  }, [slug]);

  if (!config) return null;

  const title = ar ? config.name_ar : config.name_en;

  return (
    <div
      lang={language}
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 flex items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-sm text-white/80 mb-2">
            By Dr. Kifah Fayad – Levelup Business Consulting
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
            {title}
          </h1>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">📊</div>
              <div className="text-sm font-bold">{ar ? "تحليل" : "Analysis"}</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">🧠</div>
              <div className="text-sm font-bold">{ar ? "سلوكي" : "Behavioral"}</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-white/95">
              <div className="text-xl mb-1">⏱️</div>
              <div className="text-sm font-bold">{config.timer_minutes} {ar ? "دقيقة" : "min"}</div>
            </div>
          </div>

          <p className="mt-5 text-white/90 text-sm leading-relaxed">
            {ar
              ? "هذا تقييم سلوك وردات فعل وليس اختبار معلومات. سيمنحك قراءة دقيقة لنقاط القوة والضعف وسلوكك تحت الضغط."
              : "This measures your behavior and instant reaction, NOT your knowledge. You’ll get a clear read on strengths, weaknesses, and stress behavior."}
          </p>

          <Link
            href={`/${slug}/login`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold h-12 transition shadow-lg"
          >
            {ar ? "ابدأ الآن 🚀" : "Start Now 🚀"}
          </Link>
        </div>
      </div>
    </div>
  );
}