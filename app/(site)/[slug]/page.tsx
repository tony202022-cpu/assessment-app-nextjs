import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssessmentConfig } from "@/lib/actions";

function safeSlug(x: any) {
  return String(x || "").toLowerCase().trim();
}

type WelcomeCopy = {
  titleEn: string;
  subtitleEn: string;
};

function welcomeCopy(slug: string, assessmentId: string, conf: any): WelcomeCopy {
  const s = safeSlug(slug);
  const id = safeSlug(assessmentId);
  const isLawyer = s === "lawyer-client-conversion-mri" || id === "lawyer_client_conversion_mri";
  const isSalesManager = s === "sales-manager-mri" || id === "sales_manager_mri";
  const isBusinessHealth = s === "sme-business-health-mri" || id === "sme_business_health_mri";
  const isScan = s.includes("scan") || id.includes("scan");

  if (isLawyer) {
    return {
      titleEn: "Client Acquisition Standard™",
      subtitleEn: "A practical 75-scenario diagnostic for lawyers.",
    };
  }

  if (isSalesManager) {
    return {
      titleEn: "Advanced Sales Manager MRI",
      subtitleEn: "A practical leadership diagnostic for sales managers.",
    };
  }

  if (isBusinessHealth) {
    return {
      titleEn: "SME Business Health MRI",
      subtitleEn: "A practical diagnostic across 12 business-health areas.",
    };
  }

  if (isScan) {
    return {
      titleEn: conf.title_en || conf.name_en || "Professional Sales Scan",
      subtitleEn: "A short professional scan of your current performance.",
    };
  }

  return {
    titleEn: conf.title_en || conf.name_en || "Advanced Outdoor Sales MRI",
    subtitleEn: "A practical diagnostic for professional field-sales performance.",
  };
}

export default async function LanguageEntry({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { token?: string | string[] };
}) {
  const slug = safeSlug(params?.slug);

  // ✅ Preserve team/company token from master links:
  // /outdoor-mri?token=xxx -> /outdoor-mri/login?lang=en&token=xxx
  const rawToken = Array.isArray(searchParams?.token)
    ? searchParams?.token[0]
    : searchParams?.token;

  const teamToken = String(rawToken || "").trim();
  const tokenQuery = teamToken ? `&token=${encodeURIComponent(teamToken)}` : "";

  // ✅ Allow any slug that exists and is active in Supabase
  const conf: any = await getAssessmentConfig(slug);
  if (!conf || conf.status !== "active") {
    notFound();
  }

  const mins = Number(conf?.timer_minutes || 0);
  const qCount = Number(conf?.num_questions || 0);

  const copy = welcomeCopy(slug, String(conf?.id || ""), conf);

  return (
    <main
      dir="ltr"
      className="min-h-screen w-full flex items-center justify-center px-4 py-5 sm:px-5 sm:py-10 bg-gradient-to-br from-[#0b1220] via-[#0f1f3a] to-[#102a5a]"
    >
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="rounded-3xl bg-white/10 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 text-sm font-semibold">
              <span>Choose your language</span>
            </div>

            <h1 className="mt-4 sm:mt-6 text-[clamp(27px,7vw,48px)] font-extrabold tracking-tight text-white leading-tight">
              {copy.titleEn}
            </h1>

            <p className="mt-3 text-sm sm:text-lg font-medium text-white/80 leading-relaxed">
              {copy.subtitleEn}
            </p>

            {/* micro info row */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {qCount > 0 && (
                <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                  {qCount} questions
                </div>
              )}
              {mins > 0 && (
                <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                  ~{mins} minutes
                </div>
              )}
              <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                Private results
              </div>
            </div>

            <p className="mt-5 text-sm sm:text-base text-white/80">
              Choose your language to begin
            </p>
          </div>

          {/* Buttons */}
          <div className="px-5 sm:px-8 pb-6 sm:pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href={`/${slug}/login?lang=en${tokenQuery}`}
                className="group h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-extrabold flex items-center justify-center shadow-lg hover:bg-white/90 active:bg-white/80 transition"
              >
                English
                <span className="ml-2 opacity-60 group-hover:opacity-100 transition">
                  →
                </span>
              </Link>

              <Link
                href={`/${slug}/login?lang=ar${tokenQuery}`}
                className="group h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-extrabold flex items-center justify-center shadow-lg hover:bg-white/90 active:bg-white/80 transition"
              >
                العربية
                <span className="ml-2 opacity-60 group-hover:opacity-100 transition">
                  →
                </span>
              </Link>
            </div>

          </div>
        </div>

        <div className="mt-3 text-center text-[11px] text-white/40">
          Powered by Level Up Business Consulting - Career Labs
        </div>
      </div>
    </main>
  );
}
