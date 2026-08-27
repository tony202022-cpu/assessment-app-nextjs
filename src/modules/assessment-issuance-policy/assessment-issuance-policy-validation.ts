import {
  ASSESSMENT_ACCESS_TYPES,
  ASSESSMENT_FUNDING_TYPES,
  ASSESSMENT_REPORT_VISIBILITIES,
  type AssessmentIssuanceActor,
  type CreateAssessmentIssuancePolicyInput,
} from "./assessment-issuance-policy";

export type AssessmentIssuancePolicyValidationErrorCode =
  | "INVALID_ASSESSMENT_DEFINITION"
  | "INVALID_ACCESS_TYPE"
  | "INVALID_FUNDING_TYPE"
  | "INVALID_REPORT_VISIBILITY"
  | "COMMERCIAL_REFERENCE_REQUIRED"
  | "INVALID_ACTOR";

export class AssessmentIssuancePolicyValidationError extends Error {
  constructor(
    readonly code: AssessmentIssuancePolicyValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AssessmentIssuancePolicyValidationError";
  }
}

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function validateAssessmentIssuancePolicy(
  input: CreateAssessmentIssuancePolicyInput,
  actor: AssessmentIssuanceActor,
): CreateAssessmentIssuancePolicyInput & { commercialReference: string } {
  const definitionId = String(input?.assessmentDefinition?.id || "").trim();
  const definitionVersion = String(input?.assessmentDefinition?.version || "").trim();
  if (!ID_PATTERN.test(definitionId) || !VERSION_PATTERN.test(definitionVersion)) {
    throw new AssessmentIssuancePolicyValidationError(
      "INVALID_ASSESSMENT_DEFINITION",
      "Choose a valid published assessment definition.",
    );
  }
  if (!ASSESSMENT_ACCESS_TYPES.includes(input.accessType)) {
    throw new AssessmentIssuancePolicyValidationError("INVALID_ACCESS_TYPE", "Choose a supported access type.");
  }
  if (!ASSESSMENT_FUNDING_TYPES.includes(input.fundingType)) {
    throw new AssessmentIssuancePolicyValidationError("INVALID_FUNDING_TYPE", "Choose a supported funding type.");
  }
  if (!ASSESSMENT_REPORT_VISIBILITIES.includes(input.reportVisibility)) {
    throw new AssessmentIssuancePolicyValidationError(
      "INVALID_REPORT_VISIBILITY",
      "Choose a supported report visibility policy.",
    );
  }
  const commercialReference = String(input.commercialReference || "").trim();
  if (!commercialReference || commercialReference.length > 200) {
    throw new AssessmentIssuancePolicyValidationError(
      "COMMERCIAL_REFERENCE_REQUIRED",
      "Enter a commercial reference of no more than 200 characters.",
    );
  }
  if (!String(actor?.id || "").trim() || String(actor.id).trim().length > 200) {
    throw new AssessmentIssuancePolicyValidationError("INVALID_ACTOR", "An accountable administrator is required.");
  }
  return {
    ...input,
    assessmentDefinition: { id: definitionId, version: definitionVersion },
    commercialReference,
  };
}
