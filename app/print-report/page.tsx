// app/print-report/page.tsx
import { createClient } from "@supabase/supabase-js";
import PrintReportClient from "./PrintReportClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: { attemptId?: string; lang?: string; puppeteer?: string };
}) {
  const attemptId = String(searchParams?.attemptId || "").trim();
  const langRaw = String(searchParams?.lang || "").toLowerCase();
  const lang: "ar" | "en" = langRaw === "en" ? "en" : "ar";

  if (!attemptId) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", textAlign: "center" }}>
        Missing attemptId
      </div>
    );
  }

  // GET ENVIRONMENT VARIABLES
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey; // Fallback to anon key if service role not set

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      hasServiceKey: !!serviceRoleKey
    });
    
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", textAlign: "center" }}>
        Server configuration error. Please try again later.
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: attempt, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .select("id, user_id, competency_results, total_percentage, language, created_at")
      .eq("id", attemptId)
      .single();

    if (attemptErr || !attempt) {
      console.error("Attempt fetch error:", attemptErr);
      return (
        <div style={{ padding: 40, fontFamily: "system-ui", textAlign: "center" }}>
          Report not found
        </div>
      );
    }

    const userId = (attempt as any).user_id as string | null;

    // Decide language: URL > attempt.language > default ar
    const dbLangRaw = String((attempt as any).language || "").toLowerCase();
    const finalLang: "ar" | "en" =
      langRaw === "en" || langRaw === "ar"
        ? lang
        : dbLangRaw === "en"
        ? "en"
        : "ar";

    // Fetch profile
    let profile: any = null;
    if (userId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, company, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      profile = p || null;
    }

    // Fetch email - simplified
    let email: string | null = null;
    if (userId) {
      // Try to get email from auth if possible, otherwise use placeholder
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        email = userData?.user?.email || null;
      } catch (authError) {
        console.log("Auth email fetch failed, using placeholder");
        email = "user@example.com"; // Placeholder
      }
    }

    const fullName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      (finalLang === "ar" ? "غير محدد" : "Not specified");

    const company = profile?.company || null;

    return (
      <PrintReportClient
        attempt={attempt}
        user={{
          userId,
          fullName,
          company,
          email: email || (finalLang === "ar" ? "غير محدد" : "Not specified"),
        }}
        lang={finalLang}
      />
    );
    
  } catch (error) {
    console.error("Print report server error:", error);
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", textAlign: "center" }}>
        Error loading report. Please try again.
      </div>
    );
  }
}