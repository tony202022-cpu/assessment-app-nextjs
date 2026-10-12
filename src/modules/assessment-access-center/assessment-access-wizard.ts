import {
  ASSESSMENT_FUNDING_TYPES,
  ASSESSMENT_REPORT_VISIBILITIES,
  type AssessmentFundingType,
  type AssessmentReportVisibility,
} from "@/modules/assessment-issuance-policy/assessment-issuance-policy";

export const ASSESSMENT_RECIPIENT_TYPES = ["company", "individual", "complimentary"] as const;
export type AssessmentRecipientType = (typeof ASSESSMENT_RECIPIENT_TYPES)[number];

export type AssessmentAccessCatalogItem = {
  id: string;
  version: string;
  name: string;
  slug: string;
  languages: string[];
  individualAvailable: boolean;
  companyAvailable: boolean;
  companyIssuanceAvailable: boolean;
  complimentaryAvailable: boolean;
};

export type AssessmentAccessWizardState = {
  assessmentId: string;
  accessType: AssessmentRecipientType | "";
  existingCompanyId: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: string;
  participantAllocation: string;
  participantName: string;
  participantEmail: string;
  fundingType: AssessmentFundingType | "";
  issuanceType: "offline-paid" | "online-paid" | "complimentary" | "";
  commercialReference: string;
  reportVisibility: AssessmentReportVisibility | "";
  languageMode: "participant-choice" | "en" | "ar";
  expiresAt: string;
};

export type AssessmentAccessWizardErrors = Partial<Record<keyof AssessmentAccessWizardState, string>>;

export const EMPTY_ASSESSMENT_ACCESS_WIZARD: AssessmentAccessWizardState = {
  assessmentId: "",
  accessType: "",
  existingCompanyId: "",
  companyName: "",
  managerName: "",
  managerEmail: "",
  credits: "",
  participantAllocation: "",
  participantName: "",
  participantEmail: "",
  fundingType: "",
  issuanceType: "",
  commercialReference: "",
  reportVisibility: "",
  languageMode: "participant-choice",
  expiresAt: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAssessmentAccessWizardStep(
  step: number,
  state: AssessmentAccessWizardState,
  assessments: readonly AssessmentAccessCatalogItem[],
): AssessmentAccessWizardErrors {
  const errors: AssessmentAccessWizardErrors = {};
  const assessment = assessments.find((item) => item.id === state.assessmentId);
  const freeCompanyScan = ["outdoor_sales_scan", "sales_manager_scan"].includes(assessment?.id || "");

  if (step >= 1 && !assessment) errors.assessmentId = "Select a current published assessment.";
  if (step >= 2) {
    if (!ASSESSMENT_RECIPIENT_TYPES.includes(state.accessType as AssessmentRecipientType)) {
      errors.accessType = "Select Company / Team, Individual, or Complimentary access.";
    } else if (state.accessType === "company" && (!assessment?.companyAvailable || !assessment.companyIssuanceAvailable)) {
      errors.accessType = "Company issuance is not connected to the existing production manager dashboard for this assessment.";
    } else if (["individual", "complimentary"].includes(state.accessType) && !assessment?.individualAvailable) {
      errors.accessType = "Individual access is not available for this assessment.";
    } else if (state.accessType === "complimentary" && !assessment?.complimentaryAvailable) {
      errors.accessType = "Complimentary access is not available for this assessment.";
    }
  }

  if (step >= 3 && state.accessType === "company") {
    if (!state.companyName.trim()) errors.companyName = "Company name is required.";
    if (!state.managerName.trim()) errors.managerName = "Manager name is required.";
    if (!EMAIL_PATTERN.test(state.managerEmail.trim())) errors.managerEmail = "Enter a valid manager email.";
    if (freeCompanyScan) {
      const allocation = Number(state.participantAllocation);
      if (!Number.isSafeInteger(allocation) || allocation < 1 || allocation > 100000) errors.participantAllocation = "Participant allocation must be a whole number between 1 and 100,000.";
    } else {
      const credits = Number(state.credits);
      const minimumCredits = state.existingCompanyId ? 0 : 1;
      if (!Number.isSafeInteger(credits) || credits < minimumCredits || credits > 100000) errors.credits = `Seats must be a whole number between ${minimumCredits} and 100,000.`;
    }
    if (freeCompanyScan && !["participant-choice", "en", "ar"].includes(state.languageMode)) errors.languageMode = "Select a language mode.";
    if (freeCompanyScan && state.expiresAt) {
      const expiry = new Date(state.expiresAt);
      const maximum = Date.now() + 366 * 24 * 60 * 60 * 1000;
      if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > maximum) errors.expiresAt = "Expiry must be in the future and within 366 days.";
    }
  }

  if (step >= 3 && ["individual", "complimentary"].includes(state.accessType)) {
    if (!state.participantName.trim()) errors.participantName = "Participant name is required.";
    if (!EMAIL_PATTERN.test(state.participantEmail.trim())) errors.participantEmail = "Enter a valid participant email.";
    if (!freeCompanyScan && !ASSESSMENT_FUNDING_TYPES.includes(state.fundingType as AssessmentFundingType)) {
      errors.fundingType = "Select Paid or Complimentary funding.";
    } else if (state.fundingType === "complimentary" && !assessment?.complimentaryAvailable) {
      errors.fundingType = "Complimentary funding is not available for this assessment.";
    }
  }

  if (step >= 3 && !freeCompanyScan && !["offline-paid", "online-paid", "complimentary"].includes(state.issuanceType)) {
    errors.issuanceType = "Select an issuance type.";
  }

  if (step >= 3) {
    const reference = state.commercialReference.trim();
    if ((!freeCompanyScan && !reference) || reference.length > 200) {
      errors.commercialReference = freeCompanyScan ? "Note must not exceed 200 characters." : "Commercial reference is required and must not exceed 200 characters.";
    }
  }

  if (step >= 4 && !ASSESSMENT_REPORT_VISIBILITIES.includes(state.reportVisibility as AssessmentReportVisibility)) {
    errors.reportVisibility = "Select who may view the report.";
  }
  if (step >= 4 && freeCompanyScan && state.reportVisibility === "admin-only") {
    errors.reportVisibility = "Free Scans support Participant only, Manager only, or Participant + Manager.";
  }
  return errors;
}
