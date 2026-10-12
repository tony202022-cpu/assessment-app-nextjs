import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isOfflineActivatedOutdoorMriAttempt } from "@/lib/offline-attempt-access";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const FREE_COMPANY_SCAN_BY_SLUG = new Map([
  ["scan", "outdoor_sales_scan"],
  ["outdoor-scan", "outdoor_sales_scan"],
  ["sales-manager-scan", "sales_manager_scan"],
]);

async function startFreeCompanyScan(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  input: { token: string; slug: string; lang: "en" | "ar"; fullName: string; userEmail: string; userId: string },
) {
  const assessmentId = FREE_COMPANY_SCAN_BY_SLUG.get(input.slug);
  if (!assessmentId) return null;

  const { data: access, error: accessError } = await supabaseAdmin
    .from("access_tokens")
    .select("id, company_id, assessment_type, entitlement_type, issuance_policy_id, revoked_at, expires_at")
    .eq("token_string", input.token)
    .maybeSingle();
  if (accessError) throw accessError;
  if (!access || access.entitlement_type !== "company") return null;
  if (!access.company_id || access.assessment_type !== assessmentId) throw new Error("This token is not valid for the selected free Scan");
  if (access.revoked_at) throw new Error("Access token has been revoked");
  if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now()) throw new Error("Access token has expired");

  const normalizedEmail = input.userEmail.trim().toLowerCase();
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id")
    .eq("company_id", access.company_id)
    .eq("assessment_id", assessmentId)
    .eq("user_email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return { attempt_id: existing.id, credits_remaining: null };

  const [{ data: assessment, error: assessmentError }, { data: company, error: companyError }] = await Promise.all([
    supabaseAdmin.from("assessments").select("id, num_questions").eq("id", assessmentId).eq("status", "active").maybeSingle(),
    supabaseAdmin.from("companies").select("id, name").eq("id", access.company_id).maybeSingle(),
  ]);
  if (assessmentError) throw assessmentError;
  if (companyError) throw companyError;
  if (!assessment || !company) throw new Error("Free company Scan access is unavailable");

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("quiz_attempts")
    .insert({
      assessment_id: assessment.id,
      language: input.lang,
      full_name: input.fullName || null,
      company: company.name || null,
      user_email: normalizedEmail,
      user_id: input.userId,
      total_questions: Number(assessment.num_questions || 30),
      score: 0,
      total_percentage: 0,
      answers: [],
      competency_results: [],
      company_id: access.company_id,
      access_token_id: access.id,
      issuance_policy_id: access.issuance_policy_id,
    })
    .select("id")
    .single();
  if (attemptError) throw attemptError;
  return { attempt_id: attempt.id, credits_remaining: null };
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Missing Supabase server environment variables" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing user session" },
        { status: 401 }
      );
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid or expired user session" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const slug = String(body.slug || "").toLowerCase().trim();
    const token = String(body.token || "").trim();
    const lang = body.lang === "ar" ? "ar" : "en";
    const fullName = String(body.fullName || "").trim();
    const company = String(body.company || "").trim();

    if (!slug) {
      return NextResponse.json({ error: "Missing assessment slug" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const freeCompanyScan = await startFreeCompanyScan(supabaseAdmin, {
      token,
      slug,
      lang,
      fullName,
      userEmail: userData.user.email || "",
      userId: userData.user.id,
    });
    const { data, error } = freeCompanyScan
      ? { data: freeCompanyScan, error: null }
      : await supabaseAdmin.rpc("start_assessment_with_credit", {
          p_token: token,
          p_assessment_slug: slug,
          p_lang: lang,
          p_full_name: fullName,
          p_participant_company: company,
          p_user_email: userData.user.email || "",
          p_user_id: userData.user.id,
        });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not start assessment" },
        { status: 400 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.attempt_id) {
      return NextResponse.json(
        { error: "Attempt was not created" },
        { status: 500 }
      );
    }

    const { data: attempt } = await supabaseAdmin
      .from("quiz_attempts")
      .select("answers, competency_results, total_percentage")
      .eq("id", row.attempt_id)
      .maybeSingle();

    const alreadySubmitted =
      (Array.isArray(attempt?.answers) && attempt.answers.length > 0) ||
      (Array.isArray(attempt?.competency_results) &&
        attempt.competency_results.length > 0) ||
      Number(attempt?.total_percentage || 0) > 0;
    const isOfflineActivated =
      await isOfflineActivatedOutdoorMriAttempt(row.attempt_id);

    return NextResponse.json({
      attemptId: row.attempt_id,
      creditsRemaining: row.credits_remaining,
      alreadySubmitted,
      isOfflineActivated,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
