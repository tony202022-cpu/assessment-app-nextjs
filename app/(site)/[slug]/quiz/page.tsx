"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Question, AnswerPayload } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";
import { submitQuiz, getAssessmentConfig } from "@/lib/actions";
import { useSession } from "@/contexts/SessionContext";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

const arabicFont = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "700"] });
const latinFont = Inter({ subsets: ["latin"], weight: ["400", "700"] });

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function DynamicQuizPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { language } = useLocale();
  const { user, isLoading: isSessionLoading } = useSession();
  const isArabic = language === "ar";

  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<any[]>([]);

  useEffect(() => {
    if (isSessionLoading) return;
    if (!user) {
      router.replace(`/${slug}/login`);
      return;
    }

    const init = async () => {
      const config = await getAssessmentConfig(slug as string);
      if (!config) {
        toast.error("Assessment not found");
        router.push("/");
        return;
      }
      setAssessment(config);
      // Use timer_minutes from CSV, fallback to 20
      const seconds = (config.timer_minutes || 20) * 60;
      setTimeRemaining(seconds);

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", config.id);

      if (error) {
        toast.error("Error loading questions");
        return;
      }

      const shuffled = shuffleArray(data || []);
      setQuestions(shuffled);
      setSelectedAnswers(shuffled.map(q => ({
        questionId: q.id,
        competencyId: q.competency_id,
        selectedScore: -1
      })));
      setLoading(false);
    };

    init();
  }, [user, isSessionLoading, slug]);

  useEffect(() => {
    if (loading || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, timeRemaining]);

  const handleFinish = async () => {
    if (!user?.id || !assessment) return;
    setIsTransitioning(true);
    const finalAnswers = selectedAnswers.map(a => ({
      ...a,
      selectedScore: a.selectedScore === -1 ? 0 : a.selectedScore
    }));

    try {
      const { attemptId } = await submitQuiz(finalAnswers, user.id, language, assessment.id);
      router.push(`/${slug}/results?attemptId=${attemptId}`);
    } catch (e) {
      toast.error("Failed to save results");
      setIsTransitioning(false);
    }
  };

  const handleOptionSelect = (score: number) => {
    if (isTransitioning) return;
    const copy = [...selectedAnswers];
    copy[currentQuestionIndex].selectedScore = score;
    setSelectedAnswers(copy);

    setIsTransitioning(true);
    setTimeout(() => {
      if (currentQuestionIndex === questions.length - 1) {
        handleFinish();
      } else {
        setCurrentQuestionIndex(i => i + 1);
        setIsTransitioning(false);
      }
    }, 300);
  };

  useEffect(() => {
    const q = questions[currentQuestionIndex];
    if (!q) return;
    const raw = language === "en" ? q.options_en : q.options_ar;
    const scores = q.options_scores || [];
    const opts = (Array.isArray(raw) ? raw : []).map((item: any, idx: number) => ({
      text: typeof item === "object" ? item.text : item,
      score: scores[idx] ?? 0
    }));
    setShuffledOptions(shuffleArray(opts));
  }, [currentQuestionIndex, questions, language]);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className={`fixed inset-0 flex flex-col bg-slate-50 ${isArabic ? arabicFont.className : latinFont.className}`} dir={isArabic ? "rtl" : "ltr"}>
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <span>{currentQuestionIndex + 1}/{questions.length}</span>
        <span className="font-bold">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
      </div>
      <div className="h-1 bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-bold">{isArabic ? q.question_ar : q.question_en}</h2>
          </div>
          <div className="space-y-3">
            {shuffledOptions.map((opt, i) => (
              <button key={i} onClick={() => handleOptionSelect(opt.score)} className="w-full p-4 bg-white border rounded-xl hover:bg-blue-50 transition-colors text-start font-medium">
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}