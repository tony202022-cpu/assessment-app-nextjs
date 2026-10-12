import "server-only";

import { assessmentRegistry } from "@/modules/assessment-definition";
import { validateAssessmentIssuancePolicy } from "@/modules/assessment-issuance-policy/assessment-issuance-policy-validation";
import type { AssessmentIssuanceType, AssessmentReportVisibility } from "@/modules/assessment-issuance-policy/assessment-issuance-policy";
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
  participantAllocation: number;
  commercialReference: string;
  reportVisibility: AssessmentReportVisibility;
  issuanceType: AssessmentIssuanceType;
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
  participantAllocation: number;
  reportVisibility: AssessmentReportVisibility;
  employeeAssessmentPath: string;
  managerDashboardPath: string;
  issuedAt: string;
  administrator: string;
  auditId: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREE_COMPANY_SCAN_IDS = new Set(["outdoor_sales_scan", "sales_manager_scan"]);
const CURRENT_COMPANY_ADAPTER_DEFINITIONS = new Set(["outdoor_sales_mri", "outdoor_sales_scan", "sales_manager_scan"]);

function isFreeCompanyScan(id: string) {
  return FREE_COMPANY_SCAN_IDS.has(id);
}

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
  if (!CURRENT_COMPANY_ADAPTER_DEFINITIONS.has(definition.metadata.id)) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "This assessment is not connected to the production company activation adapter.");
  }
  return definition;
}

function validatePolicy(input: IssueCompanyAssessmentAccessInput, actorId: string) {
  const scan = isFreeCompanyScan(input.assessmentDefinitionId);
  return validateAssessmentIssuancePolicy({
    assessmentDefinition: { id: input.assessmentDefinitionId, version: input.assessmentDefinitionVersion },
    accessType: "company",
    fundingType: scan || input.issuanceType === "complimentary" ? "complimentary" : "paid",
    issuanceType: scan ? "complimentary" : input.issuanceType,
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
  if (message.includes("invalid_credits")) throw new AdminActionError("INPUT_INVALID", "Seats must be a whole number between 1 and 100,000.");
  throw new AdminActionError("ACTION_FAILED", "Company assessment access could not be issued.", { cause: error });
}

export const issueCompanyAssessmentAccessAction: AdminActionDefinition<
  IssueCompanyAssessmentAccessInput,
  IssueCompanyAssessmentAccessOutput
> = {
  id: "assessment-access.company.issue",
  title: "Issue Company Assessment Access",
  description: "Create or reuse a company, manager dashboard, shared participant link, and issuance policy.",
  permission: { anyOf: ["assessment-access.company.issue"] },
  confirmation: {
    level: "dangerous",
    mode: "dangerous",
    title: "Issue company assessment access",
    message: "This creates live company access and records an immutable issuance policy. Paid assessments may also allocate credits.",
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
      credits: isFreeCompanyScan(normalizeText(value.assessmentDefinitionId)) ? 0 : Number(value.credits),
      participantAllocation: Number(value.participantAllocation),
      commercialReference: normalizeText(value.commercialReference) || (isFreeCompanyScan(normalizeText(value.assessmentDefinitionId)) ? "Free Scan issuance" : ""),
      reportVisibility: normalizeText(value.reportVisibility) as IssueCompanyAssessmentAccessInput["reportVisibility"],
      issuanceType: (isFreeCompanyScan(normalizeText(value.assessmentDefinitionId)) ? "complimentary" : normalizeText(value.issuanceType)) as AssessmentIssuanceType,
      languageMode: (normalizeText(value.languageMode) || "participant-choice") as IssueCompanyAssessmentAccessInput["languageMode"],
      expiresAt: normalizeText(value.expiresAt) || null,
    };
    const scan = isFreeCompanyScan(normalized.assessmentDefinitionId);
    const fields: Record<string, string> = {};
    if (!normalized.assessmentDefinitionId) fields.assessmentDefinitionId = "Select an assessment.";
    if (!normalized.assessmentDefinitionVersion) fields.assessmentDefinitionVersion = "Select the current assessment version.";
    if (normalized.companyName.length < 2 || normalized.companyName.length > 200) fields.companyName = "Company name must be 2 to 200 characters.";
    if (normalized.managerName.length < 2 || normalized.managerName.length > 200) fields.managerName = "Manager name must be 2 to 200 characters.";
    if (!EMAIL_PATTERN.test(normalized.managerEmail) || normalized.managerEmail.length > 254) fields.managerEmail = "Enter a valid manager email.";
    if (normalized.existingCompanyId && !UUID_PATTERN.test(normalized.existingCompanyId)) fields.existingCompanyId = "Select a valid existing company.";
    if (scan) {
      if (!Number.isSafeInteger(normalized.participantAllocation) || normalized.participantAllocation < 1 || normalized.participantAllocation > 100000) fields.participantAllocation = "Participant allocation must be a whole number between 1 and 100,000.";
    } else {
      const minimumCredits = normalized.existingCompanyId ? 0 : 1;
      if (!Number.isSafeInteger(normalized.credits) || normalized.credits < minimumCredits || normalized.credits > 100000) fields.credits = `Seats must be a whole number between ${minimumCredits} and 100,000.`;
    }
    if (!normalized.commercialReference || normalized.commercialReference.length > 200) fields.commercialReference = "Commercial reference is required and must not exceed 200 characters.";
    if (!["participant-only", "manager-only", "participant-and-manager", "admin-only"].includes(normalized.reportVisibility)) fields.reportVisibility = "Select report visibility.";
    if (!["offline-paid", "online-paid", "complimentary"].includes(normalized.issuanceType)) fields.issuanceType = "Select issuance type.";
    if (scan && normalized.reportVisibility === "admin-only") fields.reportVisibility = "Admin only is not available for free Scans.";
    if (!["participant-choice", "en", "ar"].includes(normalized.languageMode)) fields.languageMode = "Select a language mode.";
    if (scan && normalized.expiresAt) {
      const expiry = new Date(normalized.expiresAt);
      if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) fields.expiresAt = "Expiry must be in the future and within 366 days.";
    }
    if (normalized.assessmentDefinitionId === "outdoor_sales_mri" && normalized.issuanceType !== "offline-paid") fields.issuanceType = "Existing Outdoor Sales MRI issuance remains Offline Paid only.";
    if (normalized.assessmentDefinitionId === "outdoor_sales_mri" && !["manager-only", "participant-and-manager"].includes(normalized.reportVisibility)) fields.reportVisibility = "Existing Outdoor Sales MRI supports Manager only or Participant + Manager.";
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
        expectedResult: {
          company: `${input.companyName} (existing record reused)`,
          manager: `${existing.manager_name || input.managerName} · ${existing.billing_email}`,
          access: isFreeCompanyScan(definition.metadata.id) ? "Free Scan access; no paid wallet change" : `${input.credits} additional credits`,
          participantAllocation: isFreeCompanyScan(definition.metadata.id) ? input.participantAllocation : undefined,
          managerToken: existing.manager_token ? "Reused" : "Created if missing",
          issuanceType: input.issuanceType,
          reportVisibility: input.reportVisibility,
        },
        affectedRecords: [
          { type: "company", id: input.existingCompanyId, label: input.companyName },
          ...(!isFreeCompanyScan(definition.metadata.id) && input.credits > 0 ? [{ type: "credit_transaction", id: "new", label: input.commercialReference }] : []),
          { type: "assessment_issuance_policy", id: "new", label: input.commercialReference },
          { type: "admin_action_audit", id: "new", label: "Company issuance audit" },
        ],
        warnings: [
          isFreeCompanyScan(definition.metadata.id) ? `${definition.metadata.name} is free; no company package or paid credit balance will change.` : input.credits > 0 ? "The selected company credit balance will be topped up atomically." : "No company credits will be added or consumed.",
          "The existing manager token, participants, attempts, reports, and access tokens are preserved.",
        ],
      });
    }
    const { data, error } = await client().from("companies").select("id, name").eq("billing_email", input.managerEmail).limit(20);
    if (error) throw new AdminActionError("ACTION_FAILED", "Existing companies could not be checked safely.", { cause: error });
    const matching = (data || []).some((company) => normalizeText(company.name).toLowerCase() === input.companyName.toLowerCase());
    if (matching) throw new AdminActionError("ACTION_CONFLICT", "A matching company already exists. Select it from Existing Company.");
    return createDryRunPreview({
      currentState: { assessment: definition.metadata.name, company: "Not created", policy: "Not created" },
      expectedResult: {
        company: input.companyName,
        manager: `${input.managerName} · ${input.managerEmail}`,
        access: isFreeCompanyScan(definition.metadata.id) ? "Free Scan access; neutral company wallet (0 / 0)" : `${input.credits} credits`,
        participantAllocation: isFreeCompanyScan(definition.metadata.id) ? input.participantAllocation : undefined,
        fundingType: isFreeCompanyScan(definition.metadata.id) ? "Free" : input.issuanceType === "complimentary" ? "Complimentary" : "Paid",
        issuanceType: isFreeCompanyScan(definition.metadata.id) ? "Free Scan" : input.issuanceType,
        reportVisibility: input.reportVisibility,
      },
      affectedRecords: [
        { type: "company", id: "new", label: input.companyName },
        { type: "access_token", id: "new", label: "Shared participant assessment link" },
        { type: "assessment_issuance_policy", id: "new", label: input.commercialReference },
        { type: "admin_action_audit", id: "new", label: "Company issuance audit" },
      ],
      warnings: [
        isFreeCompanyScan(definition.metadata.id) ? "This creates a company with neutral package and credit balances; allocation is stored only on the issuance policy." : "This creates live production access and allocates the full credit balance.",
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
      participantAllocation: input.participantAllocation,
      commercialReference: input.commercialReference,
      reportVisibility: input.reportVisibility,
      issuanceType: input.issuanceType,
    };
  },
  async execute(input, context) {
    const definition = currentEligibleDefinition(input.assessmentDefinitionId, input.assessmentDefinitionVersion);
    const scan = isFreeCompanyScan(definition.metadata.id);
    validatePolicy(input, context.actor.id);
    const database = client();
    let companyId = input.existingCompanyId;
    if (scan && !companyId) {
      const { data: duplicate, error: duplicateError } = await database
        .from("companies")
        .select("id, name")
        .eq("billing_email", input.managerEmail)
        .neq("id", context.requestId)
        .limit(20);
      if (duplicateError) throw new AdminActionError("ACTION_FAILED", "Existing companies could not be checked safely.", { cause: duplicateError });
      if ((duplicate || []).some((company) => normalizeText(company.name).toLowerCase() === input.companyName.toLowerCase())) {
        throw new AdminActionError("ACTION_CONFLICT", "A matching company already exists. Select it from Existing Company.");
      }

      const { error: companyError } = await database.from("companies").insert({
        id: context.requestId,
        name: input.companyName,
        billing_email: input.managerEmail,
        manager_name: input.managerName,
        package_size: 0,
        credits_balance: 0,
        is_offline_activated: false,
      });
      if (companyError && companyError.code !== "23505") {
        throw new AdminActionError("ACTION_FAILED", "The free-Scan company could not be created.", { cause: companyError });
      }
      if (companyError?.code === "23505") {
        const { data: retryCompany, error: retryError } = await database
          .from("companies")
          .select("id, name, billing_email, manager_name, package_size, credits_balance")
          .eq("id", context.requestId)
          .maybeSingle();
        if (retryError || !retryCompany
          || normalizeText(retryCompany.name).toLowerCase() !== input.companyName.toLowerCase()
          || normalizeText(retryCompany.billing_email).toLowerCase() !== input.managerEmail
          || normalizeText(retryCompany.manager_name) !== input.managerName
          || Number(retryCompany.package_size || 0) !== 0
          || Number(retryCompany.credits_balance || 0) !== 0) {
          throw new AdminActionError("ACTION_CONFLICT", "This operation ID is already associated with a different company.", { cause: retryError || companyError });
        }
      }
      companyId = context.requestId;
    }
    const { data, error } = await database.rpc("issue_company_assessment_access_admin_action", {
      p_request_id: context.requestId,
      p_existing_company_id: companyId,
      p_assessment_definition_id: input.assessmentDefinitionId,
      p_assessment_definition_version: input.assessmentDefinitionVersion,
      p_company_name: input.companyName,
      p_manager_name: input.managerName,
      p_manager_email: input.managerEmail,
      p_credits: scan ? 0 : input.credits,
      p_report_visibility: input.reportVisibility,
      p_commercial_reference: input.commercialReference,
      p_issuance_type: scan ? "complimentary" : input.issuanceType,
      p_language_mode: scan ? input.languageMode : "participant-choice",
      p_expires_at: scan ? input.expiresAt : null,
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
    if (scan) {
      const { error: allocationError } = await database
        .from("assessment_issuance_policies")
        .update({ quantity: input.participantAllocation })
        .eq("id", row.policy_id)
        .eq("company_id", row.company_id);
      if (allocationError) throw new AdminActionError("ACTION_FAILED", "The free-Scan participant allocation could not be stored.", { cause: allocationError });
    }
    const languageQuery = scan && input.languageMode !== "participant-choice"
      ? `&lang=${encodeURIComponent(input.languageMode)}`
      : "";
    return {
      policyId: String(row.policy_id),
      companyId: String(row.company_id),
      companyName: String(row.company_name),
      managerName: String(row.manager_name),
      managerEmail: String(row.manager_email),
      credits: Number(row.credits),
      participantAllocation: scan ? input.participantAllocation : Number(row.credits),
      reportVisibility: input.reportVisibility,
      employeeAssessmentPath: `/${definition.metadata.slug}?token=${encodeURIComponent(String(row.employee_token))}${languageQuery}`,
      managerDashboardPath: `/company/assessment-dashboard?managerToken=${encodeURIComponent(String(row.manager_token))}&assessment=${encodeURIComponent(definition.metadata.slug)}`,
      issuedAt: String(row.issued_at),
      administrator: context.actor.id,
      auditId: String(row.audit_id),
    };
  },
};
