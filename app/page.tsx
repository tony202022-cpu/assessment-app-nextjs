"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";

export default function WelcomePage() {
  const { language } = useLocale();
  const { user, isLoading } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true); // true = login, false = sign up
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/quiz");
    }
  }, [user, isLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message || (language === "ar" ? "فشل تسجيل الدخول" : "Login failed"));
      }
    } else {
      // Sign up with name
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message || (language === "ar" ? "فشل إنشاء الحساب" : "Sign-up failed"));
      } else {
        toast.success(language === "ar"
          ? "تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني."
          : "Account created! Please check your email to verify.");
        localStorage.setItem('assessmentUserName', fullName.trim() || email);
      }
    }
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-800">
            {language === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-orange-50"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="w-full">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mx-auto">
              <span className="text-white text-2xl font-bold">D</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-800">
              {language === "ar"
                ? "اكتشف إمكاناتك الحقيقية في المبيعات الميدانية"
                : "Discover Your True Field Sales Potential"}
            </h1>
            <p className="text-sm text-gray-600">
              {language === "ar"
                ? "تقييم سلوكي مدته 20 دقيقة يكشف نقاط قوتك ومناطق نموك — بدون أسئلة تقنية أو ضغط"
                : "A 20-minute behavioral assessment that reveals your strengths and growth areas — no technical knowledge, no pressure."}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 text-center">
              {isLogin 
                ? (language === "ar" ? "تسجيل الدخول" : "Sign In") 
                : (language === "ar" ? "إنشاء حساب" : "Create Account")}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              {/* Always show name field — for PDF report */}
              <div>
                <Input
                  placeholder={language === "ar" ? "الاسم الكامل (لعرضه في التقرير)" : "Full Name (for your report)"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder={language === "ar" ? "البريد الإلكتروني" : "Email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder={language === "ar" ? "كلمة المرور" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : isLogin 
                  ? (language === "ar" ? "تسجيل الدخول" : "Sign In")
                  : (language === "ar" ? "إنشاء حساب" : "Create Account")}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isLogin
                  ? (language === "ar" ? "ليس لديك حساب؟ اشترك" : "Don't have an account? Sign up")
                  : (language === "ar" ? "لديك حساب؟ سجل الدخول" : "Already have an account? Sign in")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            {[
              { en: "Behavioral Focus", ar: "يركّز على السلوك" },
              { en: "100% Mobile", ar: "يعمل على الجوال 100%" },
              { en: "Science-Backed", ar: "مبني على أبحاث" }
            ].map((item, i) => (
              <div key={i} className="bg-white/70 backdrop-blur-sm p-2 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium text-center">
                  {language === "ar" ? item.ar : item.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center w-full pb-8">
        <p className="text-xs text-gray-500">
          {language === "ar"
            ? "© 2026 Dyad. أدوات ذكية لأداء أفضل في المبيعات."
            : "© 2026 Dyad. Smart tools for better sales performance."}
        </p>
      </div>
    </div>
  );
}