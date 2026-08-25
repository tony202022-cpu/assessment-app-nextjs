import type { AssessmentAccessPolicy } from "./assessment-access-policy";
import type { AssessmentAudience } from "./assessment-audience";
import type { AssessmentCapabilities } from "./assessment-capabilities";
import type { AssessmentCompetencyModel } from "./assessment-competency-model";
import type { AssessmentFeatures } from "./assessment-features";
import type { AssessmentLocalization } from "./assessment-localization";
import type { AssessmentMetadata } from "./assessment-metadata";
import type { AssessmentPricing } from "./assessment-pricing";
import type { AssessmentReportDefinition } from "./assessment-report-definition";

export type AssessmentQuestionSource = {
  providerId: string;
  version: string;
  kind: "database" | "versioned-content" | "external-provider";
  questionCount: number;
  timeLimitMinutes?: number;
  randomization: "none" | "questions" | "questions-and-options";
};

export type AssessmentScoringStrategy = {
  providerId: string;
  strategyId: string;
  version: string;
  mode: "deterministic";
};

export type AssessmentDefinition = {
  metadata: AssessmentMetadata;
  capabilities: AssessmentCapabilities;
  audience: AssessmentAudience;
  accessPolicy: AssessmentAccessPolicy;
  localization: AssessmentLocalization;
  competencyModel: AssessmentCompetencyModel;
  questionSource: AssessmentQuestionSource;
  scoringStrategy: AssessmentScoringStrategy;
  report: AssessmentReportDefinition;
  pricing: AssessmentPricing;
  features: AssessmentFeatures;
};

export function assessmentDefinitionKey(definition: AssessmentDefinition): string {
  return `${definition.metadata.id}@${definition.metadata.version}`;
}
