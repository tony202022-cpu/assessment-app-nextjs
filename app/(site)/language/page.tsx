"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useRouter } from "next/navigation";

export default function LanguagePage() {
  const { setLanguage } = useLocale();
  const router = useRouter();

  const choose = (lang: "en" | "ar") => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
    // Redirect to the default assessment (Free Scan)
    router.push("/free-scan/welcome");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-6 relative overflow-hidden">
      <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-10 max-w-md w-full text-center animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-white mb-4 tracking-wide drop-shadow-lg">
          Choose Your Language
        </h1>
        <p className="text-white/80 text-sm mb-10 leading-relaxed">
          Select your preferred language to begin your personalized assessment experience
        </p>
        <div className="space-y-4">
          <button
            onClick={() => choose("en")}
            className="w-full flex items-center justify-center gap-3 bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.04] transition-all text-lg"
          >
            English
          </button>
          <button
            onClick={() => choose("ar")}
            className="w-full flex items-center justify-center gap-3 bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.04] transition-all text-lg"
          >
            العربية
          </button>
        </div>
        <div className="mt-10 text-xs text-white/70">
          Powered by LevelUp Business Consulting
        </div>
      </div>
    </div>
  );
}