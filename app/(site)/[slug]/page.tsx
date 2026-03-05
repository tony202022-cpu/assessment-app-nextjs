import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssessmentConfig } from "@/lib/actions";

export default async function LanguageEntry({
  params,
}: {
  params: { slug: string };
}) {
  const slug = String(params?.slug || "").toLowerCase().trim();

  // ✅ Allow any slug that exists and is active in Supabase
  const conf: any = await getAssessmentConfig(slug);
  if (!conf || conf.status !== "active") {
    notFound();
  }

  const title = conf.title_en || conf.name_en || "Assessment";

  // Optional hints (safe fallbacks)
  const mins = Number(conf?.timer_minutes || 0);
  const qCount = Number(conf?.num_questions || 0);

  return (
    <main dir="ltr" className="min-h-screen w-full flex items-center justify-center px-5 py-10 bg-gradient-to-br from-[#0b1220] via-[#0f1f3a] to-[#102a5a]">
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="rounded-3xl bg-white/10 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-9 sm:pt-10 pb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 text-sm font-semibold">
              <span className="text-base">🧠</span>
              <span>Choose your language</span>
            </div>

            <h1 className="mt-6 text-[clamp(28px,7vw,48px)] font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>

            {/* ✅ Replace the repeated subtitle with your strong short description */}
            <p className="mt-3 text-[clamp(14px,3.8vw,18px)] font-medium text-white/80 leading-relaxed">
              A powerful assessment to evaluate 7 core competencies of outdoor salespeople.
            </p>

            {/* micro info row */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {qCount > 0 && (
                <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                  ✅ {qCount} questions
                </div>
              )}
              {mins > 0 && (
                <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                  ⏱️ ~{mins} minutes
                </div>
              )}
              <div className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/85">
                🔒 Private results
              </div>
            </div>

            <p className="mt-7 text-[clamp(14px,3.8vw,18px)] text-white/80">
              Choose your language to begin
            </p>
          </div>

          {/* Buttons */}
          <div className="px-6 sm:px-8 pb-9 sm:pb-10">
            {/* ✅ Mobile-first: stacked on mobile, two columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href={`/${slug}/login?lang=en`}
                className="group h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-extrabold flex items-center justify-center shadow-lg hover:bg-white/90 active:bg-white/80 transition"
              >
                English
                <span className="ml-2 opacity-60 group-hover:opacity-100 transition">
                  →
                </span>
              </Link>

              <Link
                href={`/${slug}/login?lang=ar`}
                className="group h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-extrabold flex items-center justify-center shadow-lg hover:bg-white/90 active:bg-white/80 transition"
              >
                Arabic
                <span className="ml-2 opacity-60 group-hover:opacity-100 transition">
                  →
                </span>
              </Link>
            </div>

            {/* ✅ Tip line: no dot-before-tip and ends properly */}
            <div className="mt-6 text-center text-xs sm:text-sm text-white/60 leading-relaxed">
              Choose the language you want for the full experience (quiz + results).
            </div>
          </div>
        </div>

        {/* Optional footer hint (you said you may change later) */}
        <div className="mt-4 text-center text-xs text-white/40">
          Powered by Level Up Business Consulting - Career Labs
        </div>
      </div>
    </main>
  );
}