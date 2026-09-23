export const ASSESSMENT_ACCESS_TYPES = ["company", "individual"] as const;
export type AssessmentAccessType = (typeof ASSESSMENT_ACCESS_TYPES)[number];

export const ASSESSMENT_FUNDING_TYPES = ["paid", "complimentary"] as const;
export type AssessmentFundingType = (typeof ASSESSMENT_FUNDING_TYPES)[number];

export const ASSESSMENT_REPORT_VISIBILITIES = [
  "participant-only",
  "manager-only",
  "participant-and-manager",
  "admin-only",
] as const;
export type AssessmentReportVisibility = (typeof ASSESSMENT_REPORT_VISIBILITIES)[number];

export type AssessmentDefinitionReference = {
  id: string;
  version: string;
};

export type AssessmentIssuancePolicy = {
  id: string;
  assessmentDefinition: AssessmentDefinitionReference;
  accessType: AssessmentAccessType;
  fundingType: AssessmentFundingType;
  reportVisibility: AssessmentReportVisibility;
  commercialReference: string;
  issuedBy: string;
  issuedAt: string;
};

export function canParticipantViewReport(value: AssessmentReportVisibility) {
  return value === "participant-only" || value === "participant-and-manager";
}

export function canManagerViewReport(value: AssessmentReportVisibility) {
  return value === "manager-only" || value === "participant-and-manager";
}

export type CreateAssessmentIssuancePolicyInput = {
  assessmentDefinition: AssessmentDefinitionReference;
  accessType: AssessmentAccessType;
  fundingType: AssessmentFundingType;
  reportVisibility: AssessmentReportVisibility;
  commercialReference: string;
};

export type AssessmentIssuanceActor = {
  id: string;
};
