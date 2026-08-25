import type { ReportAudience } from "./report-context";
import type { ReportTheme } from "./report-theme";
import type { ReportSectionKind, ReportTemplate } from "./report-template";

export type LocalizedText = string | Readonly<Record<string, string>>;

export type ReportWidgetDefinition = {
  id: string;
  kind: "text" | "metric" | "competency-list" | "chart" | "list" | "recommendation-list" | "plan" | "schedule" | "ai-summary" | "custom";
  title?: LocalizedText;
  dataPath: string;
  rendererId?: string;
  options?: Readonly<Record<string, unknown>>;
};

export type ReportSectionDefinition = {
  id: string;
  kind: ReportSectionKind;
  title: LocalizedText;
  audiences?: ReportAudience[];
  widgets: ReportWidgetDefinition[];
};

export type ReportDefinition = {
  id: string;
  version: string;
  assessmentId: string;
  supportedLocales: string[];
  defaultLocale: string;
  template: ReportTemplate;
  theme: ReportTheme;
  sections: ReportSectionDefinition[];
};

export function resolveLocalizedText(text: LocalizedText | undefined, locale: string, fallbackLocale: string): string | undefined {
  if (text === undefined || typeof text === "string") return text as string | undefined;
  return text[locale] || text[fallbackLocale] || Object.values(text)[0];
}

export function validateReportDefinition(definition: ReportDefinition): string[] {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push("Report definition ID is required.");
  if (!definition.version.trim()) errors.push("Report definition version is required.");
  if (!definition.assessmentId.trim()) errors.push("Assessment ID is required.");
  if (!definition.supportedLocales.includes(definition.defaultLocale)) errors.push("Default locale must be supported.");
  const ids = new Set<string>();
  for (const section of definition.sections) {
    if (!section.id.trim() || ids.has(section.id)) errors.push(`Invalid or duplicate section ID: ${section.id || "(empty)"}.`);
    ids.add(section.id);
  }
  for (const sectionId of definition.template.sectionOrder) if (!ids.has(sectionId)) errors.push(`Template references unknown section: ${sectionId}.`);
  return errors;
}
