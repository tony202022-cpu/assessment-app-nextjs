import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";
import { actionFailure } from "@/modules/admin-actions/action-result";
import { createAdminActionService } from "@/modules/admin-actions/production-admin-actions";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseStatus(code: string) {
  if (code === "ACTION_FORBIDDEN") return 403;
  if (code === "COMPANY_NOT_FOUND") return 404;
  if (["ACTION_CONFLICT", "INSUFFICIENT_UNUSED_CREDITS", "CREDIT_LIMIT_EXCEEDED"].includes(code)) return 409;
  if (["INPUT_INVALID", "INVALID_CREDIT_BALANCE", "CONFIRMATION_INVALID", "CONFIRMATION_REQUIRED"].includes(code)) return 400;
  return 500;
}

export async function POST(request: NextRequest) {
  const now = new Date();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Invalid request origin.", requestId, actionId: "credits.adjust", failedAt: now.toISOString() }), { status: 403 });
  }
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Administrator authentication is required.", requestId, actionId: "credits.adjust", failedAt: now.toISOString() }), { status: 401 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = consumeRateLimit(`admin-action:credits.adjust:${ipAddress}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_CONFLICT", message: "Too many credit adjustment attempts. Try again later.", requestId, actionId: "credits.adjust", failedAt: now.toISOString() }), { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {}

  const adjustmentType = body.adjustmentType === "remove" ? "remove" : body.adjustmentType === "add" ? "add" : "";
  const actionId = adjustmentType ? `credits.${adjustmentType}` : "credits.adjust";
  const companyId = String(body.companyId || "").trim();
  const amount = Number(body.amount);
  const reason = String(body.reason || "").trim();
  const suppliedOperationId = String(body.operationId || "").trim();
  const requestId = UUID_PATTERN.test(suppliedOperationId) ? suppliedOperationId : randomUUID();
  if (!adjustmentType || !UUID_PATTERN.test(suppliedOperationId)) {
    return NextResponse.json(actionFailure({ code: "INPUT_INVALID", message: "The credit adjustment request is invalid.", requestId, actionId, failedAt: now.toISOString() }), { status: 400 });
  }

  const configuredActorId = String(process.env.ADMIN_ACTION_ACTOR_ID || "").trim();
  const actorId = configuredActorId || (process.env.NODE_ENV === "production" ? "" : "development-admin");
  if (!actorId) return NextResponse.json(actionFailure({ code: "ACTION_FAILED", message: "Administrative actor identity is not configured.", requestId, actionId, failedAt: now.toISOString() }), { status: 500 });
  const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "").split(",").map((item) => item.trim()).filter(Boolean);
  const service = createAdminActionService();
  const input = { companyId, amount, reason };
  const context = {
    requestId,
    actor: { id: actorId, role: "admin" as const, capabilities },
    resource: { type: "company", id: companyId, companyId },
    now, ipAddress,
    userAgent: request.headers.get("user-agent") || undefined,
    correlationId: request.headers.get("x-correlation-id") || undefined,
  };
  const title = adjustmentType === "add" ? "Add Credits" : "Remove Credits";
  const result = body.mode === "preview"
    ? await service.prepare(actionId, input, context)
    : await service.execute({ actionId, input, confirmation: { acknowledged: true, phrase: title, reason }, context });
  return NextResponse.json(result, { status: result.ok ? 200 : responseStatus(result.error.code), headers: { "Cache-Control": "no-store" } });
}
