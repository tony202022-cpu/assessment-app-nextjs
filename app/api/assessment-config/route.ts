import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabasePublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) return null;

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get("slug") || "").trim();

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    // slug -> assessment id
    const ROUTE_TO_ASSESSMENT_ID: Record<string, string> = {
      scan: "outdoor_sales_scan",
      mri: "outdoor_sales_mri",
    };
    const assessmentId = ROUTE_TO_ASSESSMENT_ID[slug] ?? slug;

    const supabase = getSupabasePublicServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: `Config not found for id=${assessmentId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
