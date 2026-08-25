export type AssessmentAiModule = {
  id: string;
  version: string;
  purpose: "participant-summary" | "manager-summary" | "executive-summary" | "coaching" | "recommendations" | "custom";
  enabled: boolean;
  deterministicFallbackRequired: boolean;
};

export type AssessmentFeatures = {
  ninetyDayPlan: boolean;
  dailySchedule: boolean;
  strengthsAndWeaknesses: boolean;
  recommendations: boolean;
  charts: boolean;
  managerSections: boolean;
  executiveSections: boolean;
  pdfExport: boolean;
  docxExport: boolean;
  emailDelivery: boolean;
  aiModules: AssessmentAiModule[];
};
