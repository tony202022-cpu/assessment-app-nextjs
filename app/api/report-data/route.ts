// app/api/report-data/route.ts

import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // IMPORTANT: Don't crash at import/build time
  if (!url || !serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them in Vercel Project Settings → Environment Variables.",
        },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({} as any))
    const attemptId = body?.attemptId

    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("attempts")
      .select(
        `
        id,
        user_id,
        competency_results
      `
      )
      .eq("id", attemptId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
    }

    return NextResponse.json({
      user_id: data.user_id ?? "—",
      competency_results: Array.isArray((data as any).competency_results)
        ? (data as any).competency_results
        : [],
    })
  } catch (err) {
    console.error("report-data error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
