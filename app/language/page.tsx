"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useRouter } from "next/navigation";

export default function LanguagePage() {
  const { setLanguage } = useLocale();
  const router = useRouter();

  const choose = (lang: "en" | "ar") => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
    router.push("/welcome");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-6 relative overflow-hidden">

      {/* Soft glowing circles */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-amber-400/20 rounded-full blur-3xl"></div>

      {/* Main card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-10 max-w-md w-full text-center animate-fadeIn">

        <h1 className="text-3xl font-extrabold text-white mb-4 tracking-wide drop-shadow-lg">
          Choose Your Language
        </h1>

        <p className="text-white/80 text-sm mb-10 leading-relaxed">
          Select your preferred language to begin your personalized assessment experience
        </p>

        {/* Buttons */}
        <div className="space-y-4">

          {/* English */}
          <button
            onClick={() => choose("en")}
            className="w-full flex items-center justify-center gap-3 bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.04] hover:bg-blue-50 transition-all duration-200 text-lg"
          >
            English
          </button>

          {/* Arabic */}
          <button
            onClick={() => choose("ar")}
            className="w-full flex items-center justify-center gap-3 bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.04] hover:bg-blue-50 transition-all duration-200 text-lg"
          >
            العربية
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-xs text-white/70">
          Powered by LevelUp Business Consulting
        </div>
      </div>
    </div>
  );
}
