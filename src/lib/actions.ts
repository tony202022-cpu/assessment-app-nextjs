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

// Global registry for competency metadata (The "Ingredients" list)
const COMPETENCY_REGISTRY: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation", ar: "عقلية التحفيز والموقف" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
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
  if (pct >= 75) return "Strength";
  if (pct >= 50) return "Opportunity";
  if (pct >= 25) return "Weakness";
  return "Threat";
}

export async function getAssessmentConfig(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function submitQuiz(
  finalAnswers: AnswerPayload[],
  userId: string,
  language: Language,
  assessmentId: string
): Promise<{ attemptId: string }> {
  if (!userId || !assessmentId) throw new Error("Missing required IDs");
  
  const supabase = getSupabaseAdmin();

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
    const meta = COMPETENCY_REGISTRY[cid] || { en: cid, ar: cid };
    return {
      competencyId: cid,
      name: language === "ar" ? meta.ar : meta.en,
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