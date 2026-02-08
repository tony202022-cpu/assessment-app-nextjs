"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLocale();
  const { user, isLoading } = useSession();
  const isArabic = language === "ar";

  const [hydrated, setHydrated] = useState(false);

  // ✅ IMPORTANT: default must be slug-based (never "/quiz")
  const [nextPath, setNextPath] = useState<string>("/scan/quiz");

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hydration guard + compute nextPath safely
  useEffect(() => {
    setHydrated(true);

    try {
      const sp = new URLSearchParams(window.location.search);

      // 1) If caller provided ?next=..., use it
      const n = sp.get("next");
      if (n && typeof n === "string") {
        // If someone accidentally passes "/quiz", auto-fix it to "/scan/quiz"
        setNextPath(n === "/quiz" ? "/scan/quiz" : n);
        return;
      }

      // 2) Otherwise, derive slug from the current URL (scan/mri) or fallback to scan
      const path = window.location.pathname; // e.g. "/scan/profile" or "/mri/profile"
      const maybeSlug = (path.split("/")[1] || "").toLowerCase();
      const slug = maybeSlug === "mri" ? "mri" : "scan";
      setNextPath(`/${slug}/quiz`);
    } catch {
      // ignore
    }
  }, []);

  // Must be logged in
  useEffect(() => {
    if (!isLoading && hydrated && !user) {
      router.replace("/login");
    }
  }, [isLoading, hydrated, user, router]);

  // Load existing profile (if any)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setFullName(data.full_name ?? "");
        setCompany(data.company ?? "");
      }
      setLoadingProfile(false);
    };

    if (user?.id) loadProfile();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;

    if (!fullName.trim()) {
      toast.error(isArabic ? "الاسم الكامل إلزامي" : "Full name is required");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName.trim(),
        company: company.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(error);
      toast.error(isArabic ? "فشل حفظ البيانات" : "Failed to save");
      setSaving(false);
      return;
    }

    toast.success(isArabic ? "تم الحفظ ✅" : "Saved ✅");

    // ✅ Safety: never allow navigation to "/quiz" (must be "/scan/quiz" or "/mri/quiz")
    const safeNext =
      nextPath === "/quiz"
        ? "/scan/quiz"
        : /^\/(scan|mri)\/quiz(\b|\/|\?)/.test(nextPath)
        ? nextPath
        : "/scan/quiz";

    router.replace(safeNext);
  };

  if (!hydrated || isLoading || loadingProfile) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-1 px-4 py-6 flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600">
        <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-2xl overflow-hidden">
          <div className="p-6 text-white space-y-4">
            <h1 className="text-2xl font-extrabold text-center">
              {isArabic ? "🪪 بيانات التقرير" : "🪪 Report Details"}
            </h1>

            <p className="text-sm text-white/85 text-center">
              {isArabic
                ? "قبل بدء التقييم، أدخل اسمك ليظهر في تقرير الـ PDF."
                : "Before starting, enter your name so it appears in your PDF report."}
            </p>

            <div className="space-y-3">
              <Input
                placeholder={isArabic ? "الاسم الكامل (إلزامي)" : "Full Name (required)"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={saving}
                className="bg-white/90"
              />

              <Input
                placeholder={isArabic ? "الشركة (اختياري)" : "Company (optional)"}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={saving}
                className="bg-white/90"
              />

              <Button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold"
              >
                {saving
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                  ? "حفظ والمتابعة ✅"
                  : "Save & Continue ✅"}
              </Button>

              <div className="text-xs text-white/70 text-center">
                {isArabic ? "🔒 لن نشارك بياناتك مع أي طرف." : "🔒 We don’t share your data with third parties."}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
