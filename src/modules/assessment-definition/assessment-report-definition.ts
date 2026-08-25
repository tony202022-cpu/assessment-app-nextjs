import type { ReportDefinition } from "@/modules/report-engine";

export type AssessmentReportDefinition = {
  providerId: string;
  version: string;
  definitionId: string;
  supportedAudiences: Array<"participant" | "manager" | "executive" | "administrator">;
  /** Optional inline definition for future configuration loaders. */
  definition?: ReportDefinition;
};
