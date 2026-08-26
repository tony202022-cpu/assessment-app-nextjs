import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type RestoreCreditInput = { companyId: string; reason: string };
export type RestoreCreditOutput = {
  companyId: string;
  companyName: string;
  packageSize: number;
  previousBalance: number;
  newBalance: number;
  administrator: string;
  reason: string;
  timestamp: string;
  auditId: string;
};

type CompanyCreditRecord = {
  id: string;
  name: string | null;
  package_size: number | null;
  credits_balance: number | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRestoreError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("company_not_found")) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  if (message.includes("credits_already_at_maximum")) throw new AdminActionError("CREDITS_AT_MAXIMUM", "Credits are already at the purchased package maximum.");
  if (message.includes("invalid_credit_balance")) throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit balance is invalid and requires investigation.");
  if (message.includes("request_id_conflict")) throw new AdminActionError("ACTION_CONFLICT", "This operation ID has already been used for a different restore request.");
  throw new AdminActionError("ACTION_FAILED", "The credit could not be restored.", { cause: error });
}

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Credit administration is not configured.");
  return supabase;
}

async function loadCompany(companyId: string): Promise<CompanyCreditRecord> {
  const { data, error } = await client()
    .from("companies")
    .select("id, name, package_size, credits_balance")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new AdminActionError("ACTION_FAILED", "The company credit balance could not be verified.", { cause: error });
  if (!data) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  const company = data as CompanyCreditRecord;
  const packageSize = Number(company.package_size);
  const balance = Number(company.credits_balance);
  if (!Number.isInteger(packageSize) || packageSize < 1 || !Number.isInteger(balance) || balance < 0 || balance > packageSize) {
    throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit balance is invalid and requires investigation.");
  }
  if (balance === packageSize) throw new AdminActionError("CREDITS_AT_MAXIMUM", "Credits are already at the purchased package maximum.");
  return company;
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
  async dryRun(input) {
    const company = await loadCompany(input.companyId);
    const packageSize = Number(company.package_size);
    const currentBalance = Number(company.credits_balance);
    return createDryRunPreview({
      currentState: {
        company: company.name || "Unnamed company",
        packageSize,
        creditsRemaining: currentBalance,
        creditsUsed: packageSize - currentBalance,
      },
      expectedResult: {
        creditsRemaining: currentBalance + 1,
        creditsUsed: packageSize - currentBalance - 1,
        creditImpact: "Restore exactly one credit",
      },
      affectedRecords: [
        { type: "company", id: company.id, label: company.name || "Unnamed company" },
        { type: "credit_transaction", id: "new", label: "One +1 credit ledger entry" },
        { type: "admin_action_audit", id: "new", label: "Restore Credit audit record" },
      ],
      warnings: [
        "This is an exceptional manual correction.",
        "No assessment attempt, report, payment, or token will be changed.",
        "The balance will be revalidated when you confirm.",
      ],
    });
  },
  auditMetadata(input) {
    return { companyId: input.companyId };
  },
  async execute(input, context) {
    const { data, error } = await client().rpc("restore_company_credit_admin_action", {
      p_company_id: input.companyId,
      p_administrator_id: context.actor.id,
      p_administrator_role: context.actor.role,
      p_reason: input.reason,
      p_request_id: context.requestId,
    });
    if (error) mapRestoreError(error);
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row) throw new AdminActionError("ACTION_FAILED", "The restore operation returned no result.");
    const auditId = String(row.audit_id);
    const { data: audit, error: auditError } = await client()
      .from("admin_action_audit")
      .select("administrator_id, reason, created_at")
      .eq("id", auditId)
      .eq("action_id", "credits.restore")
      .eq("outcome", "succeeded")
      .maybeSingle();
    if (auditError || !audit) throw new AdminActionError("AUDIT_FAILED", "The Restore Credit audit record could not be verified.", { cause: auditError });
    return {
      companyId: String(row.company_id),
      companyName: String(row.company_name),
      packageSize: Number(row.package_size),
      previousBalance: Number(row.old_balance),
      newBalance: Number(row.new_balance),
      administrator: String(audit.administrator_id),
      reason: String(audit.reason),
      timestamp: String(audit.created_at),
      auditId,
    };
  },
};
