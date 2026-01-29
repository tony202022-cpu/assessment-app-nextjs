"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Question, AnswerPayload } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { getTranslation } from "@/lib/translations";
import { toast } from "sonner";
import { submitQuiz } from "@/lib/actions";
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

const QUIZ_TIME_LIMIT = 20 * 60;

// DO NOT TOUCH — shuffle logic
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function QuizPage() {
  // DO NOT TOUCH — state logic
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_TIME_LIMIT);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Array<{ text: string; score: number; index: number }>
  >([]);

  const router = useRouter();
  const { language } = useLocale();
  const { user, isLoading: isSessionLoading } = useSession();
  const isArabic = language === "ar";

  // DO NOT TOUCH — auth + fetch logic
  useEffect(() => {
    if (isSessionLoading) return;

    if (!user) {
      toast.info(getTranslation("loginRequired", language));
      router.replace("/login");
      return;
    }

    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(30); // Limit to 30 questions

      if (error) {
        console.error("Questions fetch error:", error);
        toast.error(getTranslation("errorFetchingQuestions", language));
        setLoading(false);
        return;
      }

      const shuffled = shuffleArray(data || []);
      setQuestions(shuffled);

      setSelectedAnswers(
        shuffled.map((q) => ({
          questionId: q.id,
          competencyId: q.competency_id,
          selectedScore: -1,
        }))
      );

      setTimerStarted(true);
      setLoading(false);
    };

    if (user) fetchQuestions();
  }, [user, isSessionLoading, router, language]);

  // DO NOT TOUCH — timer logic
  useEffect(() => {
    if (!timerStarted || loading) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, loading]);

  useEffect(() => {
    if (timeRemaining === 0 && timerStarted && !loading) {
      handleFinish();
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  // DO NOT TOUCH — answer shuffle logic
  useEffect(() => {
    if (!currentQuestion || isTransitioning) return;

    const raw = language === "en" ? currentQuestion.options_en : currentQuestion.options_ar;
    const scores = currentQuestion.options_scores || [];

    const opts = (Array.isArray(raw) ? raw : []).map((item, idx) => ({
      text:
        typeof item === "object" && item !== null && "text" in item
          ? String((item as any).text)
          : String(item),
      score: scores[idx] ?? 0,
      index: idx,
    }));

    setShuffledOptions(shuffleArray(opts));
  }, [currentQuestionIndex, language, isTransitioning, currentQuestion]);

  // DO NOT TOUCH — finish logic
  const handleFinish = async () => {
    if (!user?.id) return;

    setIsTransitioning(true);

    const finalAnswers = selectedAnswers.map((a) => ({
      ...a,
      selectedScore: a.selectedScore === -1 ? 0 : a.selectedScore,
    }));

    try {
      const { attemptId } = await submitQuiz(finalAnswers, user.id, language);
      router.push(`/results?attemptId=${attemptId}&lang=${language}`);
    } catch (e: any) {
  console.error("submitQuiz failed:", e);

  toast.error(
    (language === "ar"
      ? "فشل حفظ المحاولة: "
      : "Failed to save attempt: ") +
      (e?.message || "Unknown error")
  );

  setIsTransitioning(false);
}

  };

  // DO NOT TOUCH — option select logic
  const handleOptionSelect = (score: number) => {
    if (isTransitioning) return;

    const copy = [...selectedAnswers];
    copy[currentQuestionIndex] = {
      questionId: currentQuestion.id,
      competencyId: currentQuestion.competency_id ?? "",
      selectedScore: score,
    };
    setSelectedAnswers(copy);

    setIsTransitioning(true);
    setTimeout(() => {
      if (currentQuestionIndex === questions.length - 1) {
        handleFinish();
      } else {
        setCurrentQuestionIndex((i) => i + 1);
        setIsTransitioning(false);
      }
    }, 300);
  };

  if (loading || isSessionLoading) return null;
  if (!currentQuestion) return null;

  const questionText = isArabic ? currentQuestion.question_ar : currentQuestion.question_en;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

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

  // ✅ VISUALS ONLY BELOW THIS POINT
  return (
    <div
      className={`fixed inset-0 h-[100dvh] flex flex-col overflow-hidden
        ${isArabic ? arabicFont.className : latinFont.className}
        bg-gradient-to-br from-slate-100 via-white to-slate-200`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* TIMER */}
      <div
        className={`w-full bg-gradient-to-r ${timerColor} text-white px-5 py-3 shadow-md
        backdrop-blur-xl border-b border-white/20`}
      >
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
          {/* QUESTION BLOCK — SAME GRADIENT AS TIMER */}
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white
            backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-5"
          >
            <h2
              className={`text-[clamp(17px,4.5vw,20px)] font-extrabold leading-snug
              ${isArabic ? "text-right" : "text-left"} ${clamp3}`}
            >
              {questionText}
            </h2>
          </div>

          {/* ANSWERS — CONTRASTING GLASSY WHITE */}
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option.score)}
                disabled={isTransitioning}
                className={`w-full px-5 py-4 rounded-xl border border-white/40
                  bg-white/60 backdrop-blur-xl shadow-md
                  hover:bg-white/80 hover:shadow-lg active:scale-[0.98]
                  transition-all duration-200`}
              >
                <div className={`flex items-start gap-4 ${isArabic ? "text-right" : "text-left"}`}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-900
                      shadow-inner font-bold"
                  >
                    💡
                  </div>

                  <span
                    className={`flex-1 text-[clamp(15px,4vw,17px)] font-semibold text-gray-900 leading-snug ${clamp2}`}
                  >
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