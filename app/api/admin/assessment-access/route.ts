import { NextRequest, NextResponse } from "next/server";
import {
  DEVELOPER_TEST_LAUNCH_SECONDS,
  generateDeveloperLaunchToken,
  generateDeveloperTestIdentity,
  hashDeveloperLaunchToken,
  supportedDeveloperTestAssessment,
  validateDeveloperTestSelection,
  type DeveloperTestAssessment,
} from "@/lib/admin-assessment-access";
import {
  getSupabaseAdmin,
  isValidAdminSession,
  OFFLINE_ADMIN_COOKIE,
} from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value);
}

async function loadAssessments(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, slug, status, title_en, title_ar, name_en, name_ar, timer_minutes, num_questions",
    )
    .in("slug", [
      "outdoor-mri",
      "sales-manager-mri",
      "lawyer-client-conversion-mri",
      "sme-business-health-mri",
    ])
    .eq("status", "active");

  if (error) throw error;
  return (data || [])
    .map((row) => supportedDeveloperTestAssessment(row))
    .filter((row): row is DeveloperTestAssessment => !!row);
}

async function loadHistory(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  origin: string,
) {
  const { data, error } = await supabase
    .from("developer_test_attempts")
    .select(
      "id, assessment_id, assessment_slug, language, participant_email, attempt_id, launch_expires_at, used_at, created_at, quiz_attempts(completed_at)",
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw error;
  }

  return (data || []).map((row: any) => {
    const completedAt = Array.isArray(row.quiz_attempts)
      ? row.quiz_attempts[0]?.completed_at
      : row.quiz_attempts?.completed_at;
    const launchValid = new Date(row.launch_expires_at).getTime() > Date.now();
    const launchState = row.used_at
      ? "used"
      : launchValid
        ? "available"
        : "expired";
    return {
      id: row.id,
      assessmentId: row.assessment_id,
      assessmentSlug: row.assessment_slug,
      language: row.language,
      email: row.participant_email,
      attemptId: row.attempt_id,
      createdAt: row.created_at,
      status: completedAt ? "completed" : "ready",
      launchValid: launchState === "available",
      launchState,
      launchUrl: launchState === "available"
        ? `${origin}/api/admin/assessment-access/launch?id=${encodeURIComponent(row.id)}`
        : null,
      reportUrl: completedAt
        ? `${origin}/${row.assessment_slug}/report?attemptId=${encodeURIComponent(
            row.attempt_id,
          )}&lang=${encodeURIComponent(row.language)}`
        : null,
    };
  });
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorised admin." }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "The test service is not configured." }, { status: 500 });
  }

  try {
    const [assessments, history] = await Promise.all([
      loadAssessments(supabase),
      loadHistory(supabase, request.nextUrl.origin),
    ]);
    return NextResponse.json(
      { assessments, history },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Developer test console load failed:", error);
    return NextResponse.json({ error: "Could not load Developer Test Mode." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorised admin." }, { status: 401 });
  }
  const rate = consumeRateLimit(
    `developer-test:${clientKey(request)}`,
    20,
    60 * 60 * 1000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Developer test limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "The test service is not configured." }, { status: 500 });
  }

  let assessments: DeveloperTestAssessment[];
  try {
    assessments = await loadAssessments(supabase);
  } catch (error) {
    console.error("Developer test assessment lookup failed:", error);
    return NextResponse.json({ error: "Could not load active assessments." }, { status: 500 });
  }

  const validation = validateDeveloperTestSelection(body, assessments);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { assessment, language } = validation.data;
  const identity = generateDeveloperTestIdentity(assessment.slug);
  const launchToken = generateDeveloperLaunchToken();
  const launchExpiresAt = new Date(
    Date.now() + DEVELOPER_TEST_LAUNCH_SECONDS * 1000,
  ).toISOString();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: identity.email,
    email_confirm: true,
    user_metadata: {
      full_name: identity.fullName,
      admin_test_identity: true,
    },
  });
  if (authError || !authData.user) {
    console.error("Developer test identity creation failed:", authError?.message);
    return NextResponse.json({ error: "Could not create the test identity." }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("create_developer_test_attempt", {
    p_assessment_id: assessment.assessmentId,
    p_assessment_slug: assessment.slug,
    p_language: language,
    p_participant_email: identity.email,
    p_participant_name: identity.fullName,
    p_auth_user_id: authData.user.id,
    p_launch_token_hash: hashDeveloperLaunchToken(launchToken),
    p_launch_expires_at: launchExpiresAt,
  });

  if (error) {
    console.error("Developer test attempt creation failed:", error.code);
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    return NextResponse.json(
      { error: "Could not create the attempt. Confirm the Developer Test migration is applied." },
      { status: 500 },
    );
  }

  const created = (Array.isArray(data) ? data[0] : data) as
    | { developer_test_id?: string; attempt_id?: string }
    | null;
  if (!created?.developer_test_id || !created.attempt_id) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    return NextResponse.json({ error: "The test attempt returned an invalid result." }, { status: 500 });
  }

  return NextResponse.json({
    test: {
      id: created.developer_test_id,
      assessmentId: assessment.assessmentId,
      assessmentSlug: assessment.slug,
      assessmentTitle: assessment.title,
      language,
      email: identity.email,
      attemptId: created.attempt_id,
      createdAt: new Date().toISOString(),
      status: "ready",
      launchValid: true,
      launchUrl: `${request.nextUrl.origin}/api/admin/assessment-access/launch?token=${encodeURIComponent(
        launchToken,
      )}`,
      reportUrl: null,
    },
  });
}
