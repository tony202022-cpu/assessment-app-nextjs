import "server-only";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";
import { actionFailure } from "./action-result";
import { createAdminActionService } from "./production-admin-actions";
import type { CreditAdjustmentKind } from "./actions/adjust-credits";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseStatus(code: string) {
  if (code === "ACTION_FORBIDDEN") return 403;
  if (code === "COMPANY_NOT_FOUND") return 404;
  if (["INSUFFICIENT_CREDITS", "ACTION_CONFLICT"].includes(code)) return 409;
  if (["INPUT_INVALID", "INVALID_CREDIT_BALANCE", "CREDIT_BOUNDS_EXCEEDED", "CONFIRMATION_INVALID", "CONFIRMATION_REQUIRED", "DRY_RUN_FAILED"].includes(code)) return 400;
  return 500;
}

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function createCreditAdjustmentPost(kind: CreditAdjustmentKind) {
  const actionId = `credits.${kind}`;
  const confirmationPhrase = kind === "add" ? "Add Credits" : "Remove Credits";
  return async function POST(request: NextRequest) {
    const now = new Date();
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      const requestId = randomUUID();
      return json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Invalid request origin.", requestId, actionId, failedAt: now.toISOString() }), 403);
    }
    if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
      const requestId = randomUUID();
      return json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Administrator authentication is required.", requestId, actionId, failedAt: now.toISOString() }), 401);
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const rate = consumeRateLimit(`admin-action:${actionId}:${ipAddress}`, 20, 60 * 60 * 1000);
    if (!rate.allowed) {
      const requestId = randomUUID();
      return json(actionFailure({ code: "ACTION_CONFLICT", message: "Too many credit adjustment attempts. Try again later.", requestId, actionId, failedAt: now.toISOString() }), 429, { "Retry-After": String(rate.retryAfter) });
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
    const internalNote = String(body.internalNote || "").trim();
    const amount = Number(body.amount);
    const suppliedOperationId = String(body.operationId || "").trim();
    const requestId = UUID_PATTERN.test(suppliedOperationId) ? suppliedOperationId : randomUUID();
    if (!UUID_PATTERN.test(suppliedOperationId)) {
      return json(actionFailure({ code: "INPUT_INVALID", message: "The operation ID is invalid.", fields: { operationId: "Restart the action and try again." }, requestId, actionId, failedAt: now.toISOString() }), 400);
    }
    const configuredActorId = String(process.env.ADMIN_ACTION_ACTOR_ID || "").trim();
    const actorId = configuredActorId || (process.env.NODE_ENV === "production" ? "" : "development-admin");
    if (!actorId) {
      return json(actionFailure({ code: "ACTION_FAILED", message: "Administrative actor identity is not configured.", requestId, actionId, failedAt: now.toISOString() }), 500);
    }
    const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "").split(",").map((capability) => capability.trim()).filter(Boolean);
    const service = createAdminActionService();
    const input = { companyId, amount, reason, internalNote };
    const context = {
      requestId,
      actor: { id: actorId, role: "admin" as const, capabilities },
      resource: { type: "company", id: companyId, companyId },
      now,
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    };
    const result = body.mode === "preview"
      ? await service.prepare(actionId, input, context)
      : await service.execute({ actionId, input, confirmation: { acknowledged: true, phrase: confirmationPhrase, reason }, context });
    return json(result, result.ok ? 200 : responseStatus(result.error.code));
  };
}
