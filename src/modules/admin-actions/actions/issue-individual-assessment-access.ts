import "server-only";

import { assessmentRegistry } from "@/modules/assessment-definition";
import type { AssessmentIssuanceType, AssessmentReportVisibility } from "@/modules/assessment-issuance-policy/assessment-issuance-policy";
import { validateAssessmentIssuancePolicy } from "@/modules/assessment-issuance-policy/assessment-issuance-policy-validation";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type IssueIndividualAssessmentAccessInput = {
  assessmentDefinitionId: string;
  assessmentDefinitionVersion: string;
  recipientType: "individual" | "complimentary";
  participantName: string;
  participantEmail: string;
  issuanceType: AssessmentIssuanceType;
  commercialReference: string;
  reportVisibility: AssessmentReportVisibility;
};

export type IssueIndividualAssessmentAccessOutput = {
  policyId: string;
  participantName: string;
  participantEmail: string;
  directAccessPath: string;
  issuedAt: string;
  expiresAt: string | null;
  reportVisibility: AssessmentReportVisibility;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function definitionFor(input: IssueIndividualAssessmentAccessInput) {
  const definition = assessmentRegistry.getCurrent(input.assessmentDefinitionId);
  if (!definition || definition.metadata.version !== input.assessmentDefinitionVersion) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Select the current published assessment version.");
  }
  if (definition.metadata.id !== "outdoor_sales_scan" || !definition.capabilities.individualAvailability) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "This direct issuance path is limited to Outdoor Sales Scan.");
  }
  if (input.recipientType === "complimentary" && !definition.capabilities.complimentaryAccess) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Complimentary access is not enabled for this assessment.");
  }
  return definition;
}

function database() {
  const client = getSupabaseAdmin();
  if (!client) throw new AdminActionError("ACTION_FAILED", "Individual issuance is not configured.");
  return client;
}

export const issueIndividualAssessmentAccessAction: AdminActionDefinition<IssueIndividualAssessmentAccessInput, IssueIndividualAssessmentAccessOutput> = {
  id: "assessment-access.individual.issue",
  title: "Issue Individual Assessment Access",
  description: "Issue one governed direct Outdoor Sales Scan link through the existing access-token architecture.",
  permission: { anyOf: ["assessment-access.individual.issue"] },
  confirmation: {
    level: "dangerous",
    mode: "dangerous",
    title: "Issue direct assessment access",
    message: "This creates one live, named, single-use access token and an immutable issuance policy.",
    confirmLabel: "Issue Direct Access",
  },
  rollback: {
    mode: "manual",
    summary: "The token can be revoked through an approved database operation.",
    instructions: "Set revoked_at on the issued access token and retain the immutable policy and audit history.",
  },
  refresh: { strategy: "paths", paths: ["/admin/access-center"] },
  validateInput(input) {
    const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const normalized: IssueIndividualAssessmentAccessInput = {
      assessmentDefinitionId: normalize(value.assessmentDefinitionId),
      assessmentDefinitionVersion: normalize(value.assessmentDefinitionVersion),
      recipientType: (normalize(value.assessmentDefinitionId) === "outdoor_sales_scan" ? "individual" : normalize(value.recipientType)) as IssueIndividualAssessmentAccessInput["recipientType"],
      participantName: normalize(value.participantName),
      participantEmail: normalize(value.participantEmail).toLowerCase(),
      issuanceType: (normalize(value.assessmentDefinitionId) === "outdoor_sales_scan" ? "complimentary" : normalize(value.issuanceType)) as AssessmentIssuanceType,
      commercialReference: normalize(value.commercialReference),
      reportVisibility: normalize(value.reportVisibility) as AssessmentReportVisibility,
    };
    const fields: Record<string, string> = {};
    const scan = normalized.assessmentDefinitionId === "outdoor_sales_scan";
    if (!["individual", "complimentary"].includes(normalized.recipientType)) fields.recipientType = "Select Individual or Complimentary.";
    if (normalized.participantName.length < 2 || normalized.participantName.length > 200) fields.participantName = "Participant name must be 2 to 200 characters.";
    if (!EMAIL_PATTERN.test(normalized.participantEmail) || normalized.participantEmail.length > 254) fields.participantEmail = "Enter a valid participant email.";
    if (!["offline-paid", "online-paid", "complimentary"].includes(normalized.issuanceType)) fields.issuanceType = "Select issuance type.";
    if (normalized.recipientType === "complimentary" && normalized.issuanceType !== "complimentary") fields.issuanceType = "Complimentary recipients must use Complimentary issuance.";
    if (!["participant-only", "manager-only", "participant-and-manager", "admin-only"].includes(normalized.reportVisibility)) fields.reportVisibility = "Select report visibility.";
    if (scan && normalized.reportVisibility === "admin-only") fields.reportVisibility = "Admin only is not available for Outdoor Sales Scan.";
    if (!normalized.commercialReference || normalized.commercialReference.length > 200) fields.commercialReference = "Commercial reference is required and must not exceed 200 characters.";
    try { definitionFor(normalized); } catch (error) { fields.assessmentDefinitionId = error instanceof Error ? error.message : "Assessment is not eligible."; }
    return Object.keys(fields).length
      ? { ok: false, message: "Correct the highlighted fields.", fields }
      : { ok: true, value: normalized };
  },
  async dryRun(input, context) {
    const definition = definitionFor(input);
    const fundingType = input.assessmentDefinitionId === "outdoor_sales_scan" || input.recipientType === "complimentary" ? "complimentary" : "paid";
    validateAssessmentIssuancePolicy({
      assessmentDefinition: { id: input.assessmentDefinitionId, version: input.assessmentDefinitionVersion },
      accessType: "individual",
      fundingType,
      issuanceType: input.issuanceType,
      reportVisibility: input.reportVisibility,
      commercialReference: input.commercialReference,
    }, { id: context.actor.id });
    return createDryRunPreview({
      currentState: { assessment: definition.metadata.name, participant: "No direct entitlement" },
      expectedResult: { participant: `${input.participantName} · ${input.participantEmail}`, issuanceType: input.issuanceType, reportVisibility: input.reportVisibility },
      affectedRecords: [
        { type: "access_token", id: "new", label: "Named single-use entitlement" },
        { type: "assessment_issuance_policy", id: "new", label: input.commercialReference },
        { type: "admin_action_audit", id: "new", label: "Direct issuance audit" },
      ],
      warnings: [
        "This direct grant does not consume or modify company credits.",
        "The link is restricted to the named participant email and must be shared securely.",
        ...(["manager-only", "participant-and-manager"].includes(input.reportVisibility)
          ? ["No company is associated, so there is no manager dashboard for this direct issuance."]
          : []),
      ],
    });
  },
  auditMetadata(input) {
    return { assessmentDefinitionId: input.assessmentDefinitionId, participantEmail: input.participantEmail, issuanceType: input.issuanceType, reportVisibility: input.reportVisibility };
  },
  async execute(input, context) {
    const definition = definitionFor(input);
    const fundingType = input.assessmentDefinitionId === "outdoor_sales_scan" || input.recipientType === "complimentary" ? "complimentary" : "paid";
    const { data, error } = await database().rpc("issue_individual_assessment_access_admin_action", {
      p_request_id: context.requestId,
      p_assessment_id: input.assessmentDefinitionId,
      p_assessment_version: input.assessmentDefinitionVersion,
      p_participant_name: input.participantName,
      p_participant_email: input.participantEmail,
      p_funding_type: fundingType,
      p_issuance_type: input.issuanceType,
      p_report_visibility: input.reportVisibility,
      p_language_mode: "participant-choice",
      p_expires_at: null,
      p_reason: input.commercialReference,
      p_administrator_id: context.actor.id,
      p_administrator_role: context.actor.role,
    });
    if (error) throw new AdminActionError("ACTION_FAILED", "Direct assessment access could not be issued.", { cause: error });
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row?.policy_id || !row?.token_value) throw new AdminActionError("ACTION_FAILED", "Direct issuance returned an incomplete result.");
    return {
      policyId: String(row.policy_id),
      participantName: input.participantName,
      participantEmail: input.participantEmail,
      directAccessPath: `/${String(row.assessment_slug || definition.metadata.slug)}?token=${encodeURIComponent(String(row.token_value))}`,
      issuedAt: String(row.issued_at),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      reportVisibility: input.reportVisibility,
    };
  },
};
