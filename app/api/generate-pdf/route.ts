// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFData, generatePDFHTML } from "@/src/lib/pdfTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isVercel = () => {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const attemptId = searchParams.get("attemptId")?.trim();
  const lang = (searchParams.get("lang")?.trim() || "en") as "en" | "ar";

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId parameter" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase env vars for PDF generation.");
    return NextResponse.json(
      { error: "Server configuration error: Supabase environment variables are not set." },
      { status: 500 }
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
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const userId = (attempt as any).user_id as string | null;
    let profile: any = null;
    if (userId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, company")
        .eq("id", userId)
        .maybeSingle();
      profile = p || null;
    }

    const fullName = profile?.full_name || (lang === "ar" ? "غير محدد" : "Not specified");

    const pdfData: PDFData = {
      name: fullName,
      language: lang,
      totalPercentage: attempt.total_percentage || 0,
      competencyResults: attempt.competency_results || [],
    };

    const htmlContent = generatePDFHTML(pdfData);

    let browser: any = null;

    try {
      if (isVercel()) {
        const chromium = await import("chrome-aws-lambda");
        const puppeteerCore = await import("puppeteer-core");

        browser = await puppeteerCore.default.launch({
          args: chromium.default.args,
          executablePath: await chromium.default.executablePath,
          headless: chromium.default.headless,
        });
      } else {
        const puppeteer = await import("puppeteer");
        browser = await puppeteer.default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="report_${attemptId}_${lang}.pdf"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    } catch (puppeteerError: any) {
      console.error("Puppeteer error:", puppeteerError);
      if (browser) await browser.close();
      return NextResponse.json(
        { error: "PDF generation failed", message: puppeteerError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("PDF generation route error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}