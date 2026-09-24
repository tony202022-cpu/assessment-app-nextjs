import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/offline-company";
import {
  createParticipantReportAccess,
  PARTICIPANT_REPORT_ACCESS_COOKIE,
  PARTICIPANT_REPORT_ACCESS_SECONDS,
} from "@/lib/participant-report-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const attemptId = String((body as { attemptId?: unknown }).attemptId || "").trim();
  if (!attemptId) {
    return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Report access is not configured." }, { status: 500 });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const userId = String(authData.user?.id || "");
  if (authError || !userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, assessment_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (
    attemptError ||
    !attempt ||
    !attempt.user_id ||
    String(attempt.user_id) !== userId ||
    !attempt.assessment_id
  ) {
    return NextResponse.json({ error: "Report access denied." }, { status: 403 });
  }

  const response = NextResponse.json({ authorized: true });
  response.cookies.set(
    PARTICIPANT_REPORT_ACCESS_COOKIE,
    createParticipantReportAccess({
      attemptId: String(attempt.id),
      userId,
      assessmentId: String(attempt.assessment_id),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PARTICIPANT_REPORT_ACCESS_SECONDS,
    },
  );
  return response;
}
