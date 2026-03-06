"use client";

import { useState } from 'react';
import {
  getRecommendations,
  normalizeCompetencyId,
  tierFromPercentage,
  Tier,
  Language,
} from "@/lib/pdf-recommendations";
import React, { useEffect, useMemo, Suspense } from "react";
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
  Target,
  User,
  Mail,
  Building2,
  Fingerprint,
  Zap,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Shield,
  HelpCircle,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// ✅ Assessment IDs
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

// 🔗 New Zenler payment URL (empty until ready)
const MRI_PAYMENT_URL = "";

// ✅ Competency labels fallback
const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation", ar: "عقلية التحفيز والموقف" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
};

function normalizeCompetencySafe(raw: any) {
  const id = normalizeCompetencyId(String(raw || ""));
  if (id === "destroying_objections") return "handling_objections";
  return id;
}

function isProbablyMRI(
  routeSlug?: string,
  attemptAssessmentId?: string | null,
  configType?: string | null
) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  if (s === "mri") return true;
  if (a.includes("mri")) return true;
  if (c === "mri") return true;
  if (a === MRI_ASSESSMENT_ID) return true;
  return false;
}

function isProbablyScan(
  routeSlug?: string,
  attemptAssessmentId?: string | null,
  configType?: string | null
) {
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

function cleanRecommendationText(input: string) {
  const text = String(input || "").trim();

  return text
    // remove wrapping quotes or decorative starters
    .replace(/^[“"'`]+/, "")
    // remove leading emojis / symbols / bullets / checkmarks / stars
    .replace(/^[\p{Extended_Pictographic}\u2600-\u27BF\uFE0F\s•●▪◦▪︎✔✓✅✦★☆▶►→➡️]+/u, "")
    // remove leading numbering like 1. 1) 1- 01. ①
    .replace(/^(?:\(?\d{1,2}\)?[.)\-:]\s*|\d{1,2}\s*[-–—]\s*|[①②③④⑤⑥⑦⑧⑨⑩]\s*)/u, "")
    .trim();
}

function tierBadgeColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Threat":
      return "bg-rose-500 text-white";
    case "Weakness":
    default:
      return "bg-red-700 text-white";
  }
}

function tierBarColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "from-emerald-500 to-emerald-600";
    case "Opportunity":
      return "from-blue-500 to-blue-600";
    case "Threat":
      return "from-rose-400 to-rose-500";
    case "Weakness":
    default:
      return "from-red-600 to-red-700";
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
    return path
      .split(".")
      .reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj);
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

const PrintInstructions = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowInstructions(true)}
        className="print-hide text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        <HelpCircle size={14} />
        Print Help
      </button>

      {showInstructions && (
        <div className="print-hide fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="font-bold text-lg mb-4">Perfect PDF Settings</h3>
            <div className="space-y-3 text-sm">
              <div><strong>1. Destination:</strong> Save as PDF</div>
              <div><strong>2. Paper:</strong> A4 or Letter</div>
              <div><strong>3. Margins:</strong> None or Minimum</div>
              <div className="bg-yellow-50 p-2 rounded">
                <strong>Important:</strong> Uncheck "Headers and footers" to remove URLs
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <strong>For colors:</strong> Check "Background graphics"
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

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
    <section
      className="pdf-avoid-break relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-xl"
      data-rtl={ar ? "true" : "false"}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 blur-3xl opacity-40" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-200 to-blue-300 blur-3xl opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 blur-3xl opacity-20" />
      </div>

      <div className="relative p-5 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 md:mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="text-blue-600" size={20} />
              <div className="text-lg md:text-xl font-black text-slate-900">
                {ar ? "بطاقة هوية المشارك" : "Participant Identity Card"}
              </div>
            </div>
            <div className="text-xs md:text-sm text-slate-600">
              {ar
                ? "هوية احترافية عالمية المستوى لمشاركة النتائج بثقة تامة."
                : "World-class professional identity for confident results sharing."}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 px-3 md:px-4 py-2 md:py-2.5 bg-white shadow-sm self-start sm:self-auto">
            <Fingerprint size={16} className="text-slate-600" />
            <span className="text-xs md:text-sm font-black text-slate-700">
              ID:{" "}
              <span className="font-mono text-blue-600" style={{ direction: "ltr" }}>
                {shortAttemptId(attemptId) || "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-3 md:gap-4">
              <div className="shrink-0 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                <User size={20} className="md:w-6 md:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 md:mb-2">
                  {ar ? "الاسم الكامل" : "Full Name"}
                </div>
                <div className="text-base md:text-lg font-bold text-slate-900 break-words leading-tight">
                  {fullName || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-3 md:gap-4">
              <div className="shrink-0 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                <Mail size={20} className="md:w-6 md:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 md:mb-2">
                  {ar ? "البريد الإلكتروني" : "Email"}
                </div>
                <div
                  className="text-base md:text-lg font-bold text-slate-900 break-words leading-tight"
                  style={{ direction: "ltr", textAlign: "left" }}
                >
                  {email || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl md:rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-start gap-3 md:gap-4">
              <div className="shrink-0 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                <Building2 size={20} className="md:w-6 md:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 md:mb-2">
                  {ar ? "الشركة" : "Company"}
                </div>
                <div className="text-base md:text-lg font-bold text-slate-900 break-words leading-tight">
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

  const labelsFromConfig = useMemo(() => {
    const out: Record<string, { en: string; ar: string }> = {};
    const arr = (config?.config?.competencies || []) as any[];
    for (const c of arr) {
      const id = normalizeCompetencySafe(c?.id);
      if (!id) continue;
      out[id] = { en: String(c?.en || ""), ar: String(c?.ar || "") };
    }
    return out;
  }, [config]);

  const getCompetencyLabel = (res: any) => {
    const id = normalizeCompetencySafe(res?.competencyId);
    const meta = (id && labelsFromConfig[id]) || (id && COMPETENCY_LABELS[id]) || null;
    if (meta) return ar ? (meta.ar || meta.en) : (meta.en || meta.ar);
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
  }, [competencyRows, ar, labelsFromConfig]);

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

  const titleFromDb =
    (ar
      ? (config?.title_ar || config?.name_ar || "")
      : (config?.title_en || config?.name_en || "")) || "";

  const subtitleFromDb =
    (ar
      ? String(config?.config?.subtitle_ar || "")
      : String(config?.config?.subtitle_en || "")) || "";

  const heroTitle =
    titleFromDb ||
    (ar ? "نتائج فحص المبيعات" : "Sales Competency Results");

  const heroSubtitle =
    subtitleFromDb ||
    (ar
      ? "تحليل شامل للكفاءات مع تحليل SWOT وخطة تنفيذ فورية."
      : "Comprehensive analysis with strategic SWOT and immediate action plan.");

  // Simple download handler - MRI opens new tab, others print
  const handleDownload = () => {
    if (isMri && attemptId) {
      window.open(`/reports/pdf/mri/${attemptId}`, '_blank');
    } else {
      window.print();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
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

  const showUpsell = isScan;

  return (
    <div
      className="scan-pdf-container min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
      data-rtl={ar ? "true" : "false"}
    >
      <style jsx global>{`
        [data-rtl="true"] * { direction: rtl !important; }
        [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; }
        [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
        [data-rtl="true"] ol.rtl-ol { direction: rtl !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-right: 1.25rem !important; padding-left: 0 !important; }
        [data-rtl="false"] ol.ltr-ol { direction: ltr !important; unicode-bidi: plaintext !important; list-style-position: inside !important; padding-left: 1.25rem !important; padding-right: 0 !important; }
      `}</style>

      <Header />
 
{/* Download Controls */}
<div
  className={`print-hide fixed top-4 z-50 flex items-center gap-2 ${
    ar ? "left-4" : "right-4"
  }`}
>
  <PrintInstructions />
  <button
    onClick={handleDownload}
    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-lg flex items-center gap-2 font-semibold transition-all"
  >
    <Download size={20} />
    {ar ? "تحميل PDF" : "Download PDF"}
  </button>
</div>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* HERO */}
        <div className="pdf-avoid-break relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-2 border-slate-200">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />

          <div className="absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-400 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-400 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative p-6 sm:p-8 md:p-10 lg:p-14">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-start w-full">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-bold backdrop-blur-sm">
                  <Check size={16} className="sm:w-5 sm:h-5" />
                  {ar ? "اكتمل التقييم بنجاح" : "Assessment Completed"}
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight rtl-text">
                  {heroTitle}
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-blue-100 leading-relaxed rtl-text">
                  {heroSubtitle}
                </p>

                <div className="print-hide flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2 sm:pt-4 w-full">
                  
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="w-full sm:w-auto border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold px-6 sm:px-8 py-6 sm:py-7 rounded-2xl flex gap-2 sm:gap-3 backdrop-blur-sm transition-all active:scale-95 text-sm sm:text-base min-h-[48px]"
                  >
                    {copied ? <Check size={20} className="text-emerald-300" /> : <Share2 size={20} />}
                    {ar ? "مشاركة" : "Share"}
                  </Button>

                  <Button
                    onClick={goToFullReport}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black px-6 sm:px-8 py-6 sm:py-7 rounded-2xl flex gap-2 sm:gap-3 shadow-xl transition-all active:scale-95 text-sm sm:text-base min-h-[48px]"
                  >
                    <FileText size={20} />
                    {ar ? "التقرير الكامل" : "Full Report"}
                  </Button>
                </div>
              </div>

              <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] aspect-square relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 sm:border-8 border-white/20 backdrop-blur-md" />
                <div className="absolute inset-2 sm:inset-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 blur-2xl opacity-50 animate-pulse" />

                <div className="relative z-10 text-center space-y-2 sm:space-y-4">
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-white drop-shadow-2xl">
                    {overallPct}%
                  </div>
                  <div className="text-xs sm:text-sm font-black text-blue-200 uppercase tracking-widest px-2">
                    {ar ? "النتيجة الإجمالية" : "Overall Score"}
                  </div>

                  <div className="flex items-center justify-center pt-1 sm:pt-2">
                    <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-black shadow-lg ${tierBadgeColor(overallTier)}`}>
                      <Target size={14} className="sm:w-4 sm:h-4" />
                      {ar ? tierShortLabel(overallTier, ar) : overallTier}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ParticipantIdentityCard
          ar={ar}
          fullName={identity.fullName}
          email={identity.email}
          company={identity.company}
          attemptId={attemptId}
        />

{/* RADAR + BREAKDOWN */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
  <div className="pdf-avoid-break lg:col-span-2 bg-white rounded-2xl md:rounded-3xl border-2 border-slate-200 shadow-xl p-5 sm:p-6 md:p-8">
    <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
      <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
        <Zap size={20} className="sm:w-6 sm:h-6" />
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 rtl-text">
          {ar ? "مخطط الكفاءات" : "Competency Profile"}
        </h3>
        <div className="text-xs sm:text-sm text-slate-500 mt-1 rtl-text">
          {ar ? "لقطة مرئية للكفاءات السبع" : "A visual snapshot of your seven competencies"}
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4 md:p-5">
      <div className="h-[360px] sm:h-[430px] md:h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="72%"
            data={chartData}
            margin={{ top: 18, right: 22, bottom: 18, left: 22 }}
          >
            <PolarGrid stroke="#cbd5e1" strokeWidth={2} />
            <PolarAngleAxis
              dataKey="subject"
              tickLine={false}
              tick={{
                fill: "#334155",
                fontSize: 12,
                fontWeight: 800,
              }}
              dy={6}
            />
            <Radar
              name="Score"
              dataKey="A"
              stroke="#2563eb"
              strokeWidth={3}
              fill="#3b82f6"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>

  <div className="pdf-avoid-break bg-white rounded-2xl md:rounded-3xl border-2 border-slate-200 shadow-xl p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
        <Target size={20} className="sm:w-6 sm:h-6" />
      </div>
      <div>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 rtl-text">
          {ar ? "التفصيل" : "Breakdown"}
        </h3>
        <div className="text-xs sm:text-sm text-slate-500 mt-1 rtl-text">
          {ar ? "توزيع الكفاءات الحالية" : "Your current competency distribution"}
        </div>
      </div>
    </div>

    <div className="space-y-4 sm:space-y-5">
      {competencyRows.map((res: any) => {
        const tier = res.derivedTier;
        return (
          <div key={String(res.competencyId)} className="space-y-2.5">
            <div className="flex justify-between items-start gap-3">
              <span className="font-bold text-slate-800 text-sm rtl-text leading-snug">
                {getCompetencyLabel(res)}
              </span>
              <span
                className={`shrink-0 text-xs font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-md force-ltr ${tierBadgeColor(
                  tier
                )}`}
              >
                {safePct(res.percentage)}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-gradient-to-r transition-all duration-1000 rounded-full ${tierBarColor(
                  tier
                )}`}
                style={{ width: `${safePct(res.percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
</div>

        {/* SWOT */}
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
              <Award size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">
              {ar ? "تحليل SWOT الاستراتيجي" : "Strategic SWOT Analysis"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <BoldSwotCard
              ar={ar}
              titleAr="نقاط القوة"
              titleEn="Strengths"
              icon={<TrendingUp size={24} className="sm:w-7 sm:h-7" />}
              bgClass="bg-gradient-to-br from-emerald-500 to-green-600"
              items={swotData.strengths}
              getLabel={getCompetencyLabel}
            />

            <BoldSwotCard
              ar={ar}
              titleAr="الفرص"
              titleEn="Opportunities"
              icon={<Lightbulb size={24} className="sm:w-7 sm:h-7" />}
              bgClass="bg-gradient-to-br from-blue-500 to-cyan-600"
              items={swotData.opportunities}
              getLabel={getCompetencyLabel}
            />

            <BoldSwotCard
              ar={ar}
              titleAr="نقاط الضعف"
              titleEn="Weaknesses"
              icon={<ShieldAlert size={24} className="sm:w-7 sm:h-7" />}
              bgClass="bg-gradient-to-br from-rose-500 to-red-600"
              items={swotData.weaknesses}
              getLabel={getCompetencyLabel}
            />

            <BoldSwotCard
              ar={ar}
              titleAr="التهديدات"
              titleEn="Threats"
              icon={<AlertTriangle size={24} className="sm:w-7 sm:h-7" />}
              bgClass="bg-gradient-to-br from-amber-400 to-orange-500"
              items={swotData.threats}
              getLabel={getCompetencyLabel}
            />
          </div>
        </div>

        {/* EXECUTION PLAN */}
        {isScan && (
          <div className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8 md:p-10 space-y-8 sm:space-y-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Clock size={24} className="sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">
                {ar ? "خطة التنفيذ السريعة" : "Fast Execution Plan"}
              </h3>
            </div>

            <ExecutionCard
              ar={ar}
              titleAr="النتيجة الإجمالية"
              titleEn="Overall Score"
              descAr="هذا يلخص نمطك العام — ما يختبره العميل فعلًا."
              descEn="Your overall pattern — what prospects actually experience."
              tier={overallTier}
              recommendations={getRecommendations("overall_score", overallTier, language as Language)}
              icon={<Target size={20} className="sm:w-6 sm:h-6" />}
            />

{competencyRows
  .filter((res: any, index: number) => {
    const id = String(res.competencyId);
    const tier: Tier = res.derivedTier;
    const recs = getRecommendations(id, tier, language as Language);
    return recs.length > 0;
  })
  .map((res: any, index: number) => {
    const id = String(res.competencyId);
    const tier: Tier = res.derivedTier;
    const recs = getRecommendations(id, tier, language as Language);

    return (
      <ExecutionCard
        key={`${id}-${tier}-${index}-${res.percentage}`}
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

        {isMri && (
          <div className="pdf-avoid-break bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl md:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 text-white">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <Gift className="text-white" size={28} />
              <h3 className="text-2xl sm:text-3xl font-black rtl-text">
                {ar ? "البونصات الحصرية" : "Exclusive Bonuses"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-lg sm:text-xl mb-2 sm:mb-3 rtl-text">
                  {ar ? "خطة 90 يوم" : "90-Day Plan"}
                </div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "خطة يومية مفصلة للتحسين المستمر." : "Detailed daily plan for continuous improvement."}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-lg sm:text-xl mb-2 sm:mb-3 rtl-text">
                  {ar ? "5 بونصات" : "5 Bonuses"}
                </div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "أدوات قابلة للتطبيق الفوري." : "Tools ready for immediate application."}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 hover:bg-white/20 transition-all">
                <div className="font-black text-lg sm:text-xl mb-2 sm:mb-3 rtl-text">
                  {ar ? "دورة 3 أيام" : "3-Day Course"}
                </div>
                <div className="text-sm text-white/90 leading-relaxed rtl-text">
                  {ar ? "مقعد مجاني في التدريب المتقدم." : "Free seat in advanced training."}
                </div>
              </div>
            </div>
          </div>
        )}

{/* MRI UPSELL - ONLY FOR SCAN */}
{showUpsell && (
  <div className="print-hide mt-20">
    <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded-3xl shadow-2xl border border-red-500">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600" />

      <div className="relative p-6 md:p-10 text-white">
        <div className="inline-block bg-red-800 text-red-100 px-5 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-wider border-2 border-red-600">
          {ar ? "تشخيص المستوى التالي" : "NEXT LEVEL DIAGNOSIS"}
        </div>

        <h2 className="mt-5 text-[clamp(30px,5vw,58px)] font-black leading-[1.05] max-w-5xl">
          {ar ? (
            <>
              كشف الـ SCAN الإشارات.
              <br />
              <span className="text-orange-300">Advanced Sales MRI</span> يكشف السبب.
            </>
          ) : (
            <>
              Your SCAN revealed the signals.
              <br />
              <span className="text-orange-300">The Advanced Sales MRI</span> reveals the cause.
            </>
          )}
        </h2>

        <p className="mt-5 text-[17px] md:text-[22px] max-w-4xl leading-[1.75] text-red-50 font-medium">
          {ar
            ? "الـ SCAN أظهر نمط الأداء على السطح عبر سبع كفاءات. أما الـ Advanced Outdoor Sales MRI فيقدّم تشخيصًا أعمق عبر خمس عشرة كفاءة باستخدام مواقف بيعية واقعية وضغط زمني حقيقي."
            : "The SCAN shows surface performance patterns across seven competencies. The Advanced Outdoor Sales MRI performs a deeper diagnostic across fifteen competencies using real-world sales scenarios and strict time pressure."}
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-red-400/30 bg-red-900/35 p-6 shadow-xl">
            <div className="text-[11px] md:text-xs font-black uppercase tracking-[0.22em] text-red-100/90">
              {ar ? "ما الذي كشفه الـ SCAN" : "WHAT SCAN REVEALED"}
            </div>

            <ul className="mt-4 space-y-3 text-[17px] md:text-[20px] text-white font-bold leading-[1.65]">
              <li>✓ {ar ? "لقطة سريعة لنقاط القوة والفجوات" : "Quick snapshot of strengths and gaps"}</li>
              <li>✓ {ar ? "إشارات إنذار مبكرة" : "Early warning signals"}</li>
              <li>✓ {ar ? "مؤشرات الأداء السطحية" : "Surface performance indicators"}</li>
              <li>✓ {ar ? "نظرة استراتيجية أولية" : "Strategic preview"}</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-yellow-300/40 bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-300 p-6 shadow-xl">
            <div className="text-[15px] md:text-[18px] font-black tracking-[0.08em] text-slate-900 leading-tight">
              {ar ? "ما الذي يفتحه الـ MRI المتقدم" : "WHAT THE ADVANCED MRI UNLOCKS"}
            </div>

            <ul className="mt-4 space-y-3 text-[17px] md:text-[20px] text-slate-900 font-black leading-[1.65]">
              <li>★ {ar ? "خريطة تشخيص كاملة عبر 15 كفاءة" : "Full 15-competency diagnostic map"}</li>
              <li>★ {ar ? "اختبار قرار مبني على سيناريوهات واقعية" : "Scenario-based decision testing"}</li>
              <li>★ {ar ? "ضغط أداء حقيقي لمدة 90 دقيقة" : "Strict 90-minute performance pressure"}</li>
              <li>★ {ar ? "تحليل جذور الصفقات المفقودة" : "Root-cause analysis of lost deals"}</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/15 bg-white/8 p-5 shadow-lg">
            <div className="text-[26px] md:text-[32px] font-black text-white leading-tight">
              {ar ? "خطة 90 يوم" : "90-Day Plan"}
            </div>
            <div className="mt-2 text-[15px] md:text-[18px] text-red-50 leading-[1.65] font-medium">
              {ar ? "خارطة عملية لإصلاح أضعف كفاءاتك." : "A practical roadmap to repair your weakest competencies."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 p-5 shadow-lg">
            <div className="text-[26px] md:text-[32px] font-black text-white leading-tight">
              {ar ? "5 أدوات إضافية" : "5 Bonus Tools"}
            </div>
            <div className="mt-2 text-[14px] md:text-[16px] text-red-100 leading-relaxed">
              {ar ? "أدوات احترافية للاعتراضات والإقناع وإدارة الوقت." : "Professional tools for objections, persuasion and time mastery."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 p-5 shadow-lg">
            <div className="text-[26px] md:text-[32px] font-black text-white leading-tight">
              {ar ? "تحليل عميق 25 صفحة" : "25-Page Deep Analysis"}
            </div>
            <div className="mt-2 text-[14px] md:text-[16px] text-red-100 leading-relaxed">
              {ar ? "تقرير تشخيصي مفصل يحلل كل كفاءة من الكفاءات الخمس عشرة." : "A detailed 25-page diagnostic report analyzing every core score across all 15 competencies."}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/15 bg-black/15 px-5 py-5 text-center">
          <p className="text-[17px] md:text-[22px] font-bold text-white leading-[1.75] max-w-4xl mx-auto">
            {ar
              ? "نتائجك أظهرت بالفعل أين قد يتسرّب الإيراد. الـ Advanced MRI يوضح بالضبط لماذا تنهار الصفقات — وما الذي يجب إصلاحه أولًا."
              : "Your results already show where revenue may be leaking. The Advanced MRI shows exactly why deals break down — and what to fix first."}
          </p>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:w-auto">
            {MRI_PAYMENT_URL ? (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base md:text-lg px-8 py-7 rounded-2xl shadow-2xl transition-all hover:scale-[1.02]"
              >
                <a href={MRI_PAYMENT_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                  {ar ? "اذهب لصفحة الـ MRI الكاملة" : "OPEN THE FULL MRI PAGE"}
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            ) : (
              <Button
                size="lg"
                disabled
                className="bg-white/15 text-red-100 font-black text-base md:text-lg px-8 py-7 rounded-2xl shadow-2xl cursor-not-allowed"
              >
                {ar ? "قريباً" : "COMING SOON"}
              </Button>
            )}
          </div>

          <p className="text-sm md:text-base text-red-100/90 max-w-2xl leading-relaxed">
            {ar
              ? "المقاعد محدودة كل شهر. تجاهل ما كشفه الـ SCAN يعني الاستمرار في خسارة الصفقات دون أن تعرف السبب الحقيقي."
              : "Seats are limited each month. Ignoring what your SCAN revealed means continuing to lose deals without knowing why."}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
      </main>
    </div>
  );
}

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
    <div className={`pdf-avoid-break relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-2 border-white/20 ${bgClass} p-6 sm:p-8`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative space-y-5 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-white drop-shadow-lg">{icon}</div>
          <h4 className="text-xl sm:text-2xl font-black text-white drop-shadow-md rtl-text">
            {ar ? titleAr : titleEn}
          </h4>
        </div>

        <ul className="space-y-2.5 sm:space-y-3 text-white">
          {items?.length ? (
            items.map((s: any) => (
              <li
                key={String(s.competencyId || s.name)}
                className="flex items-start gap-2.5 sm:gap-3 text-sm sm:text-base font-bold rtl-text"
              >
                <div className="shrink-0 mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white shadow-md" />
                <span className="flex-1 leading-relaxed">{getLabel(s)}</span>
              </li>
            ))
          ) : (
            <li className="text-sm sm:text-base italic opacity-80 rtl-text">
              {ar ? "لا توجد نتائج" : "No results"}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

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
    <div className="pdf-avoid-break rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 md:p-8 shadow-lg">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  {icon}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight rtl-text">
                  {ar ? titleAr : titleEn}
                </h4>

                {(descAr || descEn) && (
                  <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed rtl-text">
                    {ar ? descAr : descEn}
                  </p>
                )}
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-black shadow-sm ${tierBadgeColor(
              tier
            )}`}
          >
            <Target size={13} className="sm:w-3.5 sm:h-3.5" />
            {ar ? tierShortLabel(tier, ar) : tier}
          </span>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="space-y-3">
          {recommendations.slice(0, 3).map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 ${
                ar ? "flex-row-reverse text-right" : ""
              }`}
            >
              <div
                className={`mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-black ${
                  ar ? "order-2" : ""
                }`}
              >
                {i + 1}
              </div>

              <p
                className={`flex-1 text-sm sm:text-base text-slate-700 leading-relaxed font-medium ${
                  ar ? "rtl-text order-1" : ""
                }`}
              >
                {String(cleanRecommendationText(r) || "")
                  .replace(/^[\s•*\-★✓\d\.\)\(]+/, "")
                  .trim()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default function DynamicResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
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
