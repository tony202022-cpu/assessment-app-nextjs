import { NextResponse } from "next/server";
import {
  createAdminSession,
  isValidAdminSession,
  OFFLINE_ADMIN_COOKIE,
  OFFLINE_ADMIN_SESSION_SECONDS,
  secretsMatch,
} from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${OFFLINE_ADMIN_COOKIE}=`))
    ?.slice(OFFLINE_ADMIN_COOKIE.length + 1);
  return NextResponse.json(
    { authenticated: isValidAdminSession(cookie ? decodeURIComponent(cookie) : undefined) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const rate = consumeRateLimit(`login:${clientKey(request)}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: { secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!secretsMatch(String(body.secret || ""))) {
    return NextResponse.json({ error: "Invalid admin secret." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(OFFLINE_ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: OFFLINE_ADMIN_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(OFFLINE_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
