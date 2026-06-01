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

  lawyer_client_conversion_overall_score: {
    id: "lawyer_client_conversion_overall_score",
    en: "Overall Legal Client Conversion Health",
    ar: "الصحة العامة لتحويل العملاء للمحامين",
    leakageEn: "unclear consultation structure, weak client trust, poor legal-value framing, hesitant professional-fee presentation, and passive follow-up",
    leakageAr: "ضعف هيكلة الاستشارة، ضعف ثقة العميل، غموض تأطير القيمة القانونية، تردد عرض أتعاب المحاماة، والمتابعة السلبية",
    treatmentEn: "build a simple client-conversion operating system around your lowest three legal consultation markers",
    treatmentAr: "بناء نظام تشغيل بسيط لتحويل العملاء حول أضعف ثلاثة مؤشرات في الاستشارة القانونية",
    drillEn: "review your top three consultation leaks before the first client interaction and choose one correction behavior for the day",
    drillAr: "راجع أكبر ثلاثة تسريبات في الاستشارة قبل أول تفاعل مع عميل واختر سلوك تصحيح واحد لليوم",
    metricEn: "daily completion of the selected legal client-conversion correction behavior",
    metricAr: "إكمال سلوك التصحيح المختار لتحويل العملاء يوميًا",
  },

  sales_manager_overall_score: {
    id: "sales_manager_overall_score",
    en: "Overall Sales Management Health",
    ar: "الصحة الإدارية العامة للمبيعات",
    leakageEn: "unclear coaching rhythm, weak pipeline inspection, soft accountability, and inconsistent team execution",
    leakageAr: "غموض إيقاع التدريب، ضعف فحص البايبلاين، ليونة المساءلة، وعدم ثبات تنفيذ الفريق",
    treatmentEn: "build a simple weekly management operating system around your lowest three leadership markers",
    treatmentAr: "بناء نظام إدارة أسبوعي بسيط حول أضعف ثلاثة مؤشرات قيادية لديك",
    drillEn: "review your top 3 management risks every Monday and choose one coaching, inspection, or accountability action before the first team interaction",
    drillAr: "راجع أخطر 3 مخاطر إدارية كل يوم اثنين واختر إجراء تدريب أو فحص أو مساءلة واحد قبل أول تفاعل مع الفريق",
    metricEn: "weekly completion of the chosen management correction behavior",
    metricAr: "إكمال سلوك التصحيح الإداري المختار أسبوعيًا",
  },

  prospecting_finding_new_clients: {
    id: "prospecting_finding_new_clients",
    en: "Prospecting & Finding New Clients",
    ar: "البحث عن عملاء جدد",
    leakageEn: "a shrinking pipeline, overdependence on familiar lead sources, and weak creation of fresh opportunities",
    leakageAr: "انكماش البايبلاين، الاعتماد الزائد على مصادر العملاء المعتادة، وضعف صناعة فرص جديدة",
    treatmentEn: "build new opportunity channels through referrals, adjacent markets, lookalike clients, and problem-based outreach",
    treatmentAr: "بناء قنوات فرص جديدة عبر الإحالات والأسواق المجاورة والعملاء المشابهين والتواصل المبني على المشكلة",
    drillEn: "identify 10 new prospects from three different sources before working your usual pipeline for 7 days",
    drillAr: "حدد 10 عملاء محتملين جدد من ثلاثة مصادر مختلفة قبل العمل على البايبلاين المعتاد لمدة 7 أيام",
    metricEn: "new qualified conversations created each week",
    metricAr: "عدد المحادثات المؤهلة الجديدة التي يتم إنشاؤها أسبوعيًا",
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
    en: "Attitude & Motivation Mindset",
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

  sales_coaching_rep_development: {
    id: "sales_coaching_rep_development",
    en: "Sales Coaching & Rep Development",
    ar: "تدريب وتطوير مندوبي المبيعات",
    leakageEn: "reps repeating the same mistakes because coaching is too general, too late, or too focused on numbers instead of behavior",
    leakageAr: "تكرار المندوبين لنفس الأخطاء لأن التدريب عام أو متأخر أو يركز على الأرقام بدل السلوك",
    treatmentEn: "coach one observable selling behavior at a time and convert feedback into a specific next action",
    treatmentAr: "تدريب سلوك بيعي واحد قابل للملاحظة في كل مرة وتحويل الملاحظات إلى إجراء تالٍ محدد",
    drillEn: "run three 15-minute coaching conversations this week using: observed behavior, impact, correction, next call action",
    drillAr: "نفّذ ثلاث جلسات تدريب قصيرة هذا الأسبوع باستخدام: السلوك الملاحظ، الأثر، التصحيح، إجراء المكالمة التالية",
    metricEn: "coaching conversations that result in one changed rep behavior",
    metricAr: "جلسات التدريب التي تنتج تغييرًا واحدًا في سلوك المندوب",
  },

  pipeline_visibility_deal_inspection: {
    id: "pipeline_visibility_deal_inspection",
    en: "Pipeline Visibility & Deal Inspection",
    ar: "رؤية البايبلاين وفحص الصفقات",
    leakageEn: "hidden deal risk, unclear next steps, and pipeline confidence based on hope rather than evidence",
    leakageAr: "مخاطر مخفية في الصفقات وخطوات تالية غير واضحة وثقة في البايبلاين مبنية على الأمل لا الدليل",
    treatmentEn: "inspect deals through evidence: buyer pain, decision process, next step, risk, and commitment",
    treatmentAr: "فحص الصفقات عبر الدليل: ألم العميل، عملية القرار، الخطوة التالية، المخاطر، والالتزام",
    drillEn: "choose five active deals and ask each rep for evidence of pain, decision owner, next step, and risk",
    drillAr: "اختر خمس صفقات نشطة واطلب من كل مندوب دليل الألم وصاحب القرار والخطوة التالية والمخاطر",
    metricEn: "percentage of pipeline with dated next steps and verified decision process",
    metricAr: "نسبة البايبلاين الذي يحتوي على خطوات تالية بتاريخ وعملية قرار مؤكدة",
  },

  pipeline_management_deal_inspection: {
    id: "pipeline_management_deal_inspection",
    en: "Pipeline Management & Deal Inspection",
    ar: "إدارة البايبلاين وفحص الصفقات",
    leakageEn: "pipeline movement based on optimism rather than disciplined deal inspection",
    leakageAr: "حركة البايبلاين مبنية على التفاؤل بدل فحص الصفقات بانضباط",
    treatmentEn: "manage the pipeline by stage evidence, deal quality, risk, and next-step commitment",
    treatmentAr: "إدارة البايبلاين حسب دليل المرحلة وجودة الصفقة والمخاطر والتزام الخطوة التالية",
    drillEn: "review the top ten opportunities and remove or re-stage any deal without a confirmed next action",
    drillAr: "راجع أهم عشر فرص وأعد تصنيف أو أزل أي صفقة بلا إجراء تالٍ مؤكد",
    metricEn: "pipeline value supported by verified buyer commitments",
    metricAr: "قيمة البايبلاين المدعومة بالتزامات مؤكدة من العميل",
  },

  forecast_judgment: {
    id: "forecast_judgment",
    en: "Forecast Judgment",
    ar: "الحكم على التوقعات البيعية",
    leakageEn: "forecast numbers shaped by hope, pressure, or rep optimism instead of deal evidence",
    leakageAr: "توقعات تتشكل بالأمل أو الضغط أو تفاؤل المندوب بدل دليل الصفقة",
    treatmentEn: "separate best-case emotion from commit evidence and challenge every forecast with risk questions",
    treatmentAr: "فصل العاطفة عن دليل الالتزام ومراجعة كل توقع بأسئلة المخاطر",
    drillEn: "for every committed deal, document the buyer action that proves it belongs in the forecast",
    drillAr: "لكل صفقة ملتزم بها، وثّق إجراء العميل الذي يثبت أنها تستحق الدخول في التوقع",
    metricEn: "forecast accuracy compared with committed buyer evidence",
    metricAr: "دقة التوقع مقارنة بدليل التزام العميل",
  },

  forecast_accuracy_judgment: {
    id: "forecast_accuracy_judgment",
    en: "Forecast Accuracy & Judgment",
    ar: "دقة التوقعات والحكم التجاري",
    leakageEn: "missed forecast commitments, late surprises, and weak judgment under target pressure",
    leakageAr: "فوات الالتزامات التوقعية ومفاجآت متأخرة وضعف الحكم تحت ضغط الهدف",
    treatmentEn: "build a forecast discipline based on evidence, probability, timing, and known risk",
    treatmentAr: "بناء انضباط توقعات قائم على الدليل والاحتمال والتوقيت والمخاطر المعروفة",
    drillEn: "create a red/yellow/green forecast review and define the evidence needed for each deal to stay green",
    drillAr: "أنشئ مراجعة توقعات أحمر/أصفر/أخضر وحدد الدليل المطلوب لبقاء كل صفقة خضراء",
    metricEn: "deals forecasted accurately by stage, date, and evidence",
    metricAr: "الصفقات المتوقعة بدقة حسب المرحلة والتاريخ والدليل",
  },

  performance_accountability: {
    id: "performance_accountability",
    en: "Performance Accountability",
    ar: "المساءلة على الأداء",
    leakageEn: "standards becoming optional because expectations, consequences, and follow-through are inconsistent",
    leakageAr: "تحول المعايير إلى شيء اختياري بسبب عدم ثبات التوقعات والعواقب والمتابعة",
    treatmentEn: "make expectations visible, inspect progress consistently, and separate support from excuse tolerance",
    treatmentAr: "جعل التوقعات واضحة وفحص التقدم بثبات وفصل الدعم عن قبول الأعذار",
    drillEn: "choose one underperforming behavior and define the standard, checkpoint, support, and consequence",
    drillAr: "اختر سلوك أداء ضعيفًا وحدد المعيار ونقطة المتابعة والدعم والعاقبة",
    metricEn: "accountability conversations that end with clear owner, action, and deadline",
    metricAr: "محادثات المساءلة التي تنتهي بمالك وإجراء وموعد واضح",
  },

  target_setting_kpi_discipline: {
    id: "target_setting_kpi_discipline",
    en: "Target Setting & KPI Discipline",
    ar: "تحديد الأهداف وانضباط المؤشرات",
    leakageEn: "targets not translating into daily behaviors, leading indicators, or controllable execution routines",
    leakageAr: "الأهداف لا تتحول إلى سلوكيات يومية أو مؤشرات مبكرة أو روتين تنفيذ قابل للتحكم",
    treatmentEn: "connect every target to controllable activity, quality standards, and weekly review rhythm",
    treatmentAr: "ربط كل هدف بنشاط قابل للتحكم ومعايير جودة وإيقاع مراجعة أسبوعي",
    drillEn: "convert one monthly target into weekly activity, quality, and conversion checkpoints",
    drillAr: "حوّل هدفًا شهريًا واحدًا إلى نقاط متابعة أسبوعية للنشاط والجودة والتحويل",
    metricEn: "KPIs linked to controllable behaviors rather than only final results",
    metricAr: "المؤشرات المرتبطة بسلوكيات قابلة للتحكم لا بالنتائج النهائية فقط",
  },

  motivation_team_energy: {
    id: "motivation_team_energy",
    en: "Motivation & Team Energy",
    ar: "تحفيز الفريق وطاقة الأداء",
    leakageEn: "team energy depending on short-term wins, pressure, or the manager's mood rather than a stable performance climate",
    leakageAr: "اعتماد طاقة الفريق على المكاسب القصيرة أو الضغط أو مزاج المدير بدل مناخ أداء ثابت",
    treatmentEn: "create a performance climate that combines recognition, standards, progress, and belief",
    treatmentAr: "بناء مناخ أداء يجمع بين التقدير والمعايير والتقدم والثقة",
    drillEn: "recognize one specific behavior publicly and correct one performance behavior privately every day for a week",
    drillAr: "قدّر سلوكًا محددًا علنًا وصحح سلوك أداء واحدًا على انفراد يوميًا لمدة أسبوع",
    metricEn: "visible energy tied to productive behaviors, not only results",
    metricAr: "طاقة ظاهرة مرتبطة بسلوكيات منتجة لا بالنتائج فقط",
  },

  sales_meeting_rhythm: {
    id: "sales_meeting_rhythm",
    en: "Sales Meeting Rhythm",
    ar: "إيقاع اجتماعات المبيعات",
    leakageEn: "meetings consuming time without changing behavior, deal quality, or execution clarity",
    leakageAr: "اجتماعات تستهلك الوقت دون تغيير السلوك أو جودة الصفقات أو وضوح التنفيذ",
    treatmentEn: "turn meetings into decision, coaching, and execution checkpoints rather than status updates",
    treatmentAr: "تحويل الاجتماعات إلى نقاط قرار وتدريب وتنفيذ بدل تحديثات حالة فقط",
    drillEn: "redesign one sales meeting around three questions: what changed, what is stuck, what action is next",
    drillAr: "أعد تصميم اجتماع مبيعات واحد حول ثلاثة أسئلة: ما الذي تغير، ما العالق، ما الإجراء التالي",
    metricEn: "meetings ending with clear decisions, owners, and deadlines",
    metricAr: "الاجتماعات التي تنتهي بقرارات ومالكين ومواعيد واضحة",
  },

  one_on_one_management: {
    id: "one_on_one_management",
    en: "One-on-One Management",
    ar: "إدارة الاجتماعات الفردية",
    leakageEn: "one-on-ones becoming casual check-ins instead of focused development and performance correction moments",
    leakageAr: "تحول الاجتماعات الفردية إلى دردشات عامة بدل لحظات تطوير وتصحيح أداء مركزة",
    treatmentEn: "structure every one-on-one around performance evidence, coaching focus, obstacle removal, and next action",
    treatmentAr: "هيكلة كل اجتماع فردي حول دليل الأداء وتركيز التدريب وإزالة العوائق والخطوة التالية",
    drillEn: "run one one-on-one using four sections: result, behavior, obstacle, next action",
    drillAr: "نفّذ اجتماعًا فرديًا واحدًا بأربعة أقسام: النتيجة، السلوك، العائق، الخطوة التالية",
    metricEn: "one-on-ones that create a specific behavior change or obstacle removal",
    metricAr: "الاجتماعات الفردية التي تنتج تغيير سلوك محدد أو إزالة عائق",
  },

  hiring_onboarding_salespeople: {
    id: "hiring_onboarding_salespeople",
    en: "Hiring & Onboarding Salespeople",
    ar: "توظيف وتأهيل مندوبي المبيعات",
    leakageEn: "new hires taking too long to become productive because selection and onboarding are not behavior-based",
    leakageAr: "تأخر الموظفين الجدد في الإنتاجية لأن الاختيار والتأهيل غير مبنيين على السلوك",
    treatmentEn: "hire for evidence of selling behaviors and onboard around the first 30 days of measurable execution",
    treatmentAr: "التوظيف بناءً على دليل السلوك البيعي والتأهيل حول أول 30 يومًا من التنفيذ المقاس",
    drillEn: "define the five behaviors a new rep must demonstrate in their first 30 days",
    drillAr: "حدد خمسة سلوكيات يجب على المندوب الجديد إظهارها في أول 30 يومًا",
    metricEn: "time to first qualified opportunity and first coached improvement",
    metricAr: "الوقت حتى أول فرصة مؤهلة وأول تحسن بعد التدريب",
  },

  territory_resource_allocation: {
    id: "territory_resource_allocation",
    en: "Territory & Resource Allocation",
    ar: "توزيع المناطق والموارد",
    leakageEn: "team effort being spread across territories, accounts, or resources without enough commercial logic",
    leakageAr: "تشتت جهد الفريق عبر المناطق أو الحسابات أو الموارد دون منطق تجاري كافٍ",
    treatmentEn: "allocate time, talent, and attention based on potential, probability, urgency, and strategic value",
    treatmentAr: "توزيع الوقت والموهبة والانتباه حسب الإمكانات والاحتمال والإلحاح والقيمة الاستراتيجية",
    drillEn: "rank your team’s top accounts by potential, probability, and required management support",
    drillAr: "رتّب أهم حسابات الفريق حسب الإمكانات والاحتمال والدعم الإداري المطلوب",
    metricEn: "management time spent on the highest-value opportunities and people",
    metricAr: "وقت الإدارة المصروف على أعلى الفرص والأشخاص قيمة",
  },

  handling_underperformance: {
    id: "handling_underperformance",
    en: "Handling Underperformance",
    ar: "معالجة ضعف الأداء",
    leakageEn: "underperformance lasting too long because the manager delays the direct conversation or accepts vague improvement promises",
    leakageAr: "استمرار ضعف الأداء طويلًا لأن المدير يؤجل المحادثة الصريحة أو يقبل وعود تحسن عامة",
    treatmentEn: "diagnose whether the issue is skill, will, activity, territory, or support, then set a clear improvement path",
    treatmentAr: "تشخيص ما إذا كانت المشكلة مهارة أو رغبة أو نشاطًا أو منطقة أو دعمًا، ثم وضع مسار تحسن واضح",
    drillEn: "choose one underperformer and define the issue, evidence, support plan, deadline, and consequence",
    drillAr: "اختر صاحب أداء ضعيف وحدد المشكلة والدليل وخطة الدعم والموعد والعاقبة",
    metricEn: "underperformance cases with written improvement plans and review dates",
    metricAr: "حالات ضعف الأداء التي لها خطط تحسن مكتوبة ومواعيد مراجعة",
  },

  managing_difficult_salespeople: {
    id: "managing_difficult_salespeople",
    en: "Managing Difficult Salespeople",
    ar: "إدارة مندوبي المبيعات الصعبين",
    leakageEn: "one resistant or negative salesperson consuming management energy and lowering team standards",
    leakageAr: "مندوب مقاوم أو سلبي يستهلك طاقة المدير ويخفض معايير الفريق",
    treatmentEn: "separate personality from behavior, name the impact, set boundaries, and follow through consistently",
    treatmentAr: "فصل الشخصية عن السلوك، تسمية الأثر، وضع الحدود، والمتابعة بثبات",
    drillEn: "prepare one difficult conversation using: behavior, impact, standard, support, consequence",
    drillAr: "حضّر محادثة صعبة واحدة باستخدام: السلوك، الأثر، المعيار، الدعم، العاقبة",
    metricEn: "difficult behavior addressed with clear boundaries and follow-through",
    metricAr: "السلوك الصعب الذي تمت معالجته بحدود واضحة ومتابعة ثابتة",
  },

  managing_top_performers: {
    id: "managing_top_performers",
    en: "Managing Top Performers",
    ar: "إدارة أصحاب الأداء العالي",
    leakageEn: "top performers being left alone until they disengage, plateau, or pull the team culture away from standards",
    leakageAr: "ترك أصحاب الأداء العالي وحدهم حتى يفقدوا الحماس أو يتوقفوا عن التطور أو يسحبوا ثقافة الفريق بعيدًا عن المعايير",
    treatmentEn: "challenge top performers with growth, recognition, strategic responsibility, and cultural standards",
    treatmentAr: "تحدي أصحاب الأداء العالي بالنمو والتقدير والمسؤولية الاستراتيجية ومعايير الثقافة",
    drillEn: "meet one top performer and agree on a stretch goal plus one behavior they can model for the team",
    drillAr: "اجتمع بصاحب أداء عالٍ واتفق على هدف ممتد وسلوك واحد يمكنه نمذجته للفريق",
    metricEn: "top performers retained, challenged, and used as positive standard-setters",
    metricAr: "أصحاب الأداء العالي الذين تم الحفاظ عليهم وتحديهم واستخدامهم كنماذج إيجابية",
  },

  manager_communication_upward_reporting: {
    id: "manager_communication_upward_reporting",
    en: "Manager Communication & Executive Reporting",
    ar: "تواصل المدير والتقارير للإدارة العليا",
    leakageEn: "senior leaders receiving late surprises, unclear risks, or reports without clear management judgment",
    leakageAr: "استلام الإدارة العليا لمفاجآت متأخرة أو مخاطر غير واضحة أو تقارير بلا حكم إداري واضح",
    treatmentEn: "report upward with clarity: what happened, what it means, what risk exists, and what decision is needed",
    treatmentAr: "التقرير للأعلى بوضوح: ماذا حدث، ماذا يعني، ما الخطر، وما القرار المطلوب",
    drillEn: "send one executive update using: result, risk, cause, action, support needed",
    drillAr: "أرسل تحديثًا تنفيذيًا واحدًا باستخدام: النتيجة، الخطر، السبب، الإجراء، الدعم المطلوب",
    metricEn: "executive updates that reduce surprises and trigger useful decisions",
    metricAr: "التحديثات التنفيذية التي تقلل المفاجآت وتنتج قرارات مفيدة",
  },

  decision_making_under_pressure: {
    id: "decision_making_under_pressure",
    en: "Decision-Making Under Pressure",
    ar: "اتخاذ القرار تحت الضغط",
    leakageEn: "pressure decisions driven by emotion, urgency, politics, or fear instead of commercial evidence",
    leakageAr: "قرارات تحت الضغط تقودها العاطفة أو الاستعجال أو السياسة أو الخوف بدل الدليل التجاري",
    treatmentEn: "slow pressure down into criteria, options, risks, decision owner, and next action",
    treatmentAr: "إبطاء الضغط إلى معايير وخيارات ومخاطر وصاحب قرار وخطوة تالية",
    drillEn: "before one pressure decision, write three options, one risk for each, and the decision criterion",
    drillAr: "قبل قرار تحت الضغط، اكتب ثلاثة خيارات وخطرًا لكل خيار ومعيار القرار",
    metricEn: "pressure decisions made with criteria rather than reaction",
    metricAr: "قرارات الضغط التي اتخذت بناءً على معايير لا رد فعل",
  },

  legal_inquiry_handling: {
    id: "legal_inquiry_handling",
    en: "Legal Inquiry Handling",
    ar: "التعامل مع الاستفسار القانوني",
    leakageEn: "lost legal inquiries because the first response is slow, vague, overly technical, or gives too much free advice before creating a structured consultation path",
    leakageAr: "ضياع استفسارات قانونية لأن الرد الأول بطيء أو غامض أو تقني أكثر من اللازم أو يقدم مشورة مجانية قبل بناء مسار استشارة منظم",
    treatmentEn: "create a calm inquiry triage routine that acknowledges the issue, identifies urgency, frames the consultation, and confirms the next step",
    treatmentAr: "بناء روتين فرز هادئ للاستفسار يعترف بالمشكلة ويحدد الاستعجال ويضع إطار الاستشارة ويؤكد الخطوة التالية",
    drillEn: "answer every serious inquiry using: acknowledge, clarify urgency, set consultation frame, request key documents, confirm next step",
    drillAr: "أجب عن كل استفسار جاد باستخدام: اعتراف، توضيح الاستعجال، إطار الاستشارة، طلب المستندات، تأكيد الخطوة التالية",
    metricEn: "qualified legal inquiries converted into structured consultations or clear next actions",
    metricAr: "الاستفسارات القانونية المؤهلة التي تتحول إلى استشارات منظمة أو خطوات واضحة",
  },

  consultation_opening_control: {
    id: "consultation_opening_control",
    en: "Consultation Opening & Control",
    ar: "افتتاح الاستشارة والسيطرة عليها",
    leakageEn: "consultations drifting into long emotional discussions without a clear agenda, decision path, or professional next step",
    leakageAr: "انحراف الاستشارات إلى أحاديث عاطفية طويلة دون أجندة واضحة أو مسار قرار أو خطوة مهنية تالية",
    treatmentEn: "open every consultation with a professional frame covering facts, risks, options, professional fees, and the next decision",
    treatmentAr: "افتتاح كل استشارة بإطار مهني يغطي الوقائع والمخاطر والخيارات وأتعاب المحاماة والقرار التالي",
    drillEn: "begin the next five consultations with a 60-second agenda that explains how the consultation will be handled",
    drillAr: "ابدأ الاستشارات القادمة بأجندة قصيرة تشرح كيف ستُدار الاستشارة",
    metricEn: "consultations that stay structured and end with a clear engagement decision or next step",
    metricAr: "الاستشارات التي تبقى منظمة وتنتهي بقرار تعاقد واضح أو خطوة تالية",
  },

  legal_need_diagnosis: {
    id: "legal_need_diagnosis",
    en: "Legal Need Diagnosis",
    ar: "تشخيص الحاجة القانونية الحقيقية",
    leakageEn: "answering the surface legal question while missing the deeper risk, fear, deadline, evidence issue, or decision pressure",
    leakageAr: "الإجابة على السؤال القانوني السطحي مع تفويت الخطر أو الخوف أو الموعد أو مشكلة الإثبات أو ضغط القرار",
    treatmentEn: "diagnose facts, urgency, evidence, desired outcome, consequences of delay, and the client’s emotional concern before proposing a path",
    treatmentAr: "تشخيص الوقائع والاستعجال والأدلة والنتيجة المطلوبة وعواقب التأخير وقلق العميل قبل اقتراح المسار",
    drillEn: "capture one legal risk, one emotional concern, one deadline, and one consequence of inaction in every consultation",
    drillAr: "التقط خطرًا قانونيًا وقلقًا عاطفيًا وموعدًا مهمًا ونتيجة لعدم التحرك في كل استشارة",
    metricEn: "consultations with documented real need and clear risk picture",
    metricAr: "الاستشارات التي تحتوي على حاجة حقيقية موثقة وصورة واضحة للمخاطر",
  },

  case_qualification_client_fit: {
    id: "case_qualification_client_fit",
    en: "Case Qualification & Client Fit",
    ar: "تأهيل القضية وملاءمة العميل",
    leakageEn: "accepting weak matters, unrealistic clients, or poor-fit engagements too quickly and creating future conflict or reputation risk",
    leakageAr: "قبول ملفات ضعيفة أو عملاء غير واقعيين أو تعاقدات غير مناسبة بسرعة مما يخلق نزاعًا لاحقًا أو خطرًا على السمعة",
    treatmentEn: "qualify each matter by evidence, urgency, expectations, client behavior, ethical fit, and fit with your expertise",
    treatmentAr: "تأهيل كل ملف حسب الأدلة والاستعجال والتوقعات وسلوك العميل والملاءمة الأخلاقية وملاءمته لاختصاصك",
    drillEn: "score the next matter on fit, evidence, urgency, expectations, and engagement quality before accepting it",
    drillAr: "قيّم الملف القادم حسب الملاءمة والأدلة والاستعجال والتوقعات وجودة العلاقة المهنية قبل قبوله",
    metricEn: "accepted matters with clear fit, evidence needs, scope, and boundaries",
    metricAr: "الملفات المقبولة بملاءمة واضحة واحتياجات أدلة ونطاق وحدود مهنية",
  },

  client_trust_professional_authority: {
    id: "client_trust_professional_authority",
    en: "Client Trust & Professional Authority",
    ar: "ثقة العميل والهيبة المهنية",
    leakageEn: "clients respecting the lawyer’s knowledge but not feeling enough trust, guidance, or confidence to engage",
    leakageAr: "احترام العميل لمعرفة المحامي دون شعوره بثقة أو توجيه أو اطمئنان كافٍ للتعاقد",
    treatmentEn: "combine legal authority with human clarity: summarize the concern, explain the path, set realistic expectations, and guide the decision",
    treatmentAr: "دمج الهيبة القانونية مع الوضوح الإنساني: تلخيص القلق وشرح المسار ووضع توقعات واقعية وتوجيه القرار",
    drillEn: "summarize the client’s concern in their own language before giving legal direction",
    drillAr: "لخّص قلق العميل بلغته قبل إعطاء التوجيه القانوني",
    metricEn: "clients expressing clarity, confidence, or readiness to proceed",
    metricAr: "العملاء الذين يعبّرون عن وضوح أو ثقة أو استعداد للمتابعة",
  },

  explaining_legal_strategy_simply: {
    id: "explaining_legal_strategy_simply",
    en: "Explaining Legal Strategy Simply",
    ar: "شرح الاستراتيجية القانونية ببساطة",
    leakageEn: "clients delaying because the legal path, risks, documents, stages, and lawyer’s work are not clear enough",
    leakageAr: "تردد العملاء لأن المسار القانوني والمخاطر والمستندات والمراحل وعمل المحامي ليست واضحة بما يكفي",
    treatmentEn: "translate the legal pathway into simple stages: immediate risk, required documents, available options, likely process, and next action",
    treatmentAr: "ترجمة المسار القانوني إلى مراحل بسيطة: الخطر الفوري والمستندات المطلوبة والخيارات المتاحة والإجراء المتوقع والخطوة التالية",
    drillEn: "explain one matter in three versions: simple client version, procedural version, and risk version",
    drillAr: "اشرح ملفًا واحدًا بثلاث نسخ: نسخة مبسطة ونسخة إجرائية ونسخة مخاطر",
    metricEn: "clients able to repeat the legal path and next step in their own words",
    metricAr: "العملاء القادرون على إعادة شرح المسار القانوني والخطوة التالية بلغتهم",
  },

  legal_value_framing: {
    id: "legal_value_framing",
    en: "Legal Value Framing",
    ar: "تأطير القيمة القانونية",
    leakageEn: "clients comparing legal fees without understanding the value of preparation, risk control, negotiation leverage, evidence review, and representation quality",
    leakageAr: "مقارنة العملاء لأتعاب المحاماة دون فهم قيمة التحضير وتقليل المخاطر وقوة التفاوض ومراجعة الأدلة وجودة التمثيل",
    treatmentEn: "frame legal value around protection, preparation, legal judgment, risk reduction, negotiation leverage, and peace of mind",
    treatmentAr: "تأطير القيمة القانونية حول الحماية والتحضير والحكم القانوني وتقليل المخاطر وقوة التفاوض وطمأنينة العميل",
    drillEn: "rewrite three legal services as value statements: risk protected, process managed, ethical objective pursued, and client burden reduced",
    drillAr: "أعد صياغة ثلاث خدمات قانونية كعبارات قيمة: الخطر المحمي والمسار المُدار والهدف الأخلاقي والعبء المخفف",
    metricEn: "clients who understand what the professional fee protects or enables",
    metricAr: "العملاء الذين يفهمون ماذا تحمي أو تُمكّن أتعاب المحاماة",
  },

  fee_presentation_retainer_confidence: {
    id: "fee_presentation_retainer_confidence",
    en: "Fee Presentation & Retainer Confidence",
    ar: "عرض أتعاب المحاماة والثقة في اتفاق التمثيل",
    leakageEn: "engagements lost when professional fees are presented with hesitation, apology, or weak connection to scope, risk, and responsibility",
    leakageAr: "ضياع التعاقدات عندما تُعرض أتعاب المحاماة بتردد أو اعتذار أو دون ربط قوي بالنطاق والمخاطر والمسؤولية",
    treatmentEn: "present professional fees with scope, stages, deliverables, risk, responsibility, and the engagement step",
    treatmentAr: "عرض أتعاب المحاماة مع النطاق والمراحل والمخرجات والمخاطر والمسؤولية وخطوة التعاقد",
    drillEn: "practice one fee presentation using: scope, legal risk, work stages, professional fee, engagement step",
    drillAr: "تدرّب على عرض أتعاب المحاماة باستخدام: النطاق، الخطر القانوني، مراحل العمل، أتعاب المحاماة، خطوة التعاقد",
    metricEn: "fee conversations ending with clarity instead of apology, confusion, or defensive explanation",
    metricAr: "محادثات أتعاب المحاماة التي تنتهي بوضوح بدل الاعتذار أو الارتباك أو الدفاع",
  },

  fee_comparison_objections: {
    id: "fee_comparison_objections",
    en: "Fee & Comparison Objections",
    ar: "اعتراضات أتعاب المحاماة والمقارنة",
    leakageEn: "clients choosing another lawyer because fee comparisons are answered defensively instead of reframing scope, risk, preparation, and accountability",
    leakageAr: "اختيار العملاء لمحامٍ آخر لأن اعتراضات أتعاب المحاماة تُجاب بدفاعية بدل إعادة تأطير النطاق والمخاطر والتحضير والمسؤولية",
    treatmentEn: "clarify what is being compared: scope, risk, preparation, communication, and professional accountability",
    treatmentAr: "توضيح ما الذي تتم مقارنته: النطاق والمخاطر والتحضير والتواصل والمسؤولية المهنية",
    drillEn: "prepare one professional response to: another lawyer’s fees are lower than yours",
    drillAr: "حضّر ردًا مهنيًا واحدًا على: أتعاب محامٍ آخر أقل من أتعابك",
    metricEn: "fee comparison conversations that return to value, scope, and engagement clarity",
    metricAr: "محادثات مقارنة أتعاب المحاماة التي تعود إلى القيمة والنطاق ووضوح التعاقد",
  },

  trust_risk_outcome_objections: {
    id: "trust_risk_outcome_objections",
    en: "Trust, Risk & Outcome Objections",
    ar: "اعتراضات الثقة والمخاطر والنتائج",
    leakageEn: "clients hesitating when they want guarantees, certainty, or reassurance and the lawyer either overpromises or becomes too cold",
    leakageAr: "تردد العملاء عندما يطلبون ضمانًا أو يقينًا أو طمأنة، فيبالغ المحامي بالوعد أو يصبح باردًا أكثر من اللازم",
    treatmentEn: "reassure ethically by separating outcome guarantees from process, preparation, risk assessment, and professional commitment",
    treatmentAr: "الطمأنة الأخلاقية عبر فصل ضمان النتائج عن المسار والتحضير وتقييم المخاطر والالتزام المهني",
    drillEn: "answer: can you guarantee the result? using ethics, process, preparation, and risk clarity",
    drillAr: "أجب عن: هل تضمن النتيجة؟ باستخدام الأخلاق والمسار والتحضير ووضوح المخاطر",
    metricEn: "objections answered without promising outcomes while maintaining client confidence",
    metricAr: "الاعتراضات التي تُجاب دون وعد بالنتائج مع الحفاظ على ثقة العميل",
  },

  ethical_persuasion_boundaries: {
    id: "ethical_persuasion_boundaries",
    en: "Ethical Persuasion & Professional Boundaries",
    ar: "الإقناع المهني الأخلاقي والحدود المهنية",
    leakageEn: "lawyers avoiding persuasion because it feels salesy, or persuading in ways that weaken professional dignity",
    leakageAr: "تجنب المحامين للإقناع لأنه يبدو تجاريًا أو استخدام الإقناع بطريقة تُضعف الهيبة المهنية",
    treatmentEn: "reframe persuasion as responsible guidance that helps the right client understand risk, options, professional fees, and next steps",
    treatmentAr: "إعادة تأطير الإقناع كإرشاد مسؤول يساعد العميل المناسب على فهم المخاطر والخيارات وأتعاب المحاماة والخطوات التالية",
    drillEn: "write: I am not selling an outcome; I am guiding a legal decision responsibly",
    drillAr: "اكتب: أنا لا أبيع نتيجة؛ أنا أوجّه قرارًا قانونيًا بمسؤولية",
    metricEn: "consultations where persuasion remains ethical, clear, and professionally bounded",
    metricAr: "الاستشارات التي يبقى فيها الإقناع أخلاقيًا وواضحًا ومحدودًا مهنيًا",
  },

  consultation_closing_engagement: {
    id: "consultation_closing_engagement",
    en: "Consultation Closing & Engagement Commitment",
    ar: "إغلاق الاستشارة والالتزام بالتعاقد",
    leakageEn: "consultations ending with polite interest but no engagement agreement, no professional-fee step, no document list, and no dated next step",
    leakageAr: "انتهاء الاستشارات باهتمام مهذب دون عقد تمثيل أو خطوة أتعاب المحاماة أو قائمة مستندات أو خطوة تالية مؤرخة",
    treatmentEn: "close professionally with risk summary, recommended path, professional fees, engagement agreement, documents, and first action",
    treatmentAr: "الإغلاق المهني عبر ملخص الخطر والمسار المقترح وأتعاب المحاماة واتفاق التمثيل والمستندات وأول إجراء",
    drillEn: "end the next five consultations with a clear engagement invitation and one specific next step",
    drillAr: "اختم الاستشارات القادمة بدعوة واضحة للتعاقد وخطوة محددة",
    metricEn: "consultations ending with signed engagement, payment step, document submission, or a clear no",
    metricAr: "الاستشارات التي تنتهي بعقد تمثيل أو خطوة أتعاب أو إرسال مستندات أو رفض واضح",
  },

  post_consultation_follow_up: {
    id: "post_consultation_follow_up",
    en: "Follow-Up Discipline After Consultation",
    ar: "انضباط المتابعة بعد الاستشارة",
    leakageEn: "qualified potential clients disappearing after consultation because follow-up is late, weak, or too passive",
    leakageAr: "اختفاء العملاء المحتملين المؤهلين بعد الاستشارة لأن المتابعة متأخرة أو ضعيفة أو سلبية أكثر من اللازم",
    treatmentEn: "follow up within 24 hours with a professional summary, risk reminder, required documents, fee step, and next decision",
    treatmentAr: "المتابعة خلال 24 ساعة بملخص مهني وتذكير بالمخاطر والمستندات المطلوبة وخطوة أتعاب المحاماة والقرار التالي",
    drillEn: "send a structured follow-up within 24 hours after every qualified consultation",
    drillAr: "أرسل متابعة منظمة خلال 24 ساعة بعد كل استشارة مؤهلة",
    metricEn: "qualified consultations followed up within 24 hours with a clear next action",
    metricAr: "الاستشارات المؤهلة التي تمت متابعتها خلال 24 ساعة بخطوة تالية واضحة",
  },

  emotional_difficult_clients: {
    id: "emotional_difficult_clients",
    en: "Managing Emotional, Difficult or Unrealistic Clients",
    ar: "إدارة العملاء الانفعاليين أو الصعبين أو غير الواقعيين",
    leakageEn: "emotional or unrealistic clients consuming time, pressuring the lawyer, resisting professional fees, or later blaming the lawyer for outcomes outside professional control",
    leakageAr: "استهلاك العملاء الانفعاليين أو غير الواقعيين للوقت وضغطهم على المحامي أو مقاومتهم لأتعاب المحاماة أو لومهم لاحقًا على نتائج خارج السيطرة المهنية",
    treatmentEn: "set calm boundaries around facts, legal limits, communication rules, professional fees, responsibilities, and realistic expectations",
    treatmentAr: "وضع حدود هادئة حول الوقائع والحدود القانونية وقواعد التواصل وأتعاب المحاماة والمسؤوليات والتوقعات الواقعية",
    drillEn: "before one difficult client conversation, write the emotion, boundary, legal reality, and next step",
    drillAr: "قبل محادثة عميل صعبة واحدة، اكتب الانفعال والحد المهني والحقيقة القانونية والخطوة التالية",
    metricEn: "difficult client interactions ending with clear boundaries and documented expectations",
    metricAr: "تفاعلات العملاء الصعبة التي تنتهي بحدود واضحة وتوقعات موثقة",
  },

  client_experience_referral_growth: {
    id: "client_experience_referral_growth",
    en: "Client Experience, Satisfaction & Referral Growth",
    ar: "تجربة العميل والرضا ونمو الإحالات",
    leakageEn: "clients becoming dissatisfied even when legal outcomes are uncertain because communication, expectation setting, and experience are weak",
    leakageAr: "عدم رضا العملاء حتى عندما تكون النتائج القانونية غير مضمونة بسبب ضعف التواصل وإدارة التوقعات وتجربة العميل",
    treatmentEn: "manage the client experience through clarity, updates, empathy, documentation, realistic expectations, and professional closure",
    treatmentAr: "إدارة تجربة العميل عبر الوضوح والتحديثات والتعاطف والتوثيق والتوقعات الواقعية والإغلاق المهني",
    drillEn: "create one client-experience checklist for intake, updates, risk explanations, and closing the matter",
    drillAr: "أنشئ قائمة تجربة عميل واحدة للاستقبال والتحديثات وشرح المخاطر وإغلاق الملف",
    metricEn: "clients who feel informed, respected, and guided even when outcomes are uncertain",
    metricAr: "العملاء الذين يشعرون بأنهم مطلعون ومحترمون وموجّهون حتى عندما تكون النتائج غير مؤكدة",
  },

};

const ALIASES: Record<string, string> = {
  overall: "overall_score",
  total: "overall_score",
  total_score: "overall_score",
  overall_score: "overall_score",
  lawyer_client_conversion_overall_score: "lawyer_client_conversion_overall_score",
  legal_client_conversion_overall_score: "lawyer_client_conversion_overall_score",

  legal_inquiry_handling: "legal_inquiry_handling",
  consultation_opening_control: "consultation_opening_control",
  legal_need_diagnosis: "legal_need_diagnosis",
  case_qualification_client_fit: "case_qualification_client_fit",
  client_trust_professional_authority: "client_trust_professional_authority",
  explaining_legal_strategy_simply: "explaining_legal_strategy_simply",
  legal_value_framing: "legal_value_framing",
  fee_presentation_retainer_confidence: "fee_presentation_retainer_confidence",
  fee_comparison_objections: "fee_comparison_objections",
  trust_risk_outcome_objections: "trust_risk_outcome_objections",
  ethical_persuasion_boundaries: "ethical_persuasion_boundaries",
  consultation_closing_engagement: "consultation_closing_engagement",
  post_consultation_follow_up: "post_consultation_follow_up",
  emotional_difficult_clients: "emotional_difficult_clients",
  client_experience_referral_growth: "client_experience_referral_growth",
  sales_coaching_rep_development: "sales_coaching_rep_development",
  coaching_rep_development: "sales_coaching_rep_development",
  sales_coaching: "sales_coaching_rep_development",
  pipeline_visibility_deal_inspection: "pipeline_visibility_deal_inspection",
  pipeline_visibility: "pipeline_visibility_deal_inspection",
  deal_inspection: "pipeline_visibility_deal_inspection",
  pipeline_management_deal_inspection: "pipeline_management_deal_inspection",
  forecast_judgment: "forecast_judgment",
  forecast_accuracy_judgment: "forecast_accuracy_judgment",
  forecast_accuracy: "forecast_accuracy_judgment",
  performance_accountability: "performance_accountability",
  target_setting_kpi_discipline: "target_setting_kpi_discipline",
  kpi_discipline: "target_setting_kpi_discipline",
  motivation_team_energy: "motivation_team_energy",
  team_motivation: "motivation_team_energy",
  sales_meeting_rhythm: "sales_meeting_rhythm",
  one_on_one_management: "one_on_one_management",
  one_to_one_management: "one_on_one_management",
  hiring_onboarding_salespeople: "hiring_onboarding_salespeople",
  hiring_and_onboarding: "hiring_onboarding_salespeople",
  territory_resource_allocation: "territory_resource_allocation",
  handling_underperformance: "handling_underperformance",
  underperformance: "handling_underperformance",
  managing_difficult_salespeople: "managing_difficult_salespeople",
  difficult_salespeople: "managing_difficult_salespeople",
  managing_top_performers: "managing_top_performers",
  top_performers: "managing_top_performers",
  manager_communication_upward_reporting: "manager_communication_upward_reporting",
  executive_reporting: "manager_communication_upward_reporting",
  decision_making_under_pressure: "decision_making_under_pressure",

  prospecting_finding_new_clients: "prospecting_finding_new_clients",
  prospecting_and_finding_new_clients: "prospecting_finding_new_clients",
  prospecting: "prospecting_finding_new_clients",
  finding_new_clients: "prospecting_finding_new_clients",
  lead_generation: "prospecting_finding_new_clients",

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


function isManagerProfile(id: string): boolean {
  const key = normalizeCompetencyId(id);
  return new Set([
    "sales_coaching_rep_development",
    "pipeline_visibility_deal_inspection",
    "pipeline_management_deal_inspection",
    "forecast_judgment",
    "forecast_accuracy_judgment",
    "performance_accountability",
    "target_setting_kpi_discipline",
    "motivation_team_energy",
    "sales_meeting_rhythm",
    "one_on_one_management",
    "hiring_onboarding_salespeople",
    "territory_resource_allocation",
    "handling_underperformance",
    "managing_difficult_salespeople",
    "managing_top_performers",
    "manager_communication_upward_reporting",
    "decision_making_under_pressure",
    "sales_manager_overall",
  ]).has(key);
}

function isLawyerProfile(id: string): boolean {
  const key = normalizeCompetencyId(id);
  return new Set([
    "lawyer_client_conversion_overall_score",
    "legal_inquiry_handling",
    "consultation_opening_control",
    "legal_need_diagnosis",
    "case_qualification_client_fit",
    "client_trust_professional_authority",
    "explaining_legal_strategy_simply",
    "legal_value_framing",
    "fee_presentation_retainer_confidence",
    "fee_comparison_objections",
    "trust_risk_outcome_objections",
    "ethical_persuasion_boundaries",
    "consultation_closing_engagement",
    "post_consultation_follow_up",
    "emotional_difficult_clients",
    "client_experience_referral_growth",
  ]).has(key);
}

function enStrength(p: CompetencyProfile): string[] {
  if (isLawyerProfile(p.id)) {
    return [
      `Protect your strength in ${p.en}. This is not an area to ignore because it already feels natural. Turn it into a repeatable professional asset by documenting exactly what you do before, during, and after successful consultations where this competency appears.`,
      `Use ${p.en} as leverage for weaker legal client-conversion areas. For the next 7 days, deliberately connect this strength to one weak competency so your strongest professional behavior helps lift consultation clarity, client trust, professional-fee confidence, or engagement commitment.`,
      `Track ${p.metricEn}. Strong lawyers do not only rely on legal expertise; they protect the consultation behaviors that make expertise visible to the client. Review the metric every evening and write one adjustment for the next day.`,
    ];
  }
  return [
    `Protect your strength in ${p.en}. This is not an area to ignore because it is already good. Turn it into a repeatable asset by documenting exactly what you do before, during, and after successful situations where this competency appears.`,
    `Use ${p.en} as leverage for weaker areas. For the next 7 days, deliberately connect this strength to one weak competency. The goal is to make your strength pull the weaker behavior upward instead of letting the weak area drag the whole performance down.`,
    `Track ${p.metricEn}. Strong performers do not only have talent; they protect the behaviors that create the result. Review the metric every evening and write one adjustment for the next day.`,
  ];
}

function arStrength(p: CompetencyProfile): string[] {
  if (isLawyerProfile(p.id)) {
    return [
      `احمِ قوتك في ${p.ar}. لا تتجاهل هذه المنطقة لأنها جيدة أصلًا. حوّلها إلى أصل مهني متكرر عبر توثيق ما تفعله قبل وأثناء وبعد الاستشارات الناجحة التي تظهر فيها هذه الكفاءة.`,
      `استخدم ${p.ar} كرافعة للمناطق الأضعف في تحويل العملاء للمحامين. خلال 7 أيام، اربط هذه القوة عمدًا بإحدى الكفاءات الضعيفة حتى تساعد على رفع وضوح الاستشارة، ثقة العميل، أتعاب المحاماة، أو قرار التعاقد.`,
      `تتبع ${p.metricAr}. المحامي القوي لا يعتمد على الخبرة القانونية فقط؛ بل يحمي سلوك الاستشارة الذي يجعل هذه الخبرة مرئية للعميل. راجع المؤشر كل مساء واكتب تعديلًا واحدًا لليوم التالي.`,
    ];
  }
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
  if (isLawyerProfile(p.id)) {
    return [
      `${p.en} is now in the warning zone. This means the issue may already be costing client trust, professional-fee confidence, consultation clarity, or engagement decisions. Do not try to fix everything. Treat this as a priority leak: ${p.leakageEn}.`,
      `Your immediate treatment is: ${p.treatmentEn}. For the next 72 hours, simplify the behavior and use the same correction pattern in every relevant legal inquiry, consultation, professional-fee discussion, or follow-up.`,
      `Use this consultation drill: ${p.drillEn}. After each attempt, write one line: what happened, what I corrected, what I will repeat. Track ${p.metricEn} until the behavior becomes visible and measurable.`,
    ];
  }
  return [
    `${p.en} is now in the warning zone. This means the issue may already be costing momentum, trust, or deal movement. Do not try to fix everything. Treat this as a priority leak: ${p.leakageEn}.`,
    `Your immediate treatment is: ${p.treatmentEn}. For the next 72 hours, simplify the behavior and use the same correction pattern in every relevant sales situation.`,
    `Use this field drill: ${p.drillEn}. After each attempt, write one line: what happened, what I corrected, what I will repeat. Track ${p.metricEn} until the behavior becomes visible and measurable.`,
  ];
}

function arThreat(p: CompetencyProfile): string[] {
  if (isLawyerProfile(p.id)) {
    return [
      `${p.ar} الآن في منطقة إنذار. هذا يعني أن المشكلة قد تكون بدأت بالفعل في خسارة ثقة العميل أو وضوح أتعاب المحاماة أو وضوح الاستشارة أو قرار التعاقد. لا تحاول إصلاح كل شيء. تعامل معها كتسريب أولوية: ${p.leakageAr}.`,
      `العلاج الفوري هو: ${p.treatmentAr}. خلال 72 ساعة، بسّط السلوك واستخدم نفس نمط التصحيح في كل استفسار قانوني أو استشارة أو نقاش حول أتعاب المحاماة أو متابعة.`,
      `استخدم هذا التمرين الاستشاري: ${p.drillAr}. بعد كل محاولة، اكتب سطرًا واحدًا: ماذا حدث، ماذا صححت، وماذا سأكرر. تتبع ${p.metricAr} حتى يصبح السلوك واضحًا وقابلًا للقياس.`,
    ];
  }
  return [
    `${p.ar} الآن في منطقة إنذار. هذا يعني أن المشكلة قد تكون بدأت بالفعل في خسارة الزخم أو الثقة أو حركة الصفقة. لا تحاول إصلاح كل شيء. تعامل معها كتسريب أولوية: ${p.leakageAr}.`,
    `العلاج الفوري هو: ${p.treatmentAr}. خلال 72 ساعة، بسّط السلوك واستخدم نفس نمط التصحيح في كل موقف بيعي مناسب.`,
    `استخدم هذا التمرين الميداني: ${p.drillAr}. بعد كل محاولة، اكتب سطرًا واحدًا: ماذا حدث، ماذا صححت، وماذا سأكرر. تتبع ${p.metricAr} حتى يصبح السلوك واضحًا وقابلًا للقياس.`,
  ];
}

function enWeakness(p: CompetencyProfile): string[] {
  return [
    isLawyerProfile(p.id)
    ? `${p.en} is a treatment priority. This is not a label of legal failure; it is a signal that this part of the legal client-conversion journey needs direct correction before it keeps leaking trust, professional-fee confidence, engagement commitment, or client follow-up.`
    : isManagerProfile(p.id)
    ? `${p.en} is a treatment priority. This is not a label of failure; it is a signal that this part of the sales-management leadership body needs direct correction before it keeps leaking team performance, forecast quality, or execution discipline.`
    : `${p.en} is a treatment priority. This is not a label of failure; it is a signal that this part of the sales performance body needs direct correction before it keeps leaking opportunities.`,
    `Stop improvising in this area for the next 7 days. Use a fixed treatment protocol: ${p.treatmentEn}. The purpose is to remove randomness and give your behavior a stable structure.`,
    `Your daily prescription is: ${p.drillEn}. Measure only one thing: ${p.metricEn}. When the weakest behavior becomes measurable, it becomes treatable.`,
  ];
}

function arWeakness(p: CompetencyProfile): string[] {
  return [
    isLawyerProfile(p.id)
    ? `${p.ar} هي أولوية علاج. هذا ليس وصفًا لفشل قانوني؛ بل إشارة إلى أن هذا الجزء من رحلة تحويل العميل القانوني يحتاج إلى تصحيح مباشر قبل أن يستمر في تسريب الثقة أو وضوح أتعاب المحاماة أو قرار التعاقد أو المتابعة.`
    : isManagerProfile(p.id)
    ? `${p.ar} هي أولوية علاج. هذا ليس وصفًا للفشل؛ بل إشارة إلى أن هذا الجزء من جسم القيادة البيعية يحتاج إلى تصحيح مباشر قبل أن يستمر في تسريب أداء الفريق أو جودة التوقعات أو انضباط التنفيذ.`
    : `${p.ar} هي أولوية علاج. هذا ليس وصفًا للفشل؛ بل إشارة إلى أن هذا الجزء من جسم الأداء البيعي يحتاج إلى تصحيح مباشر قبل أن يستمر في تسريب الفرص.`,
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