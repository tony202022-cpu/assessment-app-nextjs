import "server-only";

import { assessmentRegistry } from "@/modules/assessment-definition";
import { validateAssessmentIssuancePolicy } from "@/modules/assessment-issuance-policy/assessment-issuance-policy-validation";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type IssueCompanyAssessmentAccessInput = {
  assessmentDefinitionId: string;
  assessmentDefinitionVersion: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: number;
  commercialReference: string;
  reportVisibility: "participant" | "manager-only";
};

export type IssueCompanyAssessmentAccessOutput = {
  policyId: string;
  companyId: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: number;
  reportVisibility: "participant" | "manager-only";
  employeeAssessmentPath: string;
  managerDashboardPath: string;
  issuedAt: string;
  administrator: string;
  auditId: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_COMPANY_ADAPTER_DEFINITION = "outdoor_sales_mri";

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
  if (!definition.capabilities.corporateAvailability || !definition.capabilities.managerDashboard) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Company issuance requires an existing production manager dashboard.");
  }
  if (definition.metadata.id !== CURRENT_COMPANY_ADAPTER_DEFINITION) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "This assessment is not connected to the production company activation adapter.");
  }
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
  if (message.includes("duplicate_company")) throw new AdminActionError("ACTION_CONFLICT", "A matching company already exists.");
  if (message.includes("request_id_conflict")) throw new AdminActionError("ACTION_CONFLICT", "This operation ID has already been used for a different issuance.");
  if (message.includes("assessment_not_supported") || message.includes("invalid_assessment_version")) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "The assessment is not eligible for production company issuance.");
  }
  if (message.includes("invalid_credits")) throw new AdminActionError("INPUT_INVALID", "Credits must be a whole number between 2 and 100,000.");
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
      assessmentDefinitionId: normalizeText(value.assessmentDefinitionId),
      assessmentDefinitionVersion: normalizeText(value.assessmentDefinitionVersion),
      companyName: normalizeText(value.companyName),
      managerName: normalizeText(value.managerName),
      managerEmail: normalizeText(value.managerEmail).toLowerCase(),
      credits: Number(value.credits),
      commercialReference: normalizeText(value.commercialReference),
      reportVisibility: normalizeText(value.reportVisibility) as IssueCompanyAssessmentAccessInput["reportVisibility"],
    };
    const fields: Record<string, string> = {};
    if (!normalized.assessmentDefinitionId) fields.assessmentDefinitionId = "Select an assessment.";
    if (!normalized.assessmentDefinitionVersion) fields.assessmentDefinitionVersion = "Select the current assessment version.";
    if (normalized.companyName.length < 2 || normalized.companyName.length > 200) fields.companyName = "Company name must be 2 to 200 characters.";
    if (normalized.managerName.length < 2 || normalized.managerName.length > 200) fields.managerName = "Manager name must be 2 to 200 characters.";
    if (!EMAIL_PATTERN.test(normalized.managerEmail) || normalized.managerEmail.length > 254) fields.managerEmail = "Enter a valid manager email.";
    if (!Number.isSafeInteger(normalized.credits) || normalized.credits < 2 || normalized.credits > 100000) fields.credits = "Credits must be a whole number between 2 and 100,000.";
    if (!normalized.commercialReference || normalized.commercialReference.length > 200) fields.commercialReference = "Commercial reference is required and must not exceed 200 characters.";
    if (!["participant", "manager-only"].includes(normalized.reportVisibility)) fields.reportVisibility = "Select report visibility.";
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
        reportVisibility: input.reportVisibility === "participant" ? "Participant" : "Manager Only",
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
      assessmentDefinitionVersion: input.assessmentDefinitionVersion,
      companyName: input.companyName,
      managerEmail: input.managerEmail,
      credits: input.credits,
      commercialReference: input.commercialReference,
      reportVisibility: input.reportVisibility,
    };
  },
  async execute(input, context) {
    currentEligibleDefinition(input.assessmentDefinitionId, input.assessmentDefinitionVersion);
    validatePolicy(input, context.actor.id);
    const { data, error } = await client().rpc("issue_company_assessment_access_admin_action", {
      p_request_id: context.requestId,
      p_assessment_definition_id: input.assessmentDefinitionId,
      p_assessment_definition_version: input.assessmentDefinitionVersion,
      p_company_name: input.companyName,
      p_manager_name: input.managerName,
      p_manager_email: input.managerEmail,
      p_credits: input.credits,
      p_report_visibility: input.reportVisibility,
      p_commercial_reference: input.commercialReference,
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
      employeeAssessmentPath: `/outdoor-mri?token=${encodeURIComponent(String(row.employee_token))}`,
      managerDashboardPath: `/company/outdoor-mri-dashboard?managerToken=${encodeURIComponent(String(row.manager_token))}`,
      issuedAt: String(row.issued_at),
      administrator: context.actor.id,
      auditId: String(row.audit_id),
    };
  },
};
