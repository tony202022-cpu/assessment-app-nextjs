import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBrowser() {
  if (process.env.NODE_ENV === "development") {
    // Local development - adjust Chrome path if needed
    const executablePath = process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome";

    return await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  } else {
    // Production (Vercel) - use Sparticuz Chromium
    console.log("🔧 Launching Chromium on Vercel...");
    
    const executablePath = await chromium.executablePath();
    console.log("📍 Chromium path:", executablePath);
    
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const attemptId = searchParams.get("attemptId");
  const lang = searchParams.get("lang") || "en";

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId parameter" },
      { status: 400 }
    );
  }

  let browser;
  
  try {
    console.log("🚀 Starting PDF generation for attemptId:", attemptId);
    
    // Build the URL to your results page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   "http://localhost:3000");
    
    const reportUrl = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;
    console.log("📄 Target URL:", reportUrl);

    // Launch browser
    browser = await getBrowser();
    console.log("✅ Browser launched successfully");
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Navigate to the page
    console.log("🔄 Loading page...");
    await page.goto(reportUrl, { 
      waitUntil: "networkidle0", 
      timeout: 60000 
    });
    
    // Wait for dynamic content (React components, charts)
    console.log("⏳ Waiting for content to render...");
    await page.waitForTimeout(3000);

    // Generate PDF
    console.log("📝 Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    console.log("✅ PDF generated successfully! Size:", pdfBuffer.length, "bytes");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-assessment-${attemptId}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    
    return NextResponse.json(
      {
        error: "PDF generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
        attemptId,
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL ? "vercel" : "local",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed");
    }
  }
}
