"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";
import { getQuizAttempt } from "@/lib/actions";

export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */
type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

interface CompetencyResult {
  competencyId: string;
  score: number;
  maxScore: number;
  percentage: number;
  tier: Tier;
}

/* =========================================================
   COMPETENCY META (SINGLE SOURCE OF TRUTH)
========================================================= */
const COMPETENCY_META: Record<
  string,
  { labelEn: string; labelAr: string; diagnosticEn: string; diagnosticAr: string }
> = {
  mental_toughness: {
    labelEn: "Mental Toughness",
    labelAr: "الصلابة الذهنية",
    diagnosticEn: "Your ability to stay focused, resilient, and emotionally stable during field challenges.",
    diagnosticAr: "قدرتك على البقاء مركزاً ومرناً ومستقراً عاطفياً أثناء تحديات العمل الميداني.",
  },
  opening_conversations: {
    labelEn: "Opening Conversations",
    labelAr: "فتح المحادثات",
    diagnosticEn: "How effectively you initiate conversations and create positive first impressions.",
    diagnosticAr: "مدى فعالية بدء المحادثات وخلق انطباعات أولى إيجابية.",
  },
  identifying_real_needs: {
    labelEn: "Identifying Real Needs",
    labelAr: "تحديد الاحتياجات الحقيقية",
    diagnosticEn: "Your skill in uncovering the customer's true motivations and buying triggers.",
    diagnosticAr: "مهارتك في كشف الدوافع الحقيقة ومحفزات الشراء لدى العميل.",
  },
  destroying_objections: {
    labelEn: "Handling Objections",
    labelAr: "التعامل مع الاعتراضات",
    diagnosticEn: "How well you neutralize resistance and guide prospects back to value.",
    diagnosticAr: "مدى قدرتك على تحييد المقاومة وتوجيه العميل نحو القيمة.",
  },
  creating_irresistible_offers: {
    labelEn: "Creating Irresistible Offers",
    labelAr: "إنشاء عروض لا تُقاوَم",
    diagnosticEn: "Your ability to craft compelling, high-value offers that excite prospects.",
    diagnosticAr: "قدرتك على إنشاء عروض جذابة وعالية القيمة تثير اهتمام العملاء.",
  },
  mastering_closing: {
    labelEn: "Mastering Closing",
    labelAr: "إتقان الإغلاق",
    diagnosticEn: "How effectively you guide prospects toward confident buying decisions.",
    diagnosticAr: "مدى فعالية توجيه العملاء نحو اتخاذ قرارات شراء بثقة.",
  },
  follow_up_discipline: {
    labelEn: "Follow-Up Discipline",
    labelAr: "انضباط المتابعة",
    diagnosticEn: "Your consistency in following up and converting warm leads into customers.",
    diagnosticAr: "مدى التزامك بالمتابعة وتحويل العملاء المحتملين إلى عملاء فعليين.",
  },
};

const COMPETENCY_ORDER = [
  "mental_toughness",
  "opening_conversations",
  "identifying_real_needs",
  "destroying_objections",
  "creating_irresistible_offers",
  "mastering_closing",
  "follow_up_discipline",
] as const;

/* =========================================================
   HELPERS
========================================================= */
const tierColor = (tier: Tier) => {
  if (tier === "Strength") return "#16a34a";
  if (tier === "Opportunity") return "#2563eb";
  if (tier === "Threat") return "#f59e0b";
  return "#ef4444";
};

const tierLabel = (tier: Tier, isArabic: boolean) => {
  if (!isArabic) return tier;
  if (tier === "Strength") return "قوة";
  if (tier === "Opportunity") return "فرصة";
  if (tier === "Threat") return "تهديد";
  return "ضعف";
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const normalizeCompetencyId = (id: string) => {
  const clean = (id || "").trim();
  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "destroying_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    // English labels
    "Mental Toughness": "mental_toughness",
    "Opening Conversations": "opening_conversations",
    "Identifying Real Needs": "identifying_real_needs",
    "Handling Objections": "destroying_objections",
    "Creating Irresistible Offers": "creating_irresistible_offers",
    "Mastering Closing": "mastering_closing",
    "Follow-Up Discipline": "follow_up_discipline",

    // Arabic labels
    "الصلابة الذهنية": "mental_toughness",
    "فتح المحادثات": "opening_conversations",
    "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
    "التعامل مع الاعتراضات": "destroying_objections",
    "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
    "إتقان الإغلاق": "mastering_closing",
    "انضباط المتابعة": "follow_up_discipline",
  };
  return map[clean] || clean;
};

/* =========================================================
   84 GOLDEN RECOMMENDATIONS (7 × 4 tiers × 3 = 84)
========================================================= */
type RecommendationBlock = { en: string[]; ar: string[] };
type RecommendationTiers = {
  Strength: RecommendationBlock;
  Opportunity: RecommendationBlock;
  Threat: RecommendationBlock;
  Weakness: RecommendationBlock;
};

const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  mental_toughness: {
    Weakness: {
      en: [
        "Reset quickly after tough interactions with a 30-second breathing break to keep your energy steady.",
        "Start your day with a quick mental warm-up by visualizing the hardest part of your route and seeing yourself win it.",
        "Celebrate small wins like initiating conversations or staying calm to rebuild confidence fast.",
      ],
      ar: [
        "أعد ضبط نفسك بسرعة بعد التفاعلات الصعبة مع استراحة تنفّس مدتها 30 ثانية للحفاظ على طاقتك ثابتة.",
        "ابدأ يومك بإحماء ذهني سريع عبر تصور أصعب جزء من طريقك ورؤية نفسك تنجح فيه.",
        "احتفل بالانتصارات الصغيرة مثل بدء المحادثات أو الحفاظ على الهدوء لإعادة بناء الثقة بسرعة.",
      ],
    },
    Threat: {
      en: [
        "Use a short bounce-back script to reset after tough moments and stay consistent.",
        "Identify what drains you—heat, fatigue, tough prospects—and plan simple counter-moves like hydration or shade breaks.",
        "Focus on daily conversation targets instead of closes to reduce pressure and boost performance.",
      ],
      ar: [
        "استخدم نصاً قصيراً للارتداد لإعادة الضبط بعد اللحظات الصعبة والبقاء ثابتاً.",
        "حدد ما يستنزفك—الحرارة، التعب، العملاء الصعبين—وخطّط لتحركات مضادة بسيطة مثل الترطيب أو فترات راحة في الظل.",
        "ركز على أهداف المحادثة اليومية بدلاً من الإغلاقات لتقليل الضغط وتعزيز الأداء.",
      ],
    },
    Opportunity: {
      en: [
        "Review moments where you hesitated or got thrown off and turn them into learning loops.",
        "Use a pre-route ritual like music or affirmations to prime your mindset before the first door.",
        "Ask yourself mid-day, 'What would the best version of me do right now?' to elevate your behavior instantly.",
      ],
      ar: [
        "راجع اللحظات التي ترددت فيها أو انحرفت وحولها إلى حلقات تعلم.",
        "استخدم طقساً قبل الانطلاق مثل الموسيقى أو التأكيدات لتهيئة عقليتك قبل الباب الأول.",
        "اسأل نفسك في منتصف اليوم: 'ماذا سيفعل أفضل إصدار مني الآن؟' لرفع سلوكك فوراً.",
      ],
    },
    Strength: {
      en: [
        "Lead by example with your resilience and share your routines to lift the team's energy.",
        "Take on tougher streets or time slots where your composure gives you an advantage.",
        "Track emotional patterns to identify your peak hours and route yourself strategically.",
      ],
      ar: [
        "قد بالقدوة من خلال مرونتك وشارك روتينك لرفع طاقة الفريق.",
        "تولَّ شوارع أو فترات زمنية أصعب حيث يمنحك هدوؤك ميزة.",
        "تتبع الأنماط العاطفية لتحديد ساعات الذروة وتوجيه نفسك استراتيجياً.",
      ],
    },
  },

  opening_conversations: {
    Weakness: {
      en: [
        "Practice a friendly 3-second opener daily in the mirror until it feels natural.",
        "Start with low-pressure situations (e.g., shopkeepers) to build conversational momentum.",
        "Use a simple phrase like 'Hi, I'm with [Company]—do you have 30 seconds?' to reduce friction.",
      ],
      ar: [
        "تدرّب يومياً على جملة افتتاحية ودودة مدتها 3 ثوانٍ أمام المرآة حتى تصبح طبيعية.",
        "ابدأ بوضعيات منخفضة الضغط (مثل أصحاب المحلات) لبناء زخم في المحادثة.",
        "استخدم عبارة بسيطة مثل 'مرحباً، أنا من [الشركة]—هل لديك 30 ثانية؟' لتقليل الاحتكاك.",
      ],
    },
    Threat: {
      en: [
        "Record your first 10 seconds of conversation and refine your tone for warmth and clarity.",
        "Prepare 3 open-ended questions to pivot smoothly from hello to value.",
        "Warm up with 2 easy doors before your main route to build rhythm.",
      ],
      ar: [
        "سجل أول 10 ثوانٍ من محادثتك وحسّن نبرة صوتك لتكون دافئة وواضحة.",
        "جهّز 3 أسئلة مفتوحة للانتقال بسلاسة من التحية إلى القيمة.",
        "ابدأ ببابين سهلين قبل جولتك الرئيسية لبناء الإيقاع.",
      ],
    },
    Opportunity: {
      en: [
        "Experiment with curiosity-based openers like 'What's the most interesting thing you've seen today?'",
        "Track which openers get the highest engagement and double down on them.",
        "Pair your opener with confident body language—smile, eye contact, open posture.",
      ],
      ar: [
        "جرّب جُملاً افتتاحية تعتمد على الفضول مثل: 'ما أكثر شيء مثير للاهتمام رأيته اليوم؟'",
        "تتبع الجمل التي تحصل على أعلى تفاعل وركز عليها.",
        "ادمج جملتك الافتتاحية مع لغة جسد واثقة—ابتسامة، تواصل بصري، وضعية منفتحة.",
      ],
    },
    Strength: {
      en: [
        "Mentor others on your signature opening technique that builds instant rapport.",
        "Use your natural ease to test advanced hooks like storytelling or humor.",
        "Document your top 3 openers and share them as team best practices.",
      ],
      ar: [
        "درّب الآخرين على أسلوبك المميز في الافتتاح الذي يبني تواصلاً فورياً.",
        "استخدم سهولتك الطبيعية لاختبار تقنيات متقدمة مثل السرد القصصي أو الفكاهة.",
        "وثّق أفضل 3 جمل افتتاحية لديك وشاركها كأفضل الممارسات للفريق.",
      ],
    },
  },

  identifying_real_needs: {
    Weakness: {
      en: [
        "Ask 'What matters most to you about this?' after every feature mention.",
        "Listen for emotional words (frustrated, excited, worried) and explore them.",
        "Pause 2 seconds after their answer before responding—creates space for depth.",
      ],
      ar: [
        "اسأل: 'ما الأهم لك في هذا؟' بعد كل مرة تُذكر فيها ميزة.",
        "انتبه للكلمات العاطفية (محبط، متحمس، قلق) واستكشفها.",
        "توقف ثانيتين بعد إجابتهم قبل الرد—يخلق مساحة للعمق.",
      ],
    },
    Threat: {
      en: [
        "Replace 'Do you need this?' with 'What would solving this do for you?'",
        "Take notes during conversations to spot recurring pain points.",
        "Practice active listening by summarizing their need in your own words.",
      ],
      ar: [
        "استبدل: 'هل تحتاج هذا؟' بـ 'ماذا سيفعل حلّ هذه المشكلة من أجلك؟'",
        "دوّن ملاحظات أثناء المحادثات لرصد نقاط الألم المتكررة.",
        "تدرّب على الإصغاء الفعّال بتلخيص احتياجهم بكلماتك.",
      ],
    },
    Opportunity: {
      en: [
        "Dig deeper with 'Why is that important?' to uncover root motivations.",
        "Connect their stated need to an unspoken emotional driver (security, pride, freedom).",
        "Use silence strategically—let them fill the gap with more revealing details.",
      ],
      ar: [
        "تعمّق بسؤال: 'لماذا هذا مهم؟' لكشف الدوافع الجذرية.",
        "اربط احتياجهم الصريح بدافع عاطفي غير معلن (الأمان، الفخر، الحرية).",
        "استخدم الصمت بذكاء—دعهم يضيفون تفاصيل أكثر كاشفة.",
      ],
    },
    Strength: {
      en: [
        "Teach your team the '3 Whys' technique to uncover true needs fast.",
        "Create a needs-discovery playbook based on your best conversations.",
        "Use your insight to craft personalized value statements on the spot.",
      ],
      ar: [
        "درّب فريقك على تقنية 'الأسئلة الثلاثة لماذا' لكشف الاحتياجات بسرعة.",
        "أنشئ دليلاً لاكتشاف الاحتياجات مبنياً على أفضل محادثاتك.",
        "استخدم بصيرتك لصياغة عبارات قيمة مخصصة فوراً.",
      ],
    },
  },

  destroying_objections: {
    Weakness: {
      en: [
        "Reframe 'I don't have time' as 'I get that—when would be better?' to keep dialogue open.",
        "Practice empathetic responses like 'Many feel that way—what's your biggest concern?'",
        "Prepare 3 go-to replies for common objections (price, timing, trust).",
      ],
      ar: [
        "أعد صياغة 'ليس لدي وقت' إلى 'أتفهم ذلك—متى سيكون وقتاً أفضل؟' للحفاظ على الحوار.",
        "تدرّب على ردود تعاطفية مثل 'الكثيرون يشعرون هكذا—ما أكبر مخاوفك؟'",
        "جهّز 3 ردود جاهزة للاعتراضات الشائعة (السعر، التوقيت، الثقة).",
      ],
    },
    Threat: {
      en: [
        "Treat objections as buying signals—respond with curiosity, not defense.",
        "Use the 'Feel, Felt, Found' method: 'I understand you feel X. Others felt that too, and found Y.'",
        "Pause before answering—shows respect and prevents rushed rebuttals.",
      ],
      ar: [
        "تعامل مع الاعتراضات كإشارات شراء—استجب بفضول، لا بدفاع.",
        "استخدم طريقة 'تشعر، شعر، وجد': 'أتفهم أنك تشعر بكذا. آخرون شعروا بذلك أيضاً، ووجدوا كذا.'",
        "توقف قبل الإجابة—يظهر الاحترام ويمنع الردود المتعجلة.",
      ],
    },
    Opportunity: {
      en: [
        "Anticipate objections early by addressing them in your initial pitch.",
        "Turn price objections into value conversations: 'What would this outcome be worth to you?'",
        "Collect objection patterns and build a team FAQ to sharpen responses.",
      ],
      ar: [
        "توقع الاعتراضات مبكراً بمعالجتها في عرضك الأولي.",
        "حوّل اعتراضات السعر إلى حوار عن القيمة: 'ما الذي تستحقه هذه النتيجة بالنسبة لك؟'",
        "اجمع أنماط الاعتراضات وأنشئ أسئلة شائعة للفريق لتحسين الردود.",
      ],
    },
    Strength: {
      en: [
        "Lead objection-handling workshops using your most challenging wins.",
        "Create an 'objection-to-opportunity' playbook for new reps.",
        "Model calm reframing under pressure so others copy your composure.",
      ],
      ar: [
        "قدّم ورشاً للتعامل مع الاعتراضات باستخدام نجاحاتك الأكثر تحدياً.",
        "أنشئ دليلاً لتحويل الاعتراضات إلى فرص للممثلين الجدد.",
        "قدّم نموذجاً لإعادة الصياغة بهدوء تحت الضغط ليتعلم الآخرون من هدوئك.",
      ],
    },
  },

  creating_irresistible_offers: {
    Weakness: {
      en: [
        "Start every offer with a personalized benefit: 'This saves you X hours/week.'",
        "Use simple language—avoid jargon. Say 'saves money' not 'cost optimization.'",
        "Anchor your offer with a clear before/after contrast.",
      ],
      ar: [
        "ابدأ كل عرض بميزة شخصية: 'هذا يوفر لك X ساعات أسبوعياً.'",
        "استخدم لغة بسيطة—تجنب المصطلحات. قل 'يوفر المال' لا 'تحسين التكلفة.'",
        "ارتكز عرضك على تباين واضح بين 'قبل' و'بعد'.",
      ],
    },
    Threat: {
      en: [
        "Bundle features into outcomes: 'Get faster closes + happier clients' vs listing tools.",
        "Add urgency with time-bound bonuses: 'Free onboarding if you start by Friday.'",
        "Test two versions of your offer—one benefit-focused, one feature-focused.",
      ],
      ar: [
        "اجمع الميزات في نتائج: 'إغلاقات أسرع + عملاء أكثر سعادة' بدلاً من سرد الأدوات.",
        "أضف إلحاحاً بمكافآت محددة زمنياً: 'تشغيل مجاني إذا بدأت قبل الجمعة.'",
        "جرّب نسختين من العرض—واحدة تركّز على الفوائد، وأخرى على الميزات.",
      ],
    },
    Opportunity: {
      en: [
        "Customize offers using insights from their needs and pain points.",
        "Include social proof: '90% of reps like you saw results in 2 weeks.'",
        "Use storytelling: 'One client was stuck like you—then they tried this...'",
      ],
      ar: [
        "خصّص عروضك باستخدام الرؤى من احتياجاتهم ونقاط ألمهم.",
        "أدرج دليلاً اجتماعياً: '90% من الممثلين مثلك رأوا نتائج خلال أسبوعين.'",
        "استخدم السرد القصصي: 'كان عميل عالقاً مثلك—ثم جرّب هذا...'",
      ],
    },
    Strength: {
      en: [
        "Package your best offers as templates for the team to replicate.",
        "A/B test advanced tactics like scarcity or exclusivity to refine your edge.",
        "Coach others on combining emotional + logical triggers in one offer.",
      ],
      ar: [
        "حوّل أفضل عروضك إلى قوالب قابلة للتكرار للفريق.",
        "اختبر تكتيكات متقدمة مثل الندرة أو الحصرية لتحسين ميزتك.",
        "درّب الآخرين على دمج المحفزات العاطفية والمنطقية في عرض واحد.",
      ],
    },
  },

  mastering_closing: {
    Weakness: {
      en: [
        "Use assumptive closes: 'Shall we start with Option A or B?' instead of 'Are you ready?'",
        "Practice closing phrases daily until they feel natural, not pushy.",
        "Ask for the sale directly but gently: 'Does this make sense to move forward?'",
      ],
      ar: [
        "استخدم إغلاقات افتراضية: 'هل نبدأ بالخيار أ أم ب؟' بدلاً من 'هل أنت مستعد؟'",
        "تدرّب على عبارات الإغلاق يومياً حتى تصبح طبيعية لا ضاغطة.",
        "اطلب القرار مباشرة ولكن بلطف: 'هل يبدو هذا منطقياً للمضي قدماً؟'",
      ],
    },
    Threat: {
      en: [
        "Time your close right after they express agreement or positive emotion.",
        "Use trial closes: 'How does this sound so far?' to gauge readiness.",
        "Stay silent after asking—let them answer first.",
      ],
      ar: [
        "اختر توقيت الإغلاق بعد أن يعبّروا عن اتفاق أو مشاعر إيجابية.",
        "استخدم إغلاقاً تجريبياً: 'كيف يبدو هذا حتى الآن؟' لقياس الجاهزية.",
        "ابقَ صامتاً بعد السؤال—دعهم يجيبون أولاً.",
      ],
    },
    Opportunity: {
      en: [
        "Create urgency with natural deadlines: 'This pricing locks in at month-end.'",
        "Bundle next steps: 'If we agree today, I'll handle setup by tomorrow.'",
        "Use alternative choice closes: 'Email or WhatsApp for the contract?'",
      ],
      ar: [
        "أنشئ إلحاحاً بمواعيد طبيعية: 'هذا السعر يُغلق بنهاية الشهر.'",
        "اجمع الخطوات التالية: 'إذا اتفقنا اليوم، سأتعامل مع الإعداد بحلول الغد.'",
        "استخدم إغلاق الاختيار البديل: 'بريد إلكتروني أم واتساب للعقد؟'",
      ],
    },
    Strength: {
      en: [
        "Teach your closing rhythm to new team members.",
        "Track your close rate by tactic to double down on what works.",
        "Use confidence to create momentum closes—natural next-step asks.",
      ],
      ar: [
        "درّب أعضاء الفريق الجدد على إيقاع الإغلاق لديك.",
        "تتبع معدل الإغلاق حسب التكتيك لتعزيز ما ينجح.",
        "استخدم الثقة لخلق 'إغلاقات زخم'—طلبات طبيعية للخطوة التالية.",
      ],
    },
  },

  follow_up_discipline: {
    Weakness: {
      en: [
        "Set a 10-minute daily block to send all follow-ups at once.",
        "Use templates: 'Checking in—did you have any questions about X?'",
        "Schedule follow-ups in your calendar immediately after the conversation.",
      ],
      ar: [
        "حدّد 10 دقائق يومياً لإرسال جميع المتابعات دفعة واحدة.",
        "استخدم قوالب: 'أتابع معك—هل لديك أي أسئلة حول X؟'",
        "جدول المتابعات فور انتهاء المحادثة.",
      ],
    },
    Threat: {
      en: [
        "Batch follow-ups by time of day—morning for emails, evening for calls.",
        "Add value in every follow-up: a tip, resource, or relevant insight.",
        "Track response rates to identify your best follow-up timing.",
      ],
      ar: [
        "جمّع المتابعات حسب وقت اليوم—الصباح للبريد، المساء للمكالمات.",
        "أضف قيمة في كل متابعة: نصيحة، مورد، أو رؤية ذات صلة.",
        "تتبع معدلات الرد لتحديد أفضل توقيت للمتابعة.",
      ],
    },
    Opportunity: {
      en: [
        "Personalize follow-ups with a reference to your last conversation.",
        "Use automation (reminders) but keep messages human and warm.",
        "Test different follow-up frequencies—some prospects need 3 touches, others 5.",
      ],
      ar: [
        "خصص المتابعات بالإشارة إلى آخر محادثة بينكما.",
        "استخدم الأتمتة (تذكيرات) لكن اجعل الرسائل بشرية ودافئة.",
        "اختبر تكرارات مختلفة—بعض العملاء يحتاجون 3 لمسات، وآخرون 5.",
      ],
    },
    Strength: {
      en: [
        "Share your follow-up system as a team standard.",
        "Create a follow-up playbook with templates for every scenario.",
        "Use consistency to build a reputation for reliability that closes deals.",
      ],
      ar: [
        "شارك نظام المتابعة كمعيار للفريق.",
        "أنشئ دليلاً للمتابعة بقوالب لكل سيناريو.",
        "استخدم الاتساق لبناء سمعة موثوقية تُغلق الصفقات.",
      ],
    },
  },
};

const getRecommendations = (competencyId: string, tier: Tier, lang: "en" | "ar"): string[] => {
  const key = normalizeCompetencyId(competencyId);
  const block = RECOMMENDATIONS?.[key]?.[tier];
  if (!block) return [];
  return lang === "ar" ? block.ar : block.en;
};

/* =================
   DONUT (PRINT SAFE)
================= */
function Donut({ value, color }: { value: number; color: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = clampPct(value);
  const dash = (pct / 100) * c;
  const rest = c - dash;

  return (
    <div className="relative w-[100px] h-[100px] mx-auto">
      <svg width="100" height="100" viewBox="0 0 100 100" className="donut-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${rest}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-gray-900">
        {pct}%
      </div>
    </div>
  );
}

/* =================
   MAIN
================= */
export default function PrintReportClient() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId") || "";

  const puppeteerMode = (searchParams.get("puppeteer") || "") === "1";

  // locale language is ONLY a fallback now
  const { language: localeLanguage } = useLocale();

  // ✅ report language priority:
  // 1) URL (?lang=ar|en)
  // 2) DB row language
  // 3) LocaleContext language
  const langParamRaw = (searchParams.get("lang") || "").toLowerCase();
  const langParam = langParamRaw === "ar" ? "ar" : langParamRaw === "en" ? "en" : null;

  const [reportLang, setReportLang] = useState<"en" | "ar">(langParam || (localeLanguage === "ar" ? "ar" : "en"));
  const isArabic = reportLang === "ar";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompetencyResult[]>([]);
  const [total, setTotal] = useState(0);

  // A) Fetch results (SERVER ACTION – no RLS/session issues)
  useEffect(() => {
    const load = async () => {
      // stable language for toast/messages inside this effect
      const uiLang: "en" | "ar" = langParam || (localeLanguage === "ar" ? "ar" : "en");
      const uiIsArabic = uiLang === "ar";

      if (!attemptId) {
        toast.error(uiIsArabic ? "لا يوجد attemptId" : "Missing attemptId");
        setLoading(false);
        return;
      }

      try {
        const data: any = await getQuizAttempt(attemptId);

        // ✅ finalize report language from DB if URL param not provided
        const dbLangRaw = String(data?.language || "").toLowerCase();
        const dbLang = dbLangRaw === "ar" ? "ar" : dbLangRaw === "en" ? "en" : null;
        const finalLang = langParam || dbLang || (localeLanguage === "ar" ? "ar" : "en");
        setReportLang(finalLang);

        const parsed = (data?.competency_results || []) as CompetencyResult[];
        const normalized = parsed.map((r) => ({
          ...r,
          competencyId: normalizeCompetencyId((r as any).competencyId),
        }));

        setResults(normalized);
        setTotal(Number(data?.total_percentage) || 0);
        setLoading(false);
      } catch (e) {
        console.error("getQuizAttempt error:", e);
        toast.error(uiIsArabic ? "خطأ في تحميل النتائج" : "Error loading results");
        setLoading(false);
      }
    };

    load();
    // ✅ IMPORTANT: do NOT depend on isArabic (it changes after setReportLang and can retrigger)
  }, [attemptId, langParam, localeLanguage]);

  // B) Stable order (and keep extras if any)
  const ordered = useMemo(() => {
    const map = new Map<string, CompetencyResult>();
    results.forEach((r) => map.set(r.competencyId, r));

    const orderedCore = COMPETENCY_ORDER.map((id) => map.get(id)).filter(Boolean) as CompetencyResult[];
    const extras = results.filter((r) => !(COMPETENCY_ORDER as readonly string[]).includes(r.competencyId));
    return [...orderedCore, ...extras];
  }, [results]);

  // C) Auto-print ONLY for humans (not Puppeteer)
  useEffect(() => {
    if (puppeteerMode) return;
    if (!loading && ordered.length > 0) {
      const t = window.setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error("Print error:", e);
        }
      }, 900);
      return () => window.clearTimeout(t);
    }
  }, [loading, ordered.length, puppeteerMode]);

  // D) PDF-ready signal for Puppeteer (prevents missing donut/total/cards)
  useEffect(() => {
    if (!puppeteerMode) return;
    if (loading) return;
    if (!ordered.length) return;

    let cancelled = false;

    (async () => {
      try {
        // @ts-ignore
        if (document?.fonts?.ready) await (document as any).fonts.ready;

        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        if (!cancelled) document.body.dataset.pdfReady = "1";
      } catch {
        if (!cancelled) document.body.dataset.pdfReady = "1";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [puppeteerMode, loading, ordered.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg font-semibold">
        {isArabic ? "جاري التحضير…" : "Preparing…"}
      </div>
    );
  }

  if (!ordered.length) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg font-semibold text-red-600">
        {isArabic ? "لا توجد نتائج" : "No results found"}
      </div>
    );
  }

  // SWOT lists
  const strengths = ordered.filter((c) => c.tier === "Strength");
  const opportunities = ordered.filter((c) => c.tier === "Opportunity");
  const threats = ordered.filter((c) => c.tier === "Threat");
  const weaknesses = ordered.filter((c) => c.tier === "Weakness");

  return (
    <div dir={isArabic ? "rtl" : "ltr"}>
      {/* Screen-only print button (some browsers block auto-print) */}
      <button
        onClick={() => window.print()}
        className="printbtn fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg print:hidden"
      >
        {isArabic ? "طباعة" : "Print"}
      </button>

      <div className="report-container">
        {/* ===== PAGE 1: COVER ===== */}
        <div className="page cover-page">
          <div className="logo-circle">D</div>
          <h1 className="cover-title">{isArabic ? "تقييم المبيعات الميدانية" : "Field Sales Assessment"}</h1>
          <h2 className="cover-subtitle">{isArabic ? "تحليل كفاءات ميدانية" : "Field Competency Analysis"}</h2>

          <div className="cover-info-grid">
            <div className="cover-info-card">
              <div className="cover-info-label">{isArabic ? "معرف المحاولة" : "Attempt ID"}</div>
              <div className="cover-info-value">{attemptId ? attemptId.slice(0, 8) : "—"}</div>
            </div>
            <div className="cover-info-card">
              <div className="cover-info-label">{isArabic ? "التاريخ" : "Date"}</div>
              <div className="cover-info-value">
                {(() => {
                  try {
                    return new Date().toLocaleDateString(isArabic ? "ar-AE" : "en-AU");
                  } catch {
                    return new Date().toLocaleDateString();
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="cover-score-section">
            <Donut value={total} color="#22c55e" />
            <p className="cover-score-label">{isArabic ? "النتيجة الإجمالية" : "Overall Score"}</p>
            <p className="cover-score-percentage">{clampPct(total)}%</p>
            <p className="cover-note">{isArabic ? "ملخص سريع لأدائك في 7 كفاءات أساسية." : "A fast snapshot of your 7 core competencies."}</p>
            <p className="cover-note-small">
              {isArabic
                ? "هذا التقرير يعكس نمطك السلوكي في الميدان — وليس معرفة نظرية."
                : "This report reflects your behavioral field pattern — not theoretical knowledge."}
            </p>
          </div>
        </div>

        {/* ===== PAGE 2: SUMMARY ===== */}
        <div className="page summary-page">
          <h2 className="section-title">{isArabic ? "ملخص الأداء" : "Performance Summary"}</h2>
          <p className="section-subtitle">{isArabic ? "النتائج مرتبة حسب الكفاءات الأساسية." : "Results ordered by the core competencies."}</p>

          <div className="competency-summary-grid">
            {ordered.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const label = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
              const diag = meta ? (isArabic ? meta.diagnosticAr : meta.diagnosticEn) : "";
              const pct = clampPct(c.percentage);
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="competency-summary-card">
                  <div className="competency-summary-header">
                    <h3 className="competency-summary-label">{label}</h3>
                    <span className="competency-summary-tier" style={{ color }}>
                      {tierLabel(c.tier, isArabic)}
                    </span>
                  </div>
                  <p className="competency-summary-diagnostic">{diag}</p>
                  <div className="competency-summary-progress">
                    <div className="competency-summary-bar-track">
                      <div className="competency-summary-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="competency-summary-percentage">{pct}%</span>
                    <span className="competency-summary-score">
                      {c.score}/{c.maxScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== PAGE 3: SWOT ===== */}
        <div className="page swot-page">
          <h2 className="section-title">{isArabic ? "تحليل SWOT" : "SWOT Analysis"}</h2>
          <p className="section-subtitle">{isArabic ? "نظرة سريعة على الصورة الاستراتيجية." : "A quick strategic overview."}</p>

          <div className="swot-grid">
            <div className="swot-card swot-strength">
              <h3 className="swot-card-title">{isArabic ? "نقاط القوة" : "Strengths"}</h3>
              <ul className="swot-list">
                {strengths.length ? (
                  strengths.map((c) => {
                    const key = normalizeCompetencyId(c.competencyId);
                    const meta = COMPETENCY_META[key];
                    return (
                      <li key={c.competencyId}>
                        • {(meta ? (isArabic ? meta.labelAr : meta.labelEn) : key) + ` (${clampPct(c.percentage)}%)`}
                      </li>
                    );
                  })
                ) : (
                  <li>{isArabic ? "لا يوجد" : "None"}</li>
                )}
              </ul>
            </div>

            <div className="swot-card swot-opportunity">
              <h3 className="swot-card-title">{isArabic ? "الفرص" : "Opportunities"}</h3>
              <ul className="swot-list">
                {opportunities.length ? (
                  opportunities.map((c) => {
                    const key = normalizeCompetencyId(c.competencyId);
                    const meta = COMPETENCY_META[key];
                    return (
                      <li key={c.competencyId}>
                        • {(meta ? (isArabic ? meta.labelAr : meta.labelEn) : key) + ` (${clampPct(c.percentage)}%)`}
                      </li>
                    );
                  })
                ) : (
                  <li>{isArabic ? "لا يوجد" : "None"}</li>
                )}
              </ul>
            </div>

            <div className="swot-card swot-weakness">
              <h3 className="swot-card-title">{isArabic ? "نقاط الضعف" : "Weaknesses"}</h3>
              <ul className="swot-list">
                {weaknesses.length ? (
                  weaknesses.map((c) => {
                    const key = normalizeCompetencyId(c.competencyId);
                    const meta = COMPETENCY_META[key];
                    return (
                      <li key={c.competencyId}>
                        • {(meta ? (isArabic ? meta.labelAr : meta.labelEn) : key) + ` (${clampPct(c.percentage)}%)`}
                      </li>
                    );
                  })
                ) : (
                  <li>{isArabic ? "لا يوجد" : "None"}</li>
                )}
              </ul>
            </div>

            <div className="swot-card swot-threat">
              <h3 className="swot-card-title">{isArabic ? "التهديدات" : "Threats"}</h3>
              <ul className="swot-list">
                {threats.length ? (
                  threats.map((c) => {
                    const key = normalizeCompetencyId(c.competencyId);
                    const meta = COMPETENCY_META[key];
                    return (
                      <li key={c.competencyId}>
                        • {(meta ? (isArabic ? meta.labelAr : meta.labelEn) : key) + ` (${clampPct(c.percentage)}%)`}
                      </li>
                    );
                  })
                ) : (
                  <li>{isArabic ? "لا يوجد" : "None"}</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* ===== PAGE 4: RECOMMENDATIONS ===== */}
        <div className="page recommendations-page">
          <h2 className="section-title">{isArabic ? "التوصيات المخصصة (21)" : "Personalized Recommendations (21)"}</h2>
          <p className="section-subtitle">
            {isArabic
              ? "ملاحظة: يتم عرض 3 توصيات لكل كفاءة وفق فئتك الحالية (قوة/فرصة/تهديد/ضعف) — المجموع 21 توصية."
              : "Note: You see 3 recommendations per competency based on your current tier (Strength/Opportunity/Threat/Weakness) — total 21 recommendations."}
          </p>

          <div className="recommendations-grid">
            {ordered.map((c) => {
              const key = normalizeCompetencyId(c.competencyId);
              const meta = COMPETENCY_META[key];
              const title = meta ? (isArabic ? meta.labelAr : meta.labelEn) : key;
              const recs = getRecommendations(key, c.tier, reportLang);
              const color = tierColor(c.tier);

              return (
                <div key={c.competencyId} className="recommendation-card">
                  <h3 className="recommendation-card-title" style={{ color }}>
                    {title}
                    <span className="recommendation-card-tier"> ({tierLabel(c.tier, isArabic)})</span>
                  </h3>
                  <ul className="recommendation-list">
                    {recs.length ? (
                      recs.map((r, i) => <li key={i}>• {r}</li>)
                    ) : (
                      <li>
                        {isArabic
                          ? "لا توجد توصيات لهذه الكفاءة (تحقق من competencyId في قاعدة البيانات)."
                          : "No recs (check DB competencyId)."}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== PAGE 5: UPSELL ===== */}
        <div className="page upsell-page">
          <h2 className="section-title">{isArabic ? "الخطوة التالية" : "Your Next Step"}</h2>
          <p className="section-subtitle">
            {isArabic ? "هذا التقرير هو التشخيص. النسخة المتقدمة هي الخطة + المتابعة." : "This report is diagnosis. The advanced version is the plan + accountability."}
          </p>

          <div className="upsell-box">
            <h3 className="upsell-title">
              {isArabic ? "MRI Outdoor Sales Assessment — النسخة المتقدمة" : "MRI Outdoor Sales Assessment — Advanced"}
            </h3>
            <ul className="upsell-features">
              <li>{isArabic ? "✅ 75 سؤالاً عميقاً — يكشف السلوك الحقيقي" : "✅ 75 deep questions — reveals real field behavior"}</li>
              <li>{isArabic ? "✅ 12 كفاءة — تشخيص أدق لنقاط القوة والخلل" : "✅ 12 competencies — sharper diagnosis of strengths & gaps"}</li>
              <li>{isArabic ? "✅ 25 صفحة تقرير PDF — تحليل احترافي تفصيلي" : "✅ 25-page PDF report — professional detailed analysis"}</li>
              <li>{isArabic ? "✅ خطة عمل 90 يوم — خطوات أسبوعية قابلة للتطبيق" : "✅ 90-day action plan — weekly, executable steps"}</li>
            </ul>

            {/* keep "#" safe (no jump) until you have the real link */}
            <a href="#" onClick={(e) => e.preventDefault()} className="upsell-cta">
              {isArabic ? "اطلب النسخة المتقدمة الآن" : "Get the Advanced Edition"}
            </a>
          </div>

          <div className="report-footer">{isArabic ? "Dyad © 2026" : "Dyad © 2026"}</div>
        </div>
      </div>

      {/* =================
         PRINT CSS + CAIRO FONT-FACE (LOCAL)
      ================= */}
      <style jsx global>{`
        /* ✅ Register Cairo from /public/fonts (works for browser + Puppeteer) */
        @font-face {
          font-family: "Cairo";
          src: url("/fonts/Cairo-Regular.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "Cairo";
          src: url("/fonts/Cairo-Bold.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }

        @page {
          size: A4;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          font-family: "Cairo", sans-serif;
          color: #111827;
          line-height: 1.6;
          unicode-bidi: isolate;
        }

        .report-container {
          width: 210mm;
          margin: 0 auto;
          overflow: visible;
        }

        .page {
          width: 210mm;

          /* ✅ IMPORTANT: allow content to extend (prevents cutting / missing sections) */
          min-height: 297mm;

          padding: 20mm;
          box-sizing: border-box;

          break-after: page;
          page-break-after: always;

          background: white;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: stretch;

          overflow: visible;
        }

        .page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        /* === RTL FIXES === */
        [dir="rtl"] {
          direction: rtl;
          text-align: right;
        }

        [dir="rtl"] .cover-info-grid {
          direction: rtl;
        }

        [dir="rtl"] .cover-info-label,
        [dir="rtl"] .cover-info-value {
          text-align: right;
        }

        [dir="rtl"] .competency-summary-header {
          flex-direction: row-reverse;
        }

        [dir="rtl"] .competency-summary-label {
          text-align: right;
        }

        [dir="rtl"] .competency-summary-percentage,
        [dir="rtl"] .competency-summary-score {
          text-align: left;
        }

        [dir="rtl"] .swot-list,
        [dir="rtl"] .recommendation-list,
        [dir="rtl"] .upsell-features {
          padding-right: 25px;
          padding-left: 0;
        }

        [dir="rtl"] .swot-list li,
        [dir="rtl"] .recommendation-list li,
        [dir="rtl"] .upsell-features li {
          text-align: right;
        }

        /* ✅ Prevent ugly splits across pages */
        .competency-summary-card,
        .recommendation-card,
        .swot-card,
        .upsell-box {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Cover Page */
        .cover-page {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .logo-circle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: white;
          color: #4f46e5;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .cover-title {
          font-size: 36px;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .cover-subtitle {
          font-size: 22px;
          margin-bottom: 30px;
          opacity: 0.9;
          font-weight: 400;
        }

        .cover-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          width: 100%;
          max-width: 300px;
          margin-bottom: 40px;
        }

        .cover-info-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }

        .cover-info-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 5px;
        }

        .cover-info-value {
          font-size: 16px;
          font-weight: 600;
        }

        .cover-score-section {
          margin-top: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .cover-score-label {
          font-size: 18px;
          margin-top: 15px;
          opacity: 0.9;
        }

        .cover-score-percentage {
          font-size: 48px;
          font-weight: 700;
          margin-top: 5px;
        }

        .cover-note {
          font-size: 14px;
          margin-top: 20px;
          max-width: 400px;
          opacity: 0.8;
        }

        .cover-note-small {
          font-size: 12px;
          margin-top: 10px;
          max-width: 400px;
          opacity: 0.7;
        }

        /* General Section Styling */
        .section-title {
          font-size: 28px;
          margin-bottom: 10px;
          color: #4f46e5;
          text-align: center;
          font-weight: 700;
          padding-bottom: 5px;
          border-bottom: 2px solid #e0e7ff;
        }

        .section-subtitle {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 30px;
        }

        /* Summary Page */
        .summary-page {
          justify-content: flex-start;
        }

        .competency-summary-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .competency-summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #f9fafb;
        }

        .competency-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .competency-summary-label {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }

        .competency-summary-tier {
          font-size: 14px;
          font-weight: 600;
        }

        .competency-summary-diagnostic {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 15px;
        }

        .competency-summary-progress {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .competency-summary-bar-track {
          flex-grow: 1;
          height: 10px;
          background: #e5e7eb;
          border-radius: 5px;
          overflow: hidden;
        }

        .competency-summary-bar-fill {
          height: 100%;
          border-radius: 5px;
        }

        .competency-summary-percentage {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          min-width: 40px;
          text-align: right;
        }

        .competency-summary-score {
          font-size: 12px;
          color: #6b7280;
          min-width: 40px;
          text-align: right;
        }

        /* SWOT Page */
        .swot-page {
          justify-content: flex-start;
        }

        .swot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .swot-card {
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .swot-strength {
          background: #f0fdf4;
          border-color: #a7f3d0;
        }
        .swot-opportunity {
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .swot-weakness {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .swot-threat {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .swot-card-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          text-align: center;
          color: #1f2937;
        }

        .swot-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .swot-list li {
          font-size: 14px;
          color: #374151;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        /* Recommendations Page */
        .recommendations-page {
          justify-content: flex-start;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .recommendation-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #f9fafb;
        }

        .recommendation-card-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .recommendation-card-tier {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.8;
        }

        .recommendation-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .recommendation-list li {
          font-size: 14px;
          color: #374151;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        /* Upsell Page */
        .upsell-page {
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .upsell-box {
          background: linear-gradient(135deg, #f97316, #dc2626);
          color: white;
          padding: 40px;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          margin-top: 30px;
        }

        .upsell-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .upsell-features {
          list-style: none;
          margin: 0 auto 30px auto;
          padding: 0;
          max-width: 350px;
          text-align: left;
        }

        .upsell-features li {
          font-size: 16px;
          margin-bottom: 10px;
          line-height: 1.5;
        }

        .upsell-cta {
          display: inline-block;
          background: white;
          color: #dc2626;
          font-weight: 700;
          padding: 12px 25px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 16px;
          transition: background-color 0.2s ease;
        }

        .upsell-cta:hover {
          background-color: #fef2f2;
        }

        .report-footer {
          margin-top: auto;
          padding-top: 20px;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }

        /* Hide print button when printing */
        @media print {
          .printbtn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
