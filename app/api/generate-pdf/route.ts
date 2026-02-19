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

    // Configure browser launch options
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
      // VERCEL PRODUCTION - Use @sparticuz/chromium
      console.log("☁️ [PDF] Configuring for Vercel");
      
      const executablePath = await chromium.executablePath();
      console.log("📍 [PDF] Chromium path:", executablePath);
      
      // Enhanced check for problematic cached paths
      const problematicPaths = [
        "/app/api/bin",
        "/var/task/.next/server/app/api/bin", 
        ".next/server/app/api/bin"
      ];
      
      const hasProblematicPath = problematicPaths.some(path => 
        executablePath.includes(path)
      );
      
      if (hasProblematicPath) {
        console.error("🚨 [PDF] CACHE CONTAMINATION DETECTED!");
        console.error("🚨 [PDF] Found problematic path:", executablePath);
        throw new Error(
          `Cache issue detected: Got ${executablePath} but expected /tmp/chromium. ` +
          `Vercel is still using chrome-aws-lambda artifacts. Force rebuild without cache.`
        );
      }

      // Use @sparticuz/chromium configuration
      launchOptions.executablePath = executablePath;
      launchOptions.args = [...chromium.args, ...launchOptions.args];
      launchOptions.defaultViewport = chromium.defaultViewport;
      
    } else {
      // LOCAL DEVELOPMENT
      console.log("🏠 [PDF] Local development mode");
      launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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

    // Set viewport and load page
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(reportUrl, { 
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 45000 
    });
    
    console.log("⏳ [PDF] Page loaded, waiting for content...");

    // Wait for content to render (FIXED: No more waitForTimeout)
    await Promise.all([
      // Wait for any charts or visualizations
      page.waitForSelector('canvas, svg', { timeout: 5000 }).catch(() => null),
      // Wait for main content
      page.waitForSelector('[class*="result"], [class*="assessment"]', { timeout: 5000 }).catch(() => null),
    ]);

    // Additional wait for MRI section and animations (PROPER WAY)
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Scroll to trigger lazy-loaded content
        window.scrollTo(0, document.body.scrollHeight);
        // Wait for animations and dynamic content
        setTimeout(resolve, 3000);
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
      cacheIssue: error.message.includes("cache") || error.message.includes("chrome-aws-lambda"),
    }, { status: 500 });

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("⚠️ [PDF] Error closing browser:", closeError);
      }
    }
  }
}
