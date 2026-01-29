import { NextRequest } from "next/server";

// For Vercel (serverless)
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

// For local dev (Windows/Mac/Linux) - includes its own Chromium
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const attemptId = params.attemptId;
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";

  // Use deployed URL on Vercel, localhost otherwise
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const htmlUrl = `${host}/reports/pdf/${encodeURIComponent(
    attemptId
  )}?lang=${encodeURIComponent(lang)}`;

  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL;

  const browser = isVercel
    ? await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

  try {
    const page = await browser.newPage();
    await page.setCacheEnabled(true);
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

    await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await page.close();

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report-${attemptId}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
