import "server-only";

import { assessmentRegistry, type AssessmentRegistry } from "@/modules/assessment-definition";
import type {
  AssessmentIssuanceActor,
  AssessmentIssuancePolicy,
  CreateAssessmentIssuancePolicyInput,
} from "./assessment-issuance-policy";
import {
  createAssessmentIssuancePolicyRepository,
  type AssessmentIssuancePolicyRepository,
} from "./assessment-issuance-policy-repository";
import {
  AssessmentIssuancePolicyValidationError,
  validateAssessmentIssuancePolicy,
} from "./assessment-issuance-policy-validation";

export class AssessmentIssuancePolicyService {
  constructor(
    private readonly repository: AssessmentIssuancePolicyRepository =
      createAssessmentIssuancePolicyRepository(),
    private readonly definitions: AssessmentRegistry = assessmentRegistry,
  ) {}

  async create(
    input: CreateAssessmentIssuancePolicyInput,
    actor: AssessmentIssuanceActor,
  ): Promise<AssessmentIssuancePolicy> {
    const validated = validateAssessmentIssuancePolicy(input, actor);
    const current = this.definitions.getCurrent(validated.assessmentDefinition.id);
    if (!current || current.metadata.version !== validated.assessmentDefinition.version) {
      throw new AssessmentIssuancePolicyValidationError(
        "INVALID_ASSESSMENT_DEFINITION",
        "Assessment issuance must reference the current published definition.",
      );
    }
    return this.repository.create(validated, { id: actor.id.trim() });
  }

  findById(id: string): Promise<AssessmentIssuancePolicy | null> {
    return this.repository.findById(id);
  }
}
