// FILE: app/(site)/[slug]/results/page.tsx
"use client";

import {
  getRecommendations,
  normalizeCompetencyId,
  tierFromPercentage,
  Tier,
  Language,
} from "@/lib/pdf-recommendations";
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";
import {
  Download,
  Loader2,
  Share2,
  Check,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  ShieldAlert,
  Gift,
  FileText,
  Sparkles,
  Target,
  User,
  Mail,
  Building2,
  Fingerprint,
  Zap,
  Award,
  Clock,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// ✅ DB truth (menu IDs)
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

// ✅ Client-side competency label registry (render-time translation)
const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
};

function normalizeCompetencySafe(raw: any) {
  const id = normalizeCompetencyId(String(raw || ""));
  // ✅ never render destroying_objections
  if (id === "destroying_objections") return "handling_objections";
  return id;
}

// ✅ Robust menu detection
function isProbablyMRI(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  if (s === "mri") return true;
  if (a.includes("mri")) return true;
  if (c === "mri") return true;
  if (a === MRI_ASSESSMENT_ID) return true;
  return false;
}
function isProbablyScan(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  if (s === "scan") return true;
  if (a.includes("scan")) return true;
  if (c === "scan") return true;
  if (a === SCAN_ASSESSMENT_ID) return true;
  return false;
}

function safePct(n: any) {
  const v = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, v));
}

function shortAttemptId(id: string) {
  const x = String(id || "");
  return x ? x.slice(0, 8) : "";
}

function tierBadgeColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Threat":
      return "bg-amber-500 text-white";
    case "Weakness":
    default:
      return "bg-rose-600 text-white";
  }
}

// ✅ SWOT-colored bar backgrounds
function tierBarColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "from-emerald-500 to-emerald-600";
    case "Opportunity":
      return "from-blue-500 to-blue-600";
    case "Threat":
      return "from-amber-400 to-amber-500";
    case "Weakness":
    default:
      return "from-rose-500 to-rose-600";
  }
}

function tierShortLabel(tier: Tier, ar: boolean) {
  if (!ar) return tier;
  return tier === "Strength"
    ? "قوة"
    : tier === "Opportunity"
    ? "فرصة"
    : tier === "Threat"
    ? "تهديد"
    : "ضعف";
}

/* -----------------------------
   ✅ Identity extraction
------------------------------ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmailLike(s: string) {
  return EMAIL_RE.test(String(s || "").trim());
}
function pickFirstNonEmpty(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}
function dig(obj: any, path: string) {
  try {
    return path.split(".").reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj);
  } catch {
    return undefined;
  }
}
function extractIdentity(attempt: any) {
  const blocks = [
    attempt,
    attempt?.participant,
    attempt?.candidate,
    attempt?.user,
    attempt?.profile,
    attempt?.registration,
    attempt?.contact,
    attempt?.meta,
    attempt?.metadata,
    attempt?.data,
    attempt?.payload,
    attempt?.details,
    attempt?.info,
    attempt?.user_info,
    attempt?.userInfo,
  ].filter(Boolean);

  const nameCandidates: string[] = [];
  const emailCandidates: string[] = [];
  const companyCandidates: string[] = [];

  for (const b of blocks) {
    nameCandidates.push(
      pickFirstNonEmpty(
        b?.full_name,
        b?.fullname,
        b?.fullName,
        b?.name,
        b?.participant_name,
        b?.candidate_name,
        b?.display_name,
        b?.displayName,
        b?.first_name && b?.last_name ? `${b.first_name} ${b.last_name}` : "",
        b?.firstName && b?.lastName ? `${b.firstName} ${b.lastName}` : ""
      )
    );

    emailCandidates.push(
      pickFirstNonEmpty(
        b?.user_email,
        b?.email,
        b?.participant_email,
        b?.candidate_email,
        b?.work_email,
        b?.workEmail
      )
    );

    companyCandidates.push(
      pickFirstNonEmpty(
        b?.company,
        b?.company_name,
        b?.companyName,
        b?.organization,
        b?.organization_name,
        b?.org,
        b?.employer
      )
    );
  }

  const deepName = pickFirstNonEmpty(
    dig(attempt, "participant.full_name"),
    dig(attempt, "participant.name"),
    dig(attempt, "registration.full_name"),
    dig(attempt, "registration.name"),
    dig(attempt, "contact.name")
  );
  const deepEmail = pickFirstNonEmpty(
    dig(attempt, "participant.email"),
    dig(attempt, "registration.email"),
    dig(attempt, "contact.email")
  );
  const deepCompany = pickFirstNonEmpty(
    dig(attempt, "participant.company"),
    dig(attempt, "registration.company"),
    dig(attempt, "contact.company"),
    dig(attempt, "organization.name")
  );

  const rawName = pickFirstNonEmpty(...nameCandidates, deepName);
  const rawEmail = pickFirstNonEmpty(...emailCandidates, deepEmail);
  const rawCompany = pickFirstNonEmpty(...companyCandidates, deepCompany);

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";

  let fullName = rawName.trim() || "—";
  if ((fullName === "—" || !fullName) && email !== "—") {
    const m = email.match(/^([^@]+)/);
    if (m) fullName = m[1].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
  }

  const company = rawCompany.trim() || "—";
  return { fullName, email, company };
}

function ParticipantIdentityCard({
  ar,
  fullName,
  email,
  company,
  attemptId,
}: {
  ar: boolean;
  fullName: string;
  email: string;
  company: string;
  attemptId: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-xl" data-rtl={ar ? "true" : "false"}>
      {/* Premium Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 blur-3xl opacity-40" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-200 to-blue-300 blur-3xl opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 blur-3xl opacity-20" />
      </div>

      <div className="relative p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="text-blue-600" size={22} />
              <div className="text-xl font-black text-slate-900">
                {ar ? "بطاقة هوية المشارك" : "Participant Identity Card"}
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {ar ? "هوية احترافية عالمية المستوى لمشاركة النتائج بثقة تامة." : "World-class professional identity for confident results sharing."}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 px-4 py-2.5 bg-white shadow-sm">
            <Fingerprint size={18} className="text-slate-600" />
            <span className="text-sm font-black text-slate-700">
              ID:{" "}
              <span className="font-mono text-blue-600" style={{ direction: "ltr" }}>
                {shortAttemptId(attemptId) || "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Full Name - LARGER FONTS */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                <User size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  {ar ? "الاسم الكامل" : "Full Name"}
                </div>
                <div className="text-lg font-bold text-slate-900 break-words leading-tight">
                  {fullName || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Email - LARGER FONTS */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                <Mail size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  {ar ? "البريد الإلكتروني" : "Email"}
                </div>
                <div className="text-lg font-bold text-slate-900 break-words leading-tight" style={{ direction: "ltr", textAlign: "left" }}>
                  {email || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Company - LARGER FONTS */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                <Building2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  {ar ? "الشركة" : "Company"}
                </div>
                <div className="text-lg font-bold text-slate-900 break-words leading-tight">
                  {company || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsContent() {
  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug;

  const searchParams = useSearchParams();
  const attemptId = (searchParams.get("attemptId") || "").trim();
  const langParam = (searchParams.get("lang") || "").trim();

  const { language, setLanguage } = useLocale();

  useEffect(() => {
    if (langParam === "ar" || langParam === "en") {
      if (langParam !== language) setLanguage(langParam);
    }
  }, [langParam, language, setLanguage]);

  const ar = language === "ar";

  const [attempt, setAttempt] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!attemptId) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      const attRes = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();

      if (cancelled) return;

      const att = attRes.data ?? null;
      setAttempt(att);

      try {
        const conf = await (getAssessmentConfig as any)?.(routeSlug);
        if (!cancelled) setConfig(conf ?? null);
      } catch {
        if (!cancelled) setConfig(null);
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, routeSlug]);

  const isMri = isProbablyMRI(routeSlug, attempt?.assessment_id, config?.type);
  const isScan = isProbablyScan(routeSlug, attempt?.assessment_id, config?.type) && !isMri;

  const getCompetencyLabel = (res: any) => {
    const id = normalizeCompetencySafe(res?.competencyId);
    const meta = id ? COMPETENCY_LABELS[id] : null;
    if (meta) return ar ? meta.ar : meta.en;
    return String(res?.name || id || "");
  };

  const competencyRows = useMemo(() => {
    const rows = Array.isArray(attempt?.competency_results) ? attempt.competency_results : [];
    return rows.map((r: any) => {
      const id = normalizeCompetencySafe(r?.competencyId);
      const percentage = safePct(r?.percentage ?? 0);
      const derivedTier = tierFromPercentage(percentage);
      return { ...r, competencyId: id, percentage, derivedTier };
    });
  }, [attempt]);

  const chartData = useMemo(() => {
    return competencyRows.map((res: any) => ({
      subject: getCompetencyLabel(res),
      A: Number(res?.percentage ?? 0),
      fullMark: 100,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencyRows, ar]);

  const swotData = useMemo(() => {
    return {
      strengths: competencyRows.filter((r: any) => r?.derivedTier === "Strength"),
      opportunities: competencyRows.filter((r: any) => r?.derivedTier === "Opportunity"),
      weaknesses: competencyRows.filter((r: any) => r?.derivedTier === "Weakness"),
      threats: competencyRows.filter((r: any) => r?.derivedTier === "Threat"),
    };
  }, [competencyRows]);

  const overallPct = safePct(attempt?.total_percentage ?? 0);
  const overallTier: Tier = tierFromPercentage(overallPct);

  const identity = useMemo(() => extractIdentity(attempt), [attempt]);

  const handleDownload = () => {
    if (!attemptId) return;
    setDownloading(true);

    try {
      window.location.href = `/api/generate-pdf?attemptId=${encodeURIComponent(
        attemptId
      )}&lang=${encodeURIComponent(language)}`;
    } catch (error) {
      console.error("Download failed", error);
      toast.error(ar ? "فشل تحميل التقرير" : "Failed to download report");
    } finally {
      setTimeout(() => setDownloading(false), 2500);
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(ar ? "تم نسخ الرابط!" : "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(ar ? "تعذر نسخ الرابط" : "Failed to copy link");
    }
  };

  const goToFullReport = () => {
    if (!attemptId) return;
    window.location.href = `/${routeSlug}/report?attemptId=${encodeURIComponent(
      attemptId
    )}&lang=${encodeURIComponent(language)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <div className="text-sm font-bold text-slate-600">
            {ar ? "جارٍ تحميل نتائجك..." : "Loading your results..."}
          </div>
        </div>
      </div>
    );
  }

  if (!attemptId) return <div className="p-10 text-center">Missing attemptId</div>;

  if (!attempt) {
    return (
      <div className="p-10 text-center">
        {ar ? "النتائج غير موجودة" : "Results not found"}
      </div>
    );
  }

  const showUpsell = isScan && !!config?.upsell_url;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" data-rtl={ar ? "true" : "false"}>
      {/* ✅ HARD FORCE RTL/LTR */}
      <style jsx global>{`
        [data-rtl="true"] * { direction: rtl !important; }
        [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; }
        [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
        [data-rtl="true"] ol.rtl-ol { direction: rtl !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-right: 1.25rem !important; padding-left: 0 !important; }
        [data-rtl="false"] ol.ltr-ol { direction: ltr !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-left: 1.25rem !important; padding-right: 0 !important; }
      `}</style>

      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 space-y-10">
        {/* 🎨 PREMIUM HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl border-2 border-slate-200">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
          
          {/* Animated Accents */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-400 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-400 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          {/* Content */}
          <div className="relative p-10 md:p-14">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Left Content */}
              <div className="flex-1 space-y-6 text-center lg:text-start">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-bold backdrop-blur-sm">
                  <Check size={18} className="text-emerald-300" />
                  {ar ? "اكتمل التقييم بنجاح" : "Assessment Completed"}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight rtl-text">
                  {ar ? "نتائج فحص المبيعات" : "Sales Competency Results"}
                </h1>
                
                <p className="text-lg md:text-xl text-blue-100 leading-relaxed rtl-text max-w-2xl">
                  {ar 
                    ? "تحليل شامل لـ 7 كفاءات أساسية مع تحليل SWOT استراتيجي وخطة تنفيذ فورية."
                    : "Comprehensive analysis of 7 core competencies with strategic SWOT and immediate action plan."}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="bg-white hover:bg-slate-100 text-slate-900 font-black px-8 py-7 rounded-2xl flex gap-3 shadow-xl transition-all active:scale-95 text-base"
                  >
                    {downloading ? <Loader2 className="animate-spin" size={22} /> : <Download size={22} />}
                    {ar ? "تحميل PDF" : "Download PDF"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-7 rounded-2xl flex gap-3 backdrop-blur-sm transition-all active:scale-95 text-base"
                  >
                    {copied ? <Check size={22} className="text-emerald-300" /> : <Share2 size={22} />}
                    {ar ? "مشاركة" : "Share"}
                  </Button>

                  <Button
                    onClick={goToFullReport}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black px-8 py-7 rounded-2xl flex gap-3 shadow-xl transition-all active:scale-95 text-base"
                  >
                    <FileText size={22} />
                    {ar ? "التقرير الكامل" : "Full Report"}
                  </Button>
                </div>
              </div>

              {/* Right - Score Circle */}
              <div className="w-full max-w-[360px] aspect-square relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border-8 border-white/20 backdrop-blur-md" />
                
                {/* Animated Glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 blur-2xl opacity-50 animate-pulse" />
                
                {/* Inner Content */}
                <div className="relative z-10 text-center space-y-4">
                  <div className="text-8xl font-black text-white drop-shadow-2xl">
                    {overallPct}%
                  </div>
                  <div className="text-sm font-black text-blue-200 uppercase tracking-widest">
                    {ar ? "النتيجة الإجمالية" : "Overall Score"}
                  </div>
                  
                  {/* Tier Badge */}
                  <div className="flex items-center justify-center pt-2">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black shadow-lg ${tierBadgeColor(overallTier)}`}>
                      <Target size={16} />
                      {ar ? tierShortLabel(overallTier, ar) : overallTier}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ PARTICIPANT IDENTITY CARD */}
        <ParticipantIdentityCard
          ar={ar}
          fullName={identity.fullName}
          email={identity.email}
          company={identity.company}
          attemptId={attemptId}
        />

        {/* RADAR + BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Radar Chart - FIX OVERLAPPING LABELS */}
          <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 rtl-text">
                {ar ? "مخطط الكفاءات" : "Competency Profile"}
              </h3>
            </div>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#cbd5e1" strokeWidth={2} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ 
                      fill: "#475569", 
                      fontSize: 11, 
                      fontWeight: 700,
                    }}
                    tickLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Competency Breakdown - SWOT COLORED BARS */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 rtl-text">
                {ar ? "التفصيل" : "Breakdown"}
              </h3>
            </div>

            <div className="space-y-5">
              {competencyRows.map((res: any) => {
                const tier = res.derivedTier;
                return (
                  <div key={String(res.competencyId)} className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm rtl-text leading-tight">
                        {getCompetencyLabel(res)}
                      </span>
                      <span className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl shadow-md force-ltr ${tierBadgeColor(tier)}`}>
                        {safePct(res.percentage)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full bg-gradient-to-r transition-all duration-1000 rounded-full ${tierBarColor(tier)}`}
                        style={{ width: `${safePct(res.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🎨 BOLD SWOT CARDS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
              <Award size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 rtl-text">
              {ar ? "تحليل SWOT الاستراتيجي" : "Strategic SWOT Analysis"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STRENGTH - BOLD GREEN */}
            <BoldSwotCard
              ar={ar}
              titleAr="نقاط القوة"
              titleEn="Strengths"
              icon={<TrendingUp size={28} />}
              bgClass="bg-gradient-to-br from-emerald-500 to-green-600"
              items={swotData.strengths}
              getLabel={getCompetencyLabel}
            />
            
            {/* OPPORTUNITY - BOLD BLUE */}
            <BoldSwotCard
              ar={ar}
              titleAr="الفرص"
              titleEn="Opportunities"
              icon={<Lightbulb size={28} />}
              bgClass="bg-gradient-to-br from-blue-500 to-cyan-600"
              items={swotData.opportunities}
              getLabel={getCompetencyLabel}
            />
            
            {/* WEAKNESS - BOLD RED */}
            <BoldSwotCard
              ar={ar}
              titleAr="نقاط الضعف"
              titleEn="Weaknesses"
              icon={<ShieldAlert size={28} />}
              bgClass="bg-gradient-to-br from-rose-500 to-red-600"
              items={swotData.weaknesses}
              getLabel={getCompetencyLabel}
            />
            
            {/* THREAT - BOLD YELLOW */}
            <BoldSwotCard
              ar={ar}
              titleAr="التهديدات"
              titleEn="Threats"
              icon={<AlertTriangle size={28} />}
              bgClass="bg-gradient-to-br from-amber-400 to-orange-500"
              items={swotData.threats}
              getLabel={getCompetencyLabel}
            />
          </div>
        </div>

        {/* EXECUTION PLAN */}
        {isScan && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-10 space-y-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Clock size={28} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 rtl-text">
                {ar ? "خطة التنفيذ السريعة" : "Fast Execution Plan"}
              </h3>
            </div>

            {/* ✅ OVERALL SCORE BLOCK (8th card) */}
            <ExecutionCard
              ar={ar}
              titleAr="النتيجة الإجمالية"
              titleEn="Overall Score"
              descAr="هذا يلخص نمطك العام — ما يختبره العميل فعلًا."
              descEn="Your overall pattern — what prospects actually experience."
              tier={overallTier}
              recommendations={getRecommendations("overall_score", overallTier, language as Language)}
              icon={<Target size={24} />}
            />

            {/* Competency Cards */}
            {competencyRows.map((res: any) => {
              const id = String(res.competencyId);
              const tier: Tier = res.derivedTier;
              const recs = getRecommendations(id, tier, language as Language);
              if (!recs.length) return null;

              return (
                <ExecutionCard
                  key={id}
                  ar={ar}
                  titleAr={getCompetencyLabel({ competencyId: id })}
                  titleEn={getCompetencyLabel({ competencyId: id })}
                  tier={tier}
                  recommendations={recs}
                />
              );
            })}
          </div>
        )}

        {/* MRI Bonuses */}
        {isMri && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl p-10 text-white">
            <div className="flex items-center gap-3 mb-8">
              <Gift className="text-white" size={32} />
              <h3 className="text-3xl font-black rtl-text">
                {ar ? "البونصات الحصرية" : "Exclusive Bonuses"}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-xl mb-3 rtl-text">
                  {ar ? "خطة 90 يوم" : "90-Day Plan"}
                </div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "خطة يومية مفصلة للتحسين المستمر." : "Detailed daily plan for continuous improvement."}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-xl mb-3 rtl-text">{ar ? "5 بونصات" : "5 Bonuses"}</div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "أدوات قابلة للتطبيق الفوري." : "Tools ready for immediate application."}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-xl mb-3 rtl-text">{ar ? "دورة 3 أيام" : "3-Day Course"}</div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "مقعد مجاني في التدريب المتقدم." : "Free seat in advanced training."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Upsell */}
        {showUpsell && (
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white blur-3xl" />
            </div>

            <div className="relative p-12 text-center text-white space-y-6">
              <div className="inline-block p-4 bg-white/20 backdrop-blur-md rounded-3xl text-5xl mb-2">🚀</div>
              <h2 className="text-4xl font-black rtl-text">
                {ar ? "هل أنت مستعد للتحول الكامل؟" : "Ready for Complete Transformation?"}
              </h2>
              <p className="text-xl text-white/95 leading-relaxed max-w-2xl mx-auto rtl-text">
                {ar
                  ? "تقريرك المجاني كشف الأعراض. الآن حان وقت الحل الكامل."
                  : "Your free report revealed the symptoms. Now it's time for the complete solution."}
              </p>
              <Button
                asChild
                className="bg-white text-orange-600 hover:bg-slate-50 font-black px-12 py-8 text-xl rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <a href={config.upsell_url} target="_blank" rel="noreferrer">
                  {ar ? "ارتقِ الآن" : "Upgrade Now"}
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 🎨 BOLD SWOT CARD COMPONENT
function BoldSwotCard({
  ar,
  titleAr,
  titleEn,
  icon,
  bgClass,
  items,
  getLabel,
}: {
  ar: boolean;
  titleAr: string;
  titleEn: string;
  icon: React.ReactNode;
  bgClass: string;
  items: any[];
  getLabel: (x: any) => string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-3xl shadow-2xl border-2 border-white/20 ${bgClass} p-8`}>
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative space-y-6">
        <div className="flex items-center gap-3">
          <div className="text-white drop-shadow-lg">
            {icon}
          </div>
          <h4 className="text-2xl font-black text-white drop-shadow-md rtl-text">
            {ar ? titleAr : titleEn}
          </h4>
        </div>

        <ul className="space-y-3 text-white">
          {items?.length ? (
            items.map((s: any) => (
              <li key={String(s.competencyId || s.name)} className="flex items-start gap-3 text-base font-bold rtl-text">
                <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-white shadow-md" />
                <span className="flex-1 leading-relaxed">
                  {getLabel(s)}
                </span>
              </li>
            ))
          ) : (
            <li className="text-base italic opacity-80 rtl-text">
              {ar ? "لا توجد نتائج" : "No results"}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// EXECUTION CARD COMPONENT
function ExecutionCard({
  ar,
  titleAr,
  titleEn,
  descAr,
  descEn,
  tier,
  recommendations,
  icon,
}: {
  ar: boolean;
  titleAr: string;
  titleEn: string;
  descAr?: string;
  descEn?: string;
  tier: Tier;
  recommendations: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            {icon && <div className="text-slate-700">{icon}</div>}
            <h4 className="font-black text-slate-900 text-xl rtl-text">
              {ar ? titleAr : titleEn}
            </h4>
          </div>
          {(descAr || descEn) && (
            <p className="text-sm text-slate-600 rtl-text leading-relaxed">
              {ar ? descAr : descEn}
            </p>
          )}
        </div>

        <span className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black shadow-md ${tierBadgeColor(tier)}`}>
          <Target size={14} />
          {ar ? tierShortLabel(tier, ar) : tier}
        </span>
      </div>

      {/* Recommendations */}
      {ar ? (
        <ol className="rtl-ol space-y-4 list-decimal">
          {recommendations.slice(0, 3).map((r, i) => (
            <li key={i} className="text-slate-700 text-base leading-relaxed rtl-text font-medium">
              {r}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="ltr-ol space-y-4 list-decimal">
          {recommendations.slice(0, 3).map((r, i) => (
            <li key={i} className="text-slate-700 text-base leading-relaxed font-medium">
              {r}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function DynamicResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
            <div className="text-sm font-bold text-slate-600">Loading...</div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
