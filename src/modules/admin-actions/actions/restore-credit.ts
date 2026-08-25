import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";

export type RestoreCreditInput = { companyId: string; reason: string };
export type RestoreCreditOutput = {
  companyId: string;
  companyName: string;
  packageSize: number;
  oldBalance: number;
  newBalance: number;
  auditId: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRestoreError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("company_not_found")) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  if (message.includes("credits_already_at_maximum")) throw new AdminActionError("CREDITS_AT_MAXIMUM", "Credits are already at the purchased package maximum.");
  if (message.includes("invalid_credit_balance")) throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit balance is invalid and requires investigation.");
  throw new AdminActionError("ACTION_FAILED", "The credit could not be restored.", { cause: error });
}

export const restoreCreditAction: AdminActionDefinition<RestoreCreditInput, RestoreCreditOutput> = {
  id: "credits.restore",
  title: "Restore Credit",
  description: "Restore exactly one company credit for an approved exceptional correction.",
  permission: { anyOf: ["credits.restore"] },
  confirmation: {
    level: "dangerous",
    mode: "typed",
    title: "Restore one credit",
    message: "This exceptional correction restores exactly one credit and creates an immutable audit record.",
    confirmLabel: "Restore Credit",
    expectedPhrase: "Restore Credit",
    reasonRequired: true,
  },
  rollback: {
    mode: "manual",
    summary: "A restored credit requires a separately authorized credit correction to reverse.",
    instructions: "Review the audit record and use an approved future credit correction action.",
  },
  refresh: { strategy: "current-route" },
  validateInput(input) {
    const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const companyId = String(value.companyId || "").trim();
    const reason = String(value.reason || "").trim().replace(/\s+/g, " ");
    const fields: Record<string, string> = {};
    if (!UUID_PATTERN.test(companyId)) fields.companyId = "Choose a valid company.";
    if (!reason) fields.reason = "A reason is required.";
    else if (reason.length > 500) fields.reason = "Reason must be 500 characters or fewer.";
    return Object.keys(fields).length
      ? { ok: false, message: "Correct the highlighted fields.", fields }
      : { ok: true, value: { companyId, reason } };
  },
  auditMetadata(input) {
    return { companyId: input.companyId };
  },
  async execute(input, context) {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AdminActionError("ACTION_FAILED", "Credit administration is not configured.");
    const { data, error } = await supabase.rpc("restore_company_credit_admin_action", {
      p_company_id: input.companyId,
      p_administrator_id: context.actor.id,
      p_administrator_role: context.actor.role,
      p_reason: input.reason,
      p_request_id: context.requestId,
    });
    if (error) mapRestoreError(error);
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row) throw new AdminActionError("ACTION_FAILED", "The restore operation returned no result.");
    return {
      companyId: String(row.company_id),
      companyName: String(row.company_name),
      packageSize: Number(row.package_size),
      oldBalance: Number(row.old_balance),
      newBalance: Number(row.new_balance),
      auditId: String(row.audit_id),
    };
  },
};
