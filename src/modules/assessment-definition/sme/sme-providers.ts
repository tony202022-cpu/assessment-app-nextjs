import type { AssessmentDefinition } from "../assessment-definition";

export type LegacySmeQuestion = {
  id: string;
  competency_id: string;
  question_en: string;
  question_ar: string;
  options_en: readonly string[];
  options_ar: readonly string[];
  options_scores?: readonly number[];
};

export type LegacySmeScoreResult = {
  totalPercentage: number;
  competencies: ReadonlyArray<{ competencyId: string; percentage: number }>;
};

export type ExistingSmeQuestionLoader = (assessmentId: string) => Promise<readonly LegacySmeQuestion[]>;
export type ExistingSmeScoringProvider<TAnswers> = (answers: TAnswers) => Promise<LegacySmeScoreResult> | LegacySmeScoreResult;

/** Delegates to the existing question source; it never stores or copies question content. */
export class SmeLegacyQuestionProvider {
  constructor(private readonly loadExistingQuestions: ExistingSmeQuestionLoader) {}

  load(definition: AssessmentDefinition): Promise<readonly LegacySmeQuestion[]> {
    this.assertProvider(definition.questionSource.providerId, "legacy.supabase.questions");
    return this.loadExistingQuestions(definition.metadata.id);
  }

  private assertProvider(actual: string, expected: string) {
    if (actual !== expected) throw new Error(`SME question provider mismatch: expected ${expected}.`);
  }
}

/** Delegates scoring to the existing server-authoritative assessment implementation. */
export class SmeLegacyScoringProvider<TAnswers> {
  constructor(private readonly scoreWithExistingAssessmentEngine: ExistingSmeScoringProvider<TAnswers>) {}

  score(definition: AssessmentDefinition, answers: TAnswers): Promise<LegacySmeScoreResult> {
    if (definition.scoringStrategy.providerId !== "legacy.actions.submitQuiz") {
      throw new Error("SME scoring provider does not reference the existing Assessment Engine.");
    }
    return Promise.resolve(this.scoreWithExistingAssessmentEngine(answers));
  }
}
