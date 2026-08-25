import type { ReportAudience } from "./report-context";

export type ReportSectionKind =
  | "executive-summary"
  | "competencies"
  | "charts"
  | "strengths"
  | "weaknesses"
  | "recommendations"
  | "ninety-day-plan"
  | "daily-schedule"
  | "manager"
  | "executive"
  | "custom";

export type ReportTemplate = {
  id: string;
  version: string;
  layout: "single-column" | "two-column" | "executive";
  sectionOrder: string[];
  pageBreakBefore?: string[];
  audienceSections?: Partial<Record<ReportAudience, string[]>>;
  header?: { enabled: boolean; titleKey?: string };
  footer?: { enabled: boolean; textKey?: string; showPageNumbers?: boolean };
};
