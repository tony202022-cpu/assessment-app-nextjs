// app/api/generate-pdf/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function isVercel() {
  return !!process.env.VERCEL;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = req.nextUrl;

    const attemptId = (searchParams.get("attemptId") || "").trim();
    const lang = (searchParams.get("lang") || "en").trim() as "en" | "ar";

    if (!attemptId) {
      return new Response(JSON.stringify({ error: "Missing attemptId" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const reportUrl = `${origin}/reports/pdf/${encodeURIComponent(
      attemptId
    )}?lang=${encodeURIComponent(lang)}`;

    let browser: any;

    if (isVercel()) {
      const puppeteer = (await import("puppeteer-core")).default;

      // ✅ IMPORTANT: grab default export if present (fixes TS + ESM shape)
      const chromiumModule: any = await import("@sparticuz/chromium-min");
      const chromium: any = chromiumModule.default ?? chromiumModule;

      const executablePath = await chromium.executablePath();

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });
    } else {
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({ headless: "new" });
    }

    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.emulateMediaType("screen");

    await page.goto(reportUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 120_000,
    });

    await page.waitForTimeout(500);

    const pdfBuffer: Buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    await page.close();
    await browser.close();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="report_${attemptId}_${lang}.pdf"`,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "PDF_GENERATION_FAILED", message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
