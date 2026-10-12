import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type CreditAdjustmentKind = "add" | "remove";
export type AdjustCreditsInput = {
  companyId: string;
  amount: number;
  reason: string;
  internalNote: string;
};
export type AdjustCreditsOutput = {
  companyId: string;
  companyName: string;
  action: CreditAdjustmentKind;
  amount: number;
  previousAllocation: number;
  newAllocation: number;
  previousBalance: number;
  newBalance: number;
  administrator: string;
  reason: string;
  internalNote: string;
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
const POSTGRES_INTEGER_MAX = 2_147_483_647;

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Credit administration is not configured.");
  return supabase;
}

function mapAdjustmentError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("company_not_found")) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  if (message.includes("insufficient_remaining_credits")) throw new AdminActionError("INSUFFICIENT_CREDITS", "The removal amount exceeds the company's remaining credits.");
  if (message.includes("invalid_credit_balance")) throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit account is invalid and requires investigation.");
  if (message.includes("credit_amount_overflow") || message.includes("credit_amount_underflow")) throw new AdminActionError("CREDIT_BOUNDS_EXCEEDED", "The adjustment would exceed the supported credit bounds.");
  if (message.includes("request_id_conflict")) throw new AdminActionError("ACTION_CONFLICT", "This operation ID has already been used with different adjustment details.");
  if (message.includes("invalid_credit_amount")) throw new AdminActionError("INPUT_INVALID", "Enter a positive whole-number amount.", { fieldErrors: { amount: "Enter a positive whole-number amount." } });
  throw new AdminActionError("ACTION_FAILED", "The credit adjustment could not be completed.", { cause: error });
}

async function loadCompany(companyId: string): Promise<CompanyCreditRecord> {
  const { data, error } = await client().from("companies").select("id, name, package_size, credits_balance").eq("id", companyId).maybeSingle();
  if (error) throw new AdminActionError("ACTION_FAILED", "The company credit account could not be verified.", { cause: error });
  if (!data) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  const company = data as CompanyCreditRecord;
  const allocation = Number(company.package_size);
  const balance = Number(company.credits_balance);
  if (!Number.isInteger(allocation) || allocation < 0 || !Number.isInteger(balance) || balance < 0 || balance > allocation) {
    throw new AdminActionError("INVALID_CREDIT_BALANCE", "The company credit account is invalid and requires investigation.");
  }
  return company;
}

function validateInput(input: unknown) {
  const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const companyId = String(value.companyId || "").trim();
  const amount = Number(value.amount);
  const reason = String(value.reason || "").trim().replace(/\s+/g, " ");
  const internalNote = String(value.internalNote || "").trim().replace(/\s+/g, " ");
  const fields: Record<string, string> = {};
  if (!UUID_PATTERN.test(companyId)) fields.companyId = "Choose a valid company.";
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > POSTGRES_INTEGER_MAX) fields.amount = "Enter a positive whole-number amount.";
  if (!reason) fields.reason = "A reason is required.";
  else if (reason.length > 500) fields.reason = "Reason must be 500 characters or fewer.";
  if (internalNote.length > 1000) fields.internalNote = "Internal note must be 1,000 characters or fewer.";
  return Object.keys(fields).length
    ? { ok: false as const, message: "Correct the highlighted fields.", fields }
    : { ok: true as const, value: { companyId, amount, reason, internalNote } };
}

function createAdjustmentAction(kind: CreditAdjustmentKind): AdminActionDefinition<AdjustCreditsInput, AdjustCreditsOutput> {
  const isAdd = kind === "add";
  const actionId = `credits.${kind}`;
  const label = isAdd ? "Add Credits" : "Remove Credits";
  return {
    id: actionId,
    title: label,
    description: `${label} while preserving the company's historical credit consumption.`,
    permission: { anyOf: [actionId] },
    confirmation: {
      level: isAdd ? "standard" : "dangerous",
      mode: "typed",
      title: label,
      message: `Confirm the allocation and balance change before ${isAdd ? "adding" : "removing"} credits.`,
      confirmLabel: label,
      expectedPhrase: label,
      reasonRequired: true,
    },
    rollback: {
      mode: "manual",
      summary: "Reverse this adjustment only through a separately authorized credit adjustment.",
      instructions: "Review the immutable audit and ledger records, then submit the opposite approved adjustment.",
    },
    refresh: { strategy: "current-route" },
    validateInput,
    async dryRun(input) {
      const company = await loadCompany(input.companyId);
      const allocation = Number(company.package_size);
      const balance = Number(company.credits_balance);
      const validationErrors: Record<string, string> = {};
      if (isAdd && (allocation > POSTGRES_INTEGER_MAX - input.amount || balance > POSTGRES_INTEGER_MAX - input.amount)) {
        validationErrors.amount = "The adjustment would exceed the supported credit limit.";
      }
      if (!isAdd && input.amount > balance) {
        validationErrors.amount = "The removal amount cannot exceed the remaining balance.";
      }
      const signedAmount = isAdd ? input.amount : -input.amount;
      return createDryRunPreview({
        currentState: { company: company.name || "Unnamed company", packageSize: allocation, creditsRemaining: balance, creditsUsed: allocation - balance },
        expectedResult: {
          action: label,
          amount: input.amount,
          packageSize: allocation + signedAmount,
          creditsRemaining: balance + signedAmount,
          creditsUsed: allocation - balance,
        },
        affectedRecords: [
          { type: "company", id: company.id, label: company.name || "Unnamed company" },
          { type: "credit_transaction", id: "new", label: `${signedAmount > 0 ? "+" : ""}${signedAmount} ledger entry` },
          { type: "admin_action_audit", id: "new", label: `${label} audit record` },
        ],
        warnings: [
          "Used credits remain unchanged because allocation and balance move by the same amount.",
          "No assessment attempt, report, participant, payment, or token will be changed.",
          "The account will be locked and revalidated when you confirm.",
        ],
        validationErrors,
      });
    },
    auditMetadata(input) {
      return { companyId: input.companyId, amount: input.amount, internalNote: input.internalNote };
    },
    async execute(input, context) {
      const { data, error } = await client().rpc("adjust_company_credits_admin_action", {
        p_company_id: input.companyId,
        p_adjustment_type: kind,
        p_amount: input.amount,
        p_administrator_id: context.actor.id,
        p_administrator_role: context.actor.role,
        p_reason: input.reason,
        p_internal_note: input.internalNote || null,
        p_request_id: context.requestId,
      });
      if (error) mapAdjustmentError(error);
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
      if (!row) throw new AdminActionError("ACTION_FAILED", "The credit adjustment returned no result.");
      const auditId = String(row.audit_id);
      const { data: audit, error: auditError } = await client()
        .from("admin_action_audit")
        .select("administrator_id, reason, metadata, created_at")
        .eq("id", auditId)
        .eq("action_id", actionId)
        .eq("outcome", "succeeded")
        .maybeSingle();
      if (auditError || !audit) throw new AdminActionError("AUDIT_FAILED", `The ${label} audit record could not be verified.`, { cause: auditError });
      const metadata = (audit.metadata && typeof audit.metadata === "object" ? audit.metadata : {}) as Record<string, unknown>;
      return {
        companyId: String(row.company_id), companyName: String(row.company_name), action: kind, amount: Number(row.amount),
        previousAllocation: Number(row.old_package_size), newAllocation: Number(row.new_package_size),
        previousBalance: Number(row.old_balance), newBalance: Number(row.new_balance),
        administrator: String(audit.administrator_id), reason: String(audit.reason), internalNote: String(metadata.internalNote || ""),
        timestamp: String(audit.created_at), auditId,
      };
    },
  };
}

export const addCreditsAction = createAdjustmentAction("add");
export const removeCreditsAction = createAdjustmentAction("remove");
