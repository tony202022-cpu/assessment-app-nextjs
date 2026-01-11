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
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        Missing attemptId
      </div>
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("id, user_id, competency_results, total_percentage, language, created_at")
    .eq("id", attemptId)
    .single();

  if (attemptErr || !attempt) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
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

  // profile
  let profile: any = null;
  if (userId) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, company, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();
    profile = p || null;
  }

  // email via admin
  let email: string | null = null;
  if (userId) {
    try {
      const { data: adminData, error: adminErr } =
        await supabase.auth.admin.getUserById(userId);
      if (!adminErr) email = adminData?.user?.email ?? null;
    } catch {}
  }

  const fullName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    null;

  const company = profile?.company || null;

  return (
    <PrintReportClient
      attempt={attempt}
      user={{
        userId,
        fullName,
        company,
        email,
      }}
      lang={finalLang}
    />
  );
}
