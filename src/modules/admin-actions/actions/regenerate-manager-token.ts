import "server-only";

import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type RegenerateManagerTokenInput = { companyId: string; reason: string };
export type RegenerateManagerTokenOutput = {
  companyId: string;
  companyName: string;
  managerDashboardPath: string;
  status: "Active";
};

type CompanyTokenRecord = { id: string; name: string | null; manager_token: string | null };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Manager token administration is not configured.");
  return supabase;
}

async function loadCompany(companyId: string): Promise<CompanyTokenRecord> {
  const { data, error } = await client()
    .from("companies")
    .select("id, name, manager_token")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new AdminActionError("ACTION_FAILED", "The company manager access could not be verified.", { cause: error });
  if (!data) throw new AdminActionError("COMPANY_NOT_FOUND", "The company could not be found.");
  const company = data as CompanyTokenRecord;
  if (!company.manager_token) throw new AdminActionError("ACTION_CONFLICT", "This company does not have an existing manager token to regenerate.");
  return company;
}

export const regenerateManagerTokenAction: AdminActionDefinition<RegenerateManagerTokenInput, RegenerateManagerTokenOutput> = {
  id: "companies.manager-token.regenerate",
  title: "Regenerate Manager Token",
  description: "Replace a company manager-dashboard credential and invalidate the previous credential immediately.",
  permission: { anyOf: ["companies.manager-token.regenerate"] },
  confirmation: {
    level: "dangerous",
    mode: "reason-required",
    title: "Regenerate manager token",
    message: "The current manager dashboard link will stop working immediately.",
    confirmLabel: "Regenerate Manager Token",
    reasonRequired: true,
  },
  rollback: {
    mode: "impossible",
    summary: "The previous manager token is intentionally discarded and cannot be restored.",
    instructions: "If the replacement link must be invalidated, run this action again and distribute the newest authorized link.",
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
    return createDryRunPreview({
      currentState: { company: company.name || "Unnamed company", managerAccess: "Active" },
      expectedResult: { previousLink: "Invalidated immediately", replacementLink: "Active" },
      affectedRecords: [{ type: "company", id: company.id, label: company.name || "Unnamed company" }],
      warnings: ["Anyone using the current manager dashboard link will lose access immediately.", "The replacement link must be shared securely."],
    });
  },
  auditMetadata(input) {
    return { companyId: input.companyId, credentialType: "manager_token" };
  },
  async execute(input) {
    const company = await loadCompany(input.companyId);
    const previousToken = String(company.manager_token);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const replacementToken = randomBytes(32).toString("hex");
      const { data, error } = await client()
        .from("companies")
        .update({ manager_token: replacementToken })
        .eq("id", input.companyId)
        .eq("manager_token", previousToken)
        .select("id, name")
        .maybeSingle();

      if (error?.code === "23505") continue;
      if (error) throw new AdminActionError("ACTION_FAILED", "The manager token could not be regenerated.", { cause: error });
      if (!data) throw new AdminActionError("ACTION_CONFLICT", "Manager access changed during this request. Refresh and try again.");

      return {
        companyId: String(data.id),
        companyName: String(data.name || company.name || "Unnamed company"),
        managerDashboardPath: `/company/outdoor-mri-dashboard?managerToken=${encodeURIComponent(replacementToken)}`,
        status: "Active",
      };
    }

    throw new AdminActionError("ACTION_CONFLICT", "A unique manager token could not be generated. Try again.");
  },
};
