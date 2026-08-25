import "server-only";

import type { AdminActionActor, AdminActionResource } from "./permission-validator";

export type ActionAuditOutcome = "attempted" | "succeeded" | "denied" | "failed";

export type ActionAuditRecord = {
  requestId: string;
  actionId: string;
  actor: Pick<AdminActionActor, "id" | "role">;
  resource: AdminActionResource;
  outcome: ActionAuditOutcome;
  occurredAt: string;
  reason?: string;
  errorCode?: string;
  context: { ipAddress?: string; userAgent?: string; correlationId?: string };
  metadata?: Record<string, string | number | boolean | null>;
};

export interface ActionAudit {
  record(event: ActionAuditRecord): Promise<void>;
}

export function createActionAuditRecord(input: ActionAuditRecord): ActionAuditRecord {
  return { ...input, actor: { ...input.actor }, resource: { ...input.resource }, context: { ...input.context }, metadata: input.metadata ? { ...input.metadata } : undefined };
}
