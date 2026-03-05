"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Lang = "en" | "ar";

// DB truth (current IDs)
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

function safeSlug(x: any) {
  return String(x || "").toLowerCase().trim();
}

function safeLang(x: string | null): Lang {
  return x === "ar" ? "ar" : "en";
}

function isMRIFromSlug(slug: string) {
  const s = safeSlug(slug);
  return s === "mri" || s.endsWith("mri");
}

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();

  const slug = useMemo(() => safeSlug(params?.slug), [params]);
  const urlLang = useMemo<Lang>(() => safeLang(searchParams.get("lang")), [searchParams]);

  const { language, setLanguage } = useLocale();
  const { user, isLoading } = useSession();

  const ar = urlLang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ prevents "already logged in" flash after logout
  const [forceLoggedOut, setForceLoggedOut] = useState(false);

  // Simple mode switch
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Always-visible fields (for reports)
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Assessment config (source of truth)
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [timerMinutes, setTimerMinutes] = useState<number>(0);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (language !== urlLang) setLanguage(urlLang);
  }, [hydrated, urlLang, language, setLanguage]);

  // Load assessment config by slug (so MRI/SCAN is always correct)
  useEffect(() => {
    const load = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("id, status, num_questions, timer_minutes")
          .eq("slug", slug)
          .maybeSingle();

        if (error) console.warn("Login: assessment config load error:", error);

        if (data && data.status === "active") {
          setAssessmentId(String(data.id));
          setTotalQuestions(Number(data.num_questions || 0));
          setTimerMinutes(Number(data.timer_minutes || 0));
          return;
        }
      } catch (e) {
        console.warn("Login: assessment config load exception:", e);
      }

      // Fallback if config fetch fails
      const isMRI = isMRIFromSlug(slug);
      setAssessmentId(isMRI ? MRI_ASSESSMENT_ID : SCAN_ASSESSMENT_ID);
      setTotalQuestions(isMRI ? 75 : 30);
      setTimerMinutes(isMRI ? 90 : 20);
    };

    load();
  }, [slug]);

  // Prefill from signed-in user (if exists)
  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;

    const meta: any = (user as any).user_metadata || {};
    setFullName((meta?.full_name as string) || "");
    setCompany((meta?.company as string) || "");
    setEmail(((user as any).email as string) || "");
  }, [hydrated, user]);

  // If user becomes available again, allow signed-in UI
  useEffect(() => {
    if (user) setForceLoggedOut(false);
  }, [user]);

  const inputClass =
    "h-12 rounded-2xl bg-white text-slate-900 placeholder:text-slate-500 " +
    "border border-white/30 shadow-sm " +
    "focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-0";

  const title = ar ? "تسجيل الدخول" : "Sign In";

  // subtitle based on config (fallback safe)
  const mins = timerMinutes || (isMRIFromSlug(slug) ? 90 : 20);
  const subtitle = ar
    ? mins >= 60
      ? `ابدأ التقييم المتقدم خلال حوالي ${mins} دقيقة.`
      : `ابدأ الفحص المجاني خلال حوالي ${mins} دقيقة.`
    : mins >= 60
    ? `Start the advanced assessment (~${mins} minutes).`
    : `Start the free scan (~${mins} minutes).`;

  const saveProfileToSupabaseUser = async () => {
    if (!user) return;

    const name = fullName.trim();
    const comp = company.trim();

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name || null,
        company: comp || null,
      },
    });

    if (error) {
      console.warn("updateUser metadata error:", error);
    }
  };

  const createAttempt = async () => {
    if (!assessmentId) throw new Error(ar ? "تعذر المتابعة: التقييم غير جاهز" : "Cannot continue: assessment not ready");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) throw new Error(ar ? "غير مسجل الدخول" : "Not authenticated");

    const meta: any = auth.user.user_metadata || {};
    const questions = totalQuestions || (isMRIFromSlug(slug) ? 75 : 30);

    const payload = {
      assessment_id: assessmentId,
      language: urlLang,

      full_name: fullName.trim() || meta?.full_name || null,
      company: company.trim() || meta?.company || null,
      user_email: (auth.user.email || "").trim() || null,
      user_id: auth.user.id,

      // required columns (match your schema)
      total_questions: questions,
      score: 0,
      total_percentage: 0,
      answers: [],
      competency_results: [],
    };

    const { data, error } = await supabase.from("quiz_attempts").insert(payload).select("id").single();

    if (error) throw error;
    return data.id as string;
  };

  const goNext = async () => {
    setSubmitting(true);
    try {
      await saveProfileToSupabaseUser();

      const attemptId = await createAttempt();
      router.replace(`/${slug}/instructions?lang=${urlLang}&attemptId=${encodeURIComponent(attemptId)}`);
    } catch (e: any) {
      toast.error(e?.message || (ar ? "فشل المتابعة" : "Failed to continue"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async () => {
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
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    await goNext();
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error(ar ? "أدخل الاسم والبريد وكلمة المرور" : "Enter name, email, and password");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company: company.trim() || null,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      toast.error(ar ? "تحقق من بريدك لتأكيد الحساب" : "Check your email to confirm your account");
      setSubmitting(false);
      return;
    }

    await goNext();
  };

  const handleSignOut = async () => {
    setForceLoggedOut(true);
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setForceLoggedOut(false);
        toast.error(error.message);
        return;
      }

      toast.success(ar ? "تم تسجيل الخروج" : "Signed out");
      setPassword("");

      router.replace(`/${slug}/login?lang=${urlLang}&t=${Date.now()}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || isLoading) return null;

  const alreadyLoggedIn = !!user && !forceLoggedOut;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 sm:px-6 py-10
                 bg-gradient-to-br from-[#071a3a] via-[#0b1b3a] to-[#102a5a]"
      dir={dir}
    >
      <div className="w-full max-w-md rounded-3xl bg-white/10 border border-white/15 shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{title}</h1>
          <p className="text-white/80 text-sm sm:text-base">{subtitle}</p>
        </div>

        {alreadyLoggedIn && (
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white/90 text-sm">
            {ar ? "أنت مسجل الدخول بالفعل. يمكنك المتابعة أو تسجيل الخروج." : "You’re already signed in. You can continue or sign out."}
          </div>
        )}

        <div className="space-y-3">
          <Input
            className={inputClass}
            placeholder={ar ? "الاسم الكامل (سيظهر في التقرير)" : "Full name (shown in report)"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <Input
            className={inputClass}
            placeholder={ar ? "الشركة (اختياري)" : "Company (optional)"}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
          />
        </div>

        {!alreadyLoggedIn && (
          <div className="grid grid-cols-2 gap-2 bg-white/10 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`h-11 rounded-xl font-bold transition ${mode === "login" ? "bg-white text-[#0b1b3a]" : "text-white/80 hover:text-white"}`}
            >
              {ar ? "دخول" : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`h-11 rounded-xl font-bold transition ${mode === "signup" ? "bg-white text-[#0b1b3a]" : "text-white/80 hover:text-white"}`}
            >
              {ar ? "حساب جديد" : "Create Account"}
            </button>
          </div>
        )}

        {!alreadyLoggedIn && (
          <div className="space-y-3">
            <Input
              className={inputClass}
              placeholder={ar ? "البريد الإلكتروني" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
            <Input
              className={inputClass}
              type="password"
              placeholder={ar ? "كلمة المرور" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
        )}

        {alreadyLoggedIn ? (
          <div className="space-y-3">
            <Button
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-amber-400 text-slate-900 font-extrabold hover:bg-amber-300"
              onClick={goNext}
            >
              {submitting ? "…" : ar ? "متابعة" : "Continue"}
            </Button>

            <button type="button" className="w-full text-xs text-white/70 hover:text-white" onClick={handleSignOut}>
              {ar ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <Button
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-amber-400 text-slate-900 font-extrabold hover:bg-amber-300"
              onClick={mode === "login" ? handleEmailLogin : handleSignup}
            >
              {submitting ? "…" : mode === "login" ? (ar ? "تسجيل الدخول" : "Sign In") : ar ? "إنشاء الحساب والمتابعة" : "Create & Continue"}
            </Button>

            <div className="text-center text-xs text-white/55">
              {ar ? "لن نرسل رسائل مزعجة. هذا فقط لحفظ نتائجك." : "No spam. This is only to save your results."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}