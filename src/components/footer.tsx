"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import Link from "next/link";

const Footer = () => {
  const { language } = useLocale();
  const ar = language === "ar";

  return (
    <footer className="bg-slate-50 border-t py-12" dir={ar ? "rtl" : "ltr"}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                LU
              </div>
              <span className="font-black text-slate-900">LevelUp</span>
            </div>
            <p className="text-slate-500 max-w-xs">
              {ar 
                ? "منصة التقييم الرائدة لتمكين محترفي المبيعات في الميدان من خلال البيانات والرؤى الاستراتيجية."
                : "The leading assessment platform empowering field sales professionals through data and strategic insights."}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900">{ar ? "روابط سريعة" : "Quick Links"}</h4>
            <ul className="space-y-2 text-slate-500">
              <li><Link href="/" className="hover:text-blue-600 transition-colors">{ar ? "الرئيسية" : "Home"}</Link></li>
              <li><Link href="/dashboard" className="hover:text-blue-600 transition-colors">{ar ? "لوحة التحكم" : "Dashboard"}</Link></li>
              <li><Link href="/language" className="hover:text-blue-600 transition-colors">{ar ? "ابدأ التقييم" : "Start Assessment"}</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900">{ar ? "تواصل معنا" : "Contact"}</h4>
            <ul className="space-y-2 text-slate-500">
              <li>support@levelup.com</li>
              <li>{ar ? "دبي، الإمارات العربية المتحدة" : "Dubai, UAE"}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} LevelUp Business Consulting. {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;