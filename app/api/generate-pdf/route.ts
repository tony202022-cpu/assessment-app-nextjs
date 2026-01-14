import { NextResponse } from "next/server";

function safeFilename(name: string) {
  return String(name).replace(/[^\w\-\.]+/g, "_");
}

export const runtime = "nodejs"; // IMPORTANT: puppeteer needs Node runtime (not Edge)
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const attemptId = (searchParams.get("attemptId") || "").toString();
  const lang = (searchParams.get("lang") || "en").toString();
  const debug = (searchParams.get("debug") || "") === "1";

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  // ✅ Works without FRONTEND_URL:
  // - local: uses http://localhost:3000
  // - vercel: uses your deployed domain
  const origin = new URL(req.url).origin;

   const printUrl =
  `${origin}/reports/pdf/${encodeURIComponent(attemptId)}` +
  `?lang=${encodeURIComponent(lang)}` +
  `&puppeteer=1`;

  let browser: any;

  try {
// ✅ Serverless only when actually running on Vercel/AWS
// ✅ Windows local must NEVER use @sparticuz/chromium (it causes ENOENT)
const isServerless =
  process.platform !== "win32" &&
  (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION);


    let puppeteer: any;
    let launchArgs: string[] = [];
    let executablePath: string | undefined;
    let headless: any = "new";

    if (isServerless) {
      // ✅ Vercel / Serverless path
      const chromiumMod: any = await import("@sparticuz/chromium");
      const puppeteerCore: any = await import("puppeteer-core");

      puppeteer = puppeteerCore;
      executablePath = await chromiumMod.default.executablePath();
      launchArgs = [...chromiumMod.default.args, "--no-sandbox", "--disable-setuid-sandbox"];
      headless = chromiumMod.default.headless;
    } else {
      // ✅ Local (Windows/Mac/Linux dev): use full puppeteer (bundled Chrome)
      const puppeteerFull: any = await import("puppeteer");
      puppeteer = puppeteerFull;
      executablePath = puppeteerFull.executablePath(); // points to downloaded Chrome
      launchArgs = [];
      headless = "new";
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

// Load print page
await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 120000 });

// ✅ Wait until React finishes rendering the PDF content
await page.waitForSelector('[data-pdf-ready="1"]', { timeout: 120000 });


    // Ensure fonts loaded (important for Arabic)
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    });

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
