export const COMPETENCY_ORDER = [
  'mental_toughness',
  'opening_conversations',
  'identifying_real_needs',
  'destroying_objections',
  'creating_irresistible_offers',
  'mastering_closing',
  'follow_up_discipline',
] as const;

export type CompId = (typeof COMPETENCY_ORDER)[number];

export const COMPETENCY_META: Record<
  CompId,
  {
    icon: string;
    labelEn: string;
    labelAr: string;
    diagnosticEn: string;
    diagnosticAr: string;
  }
> = {
  mental_toughness: {
    icon: "💪",
    labelEn: "Mental Toughness",
    labelAr: "القوة الذهنية",
    diagnosticEn: "Turns rejection into momentum in the field.",
    diagnosticAr: "تحوّل الرفض إلى زخم في الميدان.",
  },
  opening_conversations: {
    icon: "🗣️",
    labelEn: "Opening Conversations",
    labelAr: "فتح المحادثات",
    diagnosticEn: "Creates instant engagement with prospects.",
    diagnosticAr: "تصنع تفاعلاً فورياً مع العملاء المحتملين.",
  },
  identifying_real_needs: {
    icon: "🔍",
    labelEn: "Identifying Needs",
    labelAr: "تحديد الاحتياجات",
    diagnosticEn: "Uncovers real pain points behind the words.",
    diagnosticAr: "تكشف نقاط الألم الحقيقية خلف الكلمات.",
  },
  destroying_objections: {
    icon: "⚔️",
    labelEn: "Handling Objections",
    labelAr: "التعامل مع الاعتراضات",
    diagnosticEn: "Turns resistance into trust.",
    diagnosticAr: "تحوّل المقاومة إلى ثقة.",
  },
  creating_irresistible_offers: {
    icon: "🎁",
    labelEn: "Irresistible Offers",
    labelAr: "عروض لا تُقاوم",
    diagnosticEn: "Packages value so hesitation collapses.",
    diagnosticAr: "تُغلّف القيمة حتى ينهار التردد.",
  },
  mastering_closing: {
    icon: "🏁",
    labelEn: "Mastering Closing",
    labelAr: "إتقان الإغلاق",
    diagnosticEn: "Converts effort into signed deals.",
    diagnosticAr: "تحوّل الجهد إلى صفقات موقعة.",
  },
  follow_up_discipline: {
    icon: "🔄",
    labelEn: "Follow-Up Discipline",
    labelAr: "انضباط المتابعة",
    diagnosticEn: "Ensures no opportunity slips away.",
    diagnosticAr: "تضمن عدم ضياع أي فرصة.",
  },
};