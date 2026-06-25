// Sales Manager MRI — isolated recommendation profiles and 90-day plan generator.
// Reads only the weakest-six rows from the report.

import type { Language } from "@/lib/pdf-recommendations";

export type SalesManagerPlanProfile = {
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
  questionEn: string;
  questionAr: string;
  evidenceEn: string;
  evidenceAr: string;
};

export type SalesManagerPlanRow = {
  competencyId: string;
  label: string;
};

export type SalesManagerPlanDay = {
  day: number;
  phase: 1 | 2 | 3;
  competencyId: string;
  competencyLabel: string;
  action: string;
  managerQuestion: string;
  proof: string;
};

const ALIASES: Record<string, string> = {
  manager_communication_upward_reporting: "manager_communication_executive_reporting",
  executive_reporting: "manager_communication_executive_reporting",
};

const clean = (id: string) =>
  String(id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").replace(/-/g, "_");

const profiles: SalesManagerPlanProfile[] = [
  {
    id: "sales_coaching_rep_development",
    en: "Sales Coaching & Rep Development",
    ar: "تدريب وتطوير مندوبي المبيعات",
    leakageEn: "reps repeat the same mistakes because coaching is generic, delayed, or focused on numbers instead of observable behaviour",
    leakageAr: "تكرار المندوبين للأخطاء نفسها لأن التدريب عام أو متأخر أو يركز على الأرقام بدل السلوك القابل للملاحظة",
    treatmentEn: "coach one observable behaviour at a time, test it in live selling situations, and turn feedback into a measurable next action",
    treatmentAr: "تدريب سلوك واحد قابل للملاحظة في كل مرة، واختباره في مواقف بيع حية، وتحويل الملاحظات إلى إجراء تالٍ قابل للقياس",
    drillEn: "review one live call or deal each day using: behaviour, impact, correction, next action",
    drillAr: "راجع مكالمة أو صفقة حية واحدة يوميًا باستخدام: السلوك، الأثر، التصحيح، الإجراء التالي",
    metricEn: "coaching conversations that produce a verified behaviour change",
    metricAr: "جلسات التدريب التي تنتج تغييرًا سلوكيًا مثبتًا",
    questionEn: "What exact behaviour must change before the next customer conversation?",
    questionAr: "ما السلوك المحدد الذي يجب أن يتغير قبل محادثة العميل التالية؟",
    evidenceEn: "a live example, a defined behaviour, and proof that the rep applied it",
    evidenceAr: "مثال حي، وسلوك محدد، ودليل على أن المندوب طبقه",
  },
  {
    id: "pipeline_management_deal_inspection",
    en: "Pipeline Management & Deal Inspection",
    ar: "إدارة مسار الفرص البيعية وفحص الصفقات",
    leakageEn: "deal movement is based on optimism, vague next steps, and internal pressure rather than buyer evidence",
    leakageAr: "حركة الصفقات مبنية على التفاؤل والخطوات التالية الغامضة والضغط الداخلي بدل دليل العميل",
    treatmentEn: "manage the sales opportunity path through stage evidence, decision access, buyer-owned next steps, risk, and commitment",
    treatmentAr: "إدارة مسار الفرص البيعية عبر دليل المرحلة والوصول إلى صاحب القرار والخطوات التالية التي يملكها العميل والمخاطر والالتزام",
    drillEn: "inspect five active deals and re-stage any deal without buyer evidence, decision access, and a dated next action",
    drillAr: "افحص خمس صفقات نشطة وأعد تصنيف أي صفقة بلا دليل من العميل أو وصول لصاحب القرار أو إجراء تالٍ مؤرخ",
    metricEn: "percentage of active opportunities with verified buyer-owned next steps",
    metricAr: "نسبة الفرص النشطة التي تحتوي على خطوات تالية مؤكدة يملكها العميل",
    questionEn: "What buyer action proves that this opportunity is real and moving?",
    questionAr: "ما الإجراء الذي قام به العميل ويثبت أن هذه الفرصة حقيقية وتتحرك؟",
    evidenceEn: "buyer problem, decision authority, timing, risk, and a dated buyer-owned next action",
    evidenceAr: "مشكلة العميل، وصاحب القرار، والتوقيت، والمخاطر، وخطوة تالية مؤرخة يملكها العميل",
  },
  {
    id: "forecast_accuracy_judgment",
    en: "Forecast Accuracy & Judgment",
    ar: "دقة التوقعات والحكم التجاري",
    leakageEn: "forecast commitments are shaped by hope, internal pressure, or rep confidence instead of evidence and known risk",
    leakageAr: "التزامات التوقعات تتشكل بالأمل أو الضغط الداخلي أو ثقة المندوب بدل الأدلة والمخاطر المعروفة",
    treatmentEn: "separate committed revenue from upside and risk, then require evidence for every material forecast assumption",
    treatmentAr: "فصل الإيراد المؤكد عن الفرص الإضافية والمخاطر، وطلب دليل لكل افتراض جوهري في التوقعات",
    drillEn: "run a red-yellow-green forecast review and challenge one assumption behind every committed deal",
    drillAr: "نفّذ مراجعة توقعات بالأحمر والأصفر والأخضر وتحدَّ افتراضًا واحدًا خلف كل صفقة ملتزم بها",
    metricEn: "forecast accuracy by deal stage, timing, and buyer evidence",
    metricAr: "دقة التوقعات حسب مرحلة الصفقة والتوقيت ودليل العميل",
    questionEn: "What evidence makes this forecast a commitment rather than an optimistic possibility?",
    questionAr: "ما الدليل الذي يجعل هذا التوقع التزامًا وليس احتمالًا متفائلًا؟",
    evidenceEn: "confirmed buyer process, timing, decision criteria, and next action",
    evidenceAr: "عملية قرار مؤكدة لدى العميل وتوقيت ومعايير قرار وخطوة تالية",
  },
  {
    id: "performance_accountability",
    en: "Performance Accountability",
    ar: "المساءلة على الأداء",
    leakageEn: "standards become optional because expectations, follow-through, support, and consequences are inconsistent",
    leakageAr: "تتحول المعايير إلى أمر اختياري بسبب عدم ثبات التوقعات والمتابعة والدعم والعواقب",
    treatmentEn: "make expectations visible, review evidence consistently, and separate practical support from tolerance of repeated excuses",
    treatmentAr: "اجعل التوقعات واضحة، وراجع الأدلة بثبات، وافصل بين الدعم العملي وقبول الأعذار المتكررة",
    drillEn: "choose one performance behaviour, define the standard, set a review date, and agree on the evidence required",
    drillAr: "اختر سلوك أداء واحدًا، وحدد المعيار، وضع تاريخ مراجعة، واتفق على الدليل المطلوب",
    metricEn: "accountability conversations ending with an owner, action, evidence, and deadline",
    metricAr: "محادثات مساءلة تنتهي بمسؤول وإجراء ودليل وموعد",
    questionEn: "What has the person committed to do, by when, and what evidence will prove it happened?",
    questionAr: "ما الذي التزم الشخص بتنفيذه، ومتى، وما الدليل الذي يثبت حدوثه؟",
    evidenceEn: "a named owner, dated action, proof of completion, and follow-up point",
    evidenceAr: "مسؤول محدد وإجراء مؤرخ ودليل إنجاز ونقطة متابعة",
  },
  {
    id: "target_setting_kpi_discipline",
    en: "Target Setting & KPI Discipline",
    ar: "تحديد الأهداف وانضباط المؤشرات",
    leakageEn: "targets do not translate into controllable behaviour, quality standards, or a reliable weekly execution rhythm",
    leakageAr: "الأهداف لا تتحول إلى سلوكيات قابلة للتحكم أو معايير جودة أو إيقاع تنفيذ أسبوعي موثوق",
    treatmentEn: "translate every target into opportunity volume, conversion, activity quality, capacity, and weekly checkpoints",
    treatmentAr: "حوّل كل هدف إلى حجم فرص ونِسب تحويل وجودة نشاط وطاقة تنفيذية ونقاط متابعة أسبوعية",
    drillEn: "convert one monthly target into weekly activity, quality, conversion, and capacity checkpoints",
    drillAr: "حوّل هدفًا شهريًا واحدًا إلى نقاط متابعة أسبوعية للنشاط والجودة والتحويل والطاقة التنفيذية",
    metricEn: "KPIs linked to controllable drivers and reviewed weekly",
    metricAr: "مؤشرات مرتبطة بمحركات قابلة للتحكم وتُراجع أسبوعيًا",
    questionEn: "Which controllable drivers must move for this target to become realistic?",
    questionAr: "ما المحركات القابلة للتحكم التي يجب أن تتحرك ليصبح هذا الهدف واقعيًا؟",
    evidenceEn: "required opportunity volume, conversion rates, quality indicators, and capacity assumptions",
    evidenceAr: "حجم الفرص المطلوب ونِسب التحويل ومؤشرات الجودة وافتراضات الطاقة التنفيذية",
  },
  {
    id: "motivation_team_energy",
    en: "Motivation & Team Energy",
    ar: "تحفيز الفريق وطاقة الأداء",
    leakageEn: "team energy depends on short-term wins, pressure, or the manager’s mood rather than a stable performance climate",
    leakageAr: "طاقة الفريق تعتمد على المكاسب القصيرة أو الضغط أو مزاج المدير بدل مناخ أداء ثابت",
    treatmentEn: "build a performance climate that combines standards, recognition, progress, realistic challenge, and visible support",
    treatmentAr: "ابنِ مناخ أداء يجمع بين المعايير والتقدير والتقدم والتحدي الواقعي والدعم الظاهر",
    drillEn: "recognise one specific productive behaviour publicly and correct one performance behaviour privately each day for a week",
    drillAr: "قدّر سلوكًا منتجًا محددًا علنًا وصحح سلوك أداء واحدًا على انفراد يوميًا لمدة أسبوع",
    metricEn: "team energy linked to productive behaviour and visible progress",
    metricAr: "طاقة فريق مرتبطة بسلوك منتج وتقدم ظاهر",
    questionEn: "What is draining energy, and what controllable action can create a visible short win this week?",
    questionAr: "ما الذي يستنزف الطاقة، وما الإجراء القابل للتحكم الذي يمكن أن يصنع مكسبًا قصيرًا ظاهرًا هذا الأسبوع؟",
    evidenceEn: "specific energy drain, a reset priority, and visible short-win evidence",
    evidenceAr: "مصدر استنزاف محدد وأولوية لإعادة الضبط ودليل على مكسب قصير ظاهر",
  },
  {
    id: "sales_meeting_rhythm",
    en: "Sales Meeting Rhythm",
    ar: "إيقاع اجتماعات المبيعات",
    leakageEn: "meetings consume time without changing behaviour, improving deal quality, or creating execution clarity",
    leakageAr: "الاجتماعات تستهلك الوقت دون تغيير السلوك أو تحسين جودة الصفقات أو خلق وضوح في التنفيذ",
    treatmentEn: "turn meetings into decision, coaching, risk-review, and execution checkpoints instead of status updates",
    treatmentAr: "حوّل الاجتماعات إلى نقاط قرار وتدريب ومراجعة مخاطر وتنفيذ بدل تحديثات حالة",
    drillEn: "run one meeting around three questions: what changed, what is stuck, and what action is next",
    drillAr: "نفّذ اجتماعًا واحدًا حول ثلاثة أسئلة: ما الذي تغير، وما العالق، وما الإجراء التالي",
    metricEn: "meetings ending with clear decisions, owners, and deadlines",
    metricAr: "اجتماعات تنتهي بقرارات ومسؤولين ومواعيد واضحة",
    questionEn: "What decision, risk, or behaviour must leave this meeting clearer than it entered?",
    questionAr: "ما القرار أو الخطر أو السلوك الذي يجب أن يخرج من هذا الاجتماع أكثر وضوحًا مما دخل؟",
    evidenceEn: "a named decision, owner, deadline, and next review point",
    evidenceAr: "قرار محدد ومسؤول وموعد ونقطة مراجعة تالية",
  },
  {
    id: "one_on_one_management",
    en: "One-on-One Management",
    ar: "إدارة الاجتماعات الفردية",
    leakageEn: "one-to-ones become casual check-ins instead of focused development and performance-correction moments",
    leakageAr: "تتحول الاجتماعات الفردية إلى متابعة عامة بدل لحظات تطوير وتصحيح أداء مركزة",
    treatmentEn: "structure every one-to-one around performance evidence, coaching focus, blocker removal, and a measurable next behaviour",
    treatmentAr: "هيكل كل اجتماع فردي حول دليل الأداء وتركيز التدريب وإزالة العوائق والسلوك التالي القابل للقياس",
    drillEn: "run one one-to-one using: result, behaviour, obstacle, next action, and proof for the next review",
    drillAr: "نفّذ اجتماعًا فرديًا واحدًا باستخدام: النتيجة، والسلوك، والعائق، والإجراء التالي، ودليل المراجعة القادمة",
    metricEn: "one-to-ones producing a verified next behaviour",
    metricAr: "اجتماعات فردية تنتج سلوكًا تالياً مثبتًا",
    questionEn: "What one behaviour must change before our next one-to-one, and what will prove it?",
    questionAr: "ما السلوك الواحد الذي يجب أن يتغير قبل اجتماعنا الفردي القادم، وما الذي سيثبته؟",
    evidenceEn: "one measurable behaviour, support needed, and a proof point",
    evidenceAr: "سلوك واحد قابل للقياس ودعم مطلوب ونقطة إثبات",
  },
  {
    id: "hiring_onboarding_salespeople",
    en: "Hiring & Onboarding Salespeople",
    ar: "توظيف وتأهيل مندوبي المبيعات",
    leakageEn: "new hires are selected on confidence or rushed into the field before behaviour, capability, and readiness are proven",
    leakageAr: "يتم اختيار الموظفين الجدد بناءً على الثقة أو دفعهم إلى الميدان بسرعة قبل إثبات السلوك والقدرة والجاهزية",
    treatmentEn: "use evidence-based selection and staged onboarding with practice, observation, milestones, and proof of readiness",
    treatmentAr: "استخدم اختيارًا مبنيًا على الأدلة وتأهيلًا مرحليًا يتضمن تدريبًا وملاحظة ومراحل ودليل جاهزية",
    drillEn: "create one scorecard for a live candidate or new hire covering behaviour, skill, readiness, and evidence",
    drillAr: "أنشئ بطاقة تقييم واحدة لمرشح أو موظف جديد تشمل السلوك والمهارة والجاهزية والأدلة",
    metricEn: "new hires reaching defined readiness milestones on time",
    metricAr: "وصول الموظفين الجدد إلى مراحل الجاهزية المحددة في وقتها",
    questionEn: "What evidence proves this person can perform the role, not merely interview well or appear confident?",
    questionAr: "ما الدليل الذي يثبت أن هذا الشخص قادر على أداء الدور، وليس فقط جيدًا في المقابلة أو واثقًا؟",
    evidenceEn: "specific past behaviour, scenario performance, observed practice, and milestone completion",
    evidenceAr: "سلوك سابق محدد وأداء في سيناريو وممارسة ملاحظة وإكمال مراحل",
  },
  {
    id: "territory_resource_allocation",
    en: "Territory & Resource Allocation",
    ar: "توزيع المناطق والموارد",
    leakageEn: "time, talent, and account coverage are allocated by habit, volume, or pressure rather than strategic potential and capacity",
    leakageAr: "يتم توزيع الوقت والقدرات وتغطية الحسابات حسب العادة أو الحجم أو الضغط بدل الإمكانات الاستراتيجية والطاقة",
    treatmentEn: "allocate territory, accounts, and support using potential, risk, complexity, capacity, continuity, and opportunity cost",
    treatmentAr: "وزّع المناطق والحسابات والدعم باستخدام الإمكانات والمخاطر والتعقيد والطاقة والاستمرارية وتكلفة الفرصة البديلة",
    drillEn: "review the top ten accounts and classify each by potential, risk, ownership, capacity, and next allocation decision",
    drillAr: "راجع أهم عشرة حسابات وصنّف كلًا منها حسب الإمكانات والمخاطر والملكية والطاقة وقرار التوزيع التالي",
    metricEn: "coverage decisions supported by capacity, potential, and customer-risk evidence",
    metricAr: "قرارات تغطية مدعومة بأدلة عن الطاقة والإمكانات ومخاطر العميل",
    questionEn: "Where will one hour of team capacity create the greatest protected commercial value?",
    questionAr: "أين ستخلق ساعة واحدة من طاقة الفريق أكبر قيمة تجارية محمية؟",
    evidenceEn: "account potential, customer risk, capacity, margin, and strategic fit",
    evidenceAr: "إمكانات الحساب ومخاطر العميل والطاقة والهامش والملاءمة الاستراتيجية",
  },
  {
    id: "handling_underperformance",
    en: "Handling Underperformance",
    ar: "معالجة ضعف الأداء",
    leakageEn: "underperformance is tolerated, pressured briefly, or explained away instead of being diagnosed and corrected through a structured plan",
    leakageAr: "يتم تحمل ضعف الأداء أو الضغط عليه لفترة قصيرة أو تبريره بدل تشخيصه وتصحيحه عبر خطة منظمة",
    treatmentEn: "diagnose whether the issue is skill, will, clarity, capacity, behaviour, or fit, then set a measurable improvement plan",
    treatmentAr: "شخّص ما إذا كانت المشكلة مهارة أو رغبة أو وضوحًا أو طاقة أو سلوكًا أو ملاءمة، ثم ضع خطة تحسين قابلة للقياس",
    drillEn: "write a one-page improvement plan for one live case: root cause, required behaviour, support, evidence, review date, consequence",
    drillAr: "اكتب خطة تحسين من صفحة واحدة لحالة حية: السبب الجذري والسلوك المطلوب والدعم والدليل وتاريخ المراجعة والعاقبة",
    metricEn: "underperformance cases with a documented improvement plan and evidence-based review",
    metricAr: "حالات ضعف أداء لها خطة تحسين موثقة ومراجعة مبنية على الأدلة",
    questionEn: "Is the gap caused by skill, will, clarity, capacity, behaviour, or fit?",
    questionAr: "هل الفجوة ناتجة عن مهارة أو رغبة أو وضوح أو طاقة أو سلوك أو ملاءمة؟",
    evidenceEn: "root-cause diagnosis, agreed behaviour, dated review, and objective proof",
    evidenceAr: "تشخيص للسبب الجذري وسلوك متفق عليه ومراجعة مؤرخة ودليل موضوعي",
  },
  {
    id: "managing_difficult_salespeople",
    en: "Managing Difficult Salespeople",
    ar: "إدارة مندوبي المبيعات الصعبين",
    leakageEn: "revenue contribution is allowed to excuse behaviour that damages standards, trust, collaboration, or the manager’s authority",
    leakageAr: "يُسمح لمساهمة الإيراد بتبرير سلوك يضر بالمعايير أو الثقة أو التعاون أو سلطة المدير",
    treatmentEn: "treat behaviour as part of performance, set non-negotiable standards, invite constructive challenge, and apply consistent consequences",
    treatmentAr: "تعامل مع السلوك كجزء من الأداء، وضع معايير غير قابلة للتفاوض، وافتح المجال للاعتراض البنّاء، وطبّق عواقب ثابتة",
    drillEn: "hold one boundary conversation using: observed behaviour, impact, standard, choice, consequence",
    drillAr: "نفّذ محادثة حدود واحدة باستخدام: السلوك الملاحظ، الأثر، المعيار، الاختيار، العاقبة",
    metricEn: "difficult-behaviour cases addressed with clear standards and documented follow-through",
    metricAr: "حالات سلوك صعب عولجت بمعايير واضحة ومتابعة موثقة",
    questionEn: "What behaviour is non-negotiable even when the person delivers revenue?",
    questionAr: "ما السلوك غير القابل للتفاوض حتى عندما يحقق الشخص إيرادًا؟",
    evidenceEn: "specific behaviour impact, agreed boundary, and documented follow-through",
    evidenceAr: "أثر سلوكي محدد وحد متفق عليه ومتابعة موثقة",
  },
  {
    id: "managing_top_performers",
    en: "Managing Top Performers",
    ar: "إدارة أصحاب الأداء العالي",
    leakageEn: "top performers are left unmanaged, overloaded, or allowed to become exceptions rather than being developed and leveraged responsibly",
    leakageAr: "يُترك أصحاب الأداء العالي بلا إدارة أو يُحمّلون أكثر من اللازم أو يُسمح لهم بأن يصبحوا استثناءات بدل تطويرهم واستثمارهم بمسؤولية",
    treatmentEn: "protect performance while creating stretch, leadership contribution, sustainable workload, and standards that remain fair to the wider team",
    treatmentAr: "احمِ الأداء مع خلق تحدٍّ ومساهمة قيادية وعبء عمل مستدام ومعايير تبقى عادلة للفريق الأوسع",
    drillEn: "hold one growth conversation covering stretch goal, leadership contribution, workload risk, and non-negotiable standards",
    drillAr: "نفّذ محادثة نمو واحدة تشمل هدفًا تطويريًا ومساهمة قيادية ومخاطر عبء العمل والمعايير غير القابلة للتفاوض",
    metricEn: "top performers with a growth plan, sustainable workload, and positive team impact",
    metricAr: "أصحاب أداء عالٍ لديهم خطة نمو وعبء عمل مستدام وأثر إيجابي في الفريق",
    questionEn: "How can this person grow without becoming an exception that weakens the team?",
    questionAr: "كيف يمكن أن ينمو هذا الشخص دون أن يصبح استثناءً يضعف الفريق؟",
    evidenceEn: "stretch objective, workload review, leadership contribution, and standards alignment",
    evidenceAr: "هدف تطويري ومراجعة عبء العمل ومساهمة قيادية ومواءمة مع المعايير",
  },
  {
    id: "manager_communication_executive_reporting",
    en: "Manager Communication & Executive Reporting",
    ar: "تواصل مدير المبيعات والتقارير للإدارة العليا",
    leakageEn: "leadership receives optimism, raw data, or late surprises instead of decision-ready commercial reality",
    leakageAr: "تتلقى الإدارة العليا تفاؤلًا أو بيانات خامًا أو مفاجآت متأخرة بدل واقع تجاري جاهز لاتخاذ القرار",
    treatmentEn: "translate field reality into concise evidence, business impact, options, decisions needed, owner, and next update",
    treatmentAr: "حوّل واقع الميدان إلى أدلة مختصرة وأثر تجاري وخيارات وقرارات مطلوبة ومسؤول وتحديث تالٍ",
    drillEn: "send one executive update using: status, impact, evidence, action, decision needed, owner, next update",
    drillAr: "أرسل تحديثًا واحدًا للإدارة العليا باستخدام: الحالة، والأثر، والدليل، والإجراء، والقرار المطلوب، والمسؤول، والتحديث التالي",
    metricEn: "executive updates that lead to timely decisions and fewer late surprises",
    metricAr: "تقارير للإدارة العليا تقود إلى قرارات في الوقت المناسب ومفاجآت أقل",
    questionEn: "What does leadership need to decide, and what evidence allows that decision now?",
    questionAr: "ما الذي تحتاج الإدارة العليا إلى تقريره، وما الدليل الذي يسمح بهذا القرار الآن؟",
    evidenceEn: "current status, commercial impact, assumptions, options, decision request, owner, and timing",
    evidenceAr: "الوضع الحالي والأثر التجاري والافتراضات والخيارات وطلب القرار والمسؤول والتوقيت",
  },
  {
    id: "decision_making_under_pressure",
    en: "Decision-Making Under Pressure",
    ar: "اتخاذ القرار تحت الضغط",
    leakageEn: "urgent decisions are driven by pressure, hierarchy, or emotion rather than impact, evidence, reversibility, and delegated capacity",
    leakageAr: "القرارات العاجلة يقودها الضغط أو التسلسل الإداري أو العاطفة بدل الأثر والدليل وقابلية التراجع والطاقة القابلة للتفويض",
    treatmentEn: "use a short pressure-decision protocol: impact, urgency, reversibility, evidence, owner, and next review",
    treatmentAr: "استخدم بروتوكولًا مختصرًا لقرار الضغط: الأثر، والاستعجال، وقابلية التراجع، والدليل، والمسؤول، والمراجعة التالية",
    drillEn: "apply the pressure-decision protocol to one live issue before responding or escalating",
    drillAr: "طبّق بروتوكول قرار الضغط على قضية حية واحدة قبل الرد أو التصعيد",
    metricEn: "major urgent decisions documented with evidence, owner, and review point",
    metricAr: "قرارات عاجلة جوهرية موثقة بدليل ومسؤول ونقطة مراجعة",
    questionEn: "What is the highest-consequence issue, what can be delegated, and what evidence is sufficient to act now?",
    questionAr: "ما القضية الأعلى أثرًا، وما الذي يمكن تفويضه، وما الدليل الكافي للتحرك الآن؟",
    evidenceEn: "impact, urgency, reversibility, available capacity, and decision evidence",
    evidenceAr: "الأثر والاستعجال وقابلية التراجع والطاقة المتاحة ودليل القرار",
  },
];

export const SALES_MANAGER_PLAN_PROFILES: Record<string, SalesManagerPlanProfile> =
  Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

function getProfile(id: string): SalesManagerPlanProfile | null {
  const key = ALIASES[clean(id)] || clean(id);
  return SALES_MANAGER_PLAN_PROFILES[key] || null;
}

function phaseFor(day: number): 1 | 2 | 3 {
  if (day <= 30) return 1;
  if (day <= 60) return 2;
  return 3;
}

function actionsFor(
  p: SalesManagerPlanProfile,
  label: string,
  lang: Language
): Array<{ action: string; managerQuestion: string; proof: string }> {
  const ar = lang === "ar";
  const t = ar ? p.treatmentAr : p.treatmentEn;
  const d = ar ? p.drillAr : p.drillEn;
  const q = ar ? p.questionAr : p.questionEn;
  const e = ar ? p.evidenceAr : p.evidenceEn;
  const m = ar ? p.metricAr : p.metricEn;

  return ar
    ? [
        { action: `حدّد معيارًا واضحًا لكفاءة «${label}» ودوّن خط الأساس الحالي.`, managerQuestion: q, proof: `خط أساس مكتوب + ${e}` },
        { action: `راجع ثلاث حالات حية مرتبطة بـ«${label}» وحدد النمط المتكرر.`, managerQuestion: q, proof: "3 أمثلة موثقة + نمط واحد واضح" },
        { action: `اختر سلوكًا واحدًا للتصحيح هذا الأسبوع: ${t}.`, managerQuestion: q, proof: "سلوك تصحيحي واحد معلن للفريق أو للفرد المعني" },
        { action: `نفّذ تطبيقًا حيًا: ${d}.`, managerQuestion: q, proof: e },
        { action: "اطلب من المندوب أو الفريق تقديم دليل بدل تفسير عام.", managerQuestion: q, proof: e },
        { action: "راجع ما نجح وما لم ينجح، ثم عدّل خطوة الغد دون تغيير المعيار.", managerQuestion: q, proof: "مراجعة قصيرة + تعديل واحد محدد" },
        { action: "راقب سلوكًا واحدًا في موقف حي وامنح ملاحظة محددة مباشرة بعده.", managerQuestion: q, proof: "ملاحظة مرتبطة بسلوك ملاحظ" },
        { action: "حوّل النتيجة إلى التزام مؤرخ ومسؤول واضح.", managerQuestion: q, proof: "مسؤول + موعد + إجراء" },
        { action: `نفّذ الجولة الثانية من التطبيق: ${d}.`, managerQuestion: q, proof: e },
        { action: "قارن الأدلة الحالية بخط الأساس الذي سجلته في اليوم الأول.", managerQuestion: q, proof: "فرق واضح أو فجوة محددة" },
        { action: "أزل عائقًا واحدًا يمنع تطبيق المعيار بصورة صحيحة.", managerQuestion: q, proof: "عائق تمت معالجته أو قرار تصعيد موثق" },
        { action: "درّب شخصًا واحدًا على تطبيق المعيار دون أن تحل المشكلة نيابةً عنه.", managerQuestion: q, proof: "سلوك جديد تم تطبيقه من الشخص نفسه" },
        { action: "راجع الالتزامات السابقة وتحقق من الأدلة، لا من النوايا.", managerQuestion: q, proof: e },
        { action: "ضع إيقاعًا أسبوعيًا ثابتًا لهذا الجانب داخل اجتماع أو متابعة قائمة.", managerQuestion: q, proof: "موعد متكرر + أجندة + مسؤول" },
        { action: `اختم دورة الـ15 يومًا بقياس: ${m}. ثبّت ما نجح وحدد التحسين التالي.`, managerQuestion: q, proof: "قياس أسبوعي + قرار استمرار أو تصحيح" },
      ]
    : [
        { action: `Define a clear standard for “${label}” and record the current baseline.`, managerQuestion: q, proof: `Written baseline + ${e}` },
        { action: `Review three live examples linked to “${label}” and identify the recurring pattern.`, managerQuestion: q, proof: "3 documented examples + one clear pattern" },
        { action: `Choose one behaviour to correct this week: ${t}.`, managerQuestion: q, proof: "One correction behaviour agreed with the relevant person or team" },
        { action: `Run one live application: ${d}.`, managerQuestion: q, proof: e },
        { action: "Ask the rep or team for evidence rather than a general explanation.", managerQuestion: q, proof: e },
        { action: "Review what worked and what did not, then adjust tomorrow’s step without lowering the standard.", managerQuestion: q, proof: "Short review + one precise adjustment" },
        { action: "Observe one behaviour live and give specific feedback immediately afterward.", managerQuestion: q, proof: "Feedback linked to observed behaviour" },
        { action: "Convert the outcome into a dated commitment with a named owner.", managerQuestion: q, proof: "Owner + date + action" },
        { action: `Run the second live application: ${d}.`, managerQuestion: q, proof: e },
        { action: "Compare current evidence with the baseline recorded on Day 1.", managerQuestion: q, proof: "Clear improvement or a precisely defined gap" },
        { action: "Remove one blocker preventing the standard from being applied correctly.", managerQuestion: q, proof: "Blocker removed or escalation decision documented" },
        { action: "Coach one person to apply the standard without solving the issue for them.", managerQuestion: q, proof: "New behaviour applied by the person themselves" },
        { action: "Review previous commitments and inspect evidence, not intention.", managerQuestion: q, proof: e },
        { action: "Install a fixed weekly rhythm for this area inside an existing meeting or check-in.", managerQuestion: q, proof: "Recurring time + agenda + owner" },
        { action: `Close this 15-day cycle by measuring: ${m}. Lock what worked and define the next correction.`, managerQuestion: q, proof: "Weekly measure + continue/correct decision" },
      ];
}

export function buildSalesManager90DayPlan(
  weakestSix: SalesManagerPlanRow[],
  lang: Language
): SalesManagerPlanDay[] {
  const days: SalesManagerPlanDay[] = [];
  const selected = weakestSix.slice(0, 6);

  selected.forEach((row, blockIndex) => {
    const profile = getProfile(row.competencyId);
    if (!profile) return;

    const label = row.label || (lang === "ar" ? profile.ar : profile.en);
    const block = actionsFor(profile, label, lang);
    const startDay = blockIndex * 15 + 1;

    block.forEach((item, index) => {
      const day = startDay + index;
      days.push({
        day,
        phase: phaseFor(day),
        competencyId: profile.id,
        competencyLabel: label,
        action: item.action,
        managerQuestion: item.managerQuestion,
        proof: item.proof,
      });
    });
  });

  return days;
}
