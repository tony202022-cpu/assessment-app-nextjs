// lib/actions.ts
"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   TYPES
========================================================= */
export type Language = "ar" | "en";
export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

export type AnswerPayload = {
  questionId: string;
  competencyId: string;
  selectedScore: number; // expected 1..4
  [key: string]: any;
};

type CompetencyResult = {
  competencyId: string;
  name: string;
  tier: Tier;
  score: number;
  maxScore: number;
  percentage: number;
};

/* =========================================================
   CONSTANTS
========================================================= */
const COMPETENCY_ORDER = [
  "mental_toughness",
  "opening_conversations",
  "identifying_real_needs",
  "destroying_objections",
  "creating_irresistible_offers",
  "mastering_closing",
  "follow_up_discipline",
] as const;

const COMPETENCY_NAME_EN: Record<string, string> = {
  mental_toughness: "Mental Toughness",
  opening_conversations: "Opening Conversations",
  identifying_real_needs: "Identifying Real Needs",
  destroying_objections: "Handling Objections",
  creating_irresistible_offers: "Creating Irresistible Offers",
  mastering_closing: "Mastering Closing",
  follow_up_discipline: "Follow-Up Discipline",
};

/* =========================================================
   ENV + ADMIN CLIENT
========================================================= */
function getSupabaseAdmin() {
  // Accept either naming style to avoid local/Vercel mismatch pain.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  return createClient(url!, key!, { auth: { persistSession: false } });
}

/* =========================================================
   HELPERS
========================================================= */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "destroying_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    "mental toughness": "mental_toughness",
    "opening conversations": "opening_conversations",
    "identifying real needs": "identifying_real_needs",
    "handling objections": "destroying_objections",
    "creating irresistible offers": "creating_irresistible_offers",
    "mastering closing": "mastering_closing",
    "follow-up discipline": "follow_up_discipline",

    "الصلابة الذهنية": "mental_toughness",
    "فتح المحادثات": "opening_conversations",
    "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
    "التعامل مع الاعتراضات": "destroying_objections",
    "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
    "إتقان الإغلاق": "mastering_closing",
    "انضباط المتابعة": "follow_up_discipline",
  };

  return map[clean] || map[key] || key;
}

function clampPct(n: any) {
  const x = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, x));
}

function tierFromPercentage(pct: number): Tier {
  const p = clampPct(pct);
  if (p >= 80) return "Strength";
  if (p >= 60) return "Opportunity";
  if (p >= 40) return "Threat";
  return "Weakness";
}

/* =========================================================
   1) BUILD PDF URL
========================================================= */
export async function buildPdfUrl({
  attemptId,
  lang,
}: {
  attemptId: string;
  lang: Language;
}) {
  const base = process.env.NEXT_PUBLIC_PDF_SERVICE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_PDF_SERVICE_URL");

  return (
    `${base.replace(/\/$/, "")}/api/generate-pdf` +
    `?attemptId=${encodeURIComponent(attemptId)}` +
    `&lang=${encodeURIComponent(lang)}`
  );
}

/* =========================================================
   2) SUBMIT QUIZ (NO GUESTS)
========================================================= */
export async function submitQuiz(
  finalAnswers: AnswerPayload[],
  userId: string,
  language: Language,
): Promise<{ attemptId: string }> {
  if (!userId) throw new Error("Missing userId");
  if (!Array.isArray(finalAnswers) || finalAnswers.length === 0) {
    throw new Error("Missing answers");
  }

  const supabase = getSupabaseAdmin();

  const answers = finalAnswers.map((a) => ({
    ...a,
    competencyId: normalizeCompetencyId(a.competencyId),
    selectedScore: Number(a.selectedScore) || 0,
  }));

  const totalQuestions = answers.length;
  const totalScore = answers.reduce((s, a) => s + (Number(a.selectedScore) || 0), 0);

  const overallMax = totalQuestions * 4;
  const totalPercentage = overallMax > 0 ? clampPct((totalScore / overallMax) * 100) : 0;

  const byComp = new Map<string, { score: number; count: number }>();
  for (const a of answers) {
    const cid = normalizeCompetencyId(a.competencyId);
    const prev = byComp.get(cid) || { score: 0, count: 0 };
    byComp.set(cid, {
      score: prev.score + (Number(a.selectedScore) || 0),
      count: prev.count + 1,
    });
  }

  const competency_results: CompetencyResult[] = COMPETENCY_ORDER.map((cid) => {
    const row = byComp.get(cid) || { score: 0, count: 0 };
    const maxScore = row.count * 4;
    const pct = maxScore > 0 ? clampPct((row.score / maxScore) * 100) : 0;
    return {
      competencyId: cid,
      name: COMPETENCY_NAME_EN[cid] || cid,
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
      language,
      answers,
      score: totalScore,
      total_questions: totalQuestions,
      total_percentage: totalPercentage,
      competency_results,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Supabase insert failed: ${error?.message || "Unknown error"}`);
  }

  return { attemptId: data.id };
}

/* =========================================================
   3) GET QUIZ ATTEMPT
========================================================= */
export async function getQuizAttempt(attemptId: string) {
  if (!attemptId) throw new Error("Missing attemptId");
  const supabase = getSupabaseAdmin();

  const { data: attempt, error: aErr } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, competency_results, total_percentage, language, created_at")
    .eq("id", attemptId)
    .single();

  if (aErr || !attempt) {
    throw new Error(`Attempt not found: ${aErr?.message || "Unknown error"}`);
  }

  const userId = (attempt as any).user_id;

  let profile: any = null;
  if (userId) {
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("full_name, company")
      .eq("id", userId)
      .single();
    if (!pErr && prof) profile = prof;
  }

  let email: string | null = null;
  try {
    const { data: u } = await supabase.auth.admin.getUserById(userId);
    email = u?.user?.email || null;
  } catch {
    email = null;
  }

  return { ...(attempt as any), profile, email };
}
