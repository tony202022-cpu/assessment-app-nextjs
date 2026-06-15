import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data, error } = await supabaseAdmin.rpc("start_assessment_with_credit", {
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

    return NextResponse.json({
      attemptId: row.attempt_id,
      creditsRemaining: row.credits_remaining,
      alreadySubmitted,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
