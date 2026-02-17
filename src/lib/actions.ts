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

// Global registry for competency metadata (render labels at save-time)
const COMPETENCY_REGISTRY: Record<string, { en: string; ar: string }> = {
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },

  // MRI extras (if/when used)
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

/**
 * ✅ MUST MATCH UI + pdf-recommendations.ts
 * Strength >= 75
 * Opportunity >= 50
 * Threat >= 30
 * Weakness < 30
 */
function tierFromPercentage(pct: number): Tier {
  const p = Number(pct) || 0;
  if (p >= 75) return "Strength";
  if (p >= 50) return "Opportunity";
  if (p >= 30) return "Threat";
  return "Weakness";
}

/**
 * ✅ Normalize competency ids so:
 * - destroying_objections NEVER survives into DB
 * - labels + recommendations always match
 */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "handling_objections",
    handling_objections: "handling_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    // if some questions use other spellings:
    followup_discipline: "follow_up_discipline",
    follow_up: "follow_up_discipline",
  };

  return map[clean] || clean;
}

export async function getAssessmentConfig(routeSlug: string) {
  const supabase = getSupabaseAdmin();

  const slug = String(routeSlug || "").trim().toLowerCase();
  if (!slug) return null;

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Assessment lookup failed (by slug):", { slug, error });
    return null;
  }

  return data;
}


export async function submitQuiz(
  finalAnswers: AnswerPayload[],
  attemptId: string,
  language: Language,
  assessmentId: string
): Promise<{ attemptId: string }> {
  if (!attemptId || !assessmentId) {
    throw new Error("Missing required IDs (attemptId or assessmentId)");
  }

  const supabase = getSupabaseAdmin();

  // --------------------------------------------------
  // 0) Ensure attempt exists + validate ownership
  // --------------------------------------------------
  const { data: existing, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("id, assessment_id, language")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptErr) throw attemptErr;
  if (!existing) {
    throw new Error("Attempt not found. Missing or invalid attemptId.");
  }

  // Hard safety: prevent mixing assessments
  if (existing.assessment_id && existing.assessment_id !== assessmentId) {
    throw new Error("Assessment mismatch for this attempt.");
  }

  // Normalize assessment_id + language ONLY if missing
  if (!existing.assessment_id || !existing.language) {
    const { error: normalizeErr } = await supabase
      .from("quiz_attempts")
      .update({
        assessment_id: existing.assessment_id || assessmentId,
        language: existing.language || language,
      })
      .eq("id", attemptId);

    if (normalizeErr) throw normalizeErr;
  }

  // --------------------------------------------------
  // 1) Normalize answers (no -1 values)
  // --------------------------------------------------
  const normalized = (finalAnswers || []).map((a) => ({
    questionId: a.questionId,
    competencyId: a.competencyId,
    selectedScore: a.selectedScore === -1 ? 0 : Number(a.selectedScore || 0),
  }));

  if (!normalized.length) {
    throw new Error("No answers to submit");
  }

  // --------------------------------------------------
  // 2) Compute per-competency percentages
  // --------------------------------------------------
  const questionIds = Array.from(
    new Set(normalized.map((a) => a.questionId).filter(Boolean))
  );

  const { data: qrows, error: qerr } = await supabase
    .from("questions")
    .select("id, competency_id, options_scores")
    .in("id", questionIds);

  if (qerr) throw qerr;

  const qMap = new Map<string, any>(
    (qrows || []).map((q) => [q.id, q])
  );

  const agg = new Map<
    string,
    { earned: number; possible: number; count: number }
  >();

  for (const a of normalized) {
    const q = qMap.get(a.questionId);
    const competencyId = String(
      a.competencyId || q?.competency_id || ""
    ).trim();

    if (!competencyId) continue;

    const scoresArr = Array.isArray(q?.options_scores)
      ? q.options_scores
      : null;

    const maxScore =
      scoresArr && scoresArr.length
        ? Math.max(...scoresArr.map((n: any) => Number(n || 0)))
        : 5;

    const earned = Number(a.selectedScore || 0);

    const cur = agg.get(competencyId) || {
      earned: 0,
      possible: 0,
      count: 0,
    };

    cur.earned += earned;
    cur.possible += maxScore;
    cur.count += 1;

    agg.set(competencyId, cur);
  }

  const competency_results = Array.from(agg.entries()).map(
    ([competencyId, v]) => ({
      competencyId,
      percentage:
        v.possible > 0
          ? Math.round((v.earned / v.possible) * 100)
          : 0,
    })
  );

  const totalEarned = Array.from(agg.values()).reduce(
    (s, v) => s + v.earned,
    0
  );

  const totalPossible = Array.from(agg.values()).reduce(
    (s, v) => s + v.possible,
    0
  );

  const total_percentage =
    totalPossible > 0
      ? Math.round((totalEarned / totalPossible) * 100)
      : 0;

  // --------------------------------------------------
  // 3) Persist results INTO THE SAME attempt row
  // --------------------------------------------------
  const { error: updateErr } = await supabase
    .from("quiz_attempts")
    .update({
      answers: normalized,
      competency_results,
      total_percentage,
    })
    .eq("id", attemptId);

  if (updateErr) throw updateErr;

  return { attemptId };
}
