import { NextRequest, NextResponse } from "next/server";
import {
  getDeveloperTestBaseUrl,
  hashDeveloperLaunchToken,
} from "@/lib/admin-assessment-access";
import {
  getSupabaseAdmin,
  isValidAdminSession,
  OFFLINE_ADMIN_COOKIE,
} from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorised admin." }, { status: 401 });
  }
  const rate = consumeRateLimit(
    `developer-test-launch:${clientKey(request)}`,
    60,
    60 * 60 * 1000,
  );
  if (!rate.allowed) {
    return NextResponse.json({ error: "Launch limit reached." }, { status: 429 });
  }

  const token = String(request.nextUrl.searchParams.get("token") || "").trim();
  const testId = String(request.nextUrl.searchParams.get("id") || "").trim();
  if ((!testId && token.length < 32) || token.length > 200) {
    return NextResponse.json({ error: "Invalid launch link." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "The test service is not configured." }, { status: 500 });
  }

  let appBaseUrl: string;
  try {
    appBaseUrl = getDeveloperTestBaseUrl();
  } catch (error) {
    console.error(
      "Developer Test Mode base URL configuration error:",
      error instanceof Error ? error.message : "invalid APP_BASE_URL",
    );
    return NextResponse.json(
      { error: "Developer Test Mode application URL is not configured safely." },
      { status: 500 },
    );
  }

  const consumedAt = new Date().toISOString();
  let query = supabase
    .from("developer_test_attempts")
    .update({ used_at: consumedAt })
    .select(
      "assessment_slug, language, participant_email, attempt_id, launch_expires_at",
    )
    .is("used_at", null)
    .gt("launch_expires_at", consumedAt);
  query = testId
    ? query.eq("id", testId)
    : query.eq("launch_token_hash", hashDeveloperLaunchToken(token));
  const { data: test, error } = await query.maybeSingle();

  if (error || !test) {
    return NextResponse.json(
      { error: "This launch link is invalid, expired, or has already been used." },
      { status: 410 },
    );
  }

  const nextPath = `/${test.assessment_slug}/instructions?lang=${encodeURIComponent(
    test.language,
  )}&attemptId=${encodeURIComponent(test.attempt_id)}`;
  const redirectUrl = `${appBaseUrl}${nextPath}`;
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: test.participant_email,
    options: { redirectTo: redirectUrl },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Developer test launch link failed:", linkError?.message);
    return NextResponse.json({ error: "Could not sign in the test identity." }, { status: 502 });
  }

  return NextResponse.redirect(linkData.properties.action_link);
}
