// lib/pdf-recommendations.ts
// Premium Sales MRI Recommendation Engine
// Keeps the same public exports used by the app:
// Tier, Language, normalizeCompetencyId, tierFromPercentage, getRecommendations

export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";
export type Language = "en" | "ar";

type CompetencyProfile = {
  id: string;
  en: string;
  ar: string;
  leakageEn: string;
  leakageAr: string;
  treatmentEn: string;
  treatmentAr: string;
  drillEn: string;
  drillAr: string;
  metricEn: string;
  metricAr: string;
};

const COMPETENCY_PROFILES: Record<string, CompetencyProfile> = {
  overall_score: {
    id: "overall_score",
    en: "Overall Sales Health",
    ar: "الصحة البيعية العامة",
    leakageEn: "scattered execution, weak rhythm, and inconsistent commercial discipline",
    leakageAr: "تشتت التنفيذ وضعف الإيقاع وعدم ثبات الانضباط التجاري",
    treatmentEn: "build a simple daily operating system around your lowest three markers",
    treatmentAr: "بناء نظام تشغيل يومي بسيط حول أضعف ثلاثة مؤشرات لديك",
    drillEn: "review your top 3 risks every morning and choose one correction behavior before your first sales activity",
    drillAr: "راجع أخطر 3 مناطق كل صباح واختر سلوك تصحيح واحد قبل أول نشاط بيعي",
    metricEn: "daily completion of the chosen correction behavior",
    metricAr: "إكمال سلوك التصحيح المختار يوميًا",
  },

  mental_toughness: {
    id: "mental_toughness",
    en: "Mental Toughness",
    ar: "الصلابة الذهنية",
    leakageEn: "emotional dips after rejection, avoidance of difficult actions, and loss of selling rhythm under pressure",
    leakageAr: "هبوط نفسي بعد الرفض، تجنب الأفعال الصعبة، وفقدان الإيقاع البيعي تحت الضغط",
    treatmentEn: "install a rejection recovery routine and a non-negotiable daily activity floor",
    treatmentAr: "تركيب روتين تعافٍ بعد الرفض وحد أدنى يومي غير قابل للتفاوض للنشاط",
    drillEn: "after every rejection, take 60 seconds to breathe, write the lesson, and execute the next action immediately",
    drillAr: "بعد كل رفض، خذ 60 ثانية للتنفس، اكتب الدرس، ونفّذ الإجراء التالي فورًا",
    metricEn: "time between rejection and next productive action",
    metricAr: "الوقت بين الرفض وأول إجراء منتج بعده",
  },

  opening_conversations: {
    id: "opening_conversations",
    en: "Opening Conversations",
    ar: "فتح المحادثات",
    leakageEn: "weak first impressions, slow trust creation, and prospects disconnecting before discovery begins",
    leakageAr: "انطباع أول ضعيف، بطء في بناء الثقة، وانفصال العميل قبل بدء الاكتشاف",
    treatmentEn: "compress the opening into a clear permission-based hook that earns the next 30 seconds",
    treatmentAr: "ضغط الافتتاح إلى مدخل واضح مبني على الإذن يكسب أول 30 ثانية",
    drillEn: "use one opening formula for 7 days: specific reason, business relevance, permission question",
    drillAr: "استخدم صيغة افتتاح واحدة لمدة 7 أيام: سبب محدد، صلة تجارية، سؤال إذن",
    metricEn: "percentage of openings that turn into real discovery conversations",
    metricAr: "نسبة الافتتاحات التي تتحول إلى محادثات اكتشاف حقيقية",
  },

  identifying_real_needs: {
    id: "identifying_real_needs",
    en: "Identifying Real Needs",
    ar: "تحديد الاحتياجات الحقيقية",
    leakageEn: "selling too early, diagnosing surface pain only, and missing the economic reason behind the conversation",
    leakageAr: "البيع المبكر، تشخيص الألم السطحي فقط، وفقدان السبب الاقتصادي خلف المحادثة",
    treatmentEn: "force deeper discovery before presenting any solution",
    treatmentAr: "فرض اكتشاف أعمق قبل تقديم أي حل",
    drillEn: "ask three layers on every opportunity: why this, why now, what happens if nothing changes",
    drillAr: "اسأل ثلاث طبقات في كل فرصة: لماذا هذا، لماذا الآن، ماذا يحدث إذا لم يتغير شيء",
    metricEn: "number of opportunities with quantified pain and a clear business consequence",
    metricAr: "عدد الفرص التي تحتوي على ألم مقاس ونتيجة تجارية واضحة",
  },

  handling_objections: {
    id: "handling_objections",
    en: "Handling Objections",
    ar: "التعامل مع الاعتراضات",
    leakageEn: "defensive reactions, over-explaining, and losing control when the buyer challenges price, timing, or trust",
    leakageAr: "ردود دفاعية، شرح زائد، وفقدان السيطرة عندما يعترض العميل على السعر أو التوقيت أو الثقة",
    treatmentEn: "slow down, classify the objection, and answer the concern behind the words",
    treatmentAr: "إبطاء الإيقاع، تصنيف الاعتراض، والرد على القلق الحقيقي خلف الكلمات",
    drillEn: "for 7 days, classify every objection into price fear, trust gap, urgency gap, or authority gap before answering",
    drillAr: "لمدة 7 أيام، صنّف كل اعتراض إلى خوف سعر، فجوة ثقة، فجوة إلحاح، أو فجوة صلاحية قبل الرد",
    metricEn: "percentage of objections that end with a clear next action",
    metricAr: "نسبة الاعتراضات التي تنتهي بإجراء تالٍ واضح",
  },

  destroying_objections: {
    id: "destroying_objections",
    en: "Destroying Objections",
    ar: "تدمير الاعتراضات من الجذور",
    leakageEn: "waiting until objections explode instead of neutralizing them before they gain power",
    leakageAr: "الانتظار حتى تنفجر الاعتراضات بدل تحييدها قبل أن تكتسب القوة",
    treatmentEn: "pre-frame value, risk, urgency, and proof before the buyer reaches the objection stage",
    treatmentAr: "تأطير القيمة والمخاطر والإلحاح والدليل قبل وصول العميل إلى مرحلة الاعتراض",
    drillEn: "before every proposal, name the two objections likely to appear and plant proof against each one before the buyer raises it",
    drillAr: "قبل كل عرض، حدد الاعتراضين المتوقعين وازرع دليلًا ضد كل واحد قبل أن يطرحه العميل",
    metricEn: "number of objections prevented before proposal or closing",
    metricAr: "عدد الاعتراضات التي تم منعها قبل العرض أو الإغلاق",
  },

  creating_irresistible_offers: {
    id: "creating_irresistible_offers",
    en: "Creating Irresistible Offers",
    ar: "إنشاء عروض لا تُقاوَم",
    leakageEn: "offers sounding like features instead of urgent business outcomes",
    leakageAr: "ظهور العروض كميزات بدل نتائج تجارية ملحّة",
    treatmentEn: "rebuild the offer around pain, measurable outcome, risk reduction, and next step",
    treatmentAr: "إعادة بناء العرض حول الألم والنتيجة المقاسة وتقليل المخاطر والخطوة التالية",
    drillEn: "rewrite every offer using this order: current pain, cost of delay, desired outcome, proof, clear next step",
    drillAr: "أعد صياغة كل عرض بهذا الترتيب: الألم الحالي، تكلفة التأجيل، النتيجة المطلوبة، الدليل، الخطوة التالية",
    metricEn: "percentage of offers that generate a next-step commitment",
    metricAr: "نسبة العروض التي تولّد التزامًا بخطوة تالية",
  },

  mastering_closing: {
    id: "mastering_closing",
    en: "Mastering Closing",
    ar: "إتقان الإغلاق",
    leakageEn: "soft endings, unclear next steps, and letting the buyer control the decision rhythm",
    leakageAr: "نهايات ضعيفة، خطوات تالية غير واضحة، وترك العميل يتحكم في إيقاع القرار",
    treatmentEn: "turn closing into a natural decision checkpoint instead of a stressful final push",
    treatmentAr: "تحويل الإغلاق إلى نقطة تحقق طبيعية للقرار بدل ضغط نهائي متوتر",
    drillEn: "end every serious conversation with one of three closes: decision close, calendar close, or next-information close",
    drillAr: "أنهِ كل محادثة جادة بأحد ثلاثة إغلاقات: إغلاق قرار، إغلاق موعد، أو إغلاق معلومات تالية",
    metricEn: "number of conversations ending with a dated next step",
    metricAr: "عدد المحادثات التي تنتهي بخطوة تالية بتاريخ محدد",
  },

  follow_up_discipline: {
    id: "follow_up_discipline",
    en: "Follow-Up Discipline",
    ar: "انضباط المتابعة",
    leakageEn: "silent pipeline decay, forgotten promises, and opportunities cooling down after initial interest",
    leakageAr: "تآكل البايبلاين بصمت، وعود منسية، وبرود الفرص بعد الاهتمام الأولي",
    treatmentEn: "install a strict follow-up rhythm that never depends on memory or mood",
    treatmentAr: "تركيب إيقاع متابعة صارم لا يعتمد على الذاكرة أو المزاج",
    drillEn: "before ending any interaction, schedule the next follow-up in your calendar with the reason for the follow-up",
    drillAr: "قبل إنهاء أي تفاعل، جدْول المتابعة التالية في التقويم مع سبب المتابعة",
    metricEn: "follow-ups completed on the promised date",
    metricAr: "المتابعات المنجزة في التاريخ الموعود",
  },

  consultative_selling: {
    id: "consultative_selling",
    en: "Consultative Selling",
    ar: "المبيعات الاستشارية",
    leakageEn: "sounding like a seller when the buyer needs a thinking partner",
    leakageAr: "الظهور كبائع عندما يحتاج العميل إلى شريك تفكير",
    treatmentEn: "shift from presenting products to diagnosing business movement and decision friction",
    treatmentAr: "الانتقال من عرض المنتجات إلى تشخيص حركة الأعمال واحتكاك القرار",
    drillEn: "replace one product statement per call with a business diagnosis question",
    drillAr: "استبدل عبارة منتج واحدة في كل مكالمة بسؤال تشخيص تجاري",
    metricEn: "buyer statements that reveal business impact, urgency, or internal pressure",
    metricAr: "عبارات العميل التي تكشف أثرًا تجاريًا أو إلحاحًا أو ضغطًا داخليًا",
  },

  time_territory_management: {
    id: "time_territory_management",
    en: "Time & Territory Management",
    ar: "إدارة الوقت والمنطقة",
    leakageEn: "busy work, scattered routes, low-value visits, and losing prime selling hours",
    leakageAr: "انشغال بلا قيمة، تنقل مشتت، زيارات منخفضة القيمة، وضياع ساعات البيع الذهبية",
    treatmentEn: "protect prime selling hours and rank accounts by commercial probability",
    treatmentAr: "حماية ساعات البيع الذهبية وترتيب الحسابات حسب الاحتمال التجاري",
    drillEn: "plan tomorrow before leaving today: top 5 accounts, route order, reason for visit, desired next step",
    drillAr: "خطط للغد قبل مغادرة اليوم: أهم 5 حسابات، ترتيب الزيارات، سبب الزيارة، والخطوة المطلوبة",
    metricEn: "percentage of selling hours spent with high-probability accounts",
    metricAr: "نسبة ساعات البيع المصروفة مع حسابات عالية الاحتمال",
  },

  product_expertise: {
    id: "product_expertise",
    en: "Product Expertise",
    ar: "الخبرة في المنتج",
    leakageEn: "knowing features without translating them into buyer-specific value",
    leakageAr: "معرفة الميزات دون ترجمتها إلى قيمة خاصة بالعميل",
    treatmentEn: "connect each feature to a business problem, proof point, and buyer outcome",
    treatmentAr: "ربط كل ميزة بمشكلة تجارية ودليل ونتيجة للعميل",
    drillEn: "choose three features and rewrite each into: problem solved, measurable outcome, proof, best-fit buyer",
    drillAr: "اختر ثلاث ميزات وأعد صياغة كل واحدة إلى: المشكلة التي تحلها، النتيجة المقاسة، الدليل، والعميل الأنسب",
    metricEn: "number of product claims tied to measurable customer outcomes",
    metricAr: "عدد ادعاءات المنتج المرتبطة بنتائج عميل قابلة للقياس",
  },

  negotiation_skills: {
    id: "negotiation_skills",
    en: "Negotiation Skills",
    ar: "مهارات التفاوض",
    leakageEn: "discounting too early, trading value for approval, and reacting to pressure instead of controlling the frame",
    leakageAr: "الخصم المبكر، مبادلة القيمة بالموافقة، والرد على الضغط بدل التحكم في الإطار",
    treatmentEn: "protect value by trading concessions only for commitments",
    treatmentAr: "حماية القيمة عبر مبادلة التنازلات فقط مقابل التزامات",
    drillEn: "prepare three tradeables before every negotiation: payment timing, volume, decision date, or access to stakeholder",
    drillAr: "حضّر ثلاثة أشياء قابلة للمبادلة قبل كل تفاوض: توقيت الدفع، الكمية، تاريخ القرار، أو الوصول لصاحب قرار",
    metricEn: "discounts exchanged for real buyer commitments",
    metricAr: "الخصومات التي تمت مبادلتها مقابل التزامات حقيقية",
  },

  attitude_motivation_mindset: {
    id: "attitude_motivation_mindset",
    en: "Attitude & Motivation",
    ar: "العقلية والتحفيز",
    leakageEn: "depending on mood, external praise, or short-term wins to maintain effort",
    leakageAr: "الاعتماد على المزاج أو الثناء الخارجي أو المكاسب السريعة للحفاظ على الجهد",
    treatmentEn: "anchor motivation to identity, process, and controllable actions",
    treatmentAr: "ربط التحفيز بالهوية والعملية والأفعال القابلة للتحكم",
    drillEn: "write one sentence every morning: today I win by completing the process, not by waiting for perfect results",
    drillAr: "اكتب جملة واحدة كل صباح: أفوز اليوم بإكمال العملية، لا بانتظار النتائج المثالية",
    metricEn: "process completion on difficult days",
    metricAr: "إكمال العملية في الأيام الصعبة",
  },

  dealing_with_boss: {
    id: "dealing_with_boss",
    en: "Dealing with Boss",
    ar: "التعامل مع المدير",
    leakageEn: "poor upward communication, surprise problems, and losing trust with management",
    leakageAr: "ضعف التواصل مع الإدارة، مفاجآت غير محببة، وفقدان الثقة مع المدير",
    treatmentEn: "manage upward with clarity, evidence, and early warning signals",
    treatmentAr: "إدارة العلاقة مع المدير بوضوح ودليل وإنذارات مبكرة",
    drillEn: "send one weekly 5-line update: wins, pipeline risk, support needed, next actions, forecast confidence",
    drillAr: "أرسل تحديثًا أسبوعيًا من 5 أسطر: النجاحات، مخاطر البايبلاين، الدعم المطلوب، الخطوات التالية، وثقة التوقع",
    metricEn: "manager conversations that end with clarity and support",
    metricAr: "محادثات المدير التي تنتهي بوضوح ودعم",
  },

  handling_difficult_customers: {
    id: "handling_difficult_customers",
    en: "Handling Difficult Customers",
    ar: "التعامل مع العملاء الصعبين",
    leakageEn: "emotional escalation, defensive tone, and losing authority when the customer becomes demanding",
    leakageAr: "تصعيد عاطفي، نبرة دفاعية، وفقدان السلطة عندما يصبح العميل صعبًا",
    treatmentEn: "lower emotional temperature while keeping commercial control",
    treatmentAr: "خفض حرارة الموقف عاطفيًا مع الحفاظ على التحكم التجاري",
    drillEn: "use the calm-control sequence: acknowledge, clarify, boundary, next step",
    drillAr: "استخدم تسلسل التحكم الهادئ: اعتراف، توضيح، حدود، خطوة تالية",
    metricEn: "difficult conversations ending with a clear next action rather than emotional residue",
    metricAr: "المحادثات الصعبة التي تنتهي بخطوة واضحة بدل بقايا عاطفية",
  },

  handling_difficult_colleagues: {
    id: "handling_difficult_colleagues",
    en: "Handling Difficult Colleagues",
    ar: "التعامل مع الزملاء الصعبين",
    leakageEn: "internal friction, delayed coordination, and emotional distraction from selling priorities",
    leakageAr: "احتكاك داخلي، تأخر التنسيق، وتشتيت عاطفي عن أولويات البيع",
    treatmentEn: "separate emotion from execution and move internal conflict toward clear agreements",
    treatmentAr: "فصل العاطفة عن التنفيذ وتحويل الخلاف الداخلي إلى اتفاقات واضحة",
    drillEn: "when friction appears, ask: what do we need to decide, who owns it, and by when",
    drillAr: "عند ظهور الاحتكاك، اسأل: ماذا نحتاج أن نقرر، من المسؤول، ومتى الموعد",
    metricEn: "internal issues resolved with owner, deadline, and next step",
    metricAr: "المشكلات الداخلية المحلولة بمالك وموعد وخطوة تالية",
  },
};

const ALIASES: Record<string, string> = {
  overall: "overall_score",
  total: "overall_score",
  total_score: "overall_score",
  overall_score: "overall_score",

  mental_toughness: "mental_toughness",
  opening_conversations: "opening_conversations",
  identifying_real_needs: "identifying_real_needs",

  handling_objections: "handling_objections",
  handle_objections: "handling_objections",
  objection_handling: "handling_objections",

  destroying_objections: "destroying_objections",
  destroy_objections: "destroying_objections",
  neutralizing_objections: "destroying_objections",
  destroying_objections_at_the_root: "destroying_objections",

  creating_irresistible_offers: "creating_irresistible_offers",
  irresistible_offers: "creating_irresistible_offers",
  offer_creation: "creating_irresistible_offers",

  mastering_closing: "mastering_closing",
  closing: "mastering_closing",
  closing_skills: "mastering_closing",

  follow_up_discipline: "follow_up_discipline",
  followup_discipline: "follow_up_discipline",
  follow_up: "follow_up_discipline",

  consultative_selling: "consultative_selling",
  time_territory_management: "time_territory_management",
  time_and_territory_management: "time_territory_management",
  product_expertise: "product_expertise",
  negotiation_skills: "negotiation_skills",
  attitude_motivation_mindset: "attitude_motivation_mindset",
  attitude_and_motivation: "attitude_motivation_mindset",
  dealing_with_boss: "dealing_with_boss",
  handling_difficult_customers: "handling_difficult_customers",
  handling_difficult_colleagues: "handling_difficult_colleagues",
};

/** Normalize competency ids for consistency without merging Destroying Objections into Handling Objections. */
export function normalizeCompetencyId(id: string): string {
  const clean = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  return ALIASES[clean] || clean;
}

/** Compute tier from percentage. */
export function tierFromPercentage(pct: number): Tier {
  const p = Number(pct) || 0;
  if (p >= 75) return "Strength";
  if (p >= 50) return "Opportunity";
  if (p >= 30) return "Threat";
  return "Weakness";
}

function getProfile(competencyId: string): CompetencyProfile {
  const key = normalizeCompetencyId(competencyId);
  return (
    COMPETENCY_PROFILES[key] || {
      id: key || "unknown",
      en: key ? key.replace(/_/g, " ") : "This competency",
      ar: key ? key.replace(/_/g, " ") : "هذه الكفاءة",
      leakageEn: "unclear execution, inconsistent behavior, and avoidable performance leakage",
      leakageAr: "تنفيذ غير واضح وسلوك غير ثابت وتسريب أداء يمكن تجنبه",
      treatmentEn: "return to the core behavior, create a simple routine, and track execution daily",
      treatmentAr: "العودة إلى السلوك الأساسي وبناء روتين بسيط وتتبع التنفيذ يوميًا",
      drillEn: "choose one correction behavior and repeat it in every relevant sales interaction for 7 days",
      drillAr: "اختر سلوك تصحيح واحد وكرره في كل تفاعل بيعي مناسب لمدة 7 أيام",
      metricEn: "daily execution of the correction behavior",
      metricAr: "التنفيذ اليومي لسلوك التصحيح",
    }
  );
}

function enStrength(p: CompetencyProfile): string[] {
  return [
    `Protect your strength in ${p.en}. This is not an area to ignore because it is already good. Turn it into a repeatable asset by documenting exactly what you do before, during, and after successful situations where this competency appears.`,
    `Use ${p.en} as leverage for weaker areas. For the next 7 days, deliberately connect this strength to one weak competency. The goal is to make your strength pull the weaker behavior upward instead of letting the weak area drag the whole performance down.`,
    `Track ${p.metricEn}. Strong performers do not only have talent; they protect the behaviors that create the result. Review the metric every evening and write one adjustment for the next day.`,
  ];
}

function arStrength(p: CompetencyProfile): string[] {
  return [
    `احمِ قوتك في ${p.ar}. لا تتجاهل هذه المنطقة لأنها جيدة أصلًا. حوّلها إلى أصل متكرر عبر توثيق ما تفعله قبل وأثناء وبعد المواقف الناجحة التي تظهر فيها هذه الكفاءة.`,
    `استخدم ${p.ar} كرافعة للمناطق الأضعف. خلال 7 أيام، اربط هذه القوة عمدًا بإحدى الكفاءات الضعيفة. الهدف أن تسحب القوة السلوك الأضعف إلى أعلى بدل أن تسحب المنطقة الضعيفة الأداء كله إلى أسفل.`,
    `تتبع ${p.metricAr}. أصحاب الأداء العالي لا يملكون الموهبة فقط؛ بل يحمون السلوك الذي يصنع النتيجة. راجع المؤشر كل مساء واكتب تعديلًا واحدًا لليوم التالي.`,
  ];
}

function enOpportunity(p: CompetencyProfile): string[] {
  return [
    `${p.en} is not broken, but it is not yet dependable under pressure. The treatment is to stop relying on instinct and install a repeatable behavior: ${p.treatmentEn}.`,
    `For the next 7 days, apply this drill: ${p.drillEn}. Do not judge success by one conversation. Judge success by whether the behavior was repeated enough to become easier and more natural.`,
    `Watch for the leakage pattern: ${p.leakageEn}. When you see it, pause and correct the behavior immediately. Your target metric is ${p.metricEn}.`,
  ];
}

function arOpportunity(p: CompetencyProfile): string[] {
  return [
    `${p.ar} ليست مكسورة، لكنها لم تصبح ثابتة تحت الضغط بعد. العلاج هو التوقف عن الاعتماد على الغريزة وتركيب سلوك متكرر: ${p.treatmentAr}.`,
    `خلال 7 أيام، طبّق هذا التمرين: ${p.drillAr}. لا تحكم على النجاح من محادثة واحدة. احكم عليه من تكرار السلوك حتى يصبح أسهل وأكثر طبيعية.`,
    `انتبه لنمط التسريب: ${p.leakageAr}. عندما تراه، توقف وصحح السلوك فورًا. مؤشر القياس المطلوب هو ${p.metricAr}.`,
  ];
}

function enThreat(p: CompetencyProfile): string[] {
  return [
    `${p.en} is now in the warning zone. This means the issue may already be costing momentum, trust, or deal movement. Do not try to fix everything. Treat this as a priority leak: ${p.leakageEn}.`,
    `Your immediate treatment is: ${p.treatmentEn}. For the next 72 hours, simplify the behavior and use the same correction pattern in every relevant sales situation.`,
    `Use this field drill: ${p.drillEn}. After each attempt, write one line: what happened, what I corrected, what I will repeat. Track ${p.metricEn} until the behavior becomes visible and measurable.`,
  ];
}

function arThreat(p: CompetencyProfile): string[] {
  return [
    `${p.ar} الآن في منطقة إنذار. هذا يعني أن المشكلة قد تكون بدأت بالفعل في خسارة الزخم أو الثقة أو حركة الصفقة. لا تحاول إصلاح كل شيء. تعامل معها كتسريب أولوية: ${p.leakageAr}.`,
    `العلاج الفوري هو: ${p.treatmentAr}. خلال 72 ساعة، بسّط السلوك واستخدم نفس نمط التصحيح في كل موقف بيعي مناسب.`,
    `استخدم هذا التمرين الميداني: ${p.drillAr}. بعد كل محاولة، اكتب سطرًا واحدًا: ماذا حدث، ماذا صححت، وماذا سأكرر. تتبع ${p.metricAr} حتى يصبح السلوك واضحًا وقابلًا للقياس.`,
  ];
}

function enWeakness(p: CompetencyProfile): string[] {
  return [
    `${p.en} is a treatment priority. This is not a label of failure; it is a signal that this part of the sales performance body needs direct correction before it keeps leaking opportunities.`,
    `Stop improvising in this area for the next 7 days. Use a fixed treatment protocol: ${p.treatmentEn}. The purpose is to remove randomness and give your behavior a stable structure.`,
    `Your daily prescription is: ${p.drillEn}. Measure only one thing: ${p.metricEn}. When the weakest behavior becomes measurable, it becomes treatable.`,
  ];
}

function arWeakness(p: CompetencyProfile): string[] {
  return [
    `${p.ar} هي أولوية علاج. هذا ليس وصفًا للفشل؛ بل إشارة إلى أن هذا الجزء من جسم الأداء البيعي يحتاج إلى تصحيح مباشر قبل أن يستمر في تسريب الفرص.`,
    `توقف عن الارتجال في هذه المنطقة لمدة 7 أيام. استخدم بروتوكول علاج ثابت: ${p.treatmentAr}. الهدف هو إزالة العشوائية ومنح السلوك بنية مستقرة.`,
    `وصفتك اليومية هي: ${p.drillAr}. قِس شيئًا واحدًا فقط: ${p.metricAr}. عندما يصبح السلوك الأضعف قابلًا للقياس، يصبح قابلًا للعلاج.`,
  ];
}

export function getRecommendations(
  competencyId: string,
  tier: Tier,
  lang: Language
): string[] {
  const profile = getProfile(competencyId);

  if (lang === "ar") {
    if (tier === "Strength") return arStrength(profile);
    if (tier === "Opportunity") return arOpportunity(profile);
    if (tier === "Threat") return arThreat(profile);
    return arWeakness(profile);
  }

  if (tier === "Strength") return enStrength(profile);
  if (tier === "Opportunity") return enOpportunity(profile);
  if (tier === "Threat") return enThreat(profile);
  return enWeakness(profile);
}