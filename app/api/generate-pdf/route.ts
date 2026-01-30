// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This route MUST NOT run puppeteer.
 * It MUST NOT proxy/stream the PDF through Vercel (Hobby plan can abort long requests).
 *
 * Instead: redirect the browser to dyad-pdf-service (Cloud Run),
 * so the PDF downloads directly from Cloud Run.
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

  const envUrl = process.env.PDF_SERVICE_URL?.trim();

  // IMPORTANT:
  // - In production, never fall back to localhost.
  // - In dev, localhost fallback is okay.
  const PDF_SERVICE_URL =
    envUrl ||
    (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:3001");

  if (!PDF_SERVICE_URL) {
    return NextResponse.json(
      {
        error: "Missing PDF_SERVICE_URL",
        hint:
          'Set PDF_SERVICE_URL in Vercel to your Cloud Run URL, e.g. "https://dyad-pdf-service-63239706514.australia-southeast1.run.app".',
      },
      { status: 500 }
    );
  }

  const target =
    `${PDF_SERVICE_URL}/api/generate-pdf?attemptId=${encodeURIComponent(
      attemptId
    )}&lang=${encodeURIComponent(lang)}`;

  return NextResponse.redirect(target, 302);
}
