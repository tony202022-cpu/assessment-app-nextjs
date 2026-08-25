export type LocalizedAssessmentText = Readonly<Record<string, string>>;

export type AssessmentCompetencyDefinition = {
  id: string;
  order: number;
  label: LocalizedAssessmentText;
  description?: LocalizedAssessmentText;
  aliases?: string[];
  parentId?: string;
  reportKey: string;
};

export type AssessmentCompetencyModel = {
  id: string;
  version: string;
  competencies: AssessmentCompetencyDefinition[];
};
