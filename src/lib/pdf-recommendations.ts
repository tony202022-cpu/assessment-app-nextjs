// lib/pdf-recommendations.ts

export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";
export type Language = "en" | "ar";

type RecommendationBlock = {
  en: string[];
  ar: string[];
};

type RecommendationTiers = {
  Strength: RecommendationBlock;
  Opportunity: RecommendationBlock;
  Threat: RecommendationBlock;
  Weakness: RecommendationBlock;
};

/** Normalize competency ids so recommendations always match */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "handling_objections",
    handling_objections: "handling_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",
  };

  return map[clean] || clean;
}

export const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  mental_toughness: {
    Strength: {
      en: [
        "Lead by example with your resilience and emotional control.",
        "Take on tougher situations where your composure gives you an edge.",
        "Track peak-energy hours and plan key interactions during them.",
      ],
      ar: [
        "قد بالقدوة من خلال مرونتك وضبطك العاطفي.",
        "تحمّل المواقف الأصعب حيث يمنحك هدوؤك ميزة.",
        "تتبع ساعات ذروة طاقتك وخطط للتفاعلات المهمة خلالها.",
      ],
    },
    Opportunity: {
      en: [
        "Turn hesitation moments into learning loops.",
        "Use a pre-route ritual to prime confidence.",
        "Ask yourself mid-day what the best version of you would do.",
      ],
      ar: [
        "حوّل لحظات التردد إلى فرص تعلم.",
        "استخدم طقساً قبل الجولة لتهيئة الثقة.",
        "اسأل نفسك في منتصف اليوم ماذا سيفعل أفضل إصدار منك.",
      ],
    },
    Weakness: {
      en: [
        "Reset after tough interactions with a 30-second breathing break.",
        "Visualize handling the hardest stop calmly before arrival.",
        "Celebrate small wins to rebuild confidence quickly.",
      ],
      ar: [
        "أعد ضبط نفسك بعد المواقف الصعبة بتنفس لمدة 30 ثانية.",
        "تخيل التعامل بهدوء مع أصعب موقف قبل الوصول.",
        "احتفل بالانتصارات الصغيرة لإعادة بناء الثقة بسرعة.",
      ],
    },
    Threat: {
      en: [
        "Use a bounce-back phrase to stay consistent.",
        "Identify energy drains and plan counter-moves.",
        "Shift focus from closes to conversations.",
      ],
      ar: [
        "استخدم جملة ارتداد للحفاظ على الثبات.",
        "حدد مصادر استنزاف الطاقة وخطط لمواجهتها.",
        "حوّل تركيزك من الإغلاق إلى المحادثة.",
      ],
    },
  },

  opening_conversations: {
    Strength: {
      en: [
        "Mentor others on your opening technique.",
        "Test advanced hooks like storytelling.",
        "Document your best openers as playbooks.",
      ],
      ar: [
        "درّب الآخرين على أسلوبك في الافتتاح.",
        "اختبر تقنيات متقدمة مثل السرد القصصي.",
        "وثّق أفضل جملك الافتتاحية كأدلة.",
      ],
    },
    Opportunity: {
      en: [
        "Experiment with curiosity-based openers.",
        "Track which openers generate engagement.",
        "Pair openings with confident body language.",
      ],
      ar: [
        "جرّب افتتاحيات قائمة على الفضول.",
        "تتبع الجمل التي تحقق أعلى تفاعل.",
        "ادمج الافتتاحيات مع لغة جسد واثقة.",
      ],
    },
    Weakness: {
      en: [
        "Practice a 3-second opener daily.",
        "Start with low-pressure conversations.",
        "Use simple permission-based openers.",
      ],
      ar: [
        "تدرّب يومياً على جملة افتتاحية قصيرة.",
        "ابدأ بمحادثات منخفضة الضغط.",
        "استخدم جمل افتتاح بسيطة بطلب الإذن.",
      ],
    },
    Threat: {
      en: [
        "Refine your first 10 seconds.",
        "Prepare pivot questions to move forward.",
        "Warm up before key routes.",
      ],
      ar: [
        "حسّن أول 10 ثوانٍ من الحديث.",
        "حضّر أسئلة انتقالية ذكية.",
        "ابدأ بإحماء قبل الجولات المهمة.",
      ],
    },
  },

  identifying_real_needs: {
    Weakness: {
      en: [
        "Ask what matters most after every feature.",
        "Listen for emotional cues and explore them.",
        "Pause before responding to deepen insight."
      ],
      ar: [
        "اسأل عما يهمهم أكثر بعد كل ميزة.",
        "استمع للإشارات العاطفية واستكشفها.",
        "توقف قبل الرد لتعميق الفهم."
      ]
    },
    Threat: {
      en: [
        "Reframe needs questions toward outcomes.",
        "Take notes to identify repeated pain points.",
        "Summarize needs to confirm understanding."
      ],
      ar: [
        "أعد صياغة الأسئلة نحو النتائج.",
        "دوّن الملاحظات لتحديد الأوجاع المتكررة.",
        "لخص الاحتياجات لتأكيد الفهم."
      ]
    },
    Opportunity: {
      en: [
        "Ask why to uncover root motivation.",
        "Link needs to emotional drivers.",
        "Use silence strategically."
      ],
      ar: [
        "اسأل لماذا لكشف الدوافع الجذرية.",
        "اربط الاحتياجات بالمحفزات العاطفية.",
        "استخدم الصمت بذكاء."
      ]
    },
    Strength: {
      en: [
        "Teach the 3-Whys method.",
        "Create a needs-discovery playbook.",
        "Craft personalized value statements."
      ],
      ar: [
        "درّب على تقنية الأسئلة الثلاثة.",
        "أنشئ دليلاً لاكتشاف الاحتياجات.",
        "صِغ عبارات قيمة مخصصة."
      ]
    }
  },

  handling_objections: {
    Weakness: {
      en: [
        "Reframe objections into questions.",
        "Practice empathetic acknowledgment.",
        "Prepare replies for common objections."
      ],
      ar: [
        "حوّل الاعتراضات إلى أسئلة.",
        "تدرّب على الاعتراف التعاطفي.",
        "حضّر ردوداً للاعتراضات الشائعة."
      ]
    },
    Threat: {
      en: [
        "Treat objections as buying signals.",
        "Use feel-felt-found structure.",
        "Pause before responding."
      ],
      ar: [
        "تعامل مع الاعتراضات كإشارات شراء.",
        "استخدم أسلوب شعرت-شعر-وجد.",
        "توقف قبل الرد."
      ]
    },
    Opportunity: {
      en: [
        "Address objections early.",
        "Turn price into value discussion.",
        "Build an objections FAQ."
      ],
      ar: [
        "عالج الاعتراضات مبكراً.",
        "حوّل السعر إلى نقاش قيمة.",
        "أنشئ أسئلة شائعة للاعتراضات."
      ]
    },
    Strength: {
      en: [
        "Run objection-handling workshops.",
        "Create an objection playbook.",
        "Model calm under pressure."
      ],
      ar: [
        "قد ورش عمل للاعتراضات.",
        "أنشئ دليلاً للاعتراضات.",
        "كن قدوة في الهدوء تحت الضغط."
      ]
    }
  },

  creating_irresistible_offers: {
    Weakness: {
      en: [
        "Lead with personalized benefits.",
        "Use simple, clear language.",
        "Show clear before/after contrast."
      ],
      ar: [
        "ابدأ بفائدة مخصصة.",
        "استخدم لغة بسيطة وواضحة.",
        "أظهر فرقاً واضحاً بين قبل وبعد."
      ]
    },
    Threat: {
      en: [
        "Bundle features into outcomes.",
        "Add time-bound urgency.",
        "Test two offer versions."
      ],
      ar: [
        "اجمع الميزات في نتائج.",
        "أضف إلحاحاً زمنياً.",
        "اختبر نسختين من العرض."
      ]
    },
    Opportunity: {
      en: [
        "Customize offers per need.",
        "Use social proof.",
        "Tell short success stories."
      ],
      ar: [
        "خصص العروض حسب الاحتياج.",
        "استخدم الدليل الاجتماعي.",
        "استخدم قصص نجاح قصيرة."
      ]
    },
    Strength: {
      en: [
        "Template your best offers.",
        "A/B test advanced tactics.",
        "Coach emotional + logical selling."
      ],
      ar: [
        "حوّل أفضل عروضك إلى قوالب.",
        "اختبر تكتيكات متقدمة.",
        "درّب على البيع العاطفي والمنطقي."
      ]
    }
  },

  mastering_closing: {
    Weakness: {
      en: [
        "Use assumptive closes.",
        "Practice closing phrases daily.",
        "Ask for the sale clearly."
      ],
      ar: [
        "استخدم إغلاقات افتراضية.",
        "تدرب على عبارات الإغلاق يومياً.",
        "اطلب البيع بوضوح."
      ]
    },
    Threat: {
      en: [
        "Time your close carefully.",
        "Use trial closes.",
        "Stay silent after asking."
      ],
      ar: [
        "اختر توقيت الإغلاق بعناية.",
        "استخدم إغلاقات تجريبية.",
        "ابقَ صامتاً بعد السؤال."
      ]
    },
    Opportunity: {
      en: [
        "Create natural urgency.",
        "Bundle next steps.",
        "Use alternative-choice closes."
      ],
      ar: [
        "أنشئ إلحاحاً طبيعياً.",
        "اجمع الخطوات التالية.",
        "استخدم إغلاقات الاختيار البديل."
      ]
    },
    Strength: {
      en: [
        "Teach your closing rhythm.",
        "Track close-rate by tactic.",
        "Use momentum closes."
      ],
      ar: [
        "علّم إيقاع الإغلاق الخاص بك.",
        "تتبع معدل الإغلاق حسب التكتيك.",
        "استخدم إغلاقات الزخم."
      ]
    }
  },

  follow_up_discipline: {
    Weakness: {
      en: [
        "Block daily follow-up time.",
        "Use simple follow-up templates.",
        "Schedule follow-ups immediately."
      ],
      ar: [
        "خصّص وقتاً يومياً للمتابعة.",
        "استخدم قوالب متابعة بسيطة.",
        "جدول المتابعة فوراً."
      ]
    },
    Threat: {
      en: [
        "Batch follow-ups by channel.",
        "Add value to every follow-up.",
        "Track response timing."
      ],
      ar: [
        "جمّع المتابعات حسب القناة.",
        "أضف قيمة لكل متابعة.",
        "تتبع توقيت الردود."
      ]
    },
    Opportunity: {
      en: [
        "Personalize follow-ups.",
        "Automate reminders carefully.",
        "Test follow-up frequency."
      ],
      ar: [
        "خصص المتابعات.",
        "أتمت التذكيرات بحذر.",
        "اختبر تكرار المتابعة."
      ]
    },
    Strength: {
      en: [
        "Standardize your follow-up system.",
        "Create a follow-up playbook.",
        "Build reliability reputation."
      ],
      ar: [
        "وحّد نظام المتابعة.",
        "أنشئ دليلاً للمتابعة.",
        "ابنِ سمعة بالموثوقية."
      ]
    }
  }
};


export function getRecommendations(
  competencyId: string,
  tier: Tier,
  lang: Language
): string[] {
  const key = normalizeCompetencyId(competencyId);
  const rec = RECOMMENDATIONS[key]?.[tier];
  if (!rec) return [];
  return lang === "ar" ? rec.ar : rec.en;
}
