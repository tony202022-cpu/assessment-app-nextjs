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
  const { user, isLoading } = useSession();
  const ar = language === "ar";

  const [hydrated, setHydrated] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || isLoading || !user) return;
    router.replace("/instructions");
  }, [hydrated, isLoading, user, router]);

  if (!hydrated || isLoading) return null;

  const saveProfileEverywhere = async (uid: string) => {
    if (!fullName.trim()) throw new Error(ar ? "الاسم الكامل إلزامي" : "Full name is required");

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

  const handleLogin = async () => {
    if (!fullName.trim()) {
      toast.error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      toast.error(e?.message || (ar ? "فشل حفظ البيانات" : "Failed to save profile"));
      setSubmitting(false);
      return;
    }

    router.replace("/instructions");
  };

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

    toast.success(ar ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني." : "Account created. Check your email.");
    setIsLogin(true);
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700"
      dir={ar ? "rtl" : "ltr"}
    >
      <Header />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-5 space-y-6 animate-fadeIn">

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-extrabold text-white drop-shadow">
              {ar
                ? "اكتشف إمكاناتك الحقيقية في الميدان"
                : "Discover Your True Field Sales Potential"}
            </h1>
<p className="text-xs font-semibold text-white/90 leading-relaxed">
  {ar
    ? "تقييم سلوكي مدته 20 دقيقة يكشف لك نقاط قوتك ونقاط ضعفك ومناطق نموك وفق معايير عالمية ثابتة"
    : "A 20-minute behavioral assessment that reveals your strengths and growth areas — no technical knowledge, no pressure."}
</p>

          </div>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-5 space-y-5 shadow-lg">
            <h2 className="text-lg font-bold text-white text-center drop-shadow">
              {isLogin ? (ar ? "تسجيل الدخول" : "Sign In") : ar ? "إنشاء حساب" : "Create Account"}
            </h2>

<div className="space-y-3">
  <Input
    placeholder={ar ? "الاسم الكامل (لعرضه في التقرير)" : "Full Name (for your report)"}
    value={fullName}
    onChange={(e) => setFullName(e.target.value)}
    required
    className="bg-white/30 backdrop-blur-xl border border-white/40 text-white placeholder-white font-semibold h-11 rounded-md shadow-inner"
  />

  <Input
    placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
    value={company}
    onChange={(e) => setCompany(e.target.value)}
    className="bg-white/30 backdrop-blur-xl border border-white/40 text-white placeholder-white font-semibold h-11 rounded-md shadow-inner"
  />

  <Input
    type="email"
    placeholder={ar ? "البريد الإلكتروني" : "Email"}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
    className="bg-white/30 backdrop-blur-xl border border-white/40 text-white placeholder-white font-semibold h-11 rounded-md shadow-inner"
  />

  <Input
    type="password"
    placeholder={ar ? "كلمة المرور" : "Password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    className="bg-white/30 backdrop-blur-xl border border-white/40 text-white placeholder-white font-semibold h-11 rounded-md shadow-inner"
  />
              <Button
                disabled={submitting}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg shadow-lg transition-all duration-200"
                onClick={isLogin ? handleLogin : handleSignup}
              >
                {submitting
                  ? ar ? "جاري المعالجة..." : "Processing..."
                  : isLogin
                  ? ar ? "تسجيل الدخول" : "Sign In"
                  : ar ? "إنشاء حساب" : "Create Account"}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-amber-300 hover:text-amber-200 font-medium"
              >
                {isLogin
                  ? ar ? "ليس لديك حساب؟ اشترك" : "Don't have an account? Sign up"
                  : ar ? "لديك حساب؟ سجل الدخول" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
