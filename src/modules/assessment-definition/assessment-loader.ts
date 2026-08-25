import type { AssessmentDefinition } from "./assessment-definition";

export type AssessmentValidationIssue = {
  code: "REQUIRED" | "VERSION_INVALID" | "DUPLICATE_ID" | "DUPLICATE_SLUG" | "LOCALIZATION_INCOMPLETE" | "FEATURE_INCOMPATIBLE" | "VALUE_INVALID";
  path: string;
  message: string;
};

export class AssessmentDefinitionValidationError extends Error {
  constructor(readonly issues: AssessmentValidationIssue[]) {
    super(`Assessment definition is invalid: ${issues.map((issue) => issue.message).join(" ")}`);
    this.name = "AssessmentDefinitionValidationError";
  }
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function object(value: unknown): value is Record<string, any> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
function issue(issues: AssessmentValidationIssue[], code: AssessmentValidationIssue["code"], path: string, message: string) { issues.push({ code, path, message }); }

export class AssessmentLoader {
  validate(value: unknown): AssessmentValidationIssue[] {
    const issues: AssessmentValidationIssue[] = [];
    if (!object(value)) return [{ code: "REQUIRED", path: "$", message: "Assessment definition must be an object." }];
    const definition = value as Partial<AssessmentDefinition>;
    for (const field of ["metadata", "capabilities", "audience", "accessPolicy", "localization", "competencyModel", "questionSource", "scoringStrategy", "report", "pricing", "features"] as const) {
      if (!object(definition[field])) issue(issues, "REQUIRED", field, `${field} is required.`);
    }
    if (issues.length) return issues;

    const metadata = definition.metadata!;
    if (!nonEmpty(metadata.id) || !ID_PATTERN.test(metadata.id)) issue(issues, "VALUE_INVALID", "metadata.id", "Assessment ID must be a canonical lowercase identifier.");
    if (!nonEmpty(metadata.slug) || !SLUG_PATTERN.test(metadata.slug)) issue(issues, "VALUE_INVALID", "metadata.slug", "Assessment slug must use lowercase kebab-case.");
    for (const [path, value] of [["metadata.name", metadata.name], ["metadata.owner", metadata.owner], ["metadata.theme.id", metadata.theme?.id], ["metadata.icons.primary", metadata.icons?.primary]] as const) {
      if (!nonEmpty(value)) issue(issues, "REQUIRED", path, `${path} is required.`);
    }
    this.validateVersion(metadata.version, "metadata.version", issues);
    this.validateVersion(definition.competencyModel!.version, "competencyModel.version", issues);
    this.validateVersion(definition.questionSource!.version, "questionSource.version", issues);
    this.validateVersion(definition.scoringStrategy!.version, "scoringStrategy.version", issues);
    this.validateVersion(definition.report!.version, "report.version", issues);

    const localization = definition.localization!;
    if (!Array.isArray(localization.supportedLocales) || !localization.supportedLocales.length) issue(issues, "REQUIRED", "localization.supportedLocales", "At least one locale is required.");
    if (!localization.supportedLocales?.includes(localization.defaultLocale)) issue(issues, "LOCALIZATION_INCOMPLETE", "localization.defaultLocale", "Default locale must be supported.");
    const localeSet = new Set<string>();
    for (const locale of localization.supportedLocales || []) {
      if (!nonEmpty(locale) || localeSet.has(locale)) issue(issues, "LOCALIZATION_INCOMPLETE", "localization.supportedLocales", `Invalid or duplicate locale: ${locale || "(empty)"}.`);
      localeSet.add(locale);
      const entry = localization.locales?.[locale];
      if (!entry || entry.locale !== locale || !nonEmpty(entry.displayName)) issue(issues, "LOCALIZATION_INCOMPLETE", `localization.locales.${locale}`, `Locale ${locale} is incomplete.`);
      for (const key of localization.requiredResourceKeys || []) if (!nonEmpty(entry?.resources?.[key])) issue(issues, "LOCALIZATION_INCOMPLETE", `localization.locales.${locale}.resources.${key}`, `Locale ${locale} is missing resource ${key}.`);
    }

    const competencyIds = new Set<string>();
    const competencyOrders = new Set<number>();
    if (!definition.competencyModel!.competencies?.length) issue(issues, "REQUIRED", "competencyModel.competencies", "At least one competency is required.");
    for (const competency of definition.competencyModel!.competencies || []) {
      if (!nonEmpty(competency.id) || competencyIds.has(competency.id)) issue(issues, "VALUE_INVALID", `competencyModel.competencies.${competency.id || "unknown"}`, "Competency IDs must be present and unique.");
      competencyIds.add(competency.id);
      if (!Number.isInteger(competency.order) || competencyOrders.has(competency.order)) issue(issues, "VALUE_INVALID", `competencyModel.competencies.${competency.id}.order`, "Competency order must be a unique integer.");
      competencyOrders.add(competency.order);
      if (!nonEmpty(competency.reportKey)) issue(issues, "REQUIRED", `competencyModel.competencies.${competency.id}.reportKey`, "Competency report key is required.");
      for (const locale of localization.supportedLocales || []) if (!nonEmpty(competency.label?.[locale])) issue(issues, "LOCALIZATION_INCOMPLETE", `competencyModel.competencies.${competency.id}.label.${locale}`, `Competency ${competency.id} is missing its ${locale} label.`);
    }

    if (!Number.isInteger(definition.questionSource!.questionCount) || definition.questionSource!.questionCount < 1) issue(issues, "VALUE_INVALID", "questionSource.questionCount", "Question count must be a positive integer.");
    if (definition.capabilities!.timed && (!Number.isFinite(definition.questionSource!.timeLimitMinutes) || Number(definition.questionSource!.timeLimitMinutes) <= 0)) issue(issues, "FEATURE_INCOMPATIBLE", "questionSource.timeLimitMinutes", "Timed assessments require a positive time limit.");
    this.validateCompatibility(definition as AssessmentDefinition, issues);
    return issues;
  }

  load(value: unknown): Readonly<AssessmentDefinition> {
    const issues = this.validate(value);
    if (issues.length) throw new AssessmentDefinitionValidationError(issues);
    return deepFreeze(value as AssessmentDefinition);
  }

  loadMany(values: readonly unknown[]): ReadonlyArray<Readonly<AssessmentDefinition>> {
    const definitions = values.map((value) => this.load(value));
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const issues: AssessmentValidationIssue[] = [];
    for (const definition of definitions) {
      const id = `${definition.metadata.id}@${definition.metadata.version}`;
      const slug = `${definition.metadata.slug}@${definition.metadata.version}`;
      if (ids.has(id)) issue(issues, "DUPLICATE_ID", "metadata.id", `Duplicate assessment ID and version: ${id}.`);
      if (slugs.has(slug)) issue(issues, "DUPLICATE_SLUG", "metadata.slug", `Duplicate assessment slug and version: ${slug}.`);
      ids.add(id); slugs.add(slug);
    }
    if (issues.length) throw new AssessmentDefinitionValidationError(issues);
    return definitions;
  }

  private validateVersion(value: unknown, path: string, issues: AssessmentValidationIssue[]) {
    if (!nonEmpty(value) || !VERSION_PATTERN.test(value)) issue(issues, "VERSION_INVALID", path, `${path} must be a semantic version.`);
  }

  private validateCompatibility(definition: AssessmentDefinition, issues: AssessmentValidationIssue[]) {
    const { capabilities, accessPolicy, audience, report, features, localization, pricing } = definition;
    if (capabilities.individualAvailability !== accessPolicy.individualEnabled) issue(issues, "FEATURE_INCOMPATIBLE", "accessPolicy.individualEnabled", "Individual capability and access policy must agree.");
    if (capabilities.corporateAvailability !== accessPolicy.corporateEnabled) issue(issues, "FEATURE_INCOMPATIBLE", "accessPolicy.corporateEnabled", "Corporate capability and access policy must agree.");
    if (capabilities.managerDashboard && (!capabilities.corporateAvailability || !accessPolicy.managerAccessEnabled)) issue(issues, "FEATURE_INCOMPATIBLE", "capabilities.managerDashboard", "Manager Dashboard requires corporate and manager access.");
    if (capabilities.bilingual && localization.supportedLocales.length < 2) issue(issues, "FEATURE_INCOMPATIBLE", "capabilities.bilingual", "Bilingual assessments require at least two locales.");
    if (features.managerSections && (!capabilities.managerReport || !report.supportedAudiences.includes("manager"))) issue(issues, "FEATURE_INCOMPATIBLE", "features.managerSections", "Manager sections require a manager report audience.");
    if (features.executiveSections && (!capabilities.executiveReport || !report.supportedAudiences.includes("executive") || !audience.supported.includes("executive"))) issue(issues, "FEATURE_INCOMPATIBLE", "features.executiveSections", "Executive sections require executive capability and audience support.");
    if (features.aiModules.some((module) => module.enabled && !module.deterministicFallbackRequired)) issue(issues, "FEATURE_INCOMPATIBLE", "features.aiModules", "Enabled AI modules require a deterministic fallback.");
    if (pricing.model === "fixed" && !pricing.individual) issue(issues, "FEATURE_INCOMPATIBLE", "pricing.individual", "Fixed pricing requires an individual price.");
    if (report.definition && (report.definition.id !== report.definitionId || report.definition.version !== report.version || report.definition.assessmentId !== definition.metadata.id)) issue(issues, "FEATURE_INCOMPATIBLE", "report.definition", "Inline Report Engine definition identity must match the assessment report reference.");
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
