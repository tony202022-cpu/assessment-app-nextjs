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

  // Your existing stable report route (do NOT change)
  const reportUrl = `${origin}/reports/pdf/${encodeURIComponent(
    attemptId
  )}?lang=${encodeURIComponent(lang)}`;

  let browser: any = null;
  let page: any = null;

  // Debug snapshot we can return if something fails (ONLY when debug=1)
  const dbg: any = {
    vercel: isVercel(),
    origin,
    reportUrl,
    attemptId,
    lang,
    nodeEnv: process.env.NODE_ENV,
    hasVercelEnv: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION,
    now: new Date().toISOString(),
  };

  try {
    if (isVercel()) {
      const puppeteer = (await import("puppeteer-core")).default;

      const chromiumModule: any = await import("@sparticuz/chromium-min");
      const chromium: any = chromiumModule.default ?? chromiumModule;

      // Resolve actual package root (works on pnpm + Vercel)
      const require = createRequire(import.meta.url);
      const chromiumPkgRoot = path.dirname(
        require.resolve("@sparticuz/chromium-min/package.json")
      );

      const brotliDir = path.join(chromiumPkgRoot, "bin");

      dbg.chromiumPkgRoot = chromiumPkgRoot;
      dbg.brotliDir = brotliDir;
      dbg.brotliDirExists = fs.existsSync(brotliDir);

      // IMPORTANT: pass brotli dir explicitly to chromium-min
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

      // Use boolean headless for maximum TS compatibility
      browser = await puppeteer.launch({ headless: true } as any);
    }

    page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.emulateMediaType("screen");

    // Helpful in debug to confirm the page actually loads
    page.on("console", (msg: any) => {
      // Keep a small tail of logs
      dbg.pageConsole = dbg.pageConsole || [];
      if (dbg.pageConsole.length < 50) {
        dbg.pageConsole.push({
          type: msg.type?.() ?? "log",
          text: msg.text?.() ?? "",
        });
      }
    });

    // Navigate to your HTML report page
    await page.goto(reportUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 120_000,
    });

    // Tiny buffer for fonts/layout/client rendering
    await page.waitForTimeout(500);

    // If debug=1, don’t generate PDF; return diagnostics that prove page loaded
    if (debug) {
      const title = await page.title().catch(() => "");
      const htmlLength = await page
        .content()
        .then((h: string) => h.length)
        .catch(() => 0);

      dbg.pageTitle = title;
      dbg.htmlLength = htmlLength;

      // Attempt to detect common “error page” signals
      dbg.containsNextErrorOverlay = false;
      try {
        const bodyText = await page.evaluate(() => document.body?.innerText || "");
        dbg.bodyTextSample = bodyText.slice(0, 800);
        dbg.containsNextErrorOverlay =
          bodyText.includes("Application error") ||
          bodyText.includes("This page could not be found") ||
          bodyText.includes("Error:") ||
          bodyText.includes("500");
      } catch {
        // ignore
      }

      await page.close();
      await browser.close();

      return new Response(JSON.stringify({ ok: true, debug: dbg }, null, 2), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Generate PDF
    const pdfBuffer: Buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    await page.close();
    await browser.close();

    // Response in Next expects web-friendly bytes in some TS setups
    co
