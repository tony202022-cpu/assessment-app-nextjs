// app/api/generate-pdf/route.ts
import { NextRequest } from "next/server";
import path from "path";
import { createRequire } from "module";
import fs from "fs";

export const runtime = "nodejs";

function isVercel() {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;

  const attemptId = (searchParams.get("attemptId") || "").trim();
  const lang = (searchParams.get("lang") || "en").trim() as "en" | "ar";
  const debug = searchParams.get("debug") === "1";

  if (!attemptId) {
    return new Response(JSON.stringify({ error: "Missing attemptId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const reportUrl = `${origin}/reports/pdf/${encodeURIComponent(
    attemptId
  )}?lang=${encodeURIComponent(lang)}`;

  const dbg: any = {
    vercel: isVercel(),
    origin,
    reportUrl,
    attemptId,
    lang,
    now: new Date().toISOString(),
    region: process.env.VERCEL_REGION,
  };

  let browser: any = null;
  let page: any = null;

  try {
    if (isVercel()) {
      const puppeteer = (await import("puppeteer-core")).default;

      const chromiumModule: any = await import("@sparticuz/chromium-min");
      const chromium: any = chromiumModule.default ?? chromiumModule;

      const require = createRequire(import.meta.url);
// Resolve the actual module entry (this exists in the serverless bundle)
const chromiumEntry = require.resolve("@sparticuz/chromium-min");

// Entry is usually .../chromium-min/build/(cjs|esm)/index.js
// So package root is two levels up from build/*
const chromiumPkgRoot = path.resolve(path.dirname(chromiumEntry), "..", "..");
const brotliDir = path.join(chromiumPkgRoot, "bin");


      dbg.chromiumPkgRoot = chromiumPkgRoot;
      dbg.brotliDir = brotliDir;
      dbg.brotliDirExists = fs.existsSync(brotliDir);

      const executablePath = await chromium.executablePath(brotliDir);

      dbg.executablePath = executablePath;
      dbg.executablePathExists = executablePath
        ? fs.existsSync(executablePath)
        : false;

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      } as any);
    } else {
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({ headless: true } as any);
    }

    page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.emulateMediaType("screen");

    await page.goto(reportUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 120_000,
    });

    await page.waitForTimeout(500);

    if (debug) {
      const title = await page.title().catch(() => "");
      const html = await page.content().catch(() => "");
      dbg.pageTitle = title;
      dbg.htmlLength = html.length;

      await page.close();
      await browser.close();

      return new Response(JSON.stringify({ ok: true, debug: dbg }, null, 2), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

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
    try {
      if (page) await page.close();
    } catch {}
    try {
      if (browser) await browser.close();
    } catch {}

    const message =
      typeof err?.message === "string" ? err.message : "Unknown error";

    const details = {
      name: err?.name,
      message,
      stack: typeof err?.stack === "string" ? err.stack : undefined,
      cause: err?.cause,
    };

    if (debug) {
      return new Response(
        JSON.stringify({ error: "PDF_GENERATION_FAILED", details, debug: dbg }, null, 2),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "PDF_GENERATION_FAILED", message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
