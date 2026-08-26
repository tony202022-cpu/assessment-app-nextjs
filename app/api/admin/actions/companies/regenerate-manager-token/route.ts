import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";
import { actionFailure } from "@/modules/admin-actions/action-result";
import { createAdminActionService } from "@/modules/admin-actions/production-admin-actions";

export const dynamic = "force-dynamic";
const ACTION_ID = "companies.manager-token.regenerate";

function responseStatus(code: string) {
  if (code === "ACTION_FORBIDDEN") return 403;
  if (code === "COMPANY_NOT_FOUND") return 404;
  if (code === "ACTION_CONFLICT") return 409;
  if (["INPUT_INVALID", "DRY_RUN_FAILED", "CONFIRMATION_INVALID", "CONFIRMATION_REQUIRED"].includes(code)) return 400;
  return 500;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const now = new Date();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Invalid request origin.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 403 });
  }
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Administrator authentication is required.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 401 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = consumeRateLimit(`admin-action:${ACTION_ID}:${ipAddress}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(actionFailure({ code: "ACTION_CONFLICT", message: "Too many token regeneration attempts. Try again later.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {}

  const input = { companyId: String(body.companyId || "").trim(), reason: String(body.reason || "").trim() };
  const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "").split(",").map((item) => item.trim()).filter(Boolean);
  const context = {
    requestId,
    actor: { id: String(process.env.ADMIN_ACTION_ACTOR_ID || "unidentified-admin-session"), role: "admin" as const, capabilities },
    resource: { type: "company", id: input.companyId, companyId: input.companyId },
    now,
    ipAddress,
    userAgent: request.headers.get("user-agent") || undefined,
    correlationId: request.headers.get("x-correlation-id") || undefined,
  };
  const service = createAdminActionService();
  const result = body.mode === "preview"
    ? await service.prepare(ACTION_ID, input, context)
    : await service.execute({ actionId: ACTION_ID, input, confirmation: { acknowledged: true, reason: input.reason }, context });

  return NextResponse.json(result, { status: result.ok ? 200 : responseStatus(result.error.code), headers: { "Cache-Control": "no-store" } });
}
