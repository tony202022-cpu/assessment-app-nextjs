// src/lib/reportSections.ts
export type ReportLang = "en" | "ar";

export type SectionType =
  | "cover"
  | "executive_summary"
  | "competency"
  | "swot"
  | "plan_90_days"
  | "bonuses"
  | "bump_offer";

export type MRICompetencyKey =
  | "mental_toughness"
  | "opening_conversations"
  | "identifying_real_needs"
  | "handling_objections"
  | "creating_irresistible_offers"
  | "mastering_closing"
  | "follow_up_discipline"
  | "consultative_selling"
  | "time_territory_management"
  | "product_expertise"
  | "negotiation_skills"
  | "attitude_motivation_mindset"
  | "dealing_with_boss"
  | "handling_difficult_customers"
  | "handling_difficult_colleagues";

export type ReportSection =
  | { id: string; type: "cover"; title_en: string; title_ar: string }
  | { id: string; type: "executive_summary"; title_en: string; title_ar: string }
  | { id: string; type: "competency"; key: MRICompetencyKey; title_en: string; title_ar: string }
  | { id: string; type: "swot"; title_en: string; title_ar: string }
  | { id: string; type: "plan_90_days"; title_en: string; title_ar: string }
  | { id: string; type: "bonuses"; title_en: string; title_ar: string }
  | { id: string; type: "bump_offer"; title_en: string; title_ar: string };

export const MRI_REPORT_SECTIONS: ReportSection[] = [
  { id: "cover", type: "cover", title_en: "Overview", title_ar: "نظرة عامة" },
  { id: "executive_summary", type: "executive_summary", title_en: "Executive Summary", title_ar: "الملخص التنفيذي" },

  { id: "c_mental_toughness", type: "competency", key: "mental_toughness", title_en: "Mental Toughness", title_ar: "الصلابة الذهنية" },
  { id: "c_opening_conversations", type: "competency", key: "opening_conversations", title_en: "Opening Conversations", title_ar: "فتح المحادثات" },
  { id: "c_identifying_real_needs", type: "competency", key: "identifying_real_needs", title_en: "Identifying Real Needs", title_ar: "تحديد الاحتياجات الحقيقية" },
  { id: "c_handling_objections", type: "competency", key: "handling_objections", title_en: "Handling Objections", title_ar: "التعامل مع الاعتراضات" },
  { id: "c_creating_irresistible_offers", type: "competency", key: "creating_irresistible_offers", title_en: "Creating Irresistible Offers", title_ar: "إنشاء عروض لا تُقاوَم" },
  { id: "c_mastering_closing", type: "competency", key: "mastering_closing", title_en: "Mastering Closing", title_ar: "إتقان الإغلاق" },
  { id: "c_follow_up_discipline", type: "competency", key: "follow_up_discipline", title_en: "Follow-Up Discipline", title_ar: "انضباط المتابعة" },
  { id: "c_consultative_selling", type: "competency", key: "consultative_selling", title_en: "Consultative Selling", title_ar: "المبيعات الاستشارية" },
  { id: "c_time_territory_management", type: "competency", key: "time_territory_management", title_en: "Time & Territory Management", title_ar: "إدارة الوقت والمنطقة" },
  { id: "c_product_expertise", type: "competency", key: "product_expertise", title_en: "Product Expertise", title_ar: "الخبرة في المنتج" },
  { id: "c_negotiation_skills", type: "competency", key: "negotiation_skills", title_en: "Negotiation Skills", title_ar: "مهارات التفاوض" },
  { id: "c_attitude_motivation_mindset", type: "competency", key: "attitude_motivation_mindset", title_en: "Attitude & Motivation", title_ar: "عقلية التحفيز والموقف" },
  { id: "c_dealing_with_boss", type: "competency", key: "dealing_with_boss", title_en: "Dealing with Boss", title_ar: "التعامل مع المدير" },
  { id: "c_handling_difficult_customers", type: "competency", key: "handling_difficult_customers", title_en: "Difficult Customers", title_ar: "التعامل مع العملاء الصعبين" },
  { id: "c_handling_difficult_colleagues", type: "competency", key: "handling_difficult_colleagues", title_en: "Difficult Colleagues", title_ar: "التعامل مع الزملاء الصعبين" },

  { id: "strategic_swot", type: "swot", title_en: "Strategic SWOT", title_ar: "تحليل SWOT الاستراتيجي" },
  { id: "plan_90_days", type: "plan_90_days", title_en: "90-Day Action Plan", title_ar: "خطة عمل 90 يوم" },
  { id: "bonuses", type: "bonuses", title_en: "Bonuses", title_ar: "المكافآت" },
  { id: "bump_offer", type: "bump_offer", title_en: "Next Step", title_ar: "الخطوة التالية" },
];
