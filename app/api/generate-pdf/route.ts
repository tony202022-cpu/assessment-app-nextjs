// app/api/generate-pdf/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // puppeteer must run on Node, not Edge
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeFilename(name: string) {
  return String(name).replace(/[^\w\-\.]+/g, "_");
}

function isTruthy(v: any) {
  return v === "1" || v === "true" || v === "yes";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const attemptId = (searchParams.get("attemptId") || "").toString().trim();
  const lang = (searchParams.get("lang") || "en").toString().trim();
  const debug = isTruthy(searchParams.get("debug") || "");

  if (debug) console.log("PDF_MARKER:", "chromium-min-active");

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  // Same-origin rendering
  const origin = new URL(req.url).origin;

  const printUrl =
    `${origin}/reports/pdf/${encodeURIComponent(attemptId)}` +
    `?lang=${encodeURIComponent(lang)}` +
    `&puppeteer=1`;

  let browser: any;

  try {
    const isServerless =
      !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

    let puppeteer: any;
    let executablePath: string | undefined;
    let launchArgs: string[] = [];
    let headless: any = "new";

    if (isServerless) {
      // ✅ Vercel / Serverless
     const chromiumModule = await import("@sparticuz/chromium-min");
const chromium = chromiumModule.default;
const puppeteerCore = await import("puppeteer-core");

puppeteer = puppeteerCore;
executablePath = await chromium.executablePath();
launchArgs = chromium.args;
headless = chromium.headless;

    } else {
      // ✅ Local dev (Windows / Mac)
      const puppeteerFull = await import("puppeteer");
      puppeteer = puppeteerFull;
      executablePath = puppeteerFull.executablePath();
    }

    browser = await puppeteer.launch({
      args: launchArgs,
      executablePath,
      headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
    );

    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 120_000,
    });

    await page.waitForSelector('[data-pdf-ready="1"]', {
      timeout: 120_000,
    });

    // Ensure fonts loaded (Arabic support)
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    });

    await new Promise((r) => setTimeout(r, 150));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    if (!buf.slice(0, 5).toString().startsWith("%PDF")) {
      throw new Error("Output is not a valid PDF");
    }

    const filename = safeFilename(`report_${attemptId}_${lang}.pdf`);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("generate-pdf error:", err);

    if (debug) {
      return new NextResponse(
        `Failed to generate PDF:\n${err?.stack || String(err)}`,
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    return new NextResponse("Failed to generate PDF", { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
