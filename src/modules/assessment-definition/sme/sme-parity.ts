import type { RenderedReport } from "@/modules/report-engine";
import type { LegacySmeQuestion, LegacySmeScoreResult } from "./sme-providers";
import { SME_REPORT_SECTION_IDS } from "./sme-report-definition";

export type SmeParitySnapshot = {
  questions: readonly LegacySmeQuestion[];
  competencies: readonly string[];
  scores: LegacySmeScoreResult;
  percentages: readonly number[];
  recommendations: readonly string[];
  weakestCompetencies: readonly string[];
  reportSections: readonly string[];
  localization: Readonly<Record<string, readonly string[]>>;
};

export type SmeParityDifference = { field: keyof SmeParitySnapshot; message: string };
export type SmeParityResult = { equivalent: boolean; differences: SmeParityDifference[] };

export function compareSmeParity(legacy: SmeParitySnapshot, migrated: SmeParitySnapshot): SmeParityResult {
  const differences: SmeParityDifference[] = [];
  for (const field of Object.keys(legacy) as Array<keyof SmeParitySnapshot>) {
    if (stableJson(legacy[field]) !== stableJson(migrated[field])) differences.push({ field, message: `${field} differs between the legacy and universal pipelines.` });
  }
  return { equivalent: differences.length === 0, differences };
}

export function reportSectionsFromUniversalReport(report: RenderedReport): string[] {
  return report.sections.map((section) => section.id);
}

export function expectedLegacySmeReportSections(): string[] {
  return [...SME_REPORT_SECTION_IDS];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
