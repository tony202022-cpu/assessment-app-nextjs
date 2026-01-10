"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLocale();
  const { isLoading } = useSession();
  const ar = language === "ar";

  // -----------------------------
  // ALL HOOKS MUST COME FIRST
  // -----------------------------
  const [hydrated, setHydrated] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setHydrated(true);
  }, []);

  // -----------------------------
  // SAFE TO RETURN AFTER HOOKS
  // -----------------------------
  if (!hydrated || isLoading) return null;

  // -----------------------------
  // SAVE PROFILE TO METADATA + PROFILES
  // -----------------------------
  const saveProfileEverywhere = async (uid: string) => {
    if (!fullName.trim()) {
      throw new Error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        company: company.trim() || null,
      },
    });
    if (metaError) throw metaError;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: uid,
        full_name: fullName.trim(),
        company: company.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (profileError) throw profileError;
  };

  // -----------------------------
  // LOGIN
  // -----------------------------
  const handleLogin = async () => {
    if (!fullName.trim()) {
      toast.error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || (ar ? "فشل تسجيل الدخول" : "Login failed"));
      setSubmitting(false);
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      toast.error(ar ? "تعذر قراءة المستخدم" : "Could not read user");
      setSubmitting(false);
      return;
    }

    try {
      await saveProfileEverywhere(uid);
    } catch (e: any) {
      toast.error(
        e?.message || (ar ? "فشل حفظ البيانات" : "Failed to save profile")
      );
      setSubmitting(false);
      return;
    }

    router.replace("/instructions");
  };

  // -----------------------------
  // SIGNUP
  // -----------------------------
  const handleSignup = async () => {
    if (!fullName.trim()) {
      toast.error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company: company.trim() || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || (ar ? "فشل إنشاء الحساب" : "Sign-up failed"));
      setSubmitting(false);
      return;
    }

    localStorage.setItem(
      "pendingProfile",
      JSON.stringify({
        full_name: fullName.trim(),
        company: company.trim() || null,
      })
    );

    toast.success(
      ar
        ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني."
        : "Account created. Check your email."
    );

    setIsLogin(true);
    setSubmitting(false);
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-orange-50"
      dir={ar ? "rtl" : "ltr"}
    >
      <Header />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mx-auto">
              <span className="text-white text-2xl font-bold">D</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-800">
              {ar
                ? "اكتشف إمكاناتك الحقيقية في المبيعات الميدانية"
                : "Discover Your True Field Sales Potential"}
            </h1>
            <p className="text-sm text-gray-600">
              {ar
                ? "تقييم سلوكي مدته 20 دقيقة يكشف نقاط قوتك ومناطق نموك — بدون أسئلة تقنية أو ضغط"
                : "A 20-minute behavioral assessment that reveals your strengths and growth areas — no technical knowledge, no pressure."}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 text-center">
              {isLogin
                ? ar
                  ? "تسجيل الدخول"
                  : "Sign In"
                : ar
                ? "إنشاء حساب"
                : "Create Account"}
            </h2>

            <div className="space-y-4">
              <Input
                placeholder={
                  ar
                    ? "الاسم الكامل (لعرضه في التقرير)"
                    : "Full Name (for your report)"
                }
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />

              <Input
                type="email"
                placeholder={ar ? "البريد الإلكتروني" : "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                type="password"
                placeholder={ar ? "كلمة المرور" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
                onClick={isLogin ? handleLogin : handleSignup}
              >
                {submitting
                  ? ar
                    ? "جاري المعالجة..."
                    : "Processing..."
                  : isLogin
                  ? ar
                    ? "تسجيل الدخول"
                    : "Sign In"
                  : ar
                  ? "إنشاء حساب"
                  : "Create Account"}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isLogin
                  ? ar
                    ? "ليس لديك حساب؟ اشترك"
                    : "Don't have an account? Sign up"
                  : ar
                  ? "لديك حساب؟ سجل الدخول"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
