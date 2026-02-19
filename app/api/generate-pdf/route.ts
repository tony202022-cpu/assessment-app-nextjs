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
    console.log("🚀 [PDF] Starting generation for attemptId:", attemptId);
    console.log("🌍 [PDF] Environment:", process.env.VERCEL ? "Vercel Production" : "Local Development");

    let launchOptions: any;

    if (process.env.VERCEL) {
      // VERCEL PRODUCTION - Use @sparticuz/chromium exactly as designed
      console.log("☁️ [PDF] Configuring for Vercel");
      
      const executablePath = await chromium.executablePath();
      console.log("📍 [PDF] Chromium path:", executablePath);
      console.log("🔧 [PDF] Using chromium args:", chromium.args.slice(0, 5).join(' ') + '...');

      // CRITICAL: Use chromium configuration exactly as provided
      // Do NOT modify or add custom args - they include --single-process and other essential flags
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      };
      
    } else {
      // LOCAL DEVELOPMENT
      console.log("🏠 [PDF] Local development mode");
      launchOptions = {
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };
    }

    // Launch browser
    console.log("🌐 [PDF] Launching browser...");
    browser = await puppeteer.launch(launchOptions);
    console.log("✅ [PDF] Browser launched successfully");

    const page = await browser.newPage();

    // Build URL using proper host detection
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host");
    const baseUrl = process.env.VERCEL 
      ? `${protocol}://${host}`
      : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    
    const reportUrl = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;
    console.log("📄 [PDF] Loading:", reportUrl);

    // Set viewport and navigate
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log("⏳ [PDF] Navigating to results page...");
    await page.goto(reportUrl, { 
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 45000 
    });
    
    console.log("⏳ [PDF] Page loaded, waiting for content to render...");

    // Wait for critical elements to load
    await Promise.all([
      page.waitForSelector('canvas, svg, [class*="chart"]', { timeout: 8000 }).catch(() => {
        console.log("⚠️ [PDF] No charts detected, continuing...");
        return null;
      }),
      page.waitForSelector('main, [role="main"], [class*="result"]', { timeout: 8000 }).catch(() => {
        console.log("⚠️ [PDF] No main content container found, continuing...");
        return null;
      }),
    ]);

    // Wait for dynamic content including MRI section
    console.log("⏳ [PDF] Waiting for MRI section and dynamic content...");
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Scroll to bottom to trigger lazy-loaded content
        window.scrollTo(0, document.body.scrollHeight);
        
        // Wait for animations and dynamic rendering
        setTimeout(() => {
          // Scroll back to top for PDF generation
          window.scrollTo(0, 0);
          resolve();
        }, 3000);
      });
    });

    console.log("📊 [PDF] Content ready, generating PDF...");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { 
        top: "20px", 
        right: "20px", 
        bottom: "20px", 
        left: "20px" 
      },
      preferCSSPageSize: false,
    });

    console.log(`✅ [PDF] Generated successfully: ${pdfBuffer.length} bytes`);

    await browser.close();
    browser = null;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-assessment-${attemptId}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });

  } catch (error: any) {
    console.error("❌ [PDF] Generation failed:", error.message);
    console.error("❌ [PDF] Stack trace:", error.stack);
    
    return NextResponse.json({
      error: "PDF generation failed",
      details: error.message,
      attemptId,
      timestamp: new Date().toISOString(),
    }, { status: 500 });

  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("🔒 [PDF] Browser closed");
      } catch (closeError) {
        console.error("⚠️ [PDF] Error closing browser:", closeError);
      }
    }
  }
}
