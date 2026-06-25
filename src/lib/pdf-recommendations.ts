// lib/pdf-recommendations.ts
// Premium Sales MRI Recommendation Engine
// Keeps the same public exports used by the app:
// Tier, Language, normalizeCompetencyId, tierFromPercentage, getRecommendations

import { SALES_MANAGER_PLAN_PROFILES } from "@/lib/sales-manager-90day";

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
    en: "Overall Legal Client Experience Health",
    ar: "الصحة العامة لتجربة العميل القانونية",
    leakageEn: "an inconsistent client journey, unclear consultation structure, weak reassurance, unclear legal value, uncertain professional-fee discussions, and passive follow-up",
    leakageAr: "تجربة عميل غير متسقة، وضعف في هيكلة الاستشارة والطمأنة المهنية ووضوح القيمة القانونية ومناقشة أتعاب المحاماة والمتابعة",
    treatmentEn: "build a simple legal client-experience operating system around your lowest three consultation and communication markers",
    treatmentAr: "بناء نظام تشغيل بسيط لتجربة العميل القانونية حول أضعف ثلاثة مؤشرات لديك في الاستشارة والتواصل",
    drillEn: "before your first client interaction each day, review your three priority areas and choose one practical correction behavior",
    drillAr: "قبل أول تفاعل مع عميل كل يوم، راجع مناطق الأولوية الثلاث واختر سلوك تصحيح عملي واحد",
    metricEn: "daily completion of the selected legal client-experience correction behavior",
    metricAr: "إكمال سلوك التصحيح المختار لتجربة العميل القانونية يوميًا",
  },

  sales_manager_overall_score: {
    id: "sales_manager_overall_score",
    en: "Overall Sales Management Health",
    ar: "الصحة الإدارية العامة للمبيعات",
    leakageEn: "unclear coaching rhythm, weak pipeline inspection, soft accountability, and inconsistent team execution",
    leakageAr: "غموض إيقاع التدريب، ضعف فحص مسار الفرص البيعية، ليونة المساءلة، وعدم ثبات تنفيذ الفريق",
    treatmentEn: "build a simple weekly management operating system around your lowest three leadership markers",
    treatmentAr: "بناء نظام إدارة أسبوعي بسيط حول أضعف ثلاثة مؤشرات قيادية لديك",
    drillEn: "review your top 3 management risks every Monday and choose one coaching, inspection, or accountability action before the first team interaction",
    drillAr: "راجع أخطر 3 مخاطر إدارية كل يوم اثنين واختر إجراء تدريب أو فحص أو مساءلة واحد قبل أول تفاعل مع الفريق",
    metricEn: "weekly completion of the chosen management correction behavior",
    metricAr: "إكمال سلوك التصحيح الإداري المختار أسبوعيًا",
  },


  sme_business_health_overall_score: {
    id: "sme_business_health_overall_score",
    en: "Overall SME Business Health",
    ar: "الصحة العامة للشركات الصغيرة والمتوسطة",
    leakageEn: "unclear direction, fragile revenue, cash pressure, weak systems, people accountability gaps, and limited management visibility",
    leakageAr: "غموض الاتجاه، هشاشة الإيرادات، ضغط النقد، ضعف الأنظمة، فجوات مساءلة الأفراد، وضعف الرؤية الإدارية",
    treatmentEn: "build a 90-day stabilization roadmap around the lowest three business health areas",
    treatmentAr: "بناء خارطة تثبيت لمدة 90 يومًا حول أضعف ثلاث مناطق في صحة الشركة",
    drillEn: "review the top three business leaks weekly and assign one owner, one action, and one measurable correction for each",
    drillAr: "راجع أكبر ثلاثة تسريبات في الشركة أسبوعيًا وحدد مالكًا واحدًا وإجراءً واحدًا ومؤشر تصحيح واحدًا لكل منها",
    metricEn: "weekly completion of the agreed business health correction actions",
    metricAr: "إكمال إجراءات تصحيح صحة الشركة المتفق عليها أسبوعيًا",
  },

  strategic_direction_business_clarity: {
    id: "strategic_direction_business_clarity",
    en: "Strategic Direction & Business Clarity",
    ar: "الاتجاه الاستراتيجي ووضوح الشركة",
    leakageEn: "reactive decisions, scattered priorities, unclear ideal customers, and the business saying yes to too many directions",
    leakageAr: "قرارات تفاعلية وأولويات مشتتة وعميل مثالي غير واضح وقبول اتجاهات كثيرة في الشركة",
    treatmentEn: "clarify the company’s target customer, strongest offer, top priorities, and stop-doing list",
    treatmentAr: "توضيح العميل المستهدف وأقوى عرض وأهم الأولويات وقائمة ما يجب التوقف عنه",
    drillEn: "create a one-page direction map and review every major decision against it for 30 days",
    drillAr: "أنشئ خريطة اتجاه من صفحة واحدة وراجع كل قرار مهم مقابلها لمدة 30 يومًا",
    metricEn: "major decisions linked to the agreed strategic priorities",
    metricAr: "القرارات المهمة المرتبطة بالأولويات الاستراتيجية المتفق عليها",
  },

  revenue_engine_sales_predictability: {
    id: "revenue_engine_sales_predictability",
    en: "Revenue Engine & Sales Predictability",
    ar: "محرك الإيرادات واستقرار المبيعات",
    leakageEn: "revenue depending on owner effort, random referrals, inconsistent follow-up, or unclear forecasting",
    leakageAr: "اعتماد الإيرادات على جهد المالك أو الإحالات العشوائية أو المتابعة غير الثابتة أو التوقعات الغامضة",
    treatmentEn: "map the revenue engine from lead source to conversion, follow-up, sales cycle, and forecast confidence",
    treatmentAr: "رسم محرك الإيرادات من مصدر العميل المحتمل إلى التحويل والمتابعة ودورة البيع وثقة التوقع",
    drillEn: "analyze the last 20 customers and identify where they came from, why they bought, and how long the decision took",
    drillAr: "حلل آخر 20 عميلًا وحدد من أين جاءوا ولماذا اشتروا وكم استغرق قرارهم",
    metricEn: "qualified inquiries converted within a tracked sales cycle",
    metricAr: "الاستفسارات المؤهلة التي تتحول داخل دورة بيع واضحة",
  },

  marketing_positioning_lead_quality: {
    id: "marketing_positioning_lead_quality",
    en: "Marketing Positioning & Lead Quality",
    ar: "التموضع التسويقي وجودة العملاء المحتملين",
    leakageEn: "marketing noise, weak differentiation, unclear promise, and poor-fit leads consuming time",
    leakageAr: "ضجيج تسويقي وتميز ضعيف ووعد غير واضح وعملاء محتملون غير مناسبين يستهلكون الوقت",
    treatmentEn: "tighten the message, audience, proof, offer clarity, and channel focus before increasing marketing volume",
    treatmentAr: "تقوية الرسالة والجمهور والدليل ووضوح العرض وتركيز القنوات قبل زيادة حجم التسويق",
    drillEn: "rewrite the core message using who we help, painful problem, outcome, proof, and next step",
    drillAr: "أعد صياغة الرسالة الأساسية باستخدام من نساعد والمشكلة المؤلمة والنتيجة والدليل والخطوة التالية",
    metricEn: "right-fit leads with a clear buying reason",
    metricAr: "العملاء المحتملون المناسبون ولديهم سبب شراء واضح",
  },

  customer_experience_retention: {
    id: "customer_experience_retention",
    en: "Customer Experience & Retention",
    ar: "تجربة العملاء والاحتفاظ بهم",
    leakageEn: "customers buying once but not returning, referring, reviewing, or becoming loyal",
    leakageAr: "عملاء يشترون مرة واحدة لكن لا يعودون أو يحيلون أو يقيمون أو يصبحون أوفياء",
    treatmentEn: "manage the customer journey through expectation setting, communication, delivery standards, recovery, and reactivation",
    treatmentAr: "إدارة رحلة العميل عبر ضبط التوقعات والتواصل ومعايير التسليم والاستدراك وإعادة التفعيل",
    drillEn: "review 10 recent customers and identify one trust-building or trust-leaking moment in each journey",
    drillAr: "راجع 10 عملاء حديثين وحدد لحظة بناء ثقة أو تسريب ثقة في كل رحلة",
    metricEn: "repeat customers, referrals, reviews, complaints resolved, and reactivation",
    metricAr: "العملاء العائدون والإحالات والتقييمات والشكاوى المعالجة وإعادة التفعيل",
  },

  cash_flow_margins_financial_control: {
    id: "cash_flow_margins_financial_control",
    en: "Cash Flow, Margins & Financial Control",
    ar: "التدفق النقدي والهوامش والرقابة المالية",
    leakageEn: "sales existing but cash staying tight because margins, costs, collections, and profit by offer are unclear",
    leakageAr: "وجود مبيعات مع بقاء النقد مضغوطًا بسبب غموض الهوامش والتكاليف والتحصيل والربح حسب العرض",
    treatmentEn: "review cash flow, gross margin, net margin, overdue payments, cost creep, and profitability by product or service line",
    treatmentAr: "مراجعة التدفق النقدي والهامش الإجمالي وصافي الهامش والمتأخرات وزحف التكاليف والربحية حسب المنتج أو الخدمة",
    drillEn: "identify the top three cash leaks and top three profit contributors from the last 90 days",
    drillAr: "حدد أكبر ثلاثة تسريبات نقدية وأكبر ثلاثة مصادر ربح من آخر 90 يومًا",
    metricEn: "weekly cash visibility, margin by offer, overdue receivables, and net profit trend",
    metricAr: "وضوح النقد الأسبوعي والهامش حسب العرض والمتأخرات واتجاه صافي الربح",
  },

  operations_systems_process_discipline: {
    id: "operations_systems_process_discipline",
    en: "Operations, Systems & Process Discipline",
    ar: "العمليات والأنظمة وانضباط الإجراءات",
    leakageEn: "delivery depending on memory, individuals, and owner intervention instead of documented repeatable systems",
    leakageAr: "اعتماد التسليم على الذاكرة والأفراد وتدخل المالك بدل أنظمة موثقة قابلة للتكرار",
    treatmentEn: "document critical workflows, quality standards, handoffs, escalation rules, and process owners",
    treatmentAr: "توثيق العمليات الحرجة ومعايير الجودة ونقاط التسليم وقواعد التصعيد وملاك العمليات",
    drillEn: "choose one recurring process and define the standard steps, owner, quality check, and failure trigger",
    drillAr: "اختر عملية متكررة وحدد خطواتها القياسية والمالك وفحص الجودة ومؤشر الفشل",
    metricEn: "critical processes documented, followed, measured, and improved",
    metricAr: "العمليات الحرجة الموثقة والمتبعة والمقاسة والمحسنة",
  },

  people_roles_accountability: {
    id: "people_roles_accountability",
    en: "People, Roles & Accountability",
    ar: "الأفراد والأدوار والمساءلة",
    leakageEn: "busy employees with unclear ownership, weak standards, soft accountability, and too many decisions returning to the owner",
    leakageAr: "موظفون مشغولون مع ملكية غير واضحة ومعايير ضعيفة ومساءلة لينة وقرارات كثيرة تعود للمالك",
    treatmentEn: "define role outcomes, responsibilities, decision rights, review rhythm, and measurable accountability",
    treatmentAr: "تحديد نتائج الدور والمسؤوليات وصلاحيات القرار وإيقاع المراجعة والمساءلة القابلة للقياس",
    drillEn: "for each key person, write: owns, measures, reports, decides, escalates",
    drillAr: "لكل شخص أساسي اكتب: يملك، يقيس، يرفع تقريرًا، يقرر، يصعّد",
    metricEn: "roles with clear ownership, measurable outcomes, and review dates",
    metricAr: "الأدوار التي لها ملكية واضحة ونتائج قابلة للقياس ومواعيد مراجعة",
  },

  leadership_decision_making_rhythm: {
    id: "leadership_decision_making_rhythm",
    en: "Leadership & Decision-Making Rhythm",
    ar: "القيادة وإيقاع اتخاذ القرار",
    leakageEn: "the week being controlled by the loudest problem rather than a leadership rhythm of priorities, numbers, decisions, and review",
    leakageAr: "تحكم المشكلة الأعلى صوتًا في الأسبوع بدل إيقاع قيادي للأولويات والأرقام والقرارات والمراجعة",
    treatmentEn: "install a weekly leadership rhythm around numbers, priorities, blockers, decisions, owners, and deadlines",
    treatmentAr: "تركيب إيقاع قيادي أسبوعي حول الأرقام والأولويات والعوائق والقرارات والملاك والمواعيد",
    drillEn: "run one 45-minute weekly business review with fixed agenda and no vague action items",
    drillAr: "نفذ مراجعة أسبوعية لمدة 45 دقيقة بأجندة ثابتة ودون بنود عمل غامضة",
    metricEn: "decisions with owner, deadline, evidence, and follow-up review",
    metricAr: "القرارات التي لها مالك وموعد ودليل ومراجعة متابعة",
  },

  products_services_value_proposition: {
    id: "products_services_value_proposition",
    en: "Products, Services & Value Proposition",
    ar: "المنتجات والخدمات وعرض القيمة",
    leakageEn: "too many unclear, low-margin, or difficult-to-deliver offers absorbing attention and capacity",
    leakageAr: "عروض كثيرة وغير واضحة أو منخفضة الهامش أو صعبة التسليم تستهلك الانتباه والطاقة",
    treatmentEn: "rank offers by demand, margin, strategic fit, delivery complexity, and customer value",
    treatmentAr: "ترتيب العروض حسب الطلب والهامش والملاءمة الاستراتيجية وتعقيد التسليم وقيمة العميل",
    drillEn: "classify every offer as scale, fix, simplify, reposition, or stop",
    drillAr: "صنف كل عرض إلى توسعة أو إصلاح أو تبسيط أو إعادة تموضع أو إيقاف",
    metricEn: "revenue and margin concentration in the strongest strategic offers",
    metricAr: "تركيز الإيرادات والهامش في أقوى العروض الاستراتيجية",
  },

  technology_data_management_visibility: {
    id: "technology_data_management_visibility",
    en: "Technology, Data & Management Visibility",
    ar: "التقنية والبيانات ووضوح الإدارة",
    leakageEn: "the owner not seeing the business clearly because data is scattered, late, manual, or missing",
    leakageAr: "عدم رؤية المالك للشركة بوضوح لأن البيانات متفرقة أو متأخرة أو يدوية أو ناقصة",
    treatmentEn: "build a simple weekly dashboard across revenue, cash, customers, operations, people, and risk",
    treatmentAr: "بناء لوحة أسبوعية بسيطة عبر الإيرادات والنقد والعملاء والعمليات والأفراد والمخاطر",
    drillEn: "choose 12 numbers the owner or GM must see weekly without chasing information",
    drillAr: "اختر 12 رقمًا يجب أن يراها المالك أو المدير العام أسبوعيًا دون مطاردة المعلومات",
    metricEn: "weekly visibility of the core business dashboard",
    metricAr: "وضوح لوحة الإدارة الأساسية أسبوعيًا",
  },

  risk_compliance_business_continuity: {
    id: "risk_compliance_business_continuity",
    en: "Risk, Compliance & Business Continuity",
    ar: "المخاطر والامتثال واستمرارية الأعمال",
    leakageEn: "hidden exposure through customer concentration, supplier dependency, compliance gaps, staff dependency, or weak continuity planning",
    leakageAr: "تعرض مخفي بسبب تركّز العملاء أو اعتماد الموردين أو فجوات الامتثال أو الاعتماد على موظف أو ضعف خطط الاستمرارية",
    treatmentEn: "identify the few risks that could damage cash, reputation, delivery, compliance, or continuity",
    treatmentAr: "تحديد المخاطر القليلة التي قد تضرب النقد أو السمعة أو التسليم أو الامتثال أو الاستمرارية",
    drillEn: "create a top-10 risk register with likelihood, impact, owner, control, and contingency action",
    drillAr: "أنشئ سجلًا لأهم 10 مخاطر مع الاحتمال والأثر والمالك والضابط وخطة بديلة",
    metricEn: "critical risks with owners, controls, contingency plans, and review dates",
    metricAr: "المخاطر الحرجة التي لها ملاك وضوابط وخطط بديلة ومواعيد مراجعة",
  },

  growth_readiness_scalability: {
    id: "growth_readiness_scalability",
    en: "Growth Readiness & Scalability",
    ar: "جاهزية النمو وقابلية التوسع",
    leakageEn: "growth creating chaos because customers, staff, marketing, or locations are added before systems are ready",
    leakageAr: "تحول النمو إلى فوضى بسبب إضافة عملاء أو موظفين أو تسويق أو فروع قبل جاهزية الأنظمة",
    treatmentEn: "define what must be systemized, delegated, measured, and protected before growth accelerates",
    treatmentAr: "تحديد ما يجب تنظيمه وتفويضه وقياسه وحمايته قبل تسريع النمو",
    drillEn: "build a scale-readiness checklist across sales, delivery, cash, people, systems, technology, and leadership rhythm",
    drillAr: "ابنِ قائمة جاهزية النمو عبر المبيعات والتسليم والنقد والأفراد والأنظمة والتقنية وإيقاع القيادة",
    metricEn: "growth initiatives supported by capacity, process, cash, and management visibility",
    metricAr: "مبادرات النمو المدعومة بالقدرة والعملية والنقد والرؤية الإدارية",
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
    ar: "رؤية مسار الفرص البيعية وفحص الصفقات",
    leakageEn: "hidden deal risk, unclear next steps, and pipeline confidence based on hope rather than evidence",
    leakageAr: "مخاطر مخفية في الصفقات وخطوات تالية غير واضحة وثقة في مسار الفرص البيعية مبنية على الأمل لا الدليل",
    treatmentEn: "inspect deals through evidence: buyer pain, decision process, next step, risk, and commitment",
    treatmentAr: "فحص الصفقات عبر الدليل: ألم العميل، عملية القرار، الخطوة التالية، المخاطر، والالتزام",
    drillEn: "choose five active deals and ask each rep for evidence of pain, decision owner, next step, and risk",
    drillAr: "اختر خمس صفقات نشطة واطلب من كل مندوب دليل الألم وصاحب القرار والخطوة التالية والمخاطر",
    metricEn: "percentage of pipeline with dated next steps and verified decision process",
    metricAr: "نسبة مسار الفرص البيعية الذي يحتوي على خطوات تالية بتاريخ وعملية قرار مؤكدة",
  },

  pipeline_management_deal_inspection: {
    id: "pipeline_management_deal_inspection",
    en: "Pipeline Management & Deal Inspection",
    ar: "إدارة مسار الفرص البيعية وفحص الصفقات",
    leakageEn: "pipeline movement based on optimism rather than disciplined deal inspection",
    leakageAr: "حركة مسار الفرص البيعية مبنية على التفاؤل بدل فحص الصفقات بانضباط",
    treatmentEn: "manage the pipeline by stage evidence, deal quality, risk, and next-step commitment",
    treatmentAr: "إدارة مسار الفرص البيعية حسب دليل المرحلة وجودة الصفقة والمخاطر والتزام الخطوة التالية",
    drillEn: "review the top ten opportunities and remove or re-stage any deal without a confirmed next action",
    drillAr: "راجع أهم عشر فرص وأعد تصنيف أو أزل أي صفقة بلا إجراء تالٍ مؤكد",
    metricEn: "pipeline value supported by verified buyer commitments",
    metricAr: "قيمة مسار الفرص البيعية المدعومة بالتزامات مؤكدة من العميل",
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

  manager_communication_executive_reporting: {
    id: "manager_communication_executive_reporting",
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

  // The attached Sales Manager package is the canonical source for these 15 profiles.
  ...SALES_MANAGER_PLAN_PROFILES,

  legal_inquiry_handling: {
    id: "legal_inquiry_handling",
    en: "First Legal Inquiry Response",
    ar: "الاستجابة الأولى للاستفسار القانوني",
    leakageEn: "legal inquiries losing momentum because the first response is slow, vague, overly technical, or asks for too much before understanding urgency and guiding the next step",
    leakageAr: "فقدان زخم الاستفسارات القانونية لأن الرد الأول بطيء أو غامض أو تقني أكثر من اللازم أو يطلب تفاصيل كثيرة قبل فهم الاستعجال وتوجيه الخطوة التالية",
    treatmentEn: "use a four-step first-response protocol: professional reassurance, urgency check, two or three clarifying questions, and a clear next step",
    treatmentAr: "استخدام بروتوكول من أربع مراحل للرد الأول: طمأنة مهنية، فحص الاستعجال، سؤالان أو ثلاثة للتوضيح، وخطوة تالية واضحة",
    drillEn: "write three first-response messages of no more than four lines, each containing reassurance, one urgency question, and one clarifying question",
    drillAr: "اكتب ثلاث رسائل رد أولي لا تتجاوز أربع سطور، وتتضمن كل واحدة طمأنة وسؤالاً عن الاستعجال وسؤالاً للتوضيح",
    metricEn: "percentage of qualified inquiries receiving a clear first response within the target time",
    metricAr: "نسبة الاستفسارات المؤهلة التي تتلقى رداً أولياً واضحاً خلال الوقت المستهدف",
  },

  consultation_opening_control: {
    id: "consultation_opening_control",
    en: "Consultation Opening & Conversation Structure",
    ar: "إدارة بداية الاستشارة وتنظيم الحوار",
    leakageEn: "consultations beginning in an emotional or scattered way, consuming time without clear priorities, a defined question, or an agreed outcome",
    leakageAr: "بدء الاستشارات بصورة عاطفية أو مشتتة واستهلاك الوقت دون أولويات واضحة أو سؤال محدد أو نتيجة متفق عليها",
    treatmentEn: "use a consistent opening: calm the client, define the purpose, organize the facts, identify the legal question, and agree what clarity should be reached by the end",
    treatmentAr: "استخدام افتتاحية ثابتة: تهدئة العميل، تحديد الهدف، ترتيب الوقائع، تحديد السؤال القانوني، والاتفاق على ما يجب الوصول إليه قبل نهاية اللقاء",
    drillEn: "start your next three consultations with the same sentence: “Let us identify your most important point first, organize the facts, and leave with one clear next step.”",
    drillAr: "ابدأ استشاراتك الثلاث القادمة بالجملة نفسها: «دعنا أولاً نحدد أهم نقطة لديك، ثم نرتب الوقائع ونخرج بخطوة واضحة.»",
    metricEn: "percentage of consultations ending with a clear summary, next step, and owner for each action",
    metricAr: "نسبة الاستشارات التي تنتهي بملخص واضح وخطوة تالية ومسؤول محدد عن كل إجراء",
  },

  legal_need_diagnosis: {
    id: "legal_need_diagnosis",
    en: "Understanding the Client’s Real Legal Need",
    ar: "فهم الحاجة القانونية الحقيقية للعميل",
    leakageEn: "responding to the surface request—such as “I want to file a case”—without discovering the client’s real objective, urgency, constraints, or risks",
    leakageAr: "التعامل مع الطلب الظاهر فقط، مثل «أريد رفع دعوى»، دون اكتشاف الهدف الحقيقي للعميل أو الاستعجال أو القيود أو المخاطر",
    treatmentEn: "ask diagnostic questions that reveal what the client wants to protect, what they fear, what outcome is acceptable, and what could happen if they wait",
    treatmentAr: "طرح أسئلة تشخيصية تكشف ما الذي يريد العميل حمايته وما الذي يخشاه وما النتيجة المقبولة وما الذي قد يحدث إذا انتظر",
    drillEn: "before giving any recommendation, ask: What outcome do you want? What concerns you most? Is there a deadline or immediate risk?",
    drillAr: "قبل تقديم أي توصية، اسأل: ما النتيجة التي تريدها؟ ما أكثر شيء يقلقك؟ وهل توجد مهلة أو مخاطرة قريبة؟",
    metricEn: "percentage of consultations where the client’s goal, risk, and priorities are documented before a recommendation",
    metricAr: "نسبة الاستشارات التي يتم فيها توثيق هدف العميل ومخاطره وأولوياته قبل تقديم التوصية",
  },

  case_qualification_client_fit: {
    id: "case_qualification_client_fit",
    en: "Matter Qualification & Appropriate Legal Service",
    ar: "تحديد ملاءمة الحالة والخدمة القانونية المناسبة",
    leakageEn: "recommending a service level that is too broad or too limited, or handling matters outside the right expertise without enough clarity for the client",
    leakageAr: "اقتراح مستوى خدمة أوسع أو أضيق من الحاجة الفعلية، أو التعامل مع ملفات خارج نطاق الاختصاص دون وضوح كافٍ للعميل",
    treatmentEn: "use a professional qualification framework for expertise fit, appropriate service level, required documents, referral needs, and the safest next step",
    treatmentAr: "استخدام إطار مهني لتحديد ملاءمة الاختصاص ومستوى الخدمة المناسب والمستندات المطلوبة والحاجة إلى الإحالة والخطوة الأكثر أماناً للعميل",
    drillEn: "take five potential matters and classify each as focused consultation, defined service, broader representation, referral, or information needed",
    drillAr: "خذ خمس حالات محتملة وصنف كل واحدة إلى: استشارة مركزة، خدمة محددة، تمثيل أوسع، إحالة، أو حاجة إلى معلومات إضافية",
    metricEn: "percentage of matters guided to the right service level or referral from the first assessment",
    metricAr: "نسبة الحالات التي تم توجيهها إلى مستوى الخدمة الصحيح أو الإحالة المناسبة من أول تقييم",
  },

  client_trust_professional_authority: {
    id: "client_trust_professional_authority",
    en: "Client Trust & Professional Reassurance",
    ar: "بناء ثقة العميل والطمأنة المهنية",
    leakageEn: "clients remaining hesitant because legal knowledge is not communicated in a way that creates safety, confidence, and clear professional guidance",
    leakageAr: "بقاء العميل متردداً لأن المعرفة القانونية لا تُعرض بطريقة تبني الأمان والثقة والتوجيه المهني الواضح",
    treatmentEn: "build trust through clarity, honest professional boundaries, and expectation management—explain what is known, what must be verified, and what can be done",
    treatmentAr: "بناء الثقة عبر الوضوح والحدود المهنية الصادقة وإدارة التوقعات: شرح ما نعرفه وما يحتاج إلى تحقق وما يمكن القيام به",
    drillEn: "in every consultation, use one sentence that combines reassurance and professional boundaries: “I cannot promise an outcome, but I can explain your position, options, and risks clearly.”",
    drillAr: "في كل استشارة، استخدم عبارة تجمع الطمأنة والحدود المهنية: «لا أعدك بنتيجة، لكن أستطيع أن أوضح لك موقفك وخياراتك ومخاطرك بوضوح.»",
    metricEn: "clients reporting that the next steps and risks became clearer after the consultation",
    metricAr: "معدل العملاء الذين يذكرون أن الخطوات والمخاطر أصبحت أوضح بعد الاستشارة",
  },

  explaining_legal_strategy_simply: {
    id: "explaining_legal_strategy_simply",
    en: "Explaining the Legal Path Clearly",
    ar: "شرح المسار القانوني بلغة واضحة ومفهومة",
    leakageEn: "clients hearing legal terminology without understanding what it means for them, why a path is chosen, or what will happen next",
    leakageAr: "سماع العميل للمصطلحات القانونية دون فهم ما تعنيه عملياً له أو لماذا يتم اختيار مسار معين أو ما الذي سيحدث بعد ذلك",
    treatmentEn: "translate every legal explanation into practical language: what it means, why it matters, the next step, the risk, and when progress will be reviewed",
    treatmentAr: "تحويل كل شرح قانوني إلى لغة عملية: ماذا يعني هذا، لماذا يهمك، ما الخطوة التالية، ما المخاطرة، ومتى سنراجع التقدم",
    drillEn: "after explaining a legal point, ask: “How do you understand the next step?” Then clarify any gap.",
    drillAr: "بعد شرح أي نقطة قانونية، اسأل العميل: «كيف فهمت الخطوة التالية؟» ثم وضح أي نقطة غير واضحة",
    metricEn: "percentage of clients able to explain the next step back in their own words",
    metricAr: "نسبة العملاء القادرين على إعادة شرح الخطوة التالية بلغتهم الخاصة",
  },

  legal_value_framing: {
    id: "legal_value_framing",
    en: "Clarifying Legal Value Before Fees",
    ar: "إظهار القيمة القانونية قبل مناقشة الأتعاب",
    leakageEn: "the conversation becoming only about fees before the client understands the protection, risk reduction, clarity, and legal judgment they receive",
    leakageAr: "تحول الحديث إلى أتعاب المحاماة فقط قبل أن يفهم العميل الحماية وتقليل المخاطر والوضوح والحكم القانوني الذي يحصل عليه",
    treatmentEn: "connect legal value to protecting rights, reducing risk, clarifying decisions, avoiding harmful steps, and choosing the right path early",
    treatmentAr: "ربط القيمة القانونية بحماية الحق وتقليل المخاطر ووضوح القرار وتجنب الخطوات التي قد تضعف الموقف واختيار المسار المناسب مبكراً",
    drillEn: "choose three services and write for each: what it protects, what risk it reduces, and what decision it helps the client make",
    drillAr: "اختر ثلاث خدمات واكتب لكل واحدة: ما الذي تحميه، ما الخطر الذي تخففه، وما القرار الذي تساعد العميل على اتخاذه",
    metricEn: "percentage of clients able to describe the benefit or protection they receive before fees are discussed",
    metricAr: "نسبة العملاء القادرين على وصف الفائدة أو الحماية التي يحصلون عليها قبل مناقشة أتعاب المحاماة",
  },

  fee_presentation_retainer_confidence: {
    id: "fee_presentation_retainer_confidence",
    en: "Presenting Professional Fees with Clarity",
    ar: "عرض أتعاب المحاماة بثقة واحتراف",
    leakageEn: "clients seeing professional fees as a number disconnected from scope, while the lawyer presents them with uncertainty or insufficient clarity",
    leakageAr: "رؤية العميل لأتعاب المحاماة كرقم منفصل عن نطاق العمل، أو عرض المحامي لها بتردد أو دون وضوح كافٍ",
    treatmentEn: "use a consistent fee presentation: scope, inclusions, exclusions, professional fees, possible scope changes, and communication approach",
    treatmentAr: "استخدام صيغة ثابتة لعرض الأتعاب: نطاق العمل، ما يشمله، ما لا يشمله، أتعاب المحاماة، ما قد يغير النطاق، وطريقة التواصل والتحديث",
    drillEn: "write a short professional-fee presentation for three different services, beginning with scope—not with the amount",
    drillAr: "اكتب نصاً مختصراً لعرض أتعاب المحاماة في ثلاث خدمات مختلفة، على أن يبدأ بنطاق العمل وليس بالمبلغ",
    metricEn: "percentage of professional-fee proposals that include a clear written scope before work begins",
    metricAr: "نسبة عروض أتعاب المحاماة التي تتضمن نطاقاً مكتوباً وواضحاً قبل بدء العمل",
  },

  fee_comparison_objections: {
    id: "fee_comparison_objections",
    en: "Managing Fee Comparison & Hesitation",
    ar: "التعامل مع مقارنة أتعاب المحاماة والتردد",
    leakageEn: "fee comparisons leading to defensiveness or quick concessions rather than discovering what the client is really comparing: scope, trust, timing, or service level",
    leakageAr: "تحول مقارنة أتعاب المحاماة إلى دفاع أو تنازل سريع بدلاً من فهم ما الذي يقارنه العميل فعلياً: النطاق أو الثقة أو التوقيت أو مستوى الخدمة",
    treatmentEn: "bring the comparison back to the right factors: scope, follow-up, clarity of steps, responsibilities, and what the client actually needs now",
    treatmentAr: "إعادة توجيه المقارنة إلى العناصر الصحيحة: نطاق العمل، المتابعة، وضوح الخطوات، المسؤوليات، وما يحتاجه العميل فعلاً في مرحلته الحالية",
    drillEn: "prepare three calm responses to: “Another lawyer is cheaper,” “Can you reduce the fee?”, and “Let me think,” each with one diagnostic question",
    drillAr: "جهّز ثلاث إجابات هادئة على: «محامٍ آخر أرخص»، «هل يمكن تخفيض الأتعاب؟»، و«دعني أفكر»، مع سؤال تشخيصي واحد في كل إجابة",
    metricEn: "percentage of fee objections ending with clarity about the client’s real hesitation rather than an abrupt end",
    metricAr: "نسبة اعتراضات أتعاب المحاماة التي تنتهي بتوضيح سبب التردد الحقيقي للعميل بدلاً من إنهاء الحديث بسرعة",
  },

  trust_risk_outcome_objections: {
    id: "trust_risk_outcome_objections",
    en: "Managing Client Anxiety, Risk & Expectations",
    ar: "إدارة القلق والمخاطر وتوقعات النتائج",
    leakageEn: "clients seeking guarantees, certainty, or a win probability, then leaving more anxious because the response is either cold or overconfident",
    leakageAr: "بحث العميل عن ضمان أو يقين أو نسبة فوز ثم خروجه أكثر قلقاً لأن الرد إما بارد أو واثق أكثر من اللازم",
    treatmentEn: "explain risk and options calmly: what supports the position, what weakens it, what can be controlled, and what decision is needed now",
    treatmentAr: "شرح المخاطر والخيارات بلغة هادئة: ما الذي يدعم الموقف، ما الذي يضعفه، ما الذي نتحكم فيه، وما القرار الذي يحتاجه العميل الآن",
    drillEn: "for every sensitive matter, prepare a simple three-column sheet: what we know, what we need to verify, and available options",
    drillAr: "في كل موضوع حساس، اكتب جدولاً بسيطاً من ثلاثة أعمدة: ما نعرفه، ما نحتاج إلى التحقق منه، وما الخيارات المتاحة",
    metricEn: "percentage of consultations where clients receive a clear risk-and-options summary without promises or fear-based pressure",
    metricAr: "نسبة الاستشارات التي يتلقى فيها العميل ملخصاً واضحاً للمخاطر والخيارات دون وعود أو ضغط مبني على التخويف",
  },

  ethical_persuasion_boundaries: {
    id: "ethical_persuasion_boundaries",
    en: "Ethical Guidance Without Pressure",
    ar: "التوجيه المهني الأخلاقي دون ضغط",
    leakageEn: "the lawyer avoiding a clear recommendation for fear of pressure, or the client moving too quickly before information and alternatives are understood",
    leakageAr: "تردد المحامي في تقديم رأي واضح خوفاً من الضغط، أو اندفاع العميل إلى خطوة قبل فهم المعلومات والبدائل",
    treatmentEn: "give a clear recommendation with reasons, explain alternatives and professional limits, and protect the client’s right to decide with full understanding",
    treatmentAr: "تقديم توصية صريحة ومدعومة بالأسباب، مع شرح البدائل والحدود المهنية وحماية حق العميل في القرار بعد فهم الصورة",
    drillEn: "for three situations, write a recommendation beginning: “My professional view is…” followed by the reason, alternative, and risk of waiting or acting",
    drillAr: "في ثلاث حالات، صغ توصية تبدأ بـ: «رأيي المهني هو…» ثم أضف السبب والبديل ومخاطرة الانتظار أو التنفيذ",
    metricEn: "percentage of recommendations that include a clear reason, at least two alternatives, and understandable professional limits",
    metricAr: "نسبة التوصيات التي تتضمن سبباً واضحاً وبديلين على الأقل وحدوداً مهنية مفهومة",
  },

  consultation_closing_engagement: {
    id: "consultation_closing_engagement",
    en: "Clarifying the Next Legal Step & Agreement",
    ar: "توضيح الخطوة القانونية التالية والاتفاق على الإجراء",
    leakageEn: "consultations ending without a clear decision, responsibilities, or follow-up timing, leaving the client uncertain about what to do next",
    leakageAr: "انتهاء الاستشارة دون قرار واضح أو مسؤوليات محددة أو توقيت للمتابعة، مما يترك العميل غير متأكد مما عليه فعله",
    treatmentEn: "close each consultation with four points: summary, recommendation, next step, and agreed responsibilities with timing",
    treatmentAr: "إنهاء كل استشارة بأربع نقاط: ملخص، توصية، خطوة تالية، ومسؤوليات متفق عليها مع توقيت",
    drillEn: "end every consultation by asking: “Before we finish, what have we agreed, who will do what, and by when?”",
    drillAr: "اختم كل استشارة بالسؤال: «قبل أن ننهي، ما الذي اتفقنا عليه، ومن سيفعل ماذا، ومتى؟»",
    metricEn: "percentage of consultations ending with a written next step, clear owner, and agreed date or time",
    metricAr: "نسبة الاستشارات التي تنتهي بخطوة مكتوبة ومسؤول واضح وتاريخ أو وقت متفق عليه",
  },

  post_consultation_follow_up: {
    id: "post_consultation_follow_up",
    en: "Professional Follow-Up After Consultation",
    ar: "المتابعة المهنية بعد الاستشارة",
    leakageEn: "follow-up becoming generic, late, or focused only on asking for a decision rather than supporting the point that made the client pause",
    leakageAr: "تحول المتابعة إلى رسائل عامة أو متأخرة أو مرتبطة فقط بطلب قرار بدلاً من دعم النقطة التي جعلت العميل يتوقف أو يتردد",
    treatmentEn: "build context-based follow-up for a delayed decision, missing documents, approaching deadline, professional-fee proposal, or unanswered concern",
    treatmentAr: "بناء متابعة حسب السياق: قرار مؤجل، مستندات ناقصة، مهلة قريبة، عرض أتعاب محاماة، أو سؤال لم تتم الإجابة عنه بالكامل",
    drillEn: "prepare five short follow-up messages: after consultation, after a fee proposal, after missing documents, before a deadline, and after a delayed decision",
    drillAr: "جهّز خمس رسائل متابعة قصيرة: بعد استشارة، بعد عرض أتعاب محاماة، بعد مستندات ناقصة، قبل مهلة، وبعد قرار مؤجل",
    metricEn: "percentage of follow-ups containing a clear reason, one specific next step, and a question that helps the client move forward",
    metricAr: "نسبة المتابعات التي تحتوي على سبب واضح وخطوة محددة وسؤال يساعد العميل على التقدم",
  },

  emotional_difficult_clients: {
    id: "emotional_difficult_clients",
    en: "Managing Stressed, Difficult or Unrealistic Clients",
    ar: "إدارة العملاء المتوترين أو الصعبين أو غير الواقعيين",
    leakageEn: "client anxiety, anger, or unrealistic demands taking over the conversation and creating pressure, vague promises, or poorly judged action",
    leakageAr: "سيطرة قلق العميل أو غضبه أو مطالبه غير الواقعية على المحادثة وخلق ضغط أو وعود غامضة أو خطوات غير مدروسة",
    treatmentEn: "use a four-part response: acknowledge emotion, return to facts, clarify boundaries, and guide the client toward a practical step",
    treatmentAr: "استخدام نموذج من أربع مراحل: الاعتراف بالمشاعر، العودة إلى الوقائع، توضيح الحدود، وتوجيه العميل إلى خطوة عملية",
    drillEn: "practice short responses for three situations: an angry client, a client demanding immediate action, and a client asking for an unrealistic outcome",
    drillAr: "تدرب على ردود قصيرة لثلاث حالات: عميل غاضب، عميل يطلب إجراءً فورياً، وعميل يطلب نتيجة غير واقعية",
    metricEn: "percentage of difficult conversations ending with a practical next step and clear professional boundaries without escalation",
    metricAr: "نسبة المحادثات الصعبة التي تنتهي بخطوة عملية وحدود مهنية واضحة دون تصعيد",
  },

  client_experience_referral_growth: {
    id: "client_experience_referral_growth",
    en: "Client Experience, Relationship Continuity & Platform Trust",
    ar: "تجربة العميل واستمرارية العلاقة والثقة في المنصة",
    leakageEn: "clients finishing a legal stage without understanding what happened or what comes next, which weakens confidence in the experience even where the legal outcome is uncertain",
    leakageAr: "انتهاء مرحلة قانونية دون أن يفهم العميل ما تم أو ما سيأتي، مما يضعف ثقته في التجربة حتى عندما تكون النتيجة القانونية غير مؤكدة",
    treatmentEn: "manage the client journey after each stage: a clear summary, practical meaning, next step, update timing, and a simple check on whether the experience was understood",
    treatmentAr: "إدارة رحلة العميل بعد كل مرحلة: ملخص واضح، معنى عملي، خطوة تالية، توقيت تحديث، وسؤال بسيط عن مدى وضوح التجربة",
    drillEn: "after every important legal step, send a three-part message: what happened, what it means, and what comes next",
    drillAr: "بعد أي خطوة قانونية مهمة، أرسل رسالة من ثلاثة أجزاء: ما تم، ماذا يعني ذلك، وما الذي سيحدث بعده",
    metricEn: "percentage of clients receiving a clear update after each major stage and reporting that communication was organized and understandable",
    metricAr: "نسبة العملاء الذين يتلقون تحديثاً واضحاً بعد كل مرحلة مهمة ويذكرون أن التواصل كان منظماً ومفهوماً",
  },

};

const ALIASES: Record<string, string> = {
  overall: "overall_score",
  total: "overall_score",
  total_score: "overall_score",
  overall_score: "overall_score",
  lawyer_client_conversion_overall_score: "lawyer_client_conversion_overall_score",
  legal_client_conversion_overall_score: "lawyer_client_conversion_overall_score",

  sme_business_health_overall_score: "sme_business_health_overall_score",
  business_health_overall_score: "sme_business_health_overall_score",
  strategic_direction_clarity: "strategic_direction_business_clarity",
  strategic_direction_business_clarity: "strategic_direction_business_clarity",
  revenue_engine_predictability: "revenue_engine_sales_predictability",
  revenue_engine_sales_predictability: "revenue_engine_sales_predictability",
  marketing_positioning_lead_quality: "marketing_positioning_lead_quality",
  customer_experience_retention: "customer_experience_retention",
  cash_flow_margins_control: "cash_flow_margins_financial_control",
  cash_flow_margins_financial_control: "cash_flow_margins_financial_control",
  operations_systems_process: "operations_systems_process_discipline",
  operations_systems_process_discipline: "operations_systems_process_discipline",
  people_roles_accountability: "people_roles_accountability",
  leadership_decision_rhythm: "leadership_decision_making_rhythm",
  leadership_decision_making_rhythm: "leadership_decision_making_rhythm",
  products_services_value_prop: "products_services_value_proposition",
  products_services_value_proposition: "products_services_value_proposition",
  technology_data_visibility: "technology_data_management_visibility",
  technology_data_management_visibility: "technology_data_management_visibility",
  risk_compliance_continuity: "risk_compliance_business_continuity",
  risk_compliance_business_continuity: "risk_compliance_business_continuity",
  growth_readiness_scalability: "growth_readiness_scalability",

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
  manager_communication_executive_reporting: "manager_communication_executive_reporting",
  manager_communication_upward_reporting: "manager_communication_executive_reporting",
  executive_reporting: "manager_communication_executive_reporting",
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
    "manager_communication_executive_reporting",
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

function isBusinessHealthProfile(id: string): boolean {
  const key = normalizeCompetencyId(id);
  return new Set([
    "sme_business_health_overall_score",
    "strategic_direction_business_clarity",
    "revenue_engine_sales_predictability",
    "marketing_positioning_lead_quality",
    "customer_experience_retention",
    "cash_flow_margins_financial_control",
    "operations_systems_process_discipline",
    "people_roles_accountability",
    "leadership_decision_making_rhythm",
    "products_services_value_proposition",
    "technology_data_management_visibility",
    "risk_compliance_business_continuity",
    "growth_readiness_scalability",
  ]).has(key);
}

function enStrength(p: CompetencyProfile): string[] {
  if (isBusinessHealthProfile(p.id)) {
    return [
      `Protect your strength in ${p.en}. This is not just a score; it is one part of the company’s operating system that can stabilize weaker business areas.`,
      `Use ${p.en} as leverage for the lowest business health area. For the next 7 days, connect this strength to one leak in cash, customers, operations, people, visibility, or growth readiness.`,
      `Track ${p.metricEn}. Strong SMEs do not rely on effort alone; they protect the vital signs that make the business stable, profitable, and scalable.`,
    ];
  }
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
  if (isBusinessHealthProfile(p.id)) {
    return [
      `احمِ قوتك في ${p.ar}. هذه ليست مجرد نتيجة؛ إنها جزء من نظام تشغيل الشركة ويمكن استخدامها لتثبيت المناطق الأضعف.`,
      `استخدم ${p.ar} كرافعة لأضعف منطقة في صحة الشركة. خلال 7 أيام، اربط هذه القوة بتسريب واحد في النقد أو العملاء أو العمليات أو الأفراد أو الرؤية الإدارية أو جاهزية النمو.`,
      `تتبع ${p.metricAr}. الشركات الصغيرة والمتوسطة القوية لا تعتمد على الاجتهاد فقط؛ بل تحمي العلامات الحيوية التي تجعل الشركة مستقرة ومربحة وقابلة للنمو.`,
    ];
  }
  if (isLawyerProfile(p.id)) {
    return [
      `احمِ قوتك في ${p.ar}. لا تتجاهل هذه المنطقة لأنها جيدة أصلًا. حوّلها إلى أصل مهني متكرر عبر توثيق ما تفعله قبل وأثناء وبعد الاستشارات الناجحة التي تظهر فيها هذه الكفاءة.`,
      `استخدم ${p.ar} كرافعة للمناطق الأضعف في تجربة العميل القانونية. خلال 7 أيام، اربط هذه القوة عمدًا بإحدى الكفاءات الضعيفة حتى تساعد على رفع وضوح الاستشارة، ثقة العميل، أتعاب المحاماة، أو قرار الاستمرار في المسار القانوني المناسب.`,
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
  if (isBusinessHealthProfile(p.id)) {
    return [
      `${p.en} is not broken, but it is not yet dependable enough to protect the business under pressure. The treatment is to install a clearer operating routine: ${p.treatmentEn}.`,
      `For the next 7 days, apply this business drill: ${p.drillEn}. Do not judge success by one meeting. Judge success by whether the company starts seeing this area more clearly and acting on it consistently.`,
      `Watch for the leakage pattern: ${p.leakageEn}. When it appears, assign an owner, a deadline, and one measurable correction. Your target metric is ${p.metricEn}.`,
    ];
  }
  return [
    `${p.en} is not broken, but it is not yet dependable under pressure. The treatment is to stop relying on instinct and install a repeatable behavior: ${p.treatmentEn}.`,
    `For the next 7 days, apply this drill: ${p.drillEn}. Do not judge success by one conversation. Judge success by whether the behavior was repeated enough to become easier and more natural.`,
    `Watch for the leakage pattern: ${p.leakageEn}. When you see it, pause and correct the behavior immediately. Your target metric is ${p.metricEn}.`,
  ];
}

function arOpportunity(p: CompetencyProfile): string[] {
  if (isBusinessHealthProfile(p.id)) {
    return [
      `${p.ar} ليست مكسورة، لكنها لم تصبح ثابتة بما يكفي لحماية الشركة تحت الضغط. العلاج هو تركيب إيقاع تشغيل أوضح: ${p.treatmentAr}.`,
      `خلال 7 أيام، طبّق هذا التمرين الإداري: ${p.drillAr}. لا تحكم على النجاح من اجتماع واحد. احكم عليه من قدرة الشركة على رؤية هذه المنطقة والتصرف عليها بثبات.`,
      `انتبه لنمط التسريب: ${p.leakageAr}. عندما يظهر، عيّن مالكًا وموعدًا وإجراء تصحيح قابلًا للقياس. مؤشر القياس المطلوب هو ${p.metricAr}.`,
    ];
  }
  return [
    `${p.ar} ليست مكسورة، لكنها لم تصبح ثابتة تحت الضغط بعد. العلاج هو التوقف عن الاعتماد على الغريزة وتركيب سلوك متكرر: ${p.treatmentAr}.`,
    `خلال 7 أيام، طبّق هذا التمرين: ${p.drillAr}. لا تحكم على النجاح من محادثة واحدة. احكم عليه من تكرار السلوك حتى يصبح أسهل وأكثر طبيعية.`,
    `انتبه لنمط التسريب: ${p.leakageAr}. عندما تراه، توقف وصحح السلوك فورًا. مؤشر القياس المطلوب هو ${p.metricAr}.`,
  ];
}

function enThreat(p: CompetencyProfile): string[] {
  if (isBusinessHealthProfile(p.id)) {
    return [
      `${p.en} is now in the business health warning zone. This may already be draining cash, customers, owner time, team energy, operating discipline, or growth capacity. Treat this as a priority business leak: ${p.leakageEn}.`,
      `Your immediate treatment is: ${p.treatmentEn}. For the next 72 hours, simplify the issue into one owner, one decision, one corrective action, and one measurable checkpoint.`,
      `Use this business drill: ${p.drillEn}. After each review, write one line: what is leaking, what we corrected, who owns the next step, and when we will review it. Track ${p.metricEn}.`,
    ];
  }
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
  if (isBusinessHealthProfile(p.id)) {
    return [
      `${p.ar} الآن في منطقة إنذار لصحة الشركة. قد تكون هذه المنطقة بدأت بالفعل في استنزاف النقد أو العملاء أو وقت المالك أو طاقة الفريق أو انضباط التشغيل أو قدرة النمو. تعامل معها كتسريب أولوية: ${p.leakageAr}.`,
      `العلاج الفوري هو: ${p.treatmentAr}. خلال 72 ساعة، بسّط المشكلة إلى مالك واحد وقرار واحد وإجراء تصحيح واحد ونقطة قياس واحدة.`,
      `استخدم هذا التمرين الإداري: ${p.drillAr}. بعد كل مراجعة، اكتب سطرًا واحدًا: ما الذي يتسرب، ماذا صححنا، من يملك الخطوة التالية، ومتى نراجعها. تتبع ${p.metricAr}.`,
    ];
  }
  if (isLawyerProfile(p.id)) {
    return [
      `${p.ar} الآن في منطقة تحتاج إلى تدخل مهني. هذا يعني أن المشكلة قد تكون بدأت بالفعل في إضعاف الثقة والاطمئنان المهني أو وضوح أتعاب المحاماة أو وضوح الاستشارة أو قرار الاستمرار في المسار القانوني المناسب. لا تحاول إصلاح كل شيء. تعامل معها كنقطة احتكاك ذات أولوية: ${p.leakageAr}.`,
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
    isBusinessHealthProfile(p.id)
    ? `${p.en} is a business revamp priority. This is not a label of failure; it is a signal that this part of the company’s health needs direct correction before it keeps leaking cash, customers, execution discipline, owner time, team energy, or growth capacity.`
    : isLawyerProfile(p.id)
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
    isBusinessHealthProfile(p.id)
    ? `${p.ar} هي أولوية لإعادة تقوية الشركة. هذا ليس وصفًا للفشل؛ بل إشارة إلى أن هذا الجزء من صحة الشركة يحتاج إلى تصحيح مباشر قبل أن يستمر في تسريب النقد أو العملاء أو انضباط التنفيذ أو وقت المالك أو طاقة الفريق أو قدرة النمو.`
    : isLawyerProfile(p.id)
    ? `${p.ar} هي أولوية توجيه مهني. هذا ليس وصفًا لفشل قانوني؛ بل إشارة إلى أن هذا الجزء من رحلة العميل القانونية يحتاج إلى تصحيح مباشر قبل أن يستمر في خلق نقطة احتكاك في الثقة أو وضوح أتعاب المحاماة أو قرار الاستمرار في المسار القانوني المناسب أو المتابعة.`
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
