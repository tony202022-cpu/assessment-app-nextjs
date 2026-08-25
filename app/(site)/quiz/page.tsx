"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Question, AnswerPayload } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";
import { submitQuiz } from "@/lib/actions";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { isPaidMriAssessmentId, isTokenBackedPaidAttempt } from "@/lib/paid-mri-access";

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
const LAWYER_MRI_ASSESSMENT_ID = "lawyer_client_conversion_mri";

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
  return String(slug || "").toLowerCase().trim();
}

function safeLang(x: any) {
  const v = String(x || "").toLowerCase().trim();
  return v === "ar" ? "ar" : "en";
}

// ✅ NEW: localStorage key helper (attemptId-scoped)
function deadlineKey(attemptId: string) {
  return `quiz_deadline_ms:${attemptId}`;
}

export default function QuizPage({
  offlineCorporate = false,
}: {
  offlineCorporate?: boolean;
} = {}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { language } = useLocale();

  const slugRaw = (params?.slug as string) || "";
  const slug = safeSlug(slugRaw);

  const urlLang = useMemo(() => safeLang(searchParams?.get("lang")), [searchParams]);
  const isArabic = (language || urlLang) === "ar";

  // ✅ REQUIRED: attemptId drives everything now
  const attemptId = useMemo(() => {
    const v = String(searchParams?.get("attemptId") || "").trim();
    return v || null;
  }, [searchParams]);

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

  // ✅ NEW: timeRemaining is now derived from a stored deadline
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);

  const [timerStarted, setTimerStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Array<{ text: string; index: number }>
  >([]);
const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  // ✅ NEW: holds the deadline timestamp (ms)
  const deadlineMsRef = useRef<number | null>(null);

  // ✅ HARD GUARD — run once only (prevents redirect loops)
  useEffect(() => {
    if (attemptId === null) {
      router.replace(`/${slug}/login?lang=${encodeURIComponent(urlLang)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Pull assessmentId from URL if present
  const assessmentIdFromUrl = useMemo(() => {
    const v = String(searchParams?.get("assessmentId") || "").trim();
    return v || "";
  }, [searchParams]);

  // 1) Load assessment config (robust)
  useEffect(() => {
    const loadConfig = async () => {
      if (!slug) return;

      const isMRI = slug.endsWith("mri") || slug === "mri";
      const defaultQ = isMRI ? 75 : 30;
      const defaultT = isMRI ? 90 * 60 : 20 * 60;

      // Priority 1: assessmentId from URL
      if (assessmentIdFromUrl) {
        setAssessmentId(assessmentIdFromUrl);
        // keep defaults as a safe fallback ONLY
        setQuestionLimit(defaultQ);
        setTimeLimitSeconds(defaultT);
        setTimeRemaining(defaultT);
        // but DO NOT return; we still want to load the real config by slug
      }

      // Priority 2: load config from Supabase using client (works in client components)
      try {
        const { data: conf, error } = await supabase
          .from("assessments")
          .select("id, num_questions, timer_minutes, status")
          .eq("slug", slug)
          .maybeSingle();

        if (error) console.warn("Assessment config load error:", error);

        if (conf && conf.status === "active") {
          const qLimit = Number(conf.num_questions) || defaultQ;
          const tSeconds = (Number(conf.timer_minutes) || defaultT / 60) * 60;

          setAssessmentId(String(conf.id));
          setQuestionLimit(qLimit);
          setTimeLimitSeconds(tSeconds);
          setTimeRemaining(tSeconds);
          return;
        }
      } catch (e) {
        console.warn("Assessment config load exception:", e);
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

  // 2) Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!assessmentId) return;
      if (!attemptId) return;

      setLoading(true);

      if (isPaidMriAssessmentId(assessmentId)) {
        const { data: attempt, error: attemptError } = await supabase
          .from("quiz_attempts")
          .select("id, assessment_id, user_id, access_token_id, company_id, is_developer_test")
          .eq("id", attemptId)
          .maybeSingle();
        const { data: authData } = await supabase.auth.getUser();
        const authenticatedUserId = authData.user?.id || "";

        if (
          attemptError ||
          !attempt ||
          String((attempt as any).assessment_id || "").toLowerCase() !==
            String(assessmentId || "").toLowerCase() ||
          !isTokenBackedPaidAttempt(attempt, authenticatedUserId)
        ) {
          toast.error(
            isArabic
              ? "هذا التقييم المدفوع يتطلب رابط دخول صالح."
              : "This paid assessment requires a valid access link."
          );
          setLoading(false);
          router.replace(`/${slug || "scan"}`);
          return;
        }
      }

      const base = supabase
        .from("questions")
        .select("id, competency_id, question_en, question_ar, options_en, options_ar, correct_answer_index, created_at");

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
          .select("id, competency_id, question_en, question_ar, options_en, options_ar, correct_answer_index, created_at")
          .eq("assessmentId", assessmentId)
          .order("created_at", { ascending: true })
          .limit(questionLimit);

        data = res2.data || [];
        error = res2.error || null;
      }

      if (!data || data.length === 0) {
        toast.error(isArabic ? "لا توجد أسئلة لهذا التقييم" : "No questions found for this assessment");
        setLoading(false);
        return;
      }

      const shuffled = shuffleArray(data);
      setQuestions(shuffled);

      setSelectedAnswers(
        shuffled.map((qItem: any) => ({
          questionId: qItem.id,
          selectedOptionIndex: null,
        }))
      );

      // ✅ NEW: Create or reuse a stored deadline that survives tab-switch/lock/refresh
      // Only set it once per attemptId.
      const key = deadlineKey(attemptId);
      const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;

      const now = Date.now();
      let deadlineMs = Number(existing || "");

      if (!deadlineMs || Number.isNaN(deadlineMs) || deadlineMs <= now) {
        // Set a fresh deadline: now + full time limit
        deadlineMs = now + timeLimitSeconds * 1000;
        window.localStorage.setItem(key, String(deadlineMs));
      }

      deadlineMsRef.current = deadlineMs;

      const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
      setTimeRemaining(remainingSeconds);

      setTimerStarted(true);
      setLoading(false);

      finishLockRef.current = false;
      setIsSubmitting(false);
      setIsTransitioning(false);
    };

    fetchQuestions();
  }, [assessmentId, questionLimit, isArabic, attemptId, timeLimitSeconds, router, slug]);

// ✅ 3) Timer (deadline-based, survives leaving the page)
useEffect(() => {
  if (!timerStarted || loading || isSubmitting) return;
  if (!attemptId) return;

  const key = deadlineKey(attemptId);

  const tick = () => {
    const now = Date.now();

    // Refresh deadline from storage in case another tab writes it,
    // or if the page refreshed and ref wasn’t set yet.
    const stored = window.localStorage.getItem(key);
    const deadlineMs = Number(stored || "") || deadlineMsRef.current || 0;

    if (!deadlineMs) {
      // If something cleared it unexpectedly, recreate using current remaining.
      const recreated = now + Math.max(0, timeRemaining) * 1000;
      window.localStorage.setItem(key, String(recreated));
      deadlineMsRef.current = recreated;
      return;
    }

    deadlineMsRef.current = deadlineMs;

    const remaining = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
    setTimeRemaining(remaining);
  };

  // ✅ NEW: When user returns to the tab, sync immediately (fixes "timer stops" perception)
  const onVisibility = () => {
    if (document.visibilityState === "visible") tick();
  };

  // Run immediately so UI is correct now
  tick();

  // Interval can be throttled in background tabs, but deadline math stays correct.
  const interval = window.setInterval(tick, 500); // smoother + resilient

  // ✅ NEW: force refresh on tab focus/visibility restore
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", tick);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}, [timerStarted, loading, isSubmitting, attemptId, timeRemaining]);
  // 4) Time up -> finish (submit once)
  useEffect(() => {
    if (timeRemaining !== 0) return;
    if (!timerStarted || loading) return;
    if (finishLockRef.current) return;
    handleFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  // 5) Shuffle answers per question (keep the original database option index)
  useEffect(() => {
    if (!currentQuestion || isTransitioning || isSubmitting) return;

    const raw =
      urlLang === "en"
        ? (currentQuestion as any).options_en
        : (currentQuestion as any).options_ar;

    const opts = (Array.isArray(raw) ? raw : []).map((item, idx) => ({
      text:
        typeof item === "object" && item !== null && "text" in item
          ? String((item as any).text)
          : String(item),
      index: idx,
    }));

    setShuffledOptions(shuffleArray(opts));
  }, [currentQuestionIndex, urlLang, isTransitioning, currentQuestion, isSubmitting]);

  // ✅ helper: clear deadline storage when quiz ends
  const clearStoredDeadline = () => {
    if (!attemptId) return;
    try {
      window.localStorage.removeItem(deadlineKey(attemptId));
    } catch {
      // ignore
    }
    deadlineMsRef.current = null;
  };

  // 6) Finish -> submitQuiz (attemptId-driven)
  const handleFinish = async (answersOverride?: AnswerPayload[]) => {
    if (!attemptId) return;

    if (finishLockRef.current) return;
    finishLockRef.current = true;

    if (!assessmentId) {
      toast.error(isArabic ? "تعذر الحفظ: معرف التقييم مفقود" : "Cannot submit: missing assessmentId");
      finishLockRef.current = false;
      return;
    }

    setIsSubmitting(true);
    setIsTransitioning(true);

    const answersToSubmit = answersOverride || selectedAnswers;
    const isOutdoorScan =
      assessmentId === SCAN_ASSESSMENT_ID || slug === "outdoor-scan" || slug === "scan";
    const shouldPadUnanswered =
      isOutdoorScan ||
      assessmentId === LAWYER_MRI_ASSESSMENT_ID ||
      slug === "lawyer-client-conversion-mri";
    const answersByQuestionId = new Map(
      answersToSubmit
        .filter((a) => a?.questionId)
        .map((a) => [String(a.questionId), a])
    );
    const paddedAnswers =
      shouldPadUnanswered && questions.length
        ? questions.map((q, index) => {
            const existing = answersByQuestionId.get(String((q as any).id)) || answersToSubmit[index];
            return {
              questionId: String((q as any).id || existing?.questionId || ""),
              selectedOptionIndex: existing?.selectedOptionIndex ?? null,
            };
          })
        : answersToSubmit;

    try {
      // ✅ NEW: submitQuiz answers INTO the existing attempt
      await submitQuiz(paddedAnswers, attemptId, urlLang, assessmentId);

      // ✅ NEW: clear deadline so a new attempt starts fresh
      clearStoredDeadline();

      const destination = isOutdoorScan ? "report" : "results";

      window.location.href = offlineCorporate
        ? `/outdoor-mri/completed?attemptId=${encodeURIComponent(attemptId)}`
        : `/${slug}/${destination}?attemptId=${encodeURIComponent(attemptId)}&lang=${encodeURIComponent(
            urlLang
          )}`;
    } catch (e: any) {
      toast.error((isArabic ? "فشل الحفظ: " : "Failed to save: ") + (e?.message || "Unknown error"));
      finishLockRef.current = false;
      setIsSubmitting(false);
      setIsTransitioning(false);
    }
  };

  // 7) Option select
  const handleOptionSelect = (originalOptionIndex: number, displayedOptionIndex: number) => {
    if (isTransitioning || isSubmitting) return;
setSelectedOptionIndex(displayedOptionIndex);
    const copy = [...selectedAnswers];
    copy[currentQuestionIndex] = {
      questionId: (currentQuestion as any).id,
      selectedOptionIndex: originalOptionIndex,
    };
    setSelectedAnswers(copy);

    const isLast = currentQuestionIndex === questions.length - 1;

    setIsTransitioning(true);
setTimeout(() => {
  if (isLast) {
    setSelectedOptionIndex(null);
    handleFinish(copy);
  } else {
    setCurrentQuestionIndex((i) => i + 1);
    setSelectedOptionIndex(null);
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

  // ❌ Removed line-clamps for answers (Problem 1 fix)
  const clamp3 = "[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden";

  if (!attemptId) return null;
  if (loading) return null;
  if (!currentQuestion) return null;

  const questionText = isArabic ? (currentQuestion as any).question_ar : (currentQuestion as any).question_en;
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
      <div
        className={`w-full bg-gradient-to-r ${timerColor} border-b border-white/20 px-3 py-2 text-white shadow-sm backdrop-blur-xl sm:px-4 sm:py-2.5 md:px-5 md:py-3`}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
          <span className="text-xs font-semibold opacity-90 sm:text-sm">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
          <span className="text-lg font-extrabold tracking-wider drop-shadow-sm sm:text-xl">{formatTime(timeRemaining)}</span>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="h-1 bg-white/40 md:h-1.5">
        <div className="h-full bg-indigo-600 transition-all duration-500 rounded-r-full" style={{ width: `${progress}%` }} />
      </div>

      {/* CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-4 md:py-5 lg:px-6 lg:py-6 [@media(max-height:700px)]:py-2">
        <div className="mx-auto w-full max-w-md space-y-2 sm:max-w-xl sm:space-y-3 md:max-w-2xl md:space-y-4 lg:max-w-3xl">

          {/* QUESTION */}
          <div className="rounded-xl border border-white/30 bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white shadow-md backdrop-blur-xl sm:rounded-2xl sm:p-4 md:p-5 [@media(max-height:700px)]:p-2.5">
            <h2
              className={`text-[16px] font-extrabold sm:text-[17px] md:text-[18px] lg:text-[20px] ${
                isArabic ? "text-right leading-[1.55] sm:leading-[1.65]" : "text-left leading-[1.45] sm:leading-relaxed"
              } whitespace-normal break-words`}
            >
              {questionText}
            </h2>
          </div>

          {/* ANSWERS */}
          <div className="space-y-2 pb-2 sm:space-y-2.5 sm:pb-4 md:space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option.index, index)}
                disabled={isTransitioning || isSubmitting}
                className={`relative min-h-12 w-full rounded-xl border px-3 py-2.5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/90 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:min-h-14 sm:px-4 sm:py-3 md:px-5 md:py-3.5 lg:py-4 [@media(max-height:700px)]:py-2 ${
                  selectedOptionIndex === index
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-white/40 bg-white/70"
                }`}
              >
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isArabic ? "right-3 sm:right-4" : "left-3 sm:left-4"
                  }`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 to-blue-200 text-sm font-extrabold text-indigo-900 shadow-sm sm:h-10 sm:w-10 sm:text-base md:h-11 md:w-11"
                    dir="ltr"
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                </div>

                <div
                  className={`${
                    isArabic ? "pr-12 text-right sm:pr-14 md:pr-16" : "pl-12 text-left sm:pl-14 md:pl-16"
                  }`}
                >
                  <span className={`block whitespace-normal break-words text-[14px] font-semibold text-gray-900 sm:text-[15px] lg:text-[16px] ${isArabic ? "leading-[1.5]" : "leading-[1.4]"}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
