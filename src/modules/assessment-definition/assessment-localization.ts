export type AssessmentLocaleDirection = "ltr" | "rtl";

export type AssessmentLocaleDefinition = {
  locale: string;
  direction: AssessmentLocaleDirection;
  displayName: string;
  description?: string;
  resources: Readonly<Record<string, string>>;
};

export type AssessmentLocalization = {
  defaultLocale: string;
  supportedLocales: string[];
  requiredResourceKeys: string[];
  locales: Readonly<Record<string, AssessmentLocaleDefinition>>;
};
