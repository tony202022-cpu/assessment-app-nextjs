export interface QuestionOption {
  text: string;
}

export interface Question {
  id: string;
  question_en: string;
  question_ar: string;
  options_en: QuestionOption[];
  options_ar: QuestionOption[];

  // ✅ ADDED — type only, does NOT affect runtime or shuffle logic
  options_scores?: number[] | null;

  correct_answer_index: number;
  created_at: string;

  // (optional safety if DB includes it)
  competency_id?: string;
}

export type AnswerPayload = {
  questionId: string;
  competencyId: string;
  selectedScore: number;
};

export interface QuizAnswer {
  question_id: string;
  selected_option_index: number;
  is_correct?: boolean; // Optional, will be calculated on server
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  answers: QuizAnswer[];
  created_at: string;
}