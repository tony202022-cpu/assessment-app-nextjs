"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

type Lang = "en" | "ar";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();

  const slug = String(params?.slug || "scan");

  const urlLang = useMemo<Lang>(() => {
    const v = String(searchParams.get("lang") || "").toLowerCase().trim();
    return v === "ar" ? "ar" : "en";
  }, [searchParams]);

  const { language, setLanguage } = useLocale();
  const { user, isLoading } = useSession();

  // ✅ URL is source of truth for direction on this page
  const ar = urlLang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Hydration + keep LocaleContext synced with URL (prevents English showing RTL)
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (language !== urlLang) setLanguage(urlLang);
  }, [hydrated, urlLang, language, setLanguage]);

  // Prefill email + profile fields if logged in (nice UX)
  useEffect(() => {
    const loadPrefill = async () => {
      if (!hydrated) return;

      const { data } = await supabase.auth.getUser();
      const u = data.user;

      if (u?.email) setEmail(String(u.email));

      const meta = (u?.user_metadata as any) || {};
      const metaFull = String(meta.full_name || "").trim();
      const metaComp = String(meta.company || "").trim();

      // Try profiles table too (optional)
      try {
        if (u?.id) {
          const prof = await supabase
            .from("profiles")
            .select("full_name, company")
            .eq("id", u.id)
            .maybeSingle();

          const profFull = String(prof.data?.full_name || "").trim();
          const profComp = String(prof.data?.company || "").trim();

          setFullName(profFull || metaFull || "");
          setCompany(profComp || metaComp || "");
          return;
        }
      } catch {
        // ignore
      }

      setFullName(metaFull || "");
      setCompany(metaComp || "");
    };

    loadPrefill();
  }, [hydrated]);

  const saveProfileEverywhere = async (uid: string, userEmail: string | null) => {
    const name = fullName.trim();
    const comp = company.trim();

    // Update auth metadata (safe)
    const { error: metaError } = await supabase.auth.updateUser({
      data: { full_name: name || null, company: comp || null },
    });
    if (metaError) throw metaError;

    // Upsert profiles row (if your profiles table exists)
    const payload: any = {
      id: uid,
      full_name: name || null,
      company: comp || null,
      updated_at: new Date().toISOString(),
    };

    // If your profiles table DOES have user_email, keep this.
    // If it DOES NOT, comment it out to avoid errors.
    payload.user_email = userEmail || null;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (profileError) {
      // If you get "column user_email does not exist", comment out payload.user_email above.
      throw profileError;
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    try {
      await supabase.auth.signOut();
      toast.success(ar ? "تم تسجيل الخروج" : "Signed out");
      // Clear fields for a clean signup/login
      setFullName("");
      setCompany("");
      setEmail("");
      setPassword("");
      setMode("login");
      // Stay on same page with same lang
      router.replace(`/${slug}/login?lang=${urlLang}`);
    } catch (e: any) {
      toast.error(e?.message || (ar ? "فشل تسجيل الخروج" : "Sign out failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error(ar ? "أدخل البريد وكلمة المرور" : "Enter email and password");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message || (ar ? "فشل تسجيل الدخول" : "Login failed"));
      setSubmitting(false);
      return;
    }

    // Save profile if name/company provided (optional on login)
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      const userEmail = data.user?.email || null;
      if (uid && (fullName.trim() || company.trim())) {
        await saveProfileEverywhere(uid, userEmail);
      }
    } catch (e: any) {
      toast.error(e?.message || (ar ? "فشل حفظ البيانات" : "Failed to save profile"));
      setSubmitting(false);
      return;
    }

    router.replace(`/${slug}/instructions?lang=${urlLang}`);
  };

  const handleSignup = async () => {
    if (!fullName.trim()) {
      toast.error(ar ? "الاسم الكامل إلزامي" : "Full name is required");
      return;
    }
    if (!email.trim() || !password) {
      toast.error(ar ? "أدخل البريد وكلمة المرور" : "Enter email and password");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), company: company.trim() || null },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || (ar ? "فشل إنشاء الحساب" : "Sign-up failed"));
      setSubmitting(false);
      return;
    }

    toast.success(ar ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني." : "Account created. Check your email.");
    setMode("login");
    setSubmitting(false);
  };

  if (!hydrated || isLoading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700" dir={dir}>
      {/* ✅ CUSTOM HEADER WITH LOGO */}
      <div className="w-full border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + LevelUp */}
          <div className="flex items-center gap-3">
            {/* Add your logo here - replace with actual logo path */}
            <div className="relative w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
              {/* Replace this SVG with actual logo: <Image src="/logo.png" alt="Logo" width={40} height={40} /> */}
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-2xl font-black text-white">
              LevelUp
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(`/${slug}/login?lang=${ar ? "en" : "ar"}`)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-all"
            >
              {ar ? "English" : "العربية"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-6 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-white drop-shadow">
              {mode === "login" ? (ar ? "تسجيل الدخول" : "Sign In") : ar ? "إنشاء حساب" : "Create Account"}
            </h1>
            <p className="text-sm text-white/80">
              {ar ? "أكمل بياناتك ليظهر اسمك في التقرير." : "Complete your details so your name appears in the report."}
            </p>
          </div>

          {/* ✅ If already signed in, do NOT auto-redirect. Show controls. */}
          {user ? (
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-4">
              <div className="text-white/90 text-sm">
                {ar ? "أنت مسجل دخولك الآن." : "You are currently signed in."}
              </div>

              <div className="flex gap-3">
                <Button
                  disabled={submitting}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-base py-6"
                  onClick={() => router.replace(`/${slug}/instructions?lang=${urlLang}`)}
                >
                  {ar ? "متابعة" : "Continue"}
                </Button>

                <Button
                  disabled={submitting}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-base py-6"
                  onClick={handleSignOut}
                >
                  {ar ? "تسجيل خروج" : "Sign out"}
                </Button>
              </div>

              <div className="text-xs text-white/70">
                {ar
                  ? "لإنشاء حساب جديد: اضغط تسجيل خروج ثم أنشئ الحساب."
                  : "To create a new account: Sign out first, then create the account."}
              </div>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/20 rounded-xl p-6 space-y-5 shadow-lg">
              <Input
                placeholder={ar ? "الاسم الكامل (سيظهر في التقرير)" : "Full Name (shown in report)"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/30 text-white placeholder-white/80 text-base py-6 rounded-xl"
              />

              <Input
                placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-white/30 text-white placeholder-white/80 text-base py-6 rounded-xl"
              />

              <Input
                type="email"
                placeholder={ar ? "البريد الإلكتروني" : "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/30 text-white placeholder-white/80 text-base py-6 rounded-xl"
              />

              <Input
                type="password"
                placeholder={ar ? "كلمة المرور" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/30 text-white placeholder-white/80 text-base py-6 rounded-xl"
              />

              <Button
                disabled={submitting}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-base py-7 rounded-xl"
                onClick={mode === "login" ? handleLogin : handleSignup}
              >
                {submitting
                  ? ar
                    ? "جاري..."
                    : "Processing..."
                  : mode === "login"
                  ? ar
                    ? "دخول"
                    : "Sign In"
                  : ar
                  ? "اشتراك"
                  : "Sign Up"}
              </Button>

              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full text-center text-sm text-amber-200 hover:underline"
              >
                {mode === "login"
                  ? ar
                    ? "ليس لديك حساب؟ أنشئ حسابًا"
                    : "No account? Create one"
                  : ar
                  ? "لديك حساب بالفعل؟ سجل دخولك"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
