import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBrowser() {
  if (process.env.NODE_ENV === "development") {
    // Local development - Windows Chrome path
    return await puppeteer.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  } else {
    // Production (Vercel) - use Sparticuz Chromium
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
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
    // Build the URL to your results page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   "http://localhost:3000");
    
    const reportUrl = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;

    console.log("📄 Generating PDF for:", reportUrl);

    // Launch browser
    browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport and navigate
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log("🌐 Loading page...");
    await page.goto(reportUrl, { 
      waitUntil: "networkidle0", 
      timeout: 60000 
    });
    
    // Wait for content to fully load
    console.log("⏳ Waiting for content...");
    await page.waitForTimeout(3000);

    // Generate PDF
    console.log("📝 Creating PDF...");
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

    console.log("✅ PDF generated successfully!");

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
