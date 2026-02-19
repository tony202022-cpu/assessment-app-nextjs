import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium'; // CORRECT IMPORT
import puppeteer from 'puppeteer-core';
import path from 'path';

// CRITICAL: Force Node.js runtime (not Edge) for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attemptId, lang = 'en' } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Missing attemptId' }, 
        { status: 400 }
      );
    }

    // Launch browser with Vercel-optimized settings
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--hide-scrollbars',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process', // REQUIRED FOR VERCEL
        '--no-zygote',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
      executablePath: await chromium.executablePath(
        process.env.VERCEL_URL 
          ? 'https://' + process.env.VERCEL_URL 
          : 'http://localhost:3000'
      ),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      // FIX FOR LIBNSS3.SO ERROR:
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${path.dirname(await chromium.executablePath())}:${process.env.LD_LIBRARY_PATH || ''}`
      }
    });

    const page = await browser.newPage();
    
    try {
      // Construct URL properly
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const url = `${baseUrl}/scan/results?attemptId=${attemptId}&lang=${lang}`;
      
      console.log(`Generating PDF for: ${url}`);
      
      // Navigate with extended timeout
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: 60000 
      });

      // Wait for page to be fully rendered
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 15000 });

      // Wait for your MRI upsell section (FIND THE ACTUAL SELECTOR)
      // INSPECT YOUR PAGE TO FIND THE CORRECT SELECTOR FOR MRI SECTION
      await page.waitForSelector('[data-section="mri-upsell"], .mri-upsell, #mri-upsell', { 
        timeout: 10000 
      }).catch(() => {
        console.log('MRI section selector not found, continuing...');
      });

      // Generate PDF with optimal settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { 
          top: '20px', 
          right: '20px', 
          bottom: '40px', 
          left: '20px' 
        },
        preferCSSPageSize: true,
        scale: 0.85,
        displayHeaderFooter: false,
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="assessment-${attemptId}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });

    } catch (error) {
      await browser.close().catch(() => {});
      throw error;
    }

  } catch (error) {
    console.error('PDF Generation Error:', error);
    
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        // ADD DEBUGGING INFO:
        vercelUrl: process.env.VERCEL_URL,
        chromiumPath: await chromium.executablePath().catch(() => 'unknown'),
        libPath: `${path.dirname(await chromium.executablePath())}`
      },
      { status: 500 }
    );
  }
}