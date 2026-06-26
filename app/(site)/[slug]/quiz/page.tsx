import QuizPage from "../../quiz/page";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedPaidMriAttempt, isPaidMriSlug } from "@/lib/paid-mri-access";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function BlockedPaidAssessment({ lang }: { lang: string }) {
  const ar = lang === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl">
        <h1 className="text-2xl font-extrabold">
          {ar ? "رابط الدخول غير صالح" : "Access link required"}
        </h1>
        <p className="mt-3 text-white/75">
          {ar
            ? "هذا التقييم المدفوع يتطلب رابط دخول صالح ومخصص لهذا التشخيص."
            : "This paid assessment requires a valid access link for this exact diagnostic."}
        </p>
      </div>
    </div>
  );
}

export default async function SlugQuizPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { attemptId?: string; lang?: string };
}) {
  const slug = String(params?.slug || "").toLowerCase().trim();
  const lang = searchParams?.lang === "ar" ? "ar" : "en";
  const attemptId = String(searchParams?.attemptId || "").trim();

  if (isPaidMriSlug(slug)) {
    if (!attemptId) {
      return <BlockedPaidAssessment lang={lang} />;
    }

    const supabase = getSupabaseAdmin();
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, assessment_id, access_token_id, company_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (!attempt || !isAuthorizedPaidMriAttempt(slug, attempt)) {
      return <BlockedPaidAssessment lang={lang} />;
    }
  }

  return <QuizPage />;
}
