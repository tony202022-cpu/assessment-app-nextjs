// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;


/**
 * This route MUST NOT run puppeteer.
 * It only proxies to dyad-pdf-service which does the real PDF rendering.
 *
 * Required env var (recommended):
 *   PDF_SERVICE_URL=http://127.0.0.1:3001   (local)
 *   PDF_SERVICE_URL=https://<your-dyad-pdf-service>.vercel.app (production)
 *
 * Example:
 *   /api/generate-pdf?attemptId=...&lang=ar
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const attemptId = searchParams.get("attemptId")?.trim();
  const lang = (searchParams.get("lang")?.trim() || "ar") as "en" | "ar";

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId parameter" },
      { status: 400 }
    );
  }

  // IMPORTANT:
  // - Local: http://127.0.0.1:3001
  // - Prod : https://dyad-pdf-service-....vercel.app
  const PDF_SERVICE_URL =
    process.env.PDF_SERVICE_URL?.trim() || "http://127.0.0.1:3001";

  const serviceUrl =
    `${PDF_SERVICE_URL}/api/generate-pdf?attemptId=${encodeURIComponent(
      attemptId
    )}&lang=${encodeURIComponent(lang)}`;

  try {
    const r = await fetch(serviceUrl, {
      // prevent Next cache
      cache: "no-store",
      headers: {
        // helps avoid intermediary caches
        "Cache-Control": "no-store",
      },
    });

    const contentType = r.headers.get("content-type") || "";

    // If dyad-pdf-service failed, return its error (JSON/text) clearly
    if (!r.ok) {
      let details: any = null;

      try {
        details = contentType.includes("application/json")
          ? await r.json()
          : await r.text();
      } catch {
        details = "Failed to read error body from PDF service.";
      }

      return NextResponse.json(
        {
          error: "PDF service error",
          status: r.status,
          serviceUrl,
          details,
        },
        { status: 500 }
      );
    }

    // Stream PDF back
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
        hint:
          "Make sure dyad-pdf-service is running locally on 127.0.0.1:3001 OR set PDF_SERVICE_URL to the deployed Vercel URL.",
      },
      { status: 500 }
    );
  }
}
