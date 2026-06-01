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

};

const ALIASES: Record<string, string> = {
  overall: "overall_score",
  total: "overall_score",
  total_score: "overall_score",
  overall_score: "overall_score",

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
    isManagerProfile(p.id)
    ? `${p.en} is a treatment priority. This is not a label of failure; it is a signal that this part of the sales-management leadership body needs direct correction before it keeps leaking team performance, forecast quality, or execution discipline.`
    : `${p.en} is a treatment priority. This is not a label of failure; it is a signal that this part of the sales performance body needs direct correction before it keeps leaking opportunities.`,
    `Stop improvising in this area for the next 7 days. Use a fixed treatment protocol: ${p.treatmentEn}. The purpose is to remove randomness and give your behavior a stable structure.`,
    `Your daily prescription is: ${p.drillEn}. Measure only one thing: ${p.metricEn}. When the weakest behavior becomes measurable, it becomes treatable.`,
  ];
}

function arWeakness(p: CompetencyProfile): string[] {
  return [
    isManagerProfile(p.id)
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