import "server-only";

import { AdminActionError } from "./action-errors";
import type { ActionAudit, ActionAuditRecord } from "./action-audit";
import { getSupabaseAdmin } from "@/lib/offline-company";

export class SupabaseActionAudit implements ActionAudit {
  async record(event: ActionAuditRecord): Promise<void> {
    validateAuditEvent(event);
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AdminActionError("AUDIT_FAILED", "Administrative audit storage is not configured.");

    if (event.outcome === "succeeded") {
      const { data, error } = await supabase
        .from("admin_action_audit")
        .select("id")
        .eq("request_id", event.requestId)
        .eq("action_id", event.actionId)
        .eq("outcome", "succeeded")
        .maybeSingle();
      if (error) throw new AdminActionError("AUDIT_FAILED", "Could not verify the administrative audit record.", { cause: error });
      if (data) return;
    }

    const { error } = await supabase.from("admin_action_audit").insert({
      request_id: event.requestId,
      action_id: event.actionId,
      administrator_id: event.actor.id,
      administrator_role: event.actor.role,
      resource_type: event.resource.type,
      resource_id: event.resource.id,
      company_id: event.resource.companyId || null,
      outcome: event.outcome,
      reason: event.reason || null,
      error_code: event.errorCode || null,
      metadata: event.metadata || {},
      context: event.context,
    });
    if (error && error.code !== "23505") {
      throw new AdminActionError("AUDIT_FAILED", "Could not write the administrative audit record.", { cause: error });
    }
  }
}

function validateAuditEvent(event: ActionAuditRecord): void {
  const required: Array<[string, string, number]> = [
    ["requestId", event.requestId, 200],
    ["actionId", event.actionId, 200],
    ["actor.id", event.actor.id, 300],
    ["actor.role", event.actor.role, 100],
    ["resource.type", event.resource.type, 100],
    ["resource.id", event.resource.id, 300],
  ];
  const invalid = required.find(([, value, maximum]) => !value.trim() || value.length > maximum);
  if (invalid) {
    throw new AdminActionError("AUDIT_FAILED", `Administrative audit field ${invalid[0]} is invalid.`);
  }
  if (event.reason && event.reason.length > 1000) {
    throw new AdminActionError("AUDIT_FAILED", "Administrative audit reason is too long.");
  }
  if (event.errorCode && event.errorCode.length > 200) {
    throw new AdminActionError("AUDIT_FAILED", "Administrative audit error code is too long.");
  }
}
