import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type CreditAdjustmentInput = { companyId: string; amount: number; reason: string };
export type CreditAdjustmentOutput = {
  companyId: string;
  companyName: string;
  amount: number;
  previousPackageSize: number;
  newPackageSize: number;
  previousBalance: number;
  newBalance: number;
  administrator: string;
  reason: string;
  timestamp: string;
  auditId: string;
};

type AdjustmentType = "add" | "remove";
type CompanyCreditRecord = { id: string; name: string | null; package_size: number | null; credits_balance: number | null };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Credit administration is not configured.");
  return supabase;
}

function mapAdjustmentError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("company_not_found")) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  if (message.includes("invalid_credit_balance")) throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit balance is invalid and requires investigation.");
  if (message.includes("invalid_credit_amount")) throw new AdminActionError("INPUT_INVALID", "Enter a valid whole-number credit amount.");
  if (message.includes("insufficient_unused_credits")) throw new AdminActionError("INSUFFICIENT_UNUSED_CREDITS", "Only unused credits can be removed, and at least one package credit must remain.");
  if (message.includes("credit_limit_exceeded")) throw new AdminActionError("CREDIT_LIMIT_EXCEEDED", "The adjusted package would exceed 100,000 credits.");
  if (message.includes("request_id_conflict")) throw new AdminActionError("ACTION_CONFLICT", "This operation ID has already been used for a different credit adjustment.");
  throw new AdminActionError("ACTION_FAILED", "The credits could not be adjusted.", { cause: error });
}

async function loadCompany(companyId: string): Promise<CompanyCreditRecord> {
  const { data, error } = await client().from("companies").select("id, name, package_size, credits_balance").eq("id", companyId).maybeSingle();
  if (error) throw new AdminActionError("ACTION_FAILED", "The company credit balance could not be verified.", { cause: error });
  if (!data) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  const company = data as CompanyCreditRecord;
  const packageSize = Number(company.package_size);
  const balance = Number(company.credits_balance);
  if (!Number.isInteger(packageSize) || packageSize < 1 || !Number.isInteger(balance) || balance < 0 || balance > packageSize) {
    throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit balance is invalid and requires investigation.");
  }
  return company;
}

function createCreditAdjustmentAction(type: AdjustmentType): AdminActionDefinition<CreditAdjustmentInput, CreditAdjustmentOutput> {
  const isAdd = type === "add";
  const title = isAdd ? "Add Credits" : "Remove Credits";
  const actionId = isAdd ? "credits.add" : "credits.remove";
  return {
    id: actionId,
    title,
    description: isAdd ? "Add purchased credits to a company package." : "Remove unused credits from a company package.",
    permission: { anyOf: [actionId] },
    confirmation: {
      level: "dangerous",
      mode: "typed",
      title,
      message: `${title} changes the purchased package and available balance and creates an immutable audit record.`,
      confirmLabel: title,
      expectedPhrase: title,
      reasonRequired: true,
    },
    rollback: {
      mode: "manual",
      summary: "Credit adjustments require a separately authorized inverse adjustment to reverse.",
      instructions: "Review the audit record, then use the opposite credit action with a reason referencing the original audit ID.",
    },
    refresh: { strategy: "current-route" },
    validateInput(input) {
      const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
      const companyId = String(value.companyId || "").trim();
      const amount = Number(value.amount);
      const reason = String(value.reason || "").trim().replace(/\s+/g, " ");
      const fields: Record<string, string> = {};
      if (!UUID_PATTERN.test(companyId)) fields.companyId = "Choose a valid company.";
      if (!Number.isInteger(amount) || amount < 1 || amount > 100000) fields.amount = "Enter a whole number from 1 to 100,000.";
      if (!reason) fields.reason = "A reason is required.";
      else if (reason.length > 500) fields.reason = "Reason must be 500 characters or fewer.";
      return Object.keys(fields).length ? { ok: false, message: "Correct the highlighted fields.", fields } : { ok: true, value: { companyId, amount, reason } };
    },
    async dryRun(input) {
      const company = await loadCompany(input.companyId);
      const packageSize = Number(company.package_size);
      const balance = Number(company.credits_balance);
      const delta = isAdd ? input.amount : -input.amount;
      if (isAdd && packageSize + input.amount > 100000) throw new AdminActionError("CREDIT_LIMIT_EXCEEDED", "The adjusted package would exceed 100,000 credits.");
      if (!isAdd && (input.amount > balance || packageSize + delta < 1)) throw new AdminActionError("INSUFFICIENT_UNUSED_CREDITS", "Only unused credits can be removed, and at least one package credit must remain.");
      return createDryRunPreview({
        currentState: { company: company.name || "Unnamed company", packageSize, creditsRemaining: balance, creditsUsed: packageSize - balance },
        expectedResult: { packageSize: packageSize + delta, creditsRemaining: balance + delta, creditsUsed: packageSize - balance, creditImpact: `${isAdd ? "+" : "-"}${input.amount}` },
        affectedRecords: [
          { type: "company", id: company.id, label: company.name || "Unnamed company" },
          { type: "credit_transaction", id: "new", label: `One ${delta > 0 ? "+" : ""}${delta} credit ledger entry` },
          { type: "admin_action_audit", id: "new", label: `${title} audit record` },
        ],
        warnings: ["The balance will be row-locked and revalidated when you confirm.", "No assessment attempt, report, payment, or token will be changed."],
      });
    },
    auditMetadata(input) { return { companyId: input.companyId, amount: input.amount, adjustmentType: type }; },
    async execute(input, context) {
      const { data, error } = await client().rpc("adjust_company_credits_admin_action", {
        p_company_id: input.companyId,
        p_adjustment_type: type,
        p_amount: input.amount,
        p_administrator_id: context.actor.id,
        p_administrator_role: context.actor.role,
        p_reason: input.reason,
        p_request_id: context.requestId,
      });
      if (error) mapAdjustmentError(error);
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
      if (!row) throw new AdminActionError("ACTION_FAILED", "The credit adjustment returned no result.");
      const auditId = String(row.audit_id);
      const { data: audit, error: auditError } = await client().from("admin_action_audit").select("administrator_id, reason, created_at").eq("id", auditId).eq("action_id", actionId).eq("outcome", "succeeded").maybeSingle();
      if (auditError || !audit) throw new AdminActionError("AUDIT_FAILED", `The ${title} audit record could not be verified.`, { cause: auditError });
      return {
        companyId: String(row.company_id), companyName: String(row.company_name), amount: input.amount,
        previousPackageSize: Number(row.old_package_size), newPackageSize: Number(row.new_package_size),
        previousBalance: Number(row.old_balance), newBalance: Number(row.new_balance),
        administrator: String(audit.administrator_id), reason: String(audit.reason), timestamp: String(audit.created_at), auditId,
      };
    },
  };
}

export const addCreditsAction = createCreditAdjustmentAction("add");
export const removeCreditsAction = createCreditAdjustmentAction("remove");
