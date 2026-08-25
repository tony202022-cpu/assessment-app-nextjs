import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { actionFailure } from "@/modules/admin-actions/action-result";
import { createAdminActionService } from "@/modules/admin-actions/production-admin-actions";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

function responseStatus(code: string) {
  if (code === "ACTION_FORBIDDEN") return 403;
  if (code === "COMPANY_NOT_FOUND") return 404;
  if (code === "CREDITS_AT_MAXIMUM" || code === "ACTION_CONFLICT") return 409;
  if (["INPUT_INVALID", "INVALID_CREDIT_BALANCE", "CONFIRMATION_INVALID", "CONFIRMATION_REQUIRED"].includes(code)) return 400;
  return 500;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const now = new Date();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Invalid request origin.", requestId, actionId: "credits.restore", failedAt: now.toISOString() }), { status: 403 });
  }
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Administrator authentication is required.", requestId, actionId: "credits.restore", failedAt: now.toISOString() }), { status: 401 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = consumeRateLimit(`admin-action:credits.restore:${ipAddress}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(actionFailure({ code: "ACTION_CONFLICT", message: "Too many restore attempts. Try again later.", requestId, actionId: "credits.restore", failedAt: now.toISOString() }), { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    body = {};
  }
  const companyId = String(body.companyId || "").trim();
  const reason = String(body.reason || "").trim();
  const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "")
    .split(",")
    .map((capability) => capability.trim())
    .filter(Boolean);
  const service = createAdminActionService();
  const result = await service.execute({
    actionId: "credits.restore",
    input: { companyId, reason },
    confirmation: { acknowledged: true, phrase: "Restore Credit", reason },
    context: {
      requestId,
      actor: {
        id: String(process.env.ADMIN_ACTION_ACTOR_ID || "unidentified-admin-session"),
        role: "admin",
        capabilities,
      },
      resource: { type: "company", id: companyId, companyId },
      now,
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    },
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : responseStatus(result.error.code),
    headers: { "Cache-Control": "no-store" },
  });
}
