import { getRecommendations, normalizeCompetencyId, tierFromPercentage, type Language, type Tier } from "@/lib/pdf-recommendations";
import { buildSmeBusinessRevival90DayPlan } from "@/lib/sme-business-revival-90day";
import { ReportEngine, type RecommendationModel, type ReportContext, type RenderedReport } from "@/modules/report-engine";
import { smeBusinessHealthReportDefinition } from "./sme-report-definition";

export type LegacySmeCompetencyResult = { competencyId?: string; key?: string; percentage?: number };
export type SmeReportInput = {
  reportId: string;
  attemptId: string;
  assessmentVersion: string;
  scoringVersion: string;
  completedAt: string;
  generatedAt: string;
  locale: Language;
  identity?: { displayName?: string; companyName?: string; roleTitle?: string };
  totalPercentage: number;
  competencyResults: readonly LegacySmeCompetencyResult[];
  executiveSummary: string;
};

export type SmeCanonicalCompetency = { competencyId: string; percentage: number; tier: Tier };
export type SmeCanonicalReportFacts = {
  executiveSummary: string;
  competencies: SmeCanonicalCompetency[];
  chart: { type: "bar"; series: Array<{ label: string; value: number }>; min: number; max: number };
  strengths: SmeCanonicalCompetency[];
  weakestCompetencies: SmeCanonicalCompetency[];
  recommendations: RecommendationModel[];
  ninetyDayPlan: ReturnType<typeof buildSmeBusinessRevival90DayPlan>;
  dailySchedule: ReturnType<typeof buildSmeBusinessRevival90DayPlan>;
  overallPercentage: number;
};

export function buildSmeCanonicalReportFacts(input: SmeReportInput): SmeCanonicalReportFacts {
  const competencies = input.competencyResults.map((row) => {
    const competencyId = normalizeCompetencyId(row.competencyId || row.key || "");
    const percentage = clampPercentage(row.percentage);
    return { competencyId, percentage, tier: tierFromPercentage(percentage) };
  });
  const ordered = [...competencies].sort((a, b) => a.percentage - b.percentage || a.competencyId.localeCompare(b.competencyId));
  const weakestCompetencies = ordered.slice(0, 6);
  const recommendations = weakestCompetencies.flatMap((row) =>
    getRecommendations(row.competencyId, row.tier, input.locale).map((action, index) => ({
      id: `${row.competencyId}-${row.tier.toLowerCase()}-${index + 1}`,
      title: row.competencyId,
      rationale: action,
      priority: String(index + 1),
    })),
  );
  const ninetyDayPlan = buildSmeBusinessRevival90DayPlan(weakestCompetencies.map((row) => ({ ...row, label: row.competencyId })), input.locale);
  return {
    executiveSummary: input.executiveSummary,
    competencies,
    chart: { type: "bar", series: competencies.map((row) => ({ label: row.competencyId, value: row.percentage })), min: 0, max: 100 },
    strengths: competencies.filter((row) => row.tier === "Strength"),
    weakestCompetencies,
    recommendations,
    ninetyDayPlan,
    dailySchedule: ninetyDayPlan,
    overallPercentage: clampPercentage(input.totalPercentage),
  };
}

export function renderSmeWithUniversalReportEngine(input: SmeReportInput, engine = new ReportEngine()): RenderedReport {
  const facts = buildSmeCanonicalReportFacts(input);
  const context: ReportContext<SmeCanonicalReportFacts & Record<string, unknown>> = {
    reportId: input.reportId,
    assessmentId: "sme_business_health_mri",
    locale: input.locale,
    direction: input.locale === "ar" ? "rtl" : "ltr",
    audience: "participant",
    generatedAt: input.generatedAt,
    identity: input.identity || {},
    provenance: {
      attemptId: input.attemptId,
      assessmentVersion: input.assessmentVersion,
      scoringVersion: input.scoringVersion,
      reportVersion: smeBusinessHealthReportDefinition.version,
      completedAt: input.completedAt,
    },
    facts,
  };
  return engine.render(smeBusinessHealthReportDefinition, context);
}

function clampPercentage(value: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
