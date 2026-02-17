import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isMriAttempt(assessmentId?: string | null) {
  const a = String(assessmentId || "").toLowerCase();
  return a.includes("mri");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const attemptId = (searchParams.get("attemptId") || "").trim();
  const lang = (searchParams.get("lang") || "en").trim();

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  let browser: any = null;

  try {
    // 1) Read attempt to know if it's Scan or MRI (DB is source of truth)
    const supabase = getSupabaseAdmin();
    const { data: attempt, error: attErr } = await supabase
      .from("quiz_attempts")
      .select("assessment_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (attErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const pdfType = isMriAttempt(attempt.assessment_id) ? "mri" : "scan";

    // 2) Launch browser
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 3) Go to the correct PDF page route
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = req.headers.get("host");

    const reportUrl = `${protocol}://${host}/reports/pdf/${pdfType}/${attemptId}?lang=${encodeURIComponent(
      lang
    )}`;

    await page.goto(reportUrl, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    const prefix = pdfType === "mri" ? "MRI" : "SCAN";

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${prefix}-Report-${attemptId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
