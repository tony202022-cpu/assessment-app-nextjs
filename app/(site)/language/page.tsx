"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe } from "lucide-react";

export default function LanguagePage() {
  const { setLanguage, language } = useLocale();
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<"en" | "ar" | null>(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, name_en, name_ar")
        .order("created_at", { ascending: true });
      setAssessments(data || []);
      setLoading(false);
    };
    fetchAssessments();
  }, []);

  const handleLanguageChoice = (lang: "en" | "ar") => {
    setLanguage(lang);
    setSelectedLang(lang);
  };

  const startAssessment = (slug: string) => {
    router.push(`/${slug}/welcome`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-6 relative overflow-hidden">
      <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center animate-fadeIn">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Globe className="text-white" size={32} />
        </div>

        {!selectedLang ? (
          <>
            <h1 className="text-3xl font-extrabold text-white mb-4 tracking-wide">
              Choose Your Language
            </h1>
            <p className="text-white/70 text-sm mb-8">
              Select your preferred language to see available assessments
            </p>
            <div className="space-y-4">
              <button
                onClick={() => handleLanguageChoice("en")}
                className="w-full bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-all text-lg"
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChoice("ar")}
                className="w-full bg-white text-blue-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-all text-lg"
              >
                العربية
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-white mb-4">
              {selectedLang === "ar" ? "اختر التقييم" : "Select Assessment"}
            </h1>
            
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            ) : (
              <div className="space-y-3">
                {assessments.map((ass) => (
                  <button
                    key={ass.id}
                    onClick={() => startAssessment(ass.id)}
                    className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-4 px-6 rounded-2xl transition-all text-start flex justify-between items-center"
                  >
                    <span>{selectedLang === "ar" ? ass.name_ar : ass.name_en}</span>
                    <span className="text-xs opacity-60">ID: {ass.id}</span>
                  </button>
                ))}
                
                <button 
                  onClick={() => setSelectedLang(null)}
                  className="mt-4 text-white/60 text-sm hover:text-white underline"
                >
                  {selectedLang === "ar" ? "تغيير اللغة" : "Change Language"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-10 text-xs text-white/50">
          Powered by LevelUp Business Consulting
        </div>
      </div>
    </div>
  );
}