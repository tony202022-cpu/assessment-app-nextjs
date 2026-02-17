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

// DB truth
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

function assessmentIdFromSlug(slug: string) {
  return slug === "mri" ? MRI_ASSESSMENT_ID : SCAN_ASSESSMENT_ID;
}

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

  const ar = urlLang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (language !== urlLang) setLanguage(urlLang);
  }, [hydrated, urlLang, language, setLanguage]);

  // ---------- CREATE ATTEMPT (SCHEMA SAFE) ----------
  const createAttempt = async () => {
    const assessmentId = assessmentIdFromSlug(slug);
    const { data: auth } = await supabase.auth.getUser();

    const payload = {
      assessment_id: assessmentId,
      language: urlLang,
      full_name: fullName.trim() || null,
      company: company.trim() || null,
      user_email: email.trim() || auth.user?.email || null,
      user_id: auth.user?.id ?? null,

      // REQUIRED NOT NULL
      total_questions: slug === "mri" ? 75 : 30,
      score: 0,
      total_percentage: 0,

      answers: [],
      competency_results: [],
    };

    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  };

  // ---------- CONTINUE ----------
  const goNext = async () => {
    setSubmitting(true);
    try {
      const attemptId = await createAttempt();
      router.replace(
        `/${slug}/instructions?lang=${urlLang}&attemptId=${encodeURIComponent(attemptId)}`
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to continue");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- AUTH ----------
  const handleLogin = async () => {
    if (!email || !password) return;
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
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
    if (!fullName || !email || !password) return;
    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company: company || null },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      toast.error("Disable Email Confirmations in Supabase");
      setSubmitting(false);
      return;
    }

    await goNext();
  };

  if (!hydrated || isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700" dir={dir}>
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">
          {mode === "login" ? (ar ? "تسجيل الدخول" : "Sign In") : ar ? "إنشاء حساب" : "Create Account"}
        </h1>

        <Input placeholder={ar ? "الاسم الكامل" : "Full name"} value={fullName} onChange={e => setFullName(e.target.value)} />
        <Input placeholder={ar ? "الشركة" : "Company"} value={company} onChange={e => setCompany(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder={ar ? "كلمة المرور" : "Password"} value={password} onChange={e => setPassword(e.target.value)} />

        <Button
          disabled={submitting}
          className="w-full bg-amber-400 text-slate-900 font-bold"
          onClick={mode === "login" ? handleLogin : handleSignup}
        >
          {submitting ? "…" : mode === "login" ? (ar ? "دخول" : "Sign In") : (ar ? "إنشاء الحساب والمتابعة" : "Create & Continue")}
        </Button>

        <button
          className="text-amber-200 text-sm w-full"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? ar ? "ليس لديك حساب؟" : "No account?"
            : ar ? "لديك حساب؟" : "Have an account?"}
        </button>
      </div>
    </div>
  );
}
