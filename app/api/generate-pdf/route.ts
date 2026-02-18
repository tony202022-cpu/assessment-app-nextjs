import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const attemptId = searchParams.get("attemptId");
  const lang = searchParams.get("lang") || "en";

  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  let browser = null;

  try {
    console.log("🚀 Starting PDF generation for:", attemptId);

    // Determine browser launch configuration
    let launchOptions: any = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--hide-scrollbars",
      ],
      headless: true,
    };

    if (process.env.VERCEL) {
      // VERCEL PRODUCTION - Let chromium package handle everything
      console.log("☁️ Running on Vercel");
      
      const executablePath = await chromium.executablePath();
      console.log("📍 Chromium path:", executablePath);
      
      // Verify we're not getting the old problematic path
      if (executablePath.includes("/app/api/bin")) {
        throw new Error("Detected old chrome-aws-lambda path. Cache cleanup needed.");
      }

      launchOptions.executablePath = executablePath;
      launchOptions.args = [...chromium.args, ...launchOptions.args];
      launchOptions.defaultViewport = chromium.defaultViewport;
    } else {
      // LOCAL DEVELOPMENT
      console.log("🏠 Running locally");
      launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    }

    // Launch browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Build URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   "http://localhost:3000");
    
    const reportUrl = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;
    console.log("📄 Loading:", reportUrl);

    // Load page and generate PDF
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 45000 });
    
    // Wait for React components and MRI sales section to render
    await page.waitForTimeout(3000);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    console.log("✅ PDF generated successfully:", pdfBuffer.length, "bytes");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-assessment-${attemptId}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });

  } catch (error: any) {
    console.error("❌ PDF generation failed:", error);
    return NextResponse.json({
      error: "PDF generation failed",
      details: error.message,
      attemptId,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
