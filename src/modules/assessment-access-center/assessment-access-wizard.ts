import {
  ASSESSMENT_ACCESS_TYPES,
  ASSESSMENT_FUNDING_TYPES,
  ASSESSMENT_REPORT_VISIBILITIES,
  type AssessmentAccessType,
  type AssessmentFundingType,
  type AssessmentReportVisibility,
} from "@/modules/assessment-issuance-policy/assessment-issuance-policy";

export type AssessmentAccessCatalogItem = {
  id: string;
  version: string;
  name: string;
  slug: string;
  languages: string[];
  individualAvailable: boolean;
  companyAvailable: boolean;
  complimentaryAvailable: boolean;
};

export type AssessmentAccessWizardState = {
  assessmentId: string;
  accessType: AssessmentAccessType | "";
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: string;
  participantName: string;
  participantEmail: string;
  fundingType: AssessmentFundingType | "";
  commercialReference: string;
  reportVisibility: AssessmentReportVisibility | "";
};

export type AssessmentAccessWizardErrors = Partial<Record<keyof AssessmentAccessWizardState, string>>;

export const EMPTY_ASSESSMENT_ACCESS_WIZARD: AssessmentAccessWizardState = {
  assessmentId: "",
  accessType: "",
  companyName: "",
  managerName: "",
  managerEmail: "",
  credits: "",
  participantName: "",
  participantEmail: "",
  fundingType: "",
  commercialReference: "",
  reportVisibility: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAssessmentAccessWizardStep(
  step: number,
  state: AssessmentAccessWizardState,
  assessments: readonly AssessmentAccessCatalogItem[],
): AssessmentAccessWizardErrors {
  const errors: AssessmentAccessWizardErrors = {};
  const assessment = assessments.find((item) => item.id === state.assessmentId);

  if (step >= 1 && !assessment) errors.assessmentId = "Select a current published assessment.";
  if (step >= 2) {
    if (!ASSESSMENT_ACCESS_TYPES.includes(state.accessType as AssessmentAccessType)) {
      errors.accessType = "Select Company or Individual access.";
    } else if (state.accessType === "company" && !assessment?.companyAvailable) {
      errors.accessType = "Company access is not available for this assessment.";
    } else if (state.accessType === "individual" && !assessment?.individualAvailable) {
      errors.accessType = "Individual access is not available for this assessment.";
    }
  }

  if (step >= 3 && state.accessType === "company") {
    if (!state.companyName.trim()) errors.companyName = "Company name is required.";
    if (!state.managerName.trim()) errors.managerName = "Manager name is required.";
    if (!EMAIL_PATTERN.test(state.managerEmail.trim())) errors.managerEmail = "Enter a valid manager email.";
    const credits = Number(state.credits);
    if (!Number.isSafeInteger(credits) || credits < 2) errors.credits = "Credits must be a whole number of at least 2.";
  }

  if (step >= 3 && state.accessType === "individual") {
    if (!state.participantName.trim()) errors.participantName = "Participant name is required.";
    if (!EMAIL_PATTERN.test(state.participantEmail.trim())) errors.participantEmail = "Enter a valid participant email.";
    if (!ASSESSMENT_FUNDING_TYPES.includes(state.fundingType as AssessmentFundingType)) {
      errors.fundingType = "Select Paid or Complimentary funding.";
    } else if (state.fundingType === "complimentary" && !assessment?.complimentaryAvailable) {
      errors.fundingType = "Complimentary funding is not available for this assessment.";
    }
  }

  if (step >= 3) {
    const reference = state.commercialReference.trim();
    if (!reference || reference.length > 200) {
      errors.commercialReference = "Commercial reference is required and must not exceed 200 characters.";
    }
  }

  if (step >= 4 && !ASSESSMENT_REPORT_VISIBILITIES.includes(state.reportVisibility as AssessmentReportVisibility)) {
    errors.reportVisibility = "Select who may view the report.";
  }
  return errors;
}
