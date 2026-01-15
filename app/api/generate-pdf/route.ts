// app/api/generate-pdf/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // IMPORTANT: Puppeteer must run on Node runtime

function isVercel() {
  // Vercel sets multiple env vars; this is the most common
  return !!process.env.VERCEL;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = req.nextUrl;

    const attemptId = (searchParams.get("attemptId") || "").trim();
    const lang = (searchParams.get("lang") || "en").trim() as "en" | "ar";

    if (!attemptId) {
      return new Response(
        JSON.stringify({ error: "Missing attemptId" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Your existing stable HTML report page (do not change)
    const reportUrl = `${origin}/reports/pdf/${encodeURIComponent(
      attemptId
    )}?lang=${encodeURIComponent(lang)}`;

    // Dynamically import based on environment (prevents bundling chaos)
    let browser: any = null;

    if (isVercel()) {
      // Vercel: puppeteer-core + @sparticuz/chromium-min
      const [{ default: puppeteer }, chromium] = await Promise.all([
        import("puppeteer-core"),
        import("@sparticuz/chromium-min"),
      ]);

      const executablePath = await chromium.executablePath();

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      // Local (Windows/macOS/Linux): full puppeteer
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({
        headless: "new",
      });
    }

    const page = await browser.newPage();

    // Extra stability for fonts/layout
    await page.setCacheEnabled(false);
    await page.emulateMediaType("screen");

    // Load the existing HTML report
    await page.goto(reportUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 120_000,
    });

    // Give any client-side rendering a tiny buffer (safe, minimal)
    await page.waitForTimeout(500);

    const pdfBuffer: Buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await page.close();
    await browser.close();

    const filename = `report_${attemptId}_${lang}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    // Keep error payload small but useful
    const message =
      typeof err?.message === "string" ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: "PDF_GENERATION_FAILED",
        message,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
