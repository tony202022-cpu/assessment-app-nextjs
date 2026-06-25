"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";

type Lang = "en" | "ar";

function safeLang(x: string | null): Lang {
  return x === "ar" ? "ar" : "en";
}

function safeSlug(x: any) {
  return String(x || "").toLowerCase().trim();
}

// Fallback competency counts ONLY if config.competency_ids is missing.
// You said: SCAN = 7 competencies, MRI = 15 competencies.
function fallbackCompetencyCount(slug: string) {
  const s = safeSlug(slug);
  if (s.includes("sme-business-health")) return 12;
  if (s.endsWith("mri") || s === "mri") return 15;
  return 7;
}

type InstructionCopy = {
  subtitle: string;
  rules: string[];
  cta: string;
};

function instructionCopy(slug: string, assessmentId: string, ar: boolean, isMRI: boolean): InstructionCopy {
  const s = safeSlug(slug);
  const id = safeSlug(assessmentId);
  const isLawyer = s === "lawyer-client-conversion-mri" || id === "lawyer_client_conversion_mri";
  const isSalesManager = s === "sales-manager-mri" || id === "sales_manager_mri";
  const isBusinessHealth = s === "sme-business-health-mri" || id === "sme_business_health_mri";

  if (isLawyer) {
    return ar
      ? {
          subtitle:
            "هذا تشخيص عملي لقياس كيفية كسب الموكلين بصورة مهنية. يقيس أسلوب تعاملك مع مواقف واقعية قبل الاستشارة وأثناءها وبعدها.",
          rules: [
            "أجب وفق الطريقة التي تتعامل بها فعليًا في الواقع المهني.",
            "جميع الخيارات واقعية؛ اختر الرد الأقرب إلى حكمك المهني المعتاد.",
            "هذا ليس اختبارًا في المعرفة القانونية. بل يقيس قدرتك على بناء الثقة، وشرح القيمة القانونية، ومناقشة أتعاب المحاماة، وقيادة الموكل نحو الخطوة القانونية المناسبة.",
          ],
          cta: "ابدأ تشخيص كسب الموكلين",
        }
      : {
          subtitle:
            "This is a practical legal client-acquisition diagnostic. It measures how you handle realistic client situations before, during, and after a consultation.",
          rules: [
            "Answer based on how you would genuinely respond in practice.",
            "The options are intentionally realistic; choose the response closest to your normal professional judgement.",
            "This is not a test of legal knowledge. It measures how clearly you build trust, explain legal value, discuss professional fees, and guide the next legal step.",
          ],
          cta: "Start the Client Acquisition Diagnostic",
        };
  }

  if (isSalesManager) {
    return ar
      ? {
          subtitle:
            "هذا تشخيص قيادي عملي لمدير المبيعات يقيس أسلوبك في التدريب، وفحص مسار الفرص البيعية، وضبط التوقعات، والمساءلة، وإدارة أداء الفريق.",
          rules: [
            "أجب وفق ما تفعله فعليًا عند قيادة الفريق، لا وفق الإجابة المثالية.",
            "اختر الحكم الإداري الأقرب إلى أسلوبك المعتاد في المواقف الواقعية.",
            "يقيس التشخيص قدرتك على تحويل التدريب والفحص والمساءلة إلى تنفيذ ثابت داخل الفريق.",
          ],
          cta: "ابدأ تشخيص قيادة المبيعات",
        }
      : {
          subtitle:
            "This is a practical sales-leadership diagnostic covering coaching, pipeline inspection, forecast discipline, accountability, and team-performance management.",
          rules: [
            "Answer according to how you genuinely lead the team, not the ideal answer.",
            "Choose the management judgement closest to your normal response in real situations.",
            "The diagnostic measures how consistently you turn coaching, inspection, and accountability into team execution.",
          ],
          cta: "Start the Sales Manager Diagnostic",
        };
  }

  if (isBusinessHealth) {
    return ar
      ? {
          subtitle:
            "هذا تشخيص تنفيذي لصحة الشركة يقيس النقد، والإيرادات، والانضباط التشغيلي، والأفراد، والقيادة، والذكاء الاصطناعي، والأتمتة، ووضوح الإدارة، وجاهزية النمو.",
          rules: [
            "أجب بصفتك صاحب قرار وفق واقع الشركة الحالي، لا وفق ما تتمنى أن تكون عليه.",
            "قيّم الأنظمة والنتائج والأدلة الفعلية، لا الجهد أو النوايا.",
            "اختر الإجابة التي تصف مستوى السيطرة الحقيقي على النقد والإيرادات والعمليات والأفراد والنمو.",
          ],
          cta: "ابدأ تشخيص صحة الشركة",
        }
      : {
          subtitle:
            "This is a CEO-level business-health diagnostic covering cash, revenue, operating discipline, people, leadership, AI, automation, management visibility, and growth readiness.",
          rules: [
            "Answer as a decision-maker based on the company’s current reality, not its ambition.",
            "Assess actual systems, results, and evidence rather than effort or intention.",
            "Choose the response that best reflects real control over cash, revenue, operations, people, and growth.",
          ],
          cta: "Start the Business Health Diagnostic",
        };
  }

  if (!isMRI) {
    return ar
      ? {
          subtitle: "هذا فحص مهني قصير يمنحك قراءة سريعة وواضحة لمؤشرات أدائك الحالية.",
          rules: [
            "أجب وفق سلوكك المعتاد في المواقف العملية.",
            "اختر الإجابة الأقرب إلى ما تفعله فعلًا.",
          ],
          cta: "ابدأ الفحص الآن",
        }
      : {
          subtitle: "This is a short professional scan that gives you a focused view of your current performance signals.",
          rules: [
            "Answer according to your usual behaviour in practical situations.",
            "Choose the response closest to what you genuinely do.",
          ],
          cta: "Start the Scan Now",
        };
  }

  return ar
    ? {
        subtitle:
          "هذا تشخيص عملي للمبيعات الميدانية يقيس طريقة تعاملك مع العملاء والاحتياجات والاعتراضات والتفاوض والمتابعة والتنفيذ.",
        rules: [
          "أجب وفق ما تفعله فعليًا في الميدان.",
          "اختر الرد الأقرب إلى سلوكك البيعي المعتاد.",
          "يقيس التشخيص قدرتك على تحويل المحادثات والفرص والمتابعة إلى تنفيذ بيعي منضبط.",
        ],
        cta: "ابدأ تشخيص المبيعات الميدانية",
      }
    : {
        subtitle:
          "This is a practical field-sales diagnostic covering customer conversations, needs, objections, negotiation, follow-up, and execution.",
        rules: [
          "Answer according to what you genuinely do in the field.",
          "Choose the response closest to your normal selling behaviour.",
          "The diagnostic measures how consistently you turn conversations and opportunities into disciplined execution.",
        ],
        cta: "Start the Field Sales Diagnostic",
      };
}

export default function InstructionsPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLocale();

  const slug = useMemo(() => safeSlug(params?.slug), [params]);
  const urlLang = useMemo<Lang>(() => safeLang(searchParams.get("lang")), [searchParams]);
  const attemptId = searchParams.get("attemptId");

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState<any>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (language !== urlLang) setLanguage(urlLang);
  }, [hydrated, language, urlLang, setLanguage]);

  // Load assessment config by slug (single source of truth)
  useEffect(() => {
    const load = async () => {
      if (!slug) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select(
            "id, slug, status, title_en, title_ar, name_en, name_ar, timer_minutes, num_questions, competency_ids"
          )
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.warn("Instructions: config load error:", error);
        }

        if (!data || data.status !== "active") {
          // Go back to the entry page if slug is invalid/inactive
          router.replace(`/${encodeURIComponent(slug)}`);
          return;
        }

        setConf(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, router]);

  if (!hydrated) return null;
  if (!slug) return null;
  if (loading) return null;
  if (!conf) return null;

  const ar = (language || urlLang) === "ar";
  const dir = ar ? "rtl" : "ltr";

  const assessmentId = String(conf.id);
  const mins = Number(conf.timer_minutes || 0);
  const qCount = Number(conf.num_questions || 0);

  // Competency count: prefer competency_ids length if present, else fallback (SCAN=7, MRI=15)
  const competencyCount = Array.isArray(conf.competency_ids)
    ? conf.competency_ids.length
    : fallbackCompetencyCount(slug);

  // For copy styling only
  const isMRI = slug.endsWith("mri") || slug === "mri";
  const isScan = slug.endsWith("scan") || slug === "scan";
  const effectiveIsScan = !isMRI && isScan ? true : !isMRI;
  const copy = instructionCopy(slug, assessmentId, ar, isMRI);

  const goToQuiz = () => {
    const a = attemptId ? `&attemptId=${encodeURIComponent(attemptId)}` : "";
    router.replace(
      `/${encodeURIComponent(slug)}/quiz?assessmentId=${encodeURIComponent(assessmentId)}${a}&lang=${encodeURIComponent(
        urlLang
      )}`
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-5 sm:py-10
                 bg-gradient-to-br from-[#07111f] via-[#0b1d38] to-[#123468]"
      dir={dir}
    >
      <div className="w-full sm:max-w-2xl rounded-3xl bg-white/10 backdrop-blur-xl shadow-2xl p-5 sm:p-10 space-y-5 sm:space-y-8 border border-white/15">
        {/* TITLE */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {ar ? "قبل أن تبدأ" : "Before You Begin"}
          </h1>
          <p className="text-white/80 text-base sm:text-lg">
            {copy.subtitle}
          </p>
        </div>

        {/* INFO BOX */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-4 sm:p-6 text-white/90">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 text-sm sm:text-base">
            <div>
              <strong>{ar ? "التقييم بزمن محدد:" : "Timed assessment:"}</strong>{" "}
              {mins > 0
                ? ar
                  ? `حوالي ${mins} دقيقة.`
                  : `About ${mins} minutes.`
                : effectiveIsScan
                ? ar
                  ? "حوالي 20 دقيقة."
                  : "About 20 minutes."
                : ar
                ? "حوالي 90 دقيقة."
                : "About 90 minutes."}
            </div>

            <div>
              <strong>{ar ? "عدد الأسئلة:" : "Questions:"}</strong>{" "}
              {qCount > 0 ? qCount : effectiveIsScan ? 30 : 75}
            </div>

            <div>
              <strong>{ar ? "عدد الكفاءات:" : "Competencies:"}</strong>{" "}
              {competencyCount}
            </div>

            <div>
              <strong>{ar ? "أسلوب الإجابة:" : "Answering style:"}</strong>{" "}
              {ar ? "تلقائي، دون تفكير مطوّل." : "Instinctive, no overthinking."}
            </div>

            <div>
              <strong>{ar ? "لا توجد إجابات صحيحة أو خاطئة." : "No right or wrong answers."}</strong>
            </div>

            <div>
              <strong>{ar ? "نتائج خاصة" : "Private results"}</strong>
            </div>
          </div>
        </div>

        {/* RULES */}
        <div className="space-y-3 text-white/95 text-sm sm:text-base leading-relaxed">
          {copy.rules.map((rule) => (
            <p key={rule}>{rule}</p>
          ))}

          <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100 font-semibold">
            {ar
              ? "تنبيه: لا يمكن إيقاف التقييم أو إعادة تشغيله بعد البدء. تحصل الأسئلة غير المجابة على صفر، ويُرسل التقييم تلقائيًا عند انتهاء الوقت."
              : "Timer warning: the assessment cannot be paused or restarted. Unanswered questions receive zero, and the assessment submits automatically when time expires."}
          </p>
        </div>

        {/* CTA */}
        <div className="pt-1 sm:pt-4">
          <Button
            className="w-full py-5 text-lg font-bold rounded-2xl bg-amber-400 text-slate-900 hover:bg-amber-300 transition"
            onClick={goToQuiz}
          >
            {copy.cta}
          </Button>
        </div>

        {/* FOOTNOTE */}
        <div className="text-center text-xs text-white/50">
          {ar ? "ستظهر نتائجك فور الانتهاء مع تقرير مفصل." : "Your results will appear immediately with a detailed report."}
        </div>
      </div>
    </div>
  );
}
