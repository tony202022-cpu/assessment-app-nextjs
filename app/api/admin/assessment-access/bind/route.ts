import { NextRequest, NextResponse } from "next/server";
import {
  createDeveloperTestAccess,
  DEVELOPER_TEST_ACCESS_COOKIE,
  DEVELOPER_TEST_LAUNCH_SECONDS,
} from "@/lib/admin-assessment-access";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { isAuthorizedPaidMriAttempt } from "@/lib/paid-mri-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { attemptId?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const attemptId = String(body.attemptId || "").trim();
  const slug = String(body.slug || "").toLowerCase().trim();
  if (!attemptId || !slug) {
    return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "The access service is not configured." }, { status: 500 });
  }
  const { data: authData, error: authError } =
    await supabase.auth.getUser(accessToken);
  const userId = authData.user?.id || "";
  if (authError || !userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, assessment_id, user_id, access_token_id, company_id, is_developer_test, completed_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (
    attemptError ||
    !attempt ||
    attempt.completed_at ||
    !isAuthorizedPaidMriAttempt(slug, attempt, userId) ||
    attempt.is_developer_test !== true
  ) {
    return NextResponse.json({ error: "Developer Test access denied." }, { status: 403 });
  }

  const response = NextResponse.json({ authorized: true });
  response.cookies.set(
    DEVELOPER_TEST_ACCESS_COOKIE,
    createDeveloperTestAccess({
      attemptId: attempt.id,
      userId,
      assessmentId: attempt.assessment_id,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEVELOPER_TEST_LAUNCH_SECONDS,
    },
  );
  return response;
}
