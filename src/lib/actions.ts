"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";

export type Language = "ar" | "en";
export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

export type AnswerPayload = {
  questionId: string;
  competencyId: string;
  selectedScore: number;
};

type CompetencyResult = {
  competencyId: string;
  name: string;
  tier: Tier;
  score: number;
  maxScore: number;
  percentage: number;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function clampPct(n: any) {
  const x = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, x));
}

function tierFromPercentage(pct: number): Tier {
  if (pct >= 80) return "Strength";
  if (pct >= 60) return "Opportunity";
  if (pct >= 40) return "Threat";
  return "Weakness";
}

/**
 * Fetches assessment configuration by slug
 */
export async function getAssessmentConfig(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", slug)
    .single();
  
  if (error || !data) return null;
  return data;
}

/**
 * Submits quiz results for a specific assessment
 */
export async function submitQuiz(
  finalAnswers: AnswerPayload[],
  userId: string,
  language: Language,
  assessmentId: string
): Promise<{ attemptId: string }> {
  if (!userId || !assessmentId) throw new Error("Missing required IDs");
  
  const supabase = getSupabaseAdmin();

  // Fetch assessment config to get competency names
  const { data: assessment } = await supabase
    .from("assessments")
    .select("competencies")
    .eq("id", assessmentId)
    .single();

  const compMap = (assessment?.competencies || {}) as Record<string, any>;

  const totalQuestions = finalAnswers.length;
  const totalScore = finalAnswers.reduce((s, a) => s + (Number(a.selectedScore) || 0), 0);
  const overallMax = totalQuestions * 5;
  const totalPercentage = overallMax > 0 ? clampPct((totalScore / overallMax) * 100) : 0;

  const byComp = new Map<string, { score: number; count: number }>();
  for (const a of finalAnswers) {
    const prev = byComp.get(a.competencyId) || { score: 0, count: 0 };
    byComp.set(a.competencyId, {
      score: prev.score + (Number(a.selectedScore) || 0),
      count: prev.count + 1,
    });
  }

  const competency_results: CompetencyResult[] = Array.from(byComp.entries()).map(([cid, row]) => {
    const maxScore = row.count * 5;
    const pct = maxScore > 0 ? clampPct((row.score / maxScore) * 100) : 0;
    const meta = compMap[cid] || {};
    return {
      competencyId: cid,
      name: language === "ar" ? meta.labelAr || cid : meta.labelEn || cid,
      score: row.score,
      maxScore,
      percentage: pct,
      tier: tierFromPercentage(pct),
    };
  });

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      language,
      answers: finalAnswers,
      score: totalScore,
      total_questions: totalQuestions,
      total_percentage: totalPercentage,
      competency_results,
    })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message || "Insert failed");

  return { attemptId: data.id };
}