// app/api/generate-pdf/route.ts

import path from "path";
import { createRequire } from "module";
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

      const chromiumModule: any = await import("@sparticuz/chromium-min");
      const chromium: any = chromiumModule.default ?? chromiumModule;

      const executablePath = await chromium.executablePath();

      // Keep options minimal + compatible; cast only here to avoid TS drift.
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      } as any);
    } else {
      const puppeteer = (await import("puppeteer")).default;

      // ✅ Use boolean headless for maximum compatibility with older typings
      browser = await puppeteer.launch({ headless: true } as any);
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

    const body = new Uint8Array(pdfBuffer);
return new Response(body, {

      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="report_${attemptId}_${lang}.pdf"`,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    const message =
      typeof err?.message === "string" ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: "PDF_GENERATION_FAILED", message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
