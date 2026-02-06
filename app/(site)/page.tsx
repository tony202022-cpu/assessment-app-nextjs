"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { 
  CheckCircle2, 
  BarChart3, 
  Target, 
  Zap, 
  ArrowRight, 
  ShieldCheck,
  Users
} from "lucide-react";

export default function LandingPage() {
  const { language } = useLocale();
  const ar = language === "ar";

  return (
    <div className="min-h-screen flex flex-col bg-white" dir={ar ? "rtl" : "ltr"}>
      <Header />
      
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative py-20 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent_50%)]" />
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold">
                <Zap size={16} />
                {ar ? "أداة تقييم المبيعات رقم 1" : "The #1 Sales Assessment Tool"}
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black leading-tight">
                {ar ? "اكتشف الحمض النووي لمبيعاتك مع " : "Discover Your Sales DNA with "}
                <span className="text-blue-500">Sales MRI</span>
              </h1>
              
              <p className="text-xl text-slate-400 leading-relaxed">
                {ar 
                  ? "توقف عن التخمين. احصل على تحليل دقيق لـ 15 كفاءة بيعية أساسية واعرف بالضبط أين تكمن نقاط قوتك وفجوات أدائك."
                  : "Stop guessing. Get a precise analysis of 15 core sales competencies and know exactly where your strengths and performance gaps lie."}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 text-lg rounded-xl w-full sm:w-auto">
                  <Link href="/language">
                    {ar ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
                    <ArrowRight className={ar ? "mr-2 rotate-180" : "ml-2"} size={20} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-slate-700 text-white hover:bg-slate-800 font-bold px-8 py-6 text-lg rounded-xl w-full sm:w-auto">
                  <Link href="#features">
                    {ar ? "تعرف على المزيد" : "Learn More"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="py-12 border-b bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-black text-slate-900">10k+</div>
                <div className="text-sm text-slate-500">{ar ? "تقييم مكتمل" : "Assessments Done"}</div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">15</div>
                <div className="text-sm text-slate-500">{ar ? "كفاءة مقاسة" : "Competencies Measured"}</div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">98%</div>
                <div className="text-sm text-slate-500">{ar ? "دقة التحليل" : "Accuracy Rate"}</div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">24/7</div>
                <div className="text-sm text-slate-500">{ar ? "دعم فني" : "Support Available"}</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                {ar ? "لماذا تختار Sales MRI؟" : "Why Choose Sales MRI?"}
              </h2>
              <p className="text-slate-500">
                {ar 
                  ? "نحن لا نقدم مجرد أرقام، بل نقدم رؤى استراتيجية تحول مسارك المهني."
                  : "We don't just provide numbers; we provide strategic insights that transform your career path."}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-white border shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{ar ? "تحليل SWOT شامل" : "Full SWOT Analysis"}</h3>
                <p className="text-slate-500 leading-relaxed">
                  {ar 
                    ? "احصل على رؤية واضحة لنقاط القوة والفرص والتهديدات في أسلوبك البيعي."
                    : "Get a clear view of strengths, opportunities, and threats in your selling style."}
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-white border shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                  <Target size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{ar ? "توصيات مخصصة" : "Personalized Tips"}</h3>
                <p className="text-slate-500 leading-relaxed">
                  {ar 
                    ? "خطة عمل فورية بناءً على نتائجك لتحسين أدائك في الميدان."
                    : "An immediate action plan based on your results to improve your field performance."}
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-white border shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{ar ? "تقرير PDF احترافي" : "Professional PDF"}</h3>
                <p className="text-slate-500 leading-relaxed">
                  {ar 
                    ? "تقرير مفصل يمكنك مشاركته مع مديرك أو استخدامه لتطوير ذاتك."
                    : "A detailed report you can share with your manager or use for self-development."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 bg-blue-600 text-white">
          <div className="container mx-auto px-6 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-black">
              {ar ? "هل أنت مستعد للارتقاء بمبيعاتك؟" : "Ready to Level Up Your Sales?"}
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {ar 
                ? "انضم إلى آلاف المحترفين الذين اكتشفوا إمكاناتهم الحقيقية."
                : "Join thousands of professionals who have discovered their true potential."}
            </p>
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-black px-10 py-8 text-xl rounded-2xl shadow-xl">
              <Link href="/language">
                {ar ? "ابدأ الآن مجاناً" : "Start Now for Free"}
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}