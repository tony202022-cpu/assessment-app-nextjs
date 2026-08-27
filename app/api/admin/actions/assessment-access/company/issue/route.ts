import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { actionFailure } from "@/modules/admin-actions/action-result";
import { createAdminActionService } from "@/modules/admin-actions/production-admin-actions";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

const ACTION_ID = "assessment-access.company.issue";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseStatus(code: string) {
  if (code === "ACTION_FORBIDDEN") return 403;
  if (code === "ASSESSMENT_NOT_FOUND") return 404;
  if (code === "ACTION_CONFLICT") return 409;
  if (["INPUT_INVALID", "ASSESSMENT_NOT_ELIGIBLE", "CONFIRMATION_INVALID", "CONFIRMATION_REQUIRED"].includes(code)) return 400;
  return 500;
}

export async function POST(request: NextRequest) {
  const now = new Date();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Invalid request origin.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 403 });
  }
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_FORBIDDEN", message: "Administrator authentication is required.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 401 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = consumeRateLimit(`admin-action:${ACTION_ID}:${ipAddress}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    const requestId = randomUUID();
    return NextResponse.json(actionFailure({ code: "ACTION_CONFLICT", message: "Too many issuance attempts. Try again later.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    body = {};
  }

  const suppliedOperationId = String(body.operationId || "").trim();
  const requestId = UUID_PATTERN.test(suppliedOperationId) ? suppliedOperationId : randomUUID();
  if (!UUID_PATTERN.test(suppliedOperationId)) {
    return NextResponse.json(actionFailure({ code: "INPUT_INVALID", message: "The operation ID is invalid.", fields: { operationId: "Restart the wizard and try again." }, requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 400 });
  }

  const actorId = String(process.env.ADMIN_ACTION_ACTOR_ID || "").trim()
    || (process.env.NODE_ENV === "production" ? "" : "development-admin");
  if (!actorId) {
    return NextResponse.json(actionFailure({ code: "ACTION_FAILED", message: "Administrative actor identity is not configured.", requestId, actionId: ACTION_ID, failedAt: now.toISOString() }), { status: 500 });
  }

  const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "")
    .split(",")
    .map((capability) => capability.trim())
    .filter(Boolean);
  const input = {
    assessmentDefinitionId: body.assessmentDefinitionId,
    assessmentDefinitionVersion: body.assessmentDefinitionVersion,
    companyName: body.companyName,
    managerName: body.managerName,
    managerEmail: body.managerEmail,
    credits: body.credits,
    commercialReference: body.commercialReference,
    reportVisibility: body.reportVisibility,
  };
  const context = {
    requestId,
    actor: { id: actorId, role: "admin" as const, capabilities },
    resource: { type: "company-issuance", id: requestId },
    now,
    ipAddress,
    userAgent: request.headers.get("user-agent") || undefined,
    correlationId: request.headers.get("x-correlation-id") || undefined,
  };
  const service = createAdminActionService();
  const result = body.mode === "preview"
    ? await service.prepare(ACTION_ID, input, context)
    : await service.execute({
        actionId: ACTION_ID,
        input,
        confirmation: { acknowledged: true },
        context,
      });

  return NextResponse.json(result, {
    status: result.ok ? 200 : responseStatus(result.error.code),
    headers: { "Cache-Control": "no-store" },
  });
}
