import "server-only";

import { createClient } from "@supabase/supabase-js";

const OUTDOOR_SALES_MRI = "outdoor_sales_mri";

export type OfflineAttemptContext = {
  attemptId: string;
  assessmentId: string;
  companyId: string | null;
  language: "en" | "ar";
  isOfflineActivated: boolean;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getOfflineAttemptContext(
  attemptId: string
): Promise<OfflineAttemptContext | null> {
  const normalizedAttemptId = String(attemptId || "").trim();
  if (!normalizedAttemptId) return null;

  const supabase = getSupabaseAdmin();
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, assessment_id, company_id, language")
    .eq("id", normalizedAttemptId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt) return null;

  const assessmentId = String(attempt.assessment_id || "").trim();
  const companyId = attempt.company_id ? String(attempt.company_id) : null;
  let isOfflineActivated = false;

  if (assessmentId === OUTDOOR_SALES_MRI && companyId) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, is_offline_activated")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) throw companyError;
    isOfflineActivated = company?.is_offline_activated === true;
  }

  return {
    attemptId: String(attempt.id),
    assessmentId,
    companyId,
    language: attempt.language === "ar" ? "ar" : "en",
    isOfflineActivated,
  };
}

export async function isOfflineActivatedOutdoorMriAttempt(
  attemptId: string
): Promise<boolean> {
  const context = await getOfflineAttemptContext(attemptId);
  return context?.isOfflineActivated === true;
}

export async function isAuthorizedOfflineManager(
  attemptId: string,
  managerToken: string
): Promise<boolean> {
  const token = String(managerToken || "").trim();
  if (!token) return false;

  const context = await getOfflineAttemptContext(attemptId);
  if (!context?.isOfflineActivated || !context.companyId) return false;

  const supabase = getSupabaseAdmin();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id")
    .eq("id", context.companyId)
    .eq("is_offline_activated", true)
    .eq("manager_token", token)
    .maybeSingle();

  if (error) throw error;
  return company?.id === context.companyId;
}

