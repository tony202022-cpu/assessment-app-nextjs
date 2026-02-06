"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const { slug } = useParams();
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
    router.replace(`/${slug}/instructions`);
  }, [hydrated, isLoading, user, router, slug]);

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

    router.replace(`/${slug}/instructions`);
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
          <div className="text-center space-y-2">
            <h1 className="text-xl font-extrabold text-white drop-shadow">
              {ar ? "سجل دخولك للمتابعة" : "Sign in to continue"}
            </h1>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-5 space-y-5 shadow-lg">
            <div className="space-y-3">
              <Input
                placeholder={ar ? "الاسم الكامل" : "Full Name"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/30 text-white placeholder-white"
              />
              <Input
                type="email"
                placeholder={ar ? "البريد الإلكتروني" : "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/30 text-white placeholder-white"
              />
              <Input
                type="password"
                placeholder={ar ? "كلمة المرور" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/30 text-white placeholder-white"
              />
              <Button
                disabled={submitting}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold"
                onClick={isLogin ? handleLogin : handleSignup}
              >
                {submitting ? (ar ? "جاري..." : "Processing...") : isLogin ? (ar ? "دخول" : "Sign In") : (ar ? "اشتراك" : "Sign Up")}
              </Button>
            </div>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm text-amber-300 hover:underline"
            >
              {isLogin ? (ar ? "ليس لديك حساب؟" : "No account?") : (ar ? "لديك حساب بالفعل؟" : "Already have an account?")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}