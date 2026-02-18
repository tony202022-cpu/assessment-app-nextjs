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

// ✅ IMPROVED: More reliable assessment type detection
function getPdfType(assessmentId: string | null): "mri" | "scan" {
  const id = String(assessmentId || "").toLowerCase();
  
  // Exact matches first
  if (id === "outdoor_sales_mri") return "mri";
  if (id === "outdoor_sales_scan") return "scan";
  
  // Fallback pattern matching
  if (id.includes("mri")) return "mri";
  return "scan"; // Default to scan
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const attemptId = (searchParams.get("attemptId") || "").trim();
  const lang = (searchParams.get("lang") || "en").trim();

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  let browser = null;

  try {
    // 1. Get assessment type from database
    const supabase = getSupabaseAdmin();
    const { data: attempt, error: attErr } = await supabase
      .from("quiz_attempts")
      .select("assessment_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (attErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // 2. Determine PDF type
    const pdfType = getPdfType(attempt.assessment_id);
    
    // 3. Build the EXACT route URL
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = req.headers.get("host");
    
    // 🚨 KEY FIX: Force specific routing
    const reportUrl = `${protocol}://${host}/reports/pdf/${pdfType}/${attemptId}?lang=${encodeURIComponent(lang)}`;
    
    console.log(`🎯 PDF Type: ${pdfType} | Generating from: ${reportUrl}`);

    // 4. Launch browser (with local development support)
    const isLocal = process.env.NODE_ENV === "development";
    
    let executablePath;
    if (isLocal) {
      // For local testing (optional - you can skip this and just test on Vercel)
      executablePath = process.env.LOCAL_CHROME_PATH || 
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      // Production (Vercel)
      executablePath = await chromium.executablePath();
    }

    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox'] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: isLocal ? true : chromium.headless,
    });

    const page = await browser.newPage();

    // 5. Navigate and generate
    await page.goto(reportUrl, { 
      waitUntil: "networkidle0",
      timeout: 30000
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    const filename = `${pdfType.toUpperCase()}-Report-${attemptId.slice(0, 8)}.pdf`;

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("❌ PDF Generation Error:", error);
    return NextResponse.json({ 
      error: `PDF generation failed: ${error.message}`,
      attemptId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
