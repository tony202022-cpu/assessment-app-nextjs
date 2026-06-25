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
  guidance: [string, string];
  warning: string;
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
            "تشخيص عملي لقياس طريقة تعاملك مع مواقف الموكلين الواقعية.",
          guidance: [
            "اختر الرد الأقرب إلى الطريقة التي تتعامل بها فعليًا في الواقع المهني.",
            "هذا ليس اختبارًا في المعرفة القانونية، بل يقيس الثقة والقيمة القانونية وأتعاب المحاماة والخطوة القانونية التالية.",
          ],
          warning: "لا يمكن إيقاف التقييم أو إعادة تشغيله بعد البدء. الأسئلة غير المجابة تحصل على صفر.",
          cta: "ابدأ تشخيص كسب الموكلين",
        }
      : {
          subtitle:
            "A practical diagnostic of how you handle real client situations.",
          guidance: [
            "Choose the response closest to how you would genuinely act in practice.",
            "This is not a legal knowledge test. It measures trust, legal value, professional fees, and the next legal step.",
          ],
          warning: "The assessment cannot be paused or restarted. Unanswered questions receive zero.",
          cta: "Start the Client Acquisition Diagnostic",
        };
  }

  if (isSalesManager) {
    return ar
      ? {
          subtitle:
            "تشخيص قيادي عملي لأسلوب إدارة أداء فريق المبيعات.",
          guidance: [
            "اختر الإجابة الأقرب إلى أسلوبك الفعلي في التدريب وفحص مسار الفرص البيعية.",
            "يقيس التشخيص انضباط التوقعات والمساءلة وتنفيذ الفريق.",
          ],
          warning: "لا يمكن إيقاف التقييم أو إعادة تشغيله بعد البدء. الأسئلة غير المجابة تحصل على صفر.",
          cta: "ابدأ تشخيص قيادة المبيعات",
        }
      : {
          subtitle:
            "A practical diagnostic of how you lead sales-team performance.",
          guidance: [
            "Choose the response closest to how you genuinely coach and inspect the pipeline.",
            "It measures forecast discipline, accountability, and team execution.",
          ],
          warning: "The assessment cannot be paused or restarted. Unanswered questions receive zero.",
          cta: "Start the Sales Manager Diagnostic",
        };
  }

  if (isBusinessHealth) {
    return ar
      ? {
          subtitle:
            "تشخيص تنفيذي مختصر لصحة الشركة وجاهزيتها للنمو.",
          guidance: [
            "أجب وفق واقع النقد والإيرادات والعمليات والأفراد والقيادة.",
            "قيّم الأدلة الفعلية في الذكاء الاصطناعي والأتمتة ووضوح الإدارة، لا النوايا.",
          ],
          warning: "لا يمكن إيقاف التقييم أو إعادة تشغيله بعد البدء. الأسئلة غير المجابة تحصل على صفر.",
          cta: "ابدأ تشخيص صحة الشركة",
        }
      : {
          subtitle:
            "A compact CEO-level diagnostic of business health and growth readiness.",
          guidance: [
            "Answer from the current reality of cash, revenue, operations, people, and leadership.",
            "Assess real evidence of AI, automation, and management visibility rather than intention.",
          ],
          warning: "The assessment cannot be paused or restarted. Unanswered questions receive zero.",
          cta: "Start the Business Health Diagnostic",
        };
  }

  if (!isMRI) {
    return ar
      ? {
          subtitle: "هذا فحص مهني قصير يمنحك قراءة سريعة وواضحة لمؤشرات أدائك الحالية.",
          guidance: [
            "أجب وفق سلوكك المعتاد في المواقف العملية.",
            "اختر الإجابة الأقرب إلى ما تفعله فعلًا.",
          ],
          warning: "لا يمكن إيقاف الفحص أو إعادة تشغيله بعد البدء. الأسئلة غير المجابة تحصل على صفر.",
          cta: "ابدأ الفحص الآن",
        }
      : {
          subtitle: "This is a short professional scan that gives you a focused view of your current performance signals.",
          guidance: [
            "Answer according to your usual behaviour in practical situations.",
            "Choose the response closest to what you genuinely do.",
          ],
          warning: "The scan cannot be paused or restarted. Unanswered questions receive zero.",
          cta: "Start the Scan Now",
        };
  }

  return ar
    ? {
        subtitle:
          "تشخيص عملي مختصر لأدائك في المبيعات الميدانية.",
        guidance: [
          "أجب وفق ما تفعله فعليًا في الميدان.",
          "اختر الرد الأقرب إلى سلوكك مع الاحتياجات والاعتراضات والتفاوض والمتابعة.",
        ],
        warning: "لا يمكن إيقاف التقييم أو إعادة تشغيله بعد البدء. الأسئلة غير المجابة تحصل على صفر.",
        cta: "ابدأ تشخيص المبيعات الميدانية",
      }
    : {
        subtitle:
          "A compact practical diagnostic of your field-sales performance.",
        guidance: [
          "Answer according to what you genuinely do in the field.",
          "Choose the response closest to your approach to needs, objections, negotiation, and follow-up.",
        ],
        warning: "The assessment cannot be paused or restarted. Unanswered questions receive zero.",
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
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-3 sm:py-10
                 bg-gradient-to-br from-[#07111f] via-[#0b1d38] to-[#123468]"
      dir={dir}
    >
      <div className="w-full sm:max-w-2xl rounded-3xl bg-white/10 backdrop-blur-xl shadow-2xl p-4 sm:p-10 space-y-3 sm:space-y-8 border border-white/15">
        {/* TITLE */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            {ar ? "قبل أن تبدأ" : "Before You Begin"}
          </h1>
          <p className="text-white/80 text-sm sm:text-lg leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        {/* INFO BOX */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-3 sm:p-6 text-white/90">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-4 text-xs sm:text-base">
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
              <strong>{ar ? "نتائج خاصة" : "Private results"}</strong>
            </div>
          </div>
        </div>

        {/* RULES */}
        <div className="space-y-2 text-white/95 text-sm sm:text-base leading-relaxed">
          {copy.guidance.map((line) => (
            <p key={line}>{line}</p>
          ))}

          <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs sm:text-sm text-amber-100 font-semibold">
            {copy.warning}
          </p>
        </div>

        {/* CTA */}
        <div>
          <Button
            className="w-full py-4 sm:py-5 text-base sm:text-lg font-bold rounded-2xl bg-amber-400 text-slate-900 hover:bg-amber-300 transition"
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
