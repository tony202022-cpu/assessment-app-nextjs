import "server-only";

import { AdminActionError } from "./action-errors";
import type { ActionAudit, ActionAuditRecord } from "./action-audit";
import { getSupabaseAdmin } from "@/lib/offline-company";

export class SupabaseActionAudit implements ActionAudit {
  async record(event: ActionAuditRecord): Promise<void> {
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
