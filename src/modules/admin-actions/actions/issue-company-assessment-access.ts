import "server-only";

import { assessmentRegistry } from "@/modules/assessment-definition";
import { validateAssessmentIssuancePolicy } from "@/modules/assessment-issuance-policy/assessment-issuance-policy-validation";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type IssueCompanyAssessmentAccessInput = {
  existingCompanyId: string | null;
  assessmentDefinitionId: string;
  assessmentDefinitionVersion: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: number;
  commercialReference: string;
  reportVisibility: "participant-only" | "manager-only" | "participant-and-manager" | "admin-only";
  issuanceType: "offline-paid" | "online-paid" | "complimentary";
  languageMode: "participant-choice" | "en" | "ar";
  expiresAt: string | null;
};

export type IssueCompanyAssessmentAccessOutput = {
  policyId: string;
  companyId: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: number;
  reportVisibility: "participant-only" | "manager-only" | "participant-and-manager" | "admin-only";
  employeeAssessmentPath: string;
  managerDashboardPath: string;
  issuedAt: string;
  administrator: string;
  auditId: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Company issuance is not configured.");
  return supabase;
}

function currentEligibleDefinition(id: string, version: string) {
  const definition = assessmentRegistry.getCurrent(id);
  if (!definition) throw new AdminActionError("ASSESSMENT_NOT_FOUND", "The assessment definition could not be found.");
  if (definition.metadata.version !== version) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Select the current published assessment version.");
  }
  if (!definition.capabilities.corporateAvailability) throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Company access is not enabled for this assessment.");
  return definition;
}

function validatePolicy(input: IssueCompanyAssessmentAccessInput, actorId: string) {
  return validateAssessmentIssuancePolicy({
    assessmentDefinition: { id: input.assessmentDefinitionId, version: input.assessmentDefinitionVersion },
    accessType: "company",
    fundingType: "paid",
    reportVisibility: input.reportVisibility,
    commercialReference: input.commercialReference,
  }, { id: actorId });
}

function mapIssueError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("duplicate_company")) throw new AdminActionError("ACTION_CONFLICT", "A matching company already exists. Select it from Existing Company.");
  if (message.includes("company_not_found")) throw new AdminActionError("ACTION_CONFLICT", "The selected company no longer exists. Refresh and select it again.");
  if (message.includes("company_identity_mismatch")) throw new AdminActionError("ACTION_CONFLICT", "The selected company identity changed. Refresh and review it again.");
  if (message.includes("request_id_conflict")) throw new AdminActionError("ACTION_CONFLICT", "This operation ID has already been used for a different issuance.");
  if (message.includes("assessment_not_supported") || message.includes("invalid_assessment_version")) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "The assessment is not eligible for production company issuance.");
  }
  if (message.includes("invalid_credits")) throw new AdminActionError("INPUT_INVALID", "Credits must be a whole number within the allowed range.");
  throw new AdminActionError("ACTION_FAILED", "Company assessment access could not be issued.", { cause: error });
}

export const issueCompanyAssessmentAccessAction: AdminActionDefinition<
  IssueCompanyAssessmentAccessInput,
  IssueCompanyAssessmentAccessOutput
> = {
  id: "assessment-access.company.issue",
  title: "Issue Company Assessment Access",
  description: "Create one company wallet, manager dashboard, shared participant link, and issuance policy.",
  permission: { anyOf: ["assessment-access.company.issue"] },
  confirmation: {
    level: "dangerous",
    mode: "dangerous",
    title: "Issue company assessment access",
    message: "This creates live company access, allocates credits, and records an immutable issuance policy.",
    confirmLabel: "Issue Company Access",
  },
  rollback: {
    mode: "manual",
    summary: "Issued company access requires an approved manual operational rollback.",
    instructions: "Disable the issued access and reconcile the company, wallet, tokens, policy, and audit record as one incident.",
  },
  refresh: { strategy: "paths", paths: ["/admin/access-center", "/admin/companies"] },
  validateInput(input) {
    const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const normalized: IssueCompanyAssessmentAccessInput = {
      existingCompanyId: normalizeText(value.existingCompanyId) || null,
      assessmentDefinitionId: normalizeText(value.assessmentDefinitionId),
      assessmentDefinitionVersion: normalizeText(value.assessmentDefinitionVersion),
      companyName: normalizeText(value.companyName),
      managerName: normalizeText(value.managerName),
      managerEmail: normalizeText(value.managerEmail).toLowerCase(),
      credits: Number(value.credits),
      commercialReference: normalizeText(value.commercialReference),
      reportVisibility: normalizeText(value.reportVisibility) as IssueCompanyAssessmentAccessInput["reportVisibility"],
      issuanceType: normalizeText(value.issuanceType) as IssueCompanyAssessmentAccessInput["issuanceType"],
      languageMode: normalizeText(value.languageMode) as IssueCompanyAssessmentAccessInput["languageMode"],
      expiresAt: value.expiresAt ? String(value.expiresAt) : null,
    };
    const fields: Record<string, string> = {};
    if (!normalized.assessmentDefinitionId) fields.assessmentDefinitionId = "Select an assessment.";
    if (!normalized.assessmentDefinitionVersion) fields.assessmentDefinitionVersion = "Select the current assessment version.";
    if (normalized.companyName.length < 2 || normalized.companyName.length > 200) fields.companyName = "Company name must be 2 to 200 characters.";
    if (normalized.managerName.length < 2 || normalized.managerName.length > 200) fields.managerName = "Manager name must be 2 to 200 characters.";
    if (!EMAIL_PATTERN.test(normalized.managerEmail) || normalized.managerEmail.length > 254) fields.managerEmail = "Enter a valid manager email.";
    if (normalized.existingCompanyId && !UUID_PATTERN.test(normalized.existingCompanyId)) fields.existingCompanyId = "Select a valid existing company.";
    const minimumCredits = normalized.existingCompanyId ? 0 : 1;
    if (!Number.isSafeInteger(normalized.credits) || normalized.credits < minimumCredits || normalized.credits > 100000) fields.credits = `Credits must be a whole number between ${minimumCredits} and 100,000.`;
    if (!normalized.commercialReference || normalized.commercialReference.length > 200) fields.commercialReference = "Commercial reference is required and must not exceed 200 characters.";
    if (!["participant-only", "manager-only", "participant-and-manager", "admin-only"].includes(normalized.reportVisibility)) fields.reportVisibility = "Select report visibility.";
    if (!["offline-paid", "online-paid", "complimentary"].includes(normalized.issuanceType)) fields.issuanceType = "Select an issuance type.";
    if (!["participant-choice", "en", "ar"].includes(normalized.languageMode)) fields.languageMode = "Select a language mode.";
    if (Object.keys(fields).length) return { ok: false, message: "Correct the highlighted fields.", fields };
    try {
      currentEligibleDefinition(normalized.assessmentDefinitionId, normalized.assessmentDefinitionVersion);
    } catch (error) {
      if (error instanceof AdminActionError) fields.assessmentDefinitionId = error.message;
    }
    return Object.keys(fields).length
      ? { ok: false, message: "This assessment cannot use the current company issuance workflow.", fields }
      : { ok: true, value: normalized };
  },
  async dryRun(input, context) {
    const definition = currentEligibleDefinition(input.assessmentDefinitionId, input.assessmentDefinitionVersion);
    validatePolicy(input, context.actor.id);
    if (input.existingCompanyId) {
      const { data: existing, error } = await client()
        .from("companies")
        .select("id, name, billing_email, manager_name, package_size, credits_balance, manager_token")
        .eq("id", input.existingCompanyId)
        .maybeSingle();
      if (error) throw new AdminActionError("ACTION_FAILED", "The selected company could not be checked safely.", { cause: error });
      if (!existing) throw new AdminActionError("ACTION_CONFLICT", "The selected company no longer exists. Refresh and select it again.");
      if (normalizeText(existing.name).toLowerCase() !== input.companyName.toLowerCase()
        || normalizeText(existing.billing_email).toLowerCase() !== input.managerEmail) {
        throw new AdminActionError("ACTION_CONFLICT", "The selected company identity changed. Refresh and review it again.");
      }
      return createDryRunPreview({
        currentState: { company: existing.name, packageSize: existing.package_size, availableCredits: existing.credits_balance },
        expectedResult: { company: existing.name, manager: `${existing.manager_name || input.managerName} · ${existing.billing_email}`, packageSize: Number(existing.package_size) + input.credits, availableCredits: Number(existing.credits_balance) + input.credits, additionalCredits: input.credits, managerToken: existing.manager_token ? "Reused" : "Created if missing", reportVisibility: input.reportVisibility },
        affectedRecords: [
          { type: "company", id: input.existingCompanyId, label: input.companyName },
          ...(input.credits > 0 ? [{ type: "credit_transaction", id: "new", label: input.commercialReference }] : []),
          { type: "assessment_issuance_policy", id: "new", label: input.commercialReference },
          { type: "admin_action_audit", id: "new", label: "Company issuance audit" },
        ],
        warnings: [
          input.credits > 0
            ? "The selected company is preserved; its package and available balance are topped up atomically."
            : "No credits will be added and the selected company's package and available balance will not change.",
          "The existing manager identity, manager token, participants, attempts, reports, and tokens are preserved.",
          "No participant attempt, score, report, payment, or assessment definition will be changed.",
        ],
      });
    }
    const { data, error } = await client()
      .from("companies")
      .select("id, name")
      .eq("billing_email", input.managerEmail)
      .limit(20);
    if (error) throw new AdminActionError("ACTION_FAILED", "Existing companies could not be checked safely.", { cause: error });
    const normalizedName = input.companyName.toLowerCase();
    const matching = (data || []).some((company) => String(company.name || "").trim().replace(/\s+/g, " ").toLowerCase() === normalizedName);
    if (matching) throw new AdminActionError("ACTION_CONFLICT", "A matching company already exists.");
    return createDryRunPreview({
      currentState: { assessment: definition.metadata.name, company: "Not created", policy: "Not created" },
      expectedResult: {
        company: input.companyName,
        manager: `${input.managerName} · ${input.managerEmail}`,
        credits: input.credits,
        fundingType: "Paid",
        reportVisibility: input.reportVisibility,
      },
      affectedRecords: [
        { type: "company", id: "new", label: input.companyName },
        { type: "access_token", id: "new", label: "Shared participant assessment link" },
        { type: "assessment_issuance_policy", id: "new", label: input.commercialReference },
        { type: "admin_action_audit", id: "new", label: "Company issuance audit" },
      ],
      warnings: [
        "This creates live production access and allocates the full credit balance.",
        "The manager and participant links contain credentials and must be shared securely.",
        "No participant attempt, score, report, payment, or assessment definition will be changed.",
      ],
    });
  },
  auditMetadata(input) {
    return {
      assessmentDefinitionId: input.assessmentDefinitionId,
      existingCompanyId: input.existingCompanyId,
      assessmentDefinitionVersion: input.assessmentDefinitionVersion,
      companyName: input.companyName,
      managerEmail: input.managerEmail,
      credits: input.credits,
      commercialReference: input.commercialReference,
      reportVisibility: input.reportVisibility,
    };
  },
  async execute(input, context) {
    const definition = currentEligibleDefinition(input.assessmentDefinitionId, input.assessmentDefinitionVersion);
    validatePolicy(input, context.actor.id);
    const { data, error } = await client().rpc("issue_company_assessment_access_admin_action", {
      p_request_id: context.requestId,
      p_existing_company_id: input.existingCompanyId,
      p_assessment_definition_id: input.assessmentDefinitionId,
      p_assessment_definition_version: input.assessmentDefinitionVersion,
      p_company_name: input.companyName,
      p_manager_name: input.managerName,
      p_manager_email: input.managerEmail,
      p_credits: input.credits,
      p_report_visibility: input.reportVisibility,
      p_commercial_reference: input.commercialReference,
      p_issuance_type: input.issuanceType,
      p_language_mode: input.languageMode,
      p_expires_at: input.expiresAt,
      p_administrator_id: context.actor.id,
      p_administrator_role: context.actor.role,
    });
    if (error) {
      console.error("Company issuance RPC diagnostic", {
        requestId: context.requestId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      mapIssueError(error);
    }
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row?.company_id || !row?.policy_id || !row?.manager_token || !row?.employee_token || !row?.audit_id) {
      throw new AdminActionError("ACTION_FAILED", "Company issuance returned an incomplete result.");
    }
    return {
      policyId: String(row.policy_id),
      companyId: String(row.company_id),
      companyName: String(row.company_name),
      managerName: String(row.manager_name),
      managerEmail: String(row.manager_email),
      credits: Number(row.credits),
      reportVisibility: input.reportVisibility,
      employeeAssessmentPath: `/${definition.metadata.slug}?token=${encodeURIComponent(String(row.employee_token))}`,
      managerDashboardPath: `/company/assessment-dashboard?managerToken=${encodeURIComponent(String(row.manager_token))}&assessment=${encodeURIComponent(definition.metadata.slug)}`,
      issuedAt: String(row.issued_at),
      administrator: context.actor.id,
      auditId: String(row.audit_id),
    };
  },
};
