import "server-only";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getOfflineAttemptContext } from "@/lib/offline-attempt-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { slug: string };
  searchParams?: {
    attemptId?: string | string[];
    alreadyCompleted?: string | string[];
  };
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value || "").trim();
}

export default async function OfflineAssessmentCompletedPage({
  params,
  searchParams,
}: PageProps) {
  const attemptId = first(searchParams?.attemptId);
  const context = await getOfflineAttemptContext(attemptId);

  if (
    params.slug !== "outdoor-mri" ||
    !context?.isOfflineActivated ||
    context.assessmentId !== "outdoor_sales_mri"
  ) {
    notFound();
  }

  const alreadyCompleted = first(searchParams?.alreadyCompleted) === "1";
  const ar = context.language === "ar";

  const copy = alreadyCompleted
    ? ar
      ? {
          title: "تم إكمال التقييم مسبقاً",
          paragraphs: [
            "لقد أكملت هذا التقييم بالفعل.",
            "تم إرسال نتائجك إلى المدير المخوّل أو قسم الموارد البشرية في شركتك.",
            "يمكنك الآن إغلاق هذه الصفحة.",
          ],
        }
      : {
          title: "Assessment Already Completed",
          paragraphs: [
            "You have already completed this assessment.",
            "Your results have been submitted to your company’s authorised manager or HR representative.",
            "You may now close this page.",
          ],
        }
    : ar
    ? {
        title: "تم إرسال التقييم بنجاح",
        paragraphs: [
          "شكراً لإكمالك التشخيص المتقدم لكفاءة مندوبي المبيعات الميدانية.",
          "تم إرسال إجاباتك بنجاح.",
          "أصبح تقرير التقييم متاحاً الآن للمدير المخوّل أو قسم الموارد البشرية في شركتك، وسيتم مناقشة النتائج معك عند الحاجة.",
          "يمكنك الآن إغلاق هذه الصفحة.",
        ],
      }
    : {
        title: "Assessment Submitted Successfully",
        paragraphs: [
          "Thank you for completing the Outdoor Sales MRI.",
          "Your responses have been submitted successfully.",
          "Your assessment report is now available to your company’s authorised manager or HR representative, who will discuss the results with you when appropriate.",
          "You may now close this page.",
        ],
      };

  return (
    <main
      lang={ar ? "ar" : "en"}
      dir={ar ? "rtl" : "ltr"}
      className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-950"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 px-7 py-9 text-white sm:px-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            {alreadyCompleted ? <ShieldCheck size={30} /> : <CheckCircle2 size={30} />}
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
            {copy.title}
          </h1>
        </div>
        <div className="space-y-4 px-7 py-8 text-base leading-8 text-slate-700 sm:px-10 sm:py-10">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </main>
  );
}

