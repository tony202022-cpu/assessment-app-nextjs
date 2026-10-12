import "server-only";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isOfflineActivatedOutdoorMriAttempt } from "@/lib/offline-attempt-access";
import { ReportAuthorizationService } from "@/modules/report-authorization";
import ResultsClient from "./ResultsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { slug: string };
  searchParams?: { attemptId?: string | string[]; lang?: string | string[] };
};

function getAttemptId(searchParams: PageProps["searchParams"]) {
  const value = searchParams?.attemptId;
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

export default async function ResultsPage({ params, searchParams }: PageProps) {
  const attemptId = getAttemptId(searchParams);

  if (attemptId && (await isOfflineActivatedOutdoorMriAttempt(attemptId))) {
    redirect(
      `/outdoor-mri/completed?attemptId=${encodeURIComponent(attemptId)}`,
    );
  }

  if (attemptId && ["scan", "outdoor-scan"].includes(params.slug)) {
    const authorization = await new ReportAuthorizationService().authorizeAttemptAccess({
      attemptId,
      expectedAssessmentSlug: params.slug,
      cookies: cookies(),
      headers: headers(),
      purpose: "view",
    });
    if (!authorization.authorized && authorization.decision === "REPORT_VISIBILITY_DENIED") {
      const rawLanguage = searchParams?.lang;
      const arabic = (Array.isArray(rawLanguage) ? rawLanguage[0] : rawLanguage) === "ar";
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white" dir={arabic ? "rtl" : "ltr"}>
          <section className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-xl">
            <h1 className="text-3xl font-black">{arabic ? "تم إكمال التقييم" : "Assessment completed"}</h1>
            <p className="mt-4 text-white/75">
              {arabic
                ? "تم حفظ إجاباتك بنجاح. سيُشارك التقرير وفق سياسة الوصول التي حددها المسؤول."
                : "Your answers have been saved. The report will be shared according to the access policy selected by the administrator."}
            </p>
          </section>
        </main>
      );
    }
  }

  return <ResultsClient />;
}
