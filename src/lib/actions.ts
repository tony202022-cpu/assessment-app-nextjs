// src/lib/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

async function getSupabaseClient() {
  // cookies() not strictly needed for service role, but kept for your existing structure
  await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

const clampPct = (n: number) =>
  Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const tierFromPct = (pct: number): Tier => {
  const p = clampPct(pct);
  if (p >= 75) return "Strength";
  if (p >= 51) return "Opportunity";
  if (p >= 31) return "Threat";
  return "Weakness";
};

export async function submitQuiz(
  answers: { questionId: string; competencyId: string; selectedScore: number }[],
  userId: string,
  language: "en" | "ar"
) {
  const supabase = await getSupabaseClient();
  if (!userId) throw new Error("User not authenticated.");

  // Normalize unanswered values
  const safeAnswers = (answers || []).map((a) => ({
    ...a,
    selectedScore: a.selectedScore === -1 ? 0 : Number(a.selectedScore) || 0,
  }));

  // Your max totals per competency (same as your existing config)
  const competencyConfig: Record<
    string,
    { name: string; nameAr: string; maxScore: number }
  > = {
    mental_toughness: {
      name: "Mental Toughness",
      nameAr: "الصلابة الذهنية",
      maxScore: 25,
    },
    opening_conversations: {
      name: "Opening Conversations",
      nameAr: "فتح المحادثات",
      maxScore: 20,
    },
    identifying_real_needs: {
      name: "Identifying Real Needs",
      nameAr: "تحديد الاحتياجات الحقيقية",
      maxScore: 20,
    },
    destroying_objections: {
      name: "Handling Objections",
      nameAr: "التعامل مع الاعتراضات",
      maxScore: 25,
    },
    creating_irresistible_offers: {
      name: "Creating Irresistible Offers",
      nameAr: "إنشاء عروض لا تُقاوَم",
      maxScore: 20,
    },
    mastering_closing: {
      name: "Mastering Closing",
      nameAr: "إتقان الإغلاق",
      maxScore: 25,
    },
    follow_up_discipline: {
      name: "Follow-Up Discipline",
      nameAr: "انضباط المتابعة",
      maxScore: 15,
    },
  };

  // Aggregate scores by competency
  const competencyScores: Record<string, { total: number; count: number }> = {};
  for (const a of safeAnswers) {
    const competencyId = String(a.competencyId || "").trim();
    if (!competencyId) continue;
    if (!competencyScores[competencyId])
      competencyScores[competencyId] = { total: 0, count: 0 };
    competencyScores[competencyId].total += a.selectedScore;
    competencyScores[competencyId].count += 1;
  }

  // Build competency_results in the exact shape your print-report expects
  const competency_results = Object.entries(competencyScores)
    .map(([competencyId, data]) => {
      const cfg = competencyConfig[competencyId];
      if (!cfg) return null;

      const percentage = cfg.maxScore > 0 ? (data.total / cfg.maxScore) * 100 : 0;
      const pct = clampPct(percentage);

      return {
        competencyId,
        // keep extra fields if you want (harmless)
        name: cfg.name,
        nameAr: cfg.nameAr,
        score: data.total,
        maxScore: cfg.maxScore,
        percentage: pct,
        tier: tierFromPct(pct),
      };
    })
    .filter(Boolean);

  // Total percentage based on total max of the 7 competencies
  const totalMax = Object.values(competencyConfig).reduce(
    (s, c) => s + c.maxScore,
    0
  ); // 150
  const totalRawScore = safeAnswers.reduce((sum, a) => sum + a.selectedScore, 0);
  const total_percentage = totalMax > 0 ? clampPct((totalRawScore / totalMax) * 100) : 0;

  // ✅ Insert attempt (SERVICE ROLE => no RLS drama)
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      score: totalRawScore,
      total_questions: safeAnswers.length,
      answers: safeAnswers,
      competency_results,
      total_percentage, // ✅ IMPORTANT: print-report expects this
      language,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("Supabase insert error:", error);
    throw new Error(`Failed to save attempt: ${error?.message || "unknown error"}`);
  }

  revalidatePath("/results");
  revalidatePath("/print-report");

  return { attemptId: data.id };
}

export async function getQuizAttempt(attemptId: string) {
  const supabase = await getSupabaseClient();
  const id = String(attemptId || "").trim();
  if (!id) throw new Error("Missing attemptId");

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id,user_id,competency_results,total_percentage,language,created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Supabase getQuizAttempt error:", error);
    throw new Error(`No quiz_attempt found for attemptId: "${id}"`);
  }

  // =========================================================
  // ✅ ENRICH: profiles.full_name + profiles.company + auth email
  // (No schema change, uses your existing Service Role client)
  // =========================================================
  let full_name: string | null = null;
  let company: string | null = null;
  let email: string | null = null;

  try {
    if (data?.user_id) {
      // 1) profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company")
        .eq("id", data.user_id)
        .maybeSingle();

      full_name = profile?.full_name ?? null;
      company = profile?.company ?? null;

      // 2) auth email (service role => admin is allowed)
      const { data: adminUser, error: adminErr } =
        await supabase.auth.admin.getUserById(data.user_id);

      if (!adminErr) {
        email = adminUser?.user?.email ?? null;
      } else {
        // Don't fail report if admin lookup fails
        console.warn("Supabase admin getUserById error:", adminErr);
      }
    }
  } catch (e) {
    // do nothing - report must still render even if enrichment fails
    console.warn("getQuizAttempt enrichment error:", e);
  }

  // Return original attempt data + enriched user meta
  return {
    ...data,
    full_name,
    company,
    email,
  };
}
