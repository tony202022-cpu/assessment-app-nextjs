export type ReportAudience = "participant" | "manager" | "executive" | "administrator";
export type ReportDirection = "ltr" | "rtl";

export type ReportIdentitySnapshot = {
  displayName?: string;
  companyName?: string;
  roleTitle?: string;
};

export type ReportProvenance = {
  attemptId: string;
  assessmentVersion: string;
  scoringVersion: string;
  reportVersion: string;
  completedAt: string;
};

export type ReportContext<TFacts extends Record<string, unknown> = Record<string, unknown>> = {
  reportId: string;
  assessmentId: string;
  locale: string;
  direction: ReportDirection;
  audience: ReportAudience;
  generatedAt: string;
  identity: Readonly<ReportIdentitySnapshot>;
  provenance: Readonly<ReportProvenance>;
  /** Canonical, authorized, already-calculated report facts. */
  facts: Readonly<TFacts>;
};

export function readReportFact(context: ReportContext, path: string): unknown {
  if (!path.trim()) return undefined;
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[key];
  }, context.facts);
}
