import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

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

    let launchOptions: any;

    if (process.env.VERCEL) {
      console.log("☁️ [PDF] Vercel Environment - Using chromium-min with includeFiles");
      
      const executablePath = await chromium.executablePath();
      console.log("📍 [PDF] Executable Path:", executablePath);

      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      console.log("🏠 [PDF] Local Development");
      launchOptions = {
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };
    }

    console.log("🌐 [PDF] Launching browser...");
    browser = await puppeteer.launch(launchOptions);
    console.log("✅ [PDF] Browser launched successfully");

    const page = await browser.newPage();

    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host");
    const baseUrl = process.env.VERCEL 
      ? `${protocol}://${host}`
      : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    
    const reportUrl = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;
    console.log("📄 [PDF] Loading:", reportUrl);

    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto(reportUrl, { 
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 45000 
    });

    console.log("⏳ [PDF] Waiting for content and MRI section...");
    
    // Wait for main content
    await page.waitForSelector('main, [role="main"], [class*="result"]', { 
      timeout: 10000 
    }).catch(() => console.log("⚠️ Main content not found"));
    
    // Wait for dynamic content including MRI section
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        window.scrollTo(0, document.body.scrollHeight);
        setTimeout(() => {
          window.scrollTo(0, 0);
          resolve();
        }, 3000);
      });
    });

    console.log("📊 [PDF] Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    console.log(`✅ [PDF] Success! Generated ${pdfBuffer.length} bytes`);

    await browser.close();
    browser = null;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="assessment-${attemptId}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });

  } catch (error: any) {
    console.error("❌ [PDF] Generation failed:", error.message);
    console.error("❌ [PDF] Full error:", error);
    
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
      } catch (closeError) {
        console.error("⚠️ [PDF] Error closing browser:", closeError);
      }
    }
  }
}
