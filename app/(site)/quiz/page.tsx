"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Question, AnswerPayload } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { getTranslation } from "@/lib/translations";
import { toast } from "sonner";
import { submitQuiz, getAssessmentConfig } from "@/lib/actions";
import { useSession } from "@/contexts/SessionContext";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const latinFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ✅ DB truth (menu IDs)
const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

// DO NOT TOUCH — shuffle logic
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function safeSlug(slug: any) {
  const s = String(slug || "").toLowerCase().trim();
  return s === "mri" ? "mri" : "scan";
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slugRaw = (params?.slug as string) || "";
  const slug = safeSlug(slugRaw);

  const { language } = useLocale();
  const { user, isLoading: isSessionLoading } = useSession();
  const isArabic = language === "ar";

  // ✅ prevent double-submit (LAST QUESTION bug)
  const finishLockRef = useRef(false);

  // Kitchen: menu-driven config
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [questionLimit, setQuestionLimit] = useState<number>(30);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(20 * 60);

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Array<{ text: string; score: number; index: number }>
  >([]);

  // 1) Auth guard
  useEffect(() => {
    if (isSessionLoading) return;
    if (!user) {
      toast.info(getTranslation("loginRequired", language));
      router.replace(`/${slug || "scan"}/login?lang=${language}`);
    }
  }, [user, isSessionLoading, router, language, slug]);

  // ✅ Pull assessmentId from URL if present
  const assessmentIdFromUrl = useMemo(() => {
    const v = String(searchParams?.get("assessmentId") || "").trim();
    return v || "";
  }, [searchParams]);

  // 2) Load assessment config (robust)
  useEffect(() => {
    const loadConfig = async () => {
      if (!slug) return;

      const defaultQ = slug === "mri" ? 75 : 30;
      const defaultT = slug === "mri" ? 90 * 60 : 20 * 60;

      // Priority 1: assessmentId from URL
      if (assessmentIdFromUrl) {
        setAssessmentId(assessmentIdFromUrl);
        setQuestionLimit(defaultQ);
        setTimeLimitSeconds(defaultT);
        setTimeRemaining(defaultT);
        return;
      }

      // Priority 2: try config loader
      try {
        const conf: any = await (getAssessmentConfig as any)?.(slug);
        const aId =
          conf?.assessmentId ||
          conf?.assessment_id ||
          conf?.id ||
          conf?.slug_assessment_id ||
          "";

        const qLimit =
          Number(
            conf?.question_limit ??
              conf?.questionCount ??
              conf?.questions_count ??
              conf?.questions_limit
          ) || defaultQ;

        const tSeconds =
          Number(conf?.time_limit_seconds ?? conf?.timeLimitSeconds) || defaultT;

        if (aId) {
          setAssessmentId(String(aId));
          setQuestionLimit(qLimit);
          setTimeLimitSeconds(tSeconds);
          setTimeRemaining(tSeconds);
          return;
        }

        console.warn("getAssessmentConfig returned without assessmentId:", conf);
      } catch (e) {
        console.warn("getAssessmentConfig failed; falling back to slug mapping:", e);
      }

      // Priority 3: hard fallback mapping
      const fallbackId = slug === "mri" ? MRI_ASSESSMENT_ID : SCAN_ASSESSMENT_ID;
      setAssessmentId(fallbackId);
      setQuestionLimit(defaultQ);
      setTimeLimitSeconds(defaultT);
      setTimeRemaining(defaultT);
    };

    loadConfig();
  }, [slug, assessmentIdFromUrl]);

  // 3) Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user?.id) return;
      if (!assessmentId) return;

      setLoading(true);

      const base = supabase.from("questions").select("*");

      // Attempt 1: assessment_id
      let { data, error } = await base
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true })
        .limit(questionLimit);

      if (error) console.warn("Questions fetch attempt1 error:", error);

      if (!data || data.length === 0) {
        // Attempt 2: assessmentId (camel)
        const res2 = await supabase
          .from("questions")
          .select("*")
          .eq("assessmentId", assessmentId)
          .order("created_at", { ascending: true })
          .limit(questionLimit);

        data = res2.data || [];
        error = res2.error || null;
        if (error) console.warn("Questions fetch attempt2 error:", error);
      }

      if (!data || data.length === 0) {
        console.error("No questions returned for assessmentId:", assessmentId);
        toast.error(isArabic ? "لا توجد أسئلة لهذا التقييم" : "No questions found for this assessment");
        setLoading(false);
        return;
      }

      const shuffled = shuffleArray(data);
      setQuestions(shuffled);

      setSelectedAnswers(
        shuffled.map((qItem: any) => ({
          questionId: qItem.id,
          competencyId: qItem.competency_id,
          selectedScore: -1,
        }))
      );

      setTimerStarted(true);
      setLoading(false);

      // Important: reset finish lock when quiz is freshly loaded
      finishLockRef.current = false;
      setIsSubmitting(false);
      setIsTransitioning(false);
    };

    if (!isSessionLoading && user?.id && assessmentId) {
      fetchQuestions();
    }
  }, [user?.id, isSessionLoading, assessmentId, questionLimit, isArabic]);

  // 4) Timer
  useEffect(() => {
    if (!timerStarted || loading || isSubmitting) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, loading, isSubmitting]);

  // 5) Time up -> finish (submit once)
  useEffect(() => {
    if (timeRemaining !== 0) return;
    if (!timerStarted || loading) return;
    if (finishLockRef.current) return; // ✅ prevent double-submit
    handleFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  // 6) Shuffle answers per question (keep score)
  useEffect(() => {
    if (!currentQuestion || isTransitioning || isSubmitting) return;

    const raw =
      language === "en"
        ? (currentQuestion as any).options_en
        : (currentQuestion as any).options_ar;

    const scores = (currentQuestion as any).options_scores || [];

    const opts = (Array.isArray(raw) ? raw : []).map((item, idx) => ({
      text:
        typeof item === "object" && item !== null && "text" in item
          ? String((item as any).text)
          : String(item),
      score: scores[idx] ?? 0,
      index: idx,
    }));

    setShuffledOptions(shuffleArray(opts));
  }, [currentQuestionIndex, language, isTransitioning, currentQuestion, isSubmitting]);

  // 7) Finish -> submitQuiz (SUBMIT ONCE)
  const handleFinish = async () => {
    if (!user?.id) return;

    // ✅ hard lock
    if (finishLockRef.current) return;
    finishLockRef.current = true;

    if (!assessmentId) {
      toast.error(isArabic ? "تعذر حفظ المحاولة: معرف التقييم مفقود" : "Cannot submit: missing assessmentId");
      finishLockRef.current = false;
      return;
    }

    setIsSubmitting(true);
    setIsTransitioning(true);

    const finalAnswers = selectedAnswers.map((a) => ({
      ...a,
      selectedScore: a.selectedScore === -1 ? 0 : a.selectedScore,
    }));

    try {
      const res: any = await submitQuiz(finalAnswers, user.id, language, assessmentId);

      const attemptId =
        (typeof res === "string" ? res : null) ||
        res?.attemptId ||
        res?.id ||
        res?.attempt_id ||
        res?.data?.id ||
        res?.data?.attemptId;

      if (!attemptId) {
        console.error("submitQuiz() returned:", res);
        throw new Error("Missing required ID (attemptId not returned)");
      }

      window.location.href = `/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${encodeURIComponent(language)}`;
    } catch (e: any) {
      console.error("submitQuiz failed:", e);
      toast.error(
        (language === "ar" ? "فشل حفظ المحاولة: " : "Failed to save attempt: ") +
          (e?.message || "Unknown error")
      );
      // unlock so they can retry
      finishLockRef.current = false;
      setIsSubmitting(false);
      setIsTransitioning(false);
    }
  };

  // 8) Option select
  const handleOptionSelect = (score: number) => {
    if (isTransitioning || isSubmitting) return;

    const copy = [...selectedAnswers];
    copy[currentQuestionIndex] = {
      questionId: (currentQuestion as any).id,
      competencyId: (currentQuestion as any).competency_id ?? "",
      selectedScore: score,
    };
    setSelectedAnswers(copy);

    // Transition to next OR finish
    const isLast = currentQuestionIndex === questions.length - 1;

    setIsTransitioning(true);
    setTimeout(() => {
      if (isLast) {
        handleFinish();
      } else {
        setCurrentQuestionIndex((i) => i + 1);
        setIsTransitioning(false);
      }
    }, 250);
  };

  // UI helpers
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  }, [currentQuestionIndex, questions.length]);

  const timerColor =
    timeRemaining < 180
      ? "from-red-500 to-rose-600"
      : timeRemaining < 360
      ? "from-amber-500 to-orange-600"
      : "from-blue-600 to-indigo-700";

  const clamp2 =
    "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden";
  const clamp3 =
    "[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden";

  if (loading || isSessionLoading) return null;
  if (!currentQuestion) return null;

  const questionText = isArabic
    ? (currentQuestion as any).question_ar
    : (currentQuestion as any).question_en;

  return (
    <div
      className={`fixed inset-0 h-[100dvh] flex flex-col overflow-hidden
        ${isArabic ? arabicFont.className : latinFont.className}
        bg-gradient-to-br from-slate-100 via-white to-slate-200`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* SUBMIT OVERLAY */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-lg border">
            <div className="text-slate-900 font-bold text-center">
              {isArabic ? "جارٍ حفظ النتائج..." : "Saving your results..."}
            </div>
          </div>
        </div>
      )}

      {/* TIMER */}
      <div className={`w-full bg-gradient-to-r ${timerColor} text-white px-5 py-3 shadow-md backdrop-blur-xl border-b border-white/20`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold opacity-90">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
          <span className="text-xl font-extrabold tracking-wider drop-shadow-sm">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="h-1.5 bg-white/40">
        <div
          className="h-full bg-indigo-600 transition-all duration-500 rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex items-center justify-center px-4 py-5">
        <div className="w-full max-w-md space-y-3">
          {/* QUESTION */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-5">
            <h2 className={`text-[clamp(17px,4.5vw,20px)] font-extrabold leading-snug ${isArabic ? "text-right" : "text-left"} ${clamp3}`}>
              {questionText}
            </h2>
          </div>

          {/* ANSWERS */}
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option.score)}
                disabled={isTransitioning || isSubmitting}
                className={`w-full px-5 py-4 rounded-xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-md
                  hover:bg-white/80 hover:shadow-lg active:scale-[0.98] transition-all duration-200`}
              >
                <div className={`flex items-start gap-4 ${isArabic ? "text-right" : "text-left"}`}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-900 shadow-inner font-bold"
                  >
                    💡
                  </div>

                  <span className={`flex-1 text-[clamp(15px,4vw,17px)] font-semibold text-gray-900 leading-snug ${clamp2}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* DEBUG (optional): remove later if you want */}
          {/* <div className="text-[11px] text-slate-500 text-center">
            assessmentId: <span className="font-mono">{assessmentId}</span>
          </div> */}
        </div>
      </div>
    </div>
  );
}
