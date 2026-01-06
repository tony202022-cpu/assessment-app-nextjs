// src/lib/translations.ts

export type Language = "en" | "ar";

export type TranslationValue = string | number;

export type Translation = Record<
  string,
  {
    en: TranslationValue;
    ar: TranslationValue;
  }
>;

/**
 * Keep as const so TS preserves literal keys (useful when you autocomplete).
 * Still compatible with getTranslation(key: string, ...)
 */
const translations = {
  appName: { en: "Assessment Platform", ar: "منصة التقييم" },
  startAssessment: { en: "Start Assessment", ar: "ابدأ التقييم" },
  nextQuestion: { en: "Next Question", ar: "السؤال التالي" },
  previousQuestion: { en: "Previous Question", ar: "السؤال السابق" },
  submitQuiz: { en: "Submit Quiz", ar: "إرسال التقييم" },
  yourScore: { en: "Your Score:", ar: "درجتك:" },
  totalQuestions: { en: "Total Questions:", ar: "إجمالي الأسئلة:" },
  backToHome: { en: "Back to Home", ar: "العودة للصفحة الرئيسية" },
  adminPanel: { en: "Admin Panel", ar: "لوحة الإدارة" },
  addQuestion: { en: "Add Question", ar: "إضافة سؤال" },
  editQuestion: { en: "Edit Question", ar: "تعديل سؤال" },
  deleteQuestion: { en: "Delete Question", ar: "حذف سؤال" },
  questionTextEn: { en: "Question Text (English)", ar: "نص السؤال (الإنجليزية)" },
  questionTextAr: { en: "Question Text (Arabic)", ar: "نص السؤال (العربية)" },
  optionsEn: {
    en: "Options (English, comma-separated)",
    ar: "الخيارات (الإنجليزية، مفصولة بفاصلة)",
  },
  optionsAr: {
    en: "Options (Arabic, comma-separated)",
    ar: "الخيارات (العربية، مفصولة بفاصلة)",
  },
  correctAnswerIndex: {
    en: "Correct Answer Index (0-based)",
    ar: "مؤشر الإجابة الصحيحة (يبدأ من 0)",
  },
  saveQuestion: { en: "Save Question", ar: "حفظ السؤال" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  questionAddedSuccess: { en: "Question added successfully!", ar: "تمت إضافة السؤال بنجاح!" },
  questionUpdatedSuccess: { en: "Question updated successfully!", ar: "تم تحديث السؤال بنجاح!" },
  questionDeletedSuccess: { en: "Question deleted successfully!", ar: "تم حذف السؤال بنجاح!" },
  errorAddingQuestion: { en: "Error adding question.", ar: "حدث خطأ أثناء إضافة السؤال." },
  errorUpdatingQuestion: { en: "Error updating question.", ar: "حدث خطأ أثناء تحديث السؤال." },
  errorDeletingQuestion: { en: "Error deleting question.", ar: "حدث خطأ أثناء حذف السؤال." },
  errorFetchingQuestions: { en: "Error fetching questions.", ar: "حدث خطأ أثناء جلب الأسئلة." },
  errorSubmittingQuiz: { en: "Error submitting quiz.", ar: "حدث خطأ أثناء إرسال التقييم." },
  loginRequired: { en: "Please log in to access this page.", ar: "الرجاء تسجيل الدخول للوصول إلى هذه الصفحة." },
  quizCompleted: { en: "Quiz Completed!", ar: "اكتمل التقييم!" },
  quizNotFound: { en: "Quiz attempt not found.", ar: "لم يتم العثور على محاولة التقييم." },
  loading: { en: "Loading...", ar: "جار التحميل..." },
  noQuestions: {
    en: "No questions available. Please add some from the admin panel.",
    ar: "لا توجد أسئلة متاحة. الرجاء إضافة بعضها من لوحة الإدارة.",
  },
  selectOption: { en: "Please select an option.", ar: "الرجاء اختيار خيار." },
  login: { en: "Login", ar: "تسجيل الدخول" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  welcome: { en: "Welcome", ar: "أهلاً بك" },
  home: { en: "Home", ar: "الرئيسية" },
  quiz: { en: "Quiz", ar: "التقييم" },
  results: { en: "Results", ar: "النتائج" },
  question: { en: "Question", ar: "سؤال" },
  option: { en: "Option", ar: "خيار" },
  areYouSure: {
    en: "Are you sure you want to delete this question?",
    ar: "هل أنت متأكد أنك تريد حذف هذا السؤال؟",
  },
  confirm: { en: "Confirm", ar: "تأكيد" },
  cancelDelete: { en: "Cancel", ar: "إلغاء" },
} as const satisfies Translation;

/**
 * Returns ALWAYS a string (so it matches UI component prop types on Vercel).
 */
export function getTranslation(key: string, lang: Language): string {
  const entry = (translations as Translation)[key];
  const value = entry?.[lang] ?? entry?.en ?? key;
  return String(value);
}

/**
 * Optional: exported for debugging / admin tools, if you need it elsewhere.
 */
export { translations };
