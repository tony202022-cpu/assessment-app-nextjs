"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StartPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");

  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const { user, isLoading } = useSession();

  const ar = langParam === "ar";

  const [hydrated, setHydrated] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setHydrated(true);
    if (langParam && langParam !== language) {
      setLanguage(langParam as "en" | "ar");
    }
  }, [langParam, language, setLanguage]);

  useEffect(() => {
    if (!hydrated || isLoading || !user) return;
    router.replace(`/${slug}/instructions?lang=${langParam || "en"}`);
  }, [hydrated, isLoading, user, router, slug, langParam]);

  if (!hydrated || isLoading) return null;

  const saveProfileEverywhere = async (uid: string) => {
    if (!fullName.trim()) {
      throw new Error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
    }

    await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        company: company.trim() || null,
      },
    });

    await supabase.from("profiles").upsert(
      {
        id: uid,
        full_name: fullName.trim(),
        company: company.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(ar ? "البريد الإلكتروني وكلمة المرور مطلوبان" : "Email and password are required");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message || (ar ? "فشل تسجيل الدخول" : "Login failed"));
      setSubmitting(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
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

    router.replace(`/${slug}/instructions?lang=${langParam || "en"}`);
  };

  const handleSignup = async () => {
    if (!email || !password || !fullName.trim()) {
      toast.error(ar ? "يرجى إدخال جميع الحقول المطلوبة" : "Please fill all required fields");
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

    toast.success(ar ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني." : "Account created. Check your email.");
    setIsLogin(true);
    setSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${slug}/instructions`,
      },
    });

    if (error) {
      toast.error(ar ? "فشل تسجيل الدخول عبر Google" : "Google sign-in failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-[#1a5cff] via-[#2f7bff] to-[#3b82f6]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md rounded-2xl bg-white/15 backdrop-blur-xl shadow-xl p-8 space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            {ar ? "مرحباً بك" : "Welcome"}
          </h1>
          <p className="text-white/90 text-base font-medium">
            {ar ? "سجل الدخول للمتابعة" : "Sign in to continue"}
          </p>
        </div>

        {/* Google Login */}
        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full bg-white text-slate-900 font-semibold hover:bg-white/90"
        >
          {ar ? "المتابعة باستخدام Google" : "Continue with Google"}
        </Button>

        <div className="text-center text-xs text-white/70">or</div>

        {/* Auth Form */}
        <div className="space-y-3">
          <Input
            placeholder={ar ? "الاسم الكامل *" : "Full Name *"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-white/30 text-white placeholder-white/80"
          />

          <Input
            placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-white/30 text-white placeholder-white/80"
          />

          <Input
            type="email"
            placeholder={ar ? "البريد الإلكتروني *" : "Email *"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/30 text-white placeholder-white/80"
          />

          <Input
            type="password"
            placeholder={ar ? "كلمة المرور *" : "Password *"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/30 text-white placeholder-white/80"
          />

          <Button
            disabled={submitting}
            className="w-full bg-black text-white font-semibold hover:bg-slate-900"
            onClick={isLogin ? handleLogin : handleSignup}
          >
            {submitting
              ? ar
                ? "جاري..."
                : "Processing..."
              : isLogin
              ? ar
                ? "تسجيل الدخول"
                : "Sign In"
              : ar
              ? "إنشاء حساب"
              : "Sign Up"}
          </Button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-sm text-white/90 hover:underline"
        >
          {isLogin
            ? ar
              ? "ليس لديك حساب؟ أنشئ حسابًا"
              : "You don’t have an account? Sign up"
            : ar
            ? "لديك حساب بالفعل؟ تسجيل الدخول"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
