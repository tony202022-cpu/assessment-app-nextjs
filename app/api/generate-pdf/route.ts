// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This route MUST NOT run puppeteer.
 * It only proxies to dyad-pdf-service which does the real PDF rendering.
 *
 * Local dev:
 *   PDF_SERVICE_URL=http://127.0.0.1:3001
 *
 * Production (later):
 *   PDF_SERVICE_URL=https://<your-pdf-service>
 */

export async function GET(req: NextRequest) {
  /**
   * HARD STOP ON VERCEL
   * -------------------
   * Vercel Hobby cannot run Puppeteer.
   * We intentionally disable PDF generation there.
   */
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error: "PDF generation disabled on Vercel",
        reason: "Puppeteer runs locally during development",
      },
      { status: 503 }
    );
  }

  const { searchParams } = req.nextUrl;

  const attemptId = searchParams.get("attemptId")?.trim();
  const lang = (searchParams.get("lang")?.trim() || "ar") as "en" | "ar";

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId parameter" },
      { status: 400 }
    );
  }

  const PDF_SERVICE_URL =
    process.env.PDF_SERVICE_URL?.trim() || "http://127.0.0.1:3001";

  const serviceUrl =
    `${PDF_SERVICE_URL}/api/generate-pdf?attemptId=${encodeURIComponent(
      attemptId
    )}&lang=${encodeURIComponent(lang)}`;

  try {
    const r = await fetch(serviceUrl, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        {
          error: "PDF service error",
          status: r.status,
          details: text,
        },
        { status: 500 }
      );
    }

    const pdfBuffer = await r.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report_${attemptId}_${lang}.pdf"`,
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to reach PDF service",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
