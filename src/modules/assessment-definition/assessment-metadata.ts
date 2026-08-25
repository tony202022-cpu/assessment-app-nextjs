export type AssessmentStatus = "draft" | "published" | "retired" | "archived";
export type AssessmentType = "diagnostic" | "knowledge" | "skills" | "survey" | "personality" | "custom";

export type AssessmentIconSet = {
  primary: string;
  compact?: string;
  monochrome?: string;
};

export type AssessmentThemeReference = {
  id: string;
  version: string;
  reportThemeId?: string;
};

export type AssessmentMetadata = {
  id: string;
  version: string;
  name: string;
  slug: string;
  status: AssessmentStatus;
  type: AssessmentType;
  description?: string;
  owner: string;
  publishedAt?: string;
  retiredAt?: string;
  theme: AssessmentThemeReference;
  icons: AssessmentIconSet;
  tags?: string[];
};
