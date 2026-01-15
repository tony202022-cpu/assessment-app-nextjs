// app/api/generate-pdf/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // puppeteer must run on Node, not Edge
export const dynamic = "force-dynamic";
export const maxDuration = 60; // give puppeteer enough time on Vercel

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

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  // ✅ Same-origin always:
  // - local: http://localhost:3000
  // - vercel: https://<deployment-domain>
  const origin = new URL(req.url).origin;

  // ✅ Render the HTML report route, then print it
  const printUrl =
    `${origin}/reports/pdf/${encodeURIComponent(attemptId)}` +
    `?lang=${encodeURIComponent(lang)}` +
    `&puppeteer=1`;

  let browser: any;

  try {
    // ✅ Serverless detection: use @sparticuz/chromium only on Vercel/AWS (never on Windows local)
    const isServerless =
      process.platform !== "win32" &&
      (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION);

    let puppeteer: any;
    let launchArgs: string[] = [];
    let executablePath: string | undefined;
    let headless: any = "new";
    let defaultViewport: any = undefined;

    if (isServerless) {
      // ✅ Vercel / Serverless path (chromium provided by @sparticuz/chromium)
      const chromiumMod: any = await import("@sparticuz/chromium");
      const puppeteerCore: any = await import("puppeteer-core");

      const chromium = chromiumMod.default;

      puppeteer = puppeteerCore;
      executablePath = await chromium.executablePath(); // ✅ fixes your Vercel error
      launchArgs = chromium.args; // already includes required flags
      headless = chromium.headless;
      defaultViewport = chromium.defaultViewport;
    } else {
      // ✅ Local dev: use full puppeteer (bundled Chrome)
      const puppeteerFull: any = await import("puppeteer");
      puppeteer = puppeteerFull;
      executablePath = puppeteerFull.executablePath();
      launchArgs = [];
      headless = "new";
      defaultViewport = undefined;
    }

    browser = await puppeteer.launch({
      args: launchArgs,
      executablePath,
      headless,
      defaultViewport,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
    );

    // Load print page
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 120_000 });

    // Wait until the report page says it's fully rendered
    await page.waitForSelector('[data-pdf-ready="1"]', { timeout: 120_000 });

    // Ensure fonts loaded (important for Arabic)
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    });

    // Small buffer for layout stabilization
    await new Promise((r) => setTimeout(r, 150));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    if (buf.length < 5 || buf.slice(0, 5).toString() !== "%PDF-") {
      throw new Error("Output missing %PDF- header (not a valid PDF)");
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
        `Failed to generate PDF:\n${err?.stack ? err.stack : String(err)}`,
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
