// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isVercel = () => {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV;
};

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;

  const attemptId = searchParams.get("attemptId")?.trim();
  const lang = (searchParams.get("lang")?.trim() || "en") as "en" | "ar";
  const debug = searchParams.get("debug") === "1";

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId parameter" },
      { status: 400 }
    );
  }

  const reportUrl = `${origin}/reports/pdf/${encodeURIComponent(attemptId)}?lang=${encodeURIComponent(lang)}`;

  const debugInfo: any = {
    environment: isVercel() ? "vercel" : "local",
    reportUrl,
    attemptId,
    lang,
    timestamp: new Date().toISOString(),
  };

  let browser: any = null;

  try {
    if (isVercel()) {
      // ✅ Vercel/Production: Use puppeteer-core + chromium
      const puppeteerCore = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium");

      // Get chromium executable
      const executablePath = await chromium.default.executablePath();

      debugInfo.executablePath = executablePath;
      debugInfo.chromiumVersion = chromium.default.headless;

      browser = await puppeteerCore.default.launch({
        args: [
          ...chromium.default.args,
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-software-rasterizer",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--single-process",
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        headless: chromium.default.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      // ✅ Local: Use full puppeteer
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    // Navigate to the HTML report
    await page.goto(reportUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 60000,
    });

    // Wait for content to be ready
    await page.waitForSelector('[data-pdf-ready="1"]', { timeout: 10000 });

    // Small delay for fonts/images
    await page.waitForTimeout(1000);

    if (debug) {
      const title = await page.title();
      const content = await page.content();
      debugInfo.pageTitle = title;
      debugInfo.contentLength = content.length;

      await browser.close();

      return NextResponse.json(
        { success: true, debug: debugInfo },
        { status: 200 }
      );
    }

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await browser.close();

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report_${attemptId}_${lang}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    const errorMessage = error?.message || "Unknown error";
    const errorDetails = {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    };

    console.error("PDF Generation Error:", errorDetails);

    if (debug) {
      return NextResponse.json(
        {
          error: "PDF generation failed",
          details: errorDetails,
          debug: debugInfo,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "PDF generation failed",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}