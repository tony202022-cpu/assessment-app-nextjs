"use client";

import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { getTranslation } from "@/lib/translations";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const { language } = useLocale();
  const isArabic = language === "ar";

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detect session + load profile if logged in
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      setLoadingProfile(true);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, company")
        .eq("id", uid)
        .maybeSingle();

      if (!error && profile) {
        setFullName(profile.full_name ?? "");
        setCompany(profile.company ?? "");
      }
      setLoadingProfile(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const saveProfile = async () => {
    if (!userId) {
      toast.error(isArabic ? "يرجى تسجيل الدخول أولاً" : "Please sign in first");
      return;
    }
    if (!fullName.trim()) {
      toast.error(isArabic ? "يرجى إدخال الاسم الكامل" : "Please enter your full name");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName.trim(),
        company: company.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(error);
      toast.error(isArabic ? "فشل حفظ البيانات" : "Failed to save profile");
    } else {
      toast.success(isArabic ? "تم حفظ الاسم والشركة ✅" : "Saved ✅");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-center">
            {getTranslation("login", language)}
          </h1>

          {/* Auth UI (email/password) */}
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(var(--primary))",
                    brandAccent: "hsl(var(--primary-foreground))",
                  },
                },
              },
            }}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: getTranslation("email", language),
                  password_label: getTranslation("password", language),
                  email_input_placeholder: getTranslation("yourEmail", language),
                  password_input_placeholder: getTranslation("yourPassword", language),
                  button_label: getTranslation("signIn", language),
                  social_provider_text: getTranslation("signInWith", language),
                  link_text: getTranslation("alreadyHaveAccount", language),
                },
                sign_up: {
                  email_label: getTranslation("email", language),
                  password_label: getTranslation("password", language),
                  email_input_placeholder: getTranslation("yourEmail", language),
                  password_input_placeholder: getTranslation("yourPassword", language),
                  button_label: getTranslation("signUp", language),
                  social_provider_text: getTranslation("signUpWith", language),
                  link_text: getTranslation("dontHaveAccount", language),
                },
                forgotten_password: {
                  email_label: getTranslation("email", language),
                  email_input_placeholder: getTranslation("yourEmail", language),
                  button_label: getTranslation("sendResetInstructions", language),
                  link_text: getTranslation("forgotPassword", language),
                },
                update_password: {
                  password_label: getTranslation("newPassword", language),
                  password_input_placeholder: getTranslation("yourNewPassword", language),
                  button_label: getTranslation("updatePassword", language),
                },
              },
            }}
          />

          {/* Profile fields (for PDF) - shows after login */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <div className="text-sm font-bold">
              {isArabic ? "🪪 بيانات التقرير (لـ PDF)" : "🪪 Report details (for PDF)"}
            </div>

            {userId ? (
              <>
                <Input
                  placeholder={isArabic ? "الاسم الكامل (إلزامي)" : "Full name (required)"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loadingProfile || saving}
                />
                <Input
                  placeholder={isArabic ? "الشركة (اختياري)" : "Company (optional)"}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={loadingProfile || saving}
                />
                <Button
                  type="button"
                  onClick={saveProfile}
                  disabled={loadingProfile || saving}
                  className="w-full"
                >
                  {saving
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isArabic
                    ? "حفظ البيانات ✅"
                    : "Save ✅"}
                </Button>

                <div className="text-xs text-muted-foreground">
                  {isArabic
                    ? "سيظهر الاسم والشركة في التقرير النهائي."
                    : "Your name/company will appear on your final report."}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isArabic
                  ? "سجّل الدخول أولاً، ثم أضف الاسم والشركة."
                  : "Sign in first, then add your name/company."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
