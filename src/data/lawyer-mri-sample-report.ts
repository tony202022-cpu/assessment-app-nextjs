export type SampleCompetency = {
  id: string;
  label: string;
  score: number;
};

export type SampleTreatment = SampleCompetency & {
  diagnosis: string;
  rootCause: string;
  action: string;
  indicator: string;
};

export type SamplePlanDay = {
  day: number;
  week: number;
  phase: string;
  focus: string;
  exercise: string;
  application: string;
  verification: string;
  reflection: string;
};

export const LAWYER_SAMPLE_IDENTITY = {
  name: "Test",
  email: "test",
  experience: "—",
  reference: "SAMPLE-LAWYER-MRI",
} as const;

export const LAWYER_SAMPLE_OVERALL_SCORE = 39;

export const LAWYER_SAMPLE_COMPETENCIES: SampleCompetency[] = [
  { id: "explaining_legal_strategy_simply", label: "شرح الاستراتيجية القانونية ببساطة", score: 72 },
  { id: "ethical_persuasion_boundaries", label: "الإقناع المهني والحدود الأخلاقية", score: 68 },
  { id: "post_consultation_follow_up", label: "المتابعة المهنية بعد الاستشارة", score: 56 },
  { id: "fee_comparison_objections", label: "التعامل مع مقارنة الأتعاب والاعتراضات", score: 52 },
  { id: "legal_inquiry_handling", label: "الاستجابة الأولى للاستفسار القانوني", score: 48 },
  { id: "trust_risk_outcome_objections", label: "معالجة اعتراضات الثقة والمخاطر والنتائج", score: 44 },
  { id: "consultation_opening_control", label: "إدارة بداية الاستشارة وتنظيم الحوار", score: 40 },
  { id: "consultation_closing_engagement", label: "إغلاق الاستشارة وتثبيت الخطوة التالية", score: 40 },
  { id: "client_experience_referral_growth", label: "تجربة العميل ونمو الإحالات", score: 40 },
  { id: "case_qualification_client_fit", label: "تأهيل القضية وملاءمة العميل", score: 36 },
  { id: "legal_need_diagnosis", label: "فهم الحاجة القانونية الحقيقية للعميل", score: 28 },
  { id: "client_trust_professional_authority", label: "بناء الثقة والسلطة المهنية", score: 24 },
  { id: "emotional_difficult_clients", label: "إدارة العملاء العاطفيين أو الصعبين", score: 24 },
  { id: "legal_value_framing", label: "صياغة القيمة القانونية بوضوح", score: 12 },
  { id: "fee_presentation_retainer_confidence", label: "عرض الأتعاب والثقة في اتفاقية التوكيل", score: 4 },
];

const treatmentCopy: Record<
  string,
  Pick<SampleTreatment, "diagnosis" | "rootCause" | "action" | "indicator">
> = {
  fee_presentation_retainer_confidence: {
    diagnosis: "عرض الأتعاب قد يأتي في لحظة منفصلة عن القيمة، فيشعر العميل أنه انتقل فجأة من فهم القضية إلى مواجهة السعر.",
    rootCause: "غياب جسر مهني واضح يربط نطاق العمل القانوني، المخاطر، المسؤولية، والنتيجة المتوقعة قبل ذكر الأتعاب.",
    action: "استخدم تسلسلًا ثابتًا: ما فهمناه، ما الذي سنعالجه، نطاق المسؤولية، ما الذي يحميه هذا العمل، ثم الأتعاب والخطوة التالية.",
    indicator: "يستطيع العميل إعادة شرح سبب الأتعاب وما الذي يتضمنه التكليف قبل اتخاذ القرار.",
  },
  legal_value_framing: {
    diagnosis: "الخبرة القانونية موجودة، لكن العميل قد لا يرى كيف تتحول إلى حماية أو وضوح أو تقليل للمخاطر.",
    rootCause: "الشرح يركز على الإجراء القانوني أكثر من أثره العملي على قرار العميل ووقته ومخاطره.",
    action: "ترجم كل إجراء إلى قيمة عميل: الخطر الذي يقلله، القرار الذي يوضحه، والنتيجة الواقعية التي يدعمها.",
    indicator: "ينتقل العميل من سؤال «ماذا ستفعل؟» إلى فهم «لماذا هذه الخطوة مهمة لي؟».",
  },
  client_trust_professional_authority: {
    diagnosis: "قد يكون الأسلوب مهنيًا، لكن الثقة لا تُبنى مبكرًا بما يكفي لإشعار العميل أن قضيته مفهومة ومسيطر عليها.",
    rootCause: "الاعتماد على اللقب والخبرة الضمنية بدل إظهار منهج التفكير، حدود اليقين، وخريطة التعامل مع الملف.",
    action: "افتتح بتلخيص دقيق، وضّح ما تعرفه وما يحتاج تحققًا، ثم اشرح كيف ستُدار الخطوة التالية.",
    indicator: "يعبّر العميل عن وضوح وثقة قبل مناقشة الحل أو الأتعاب.",
  },
  emotional_difficult_clients: {
    diagnosis: "انفعال العميل قد يستهلك وقت الاستشارة ويجعل الحوار ينتقل من التشخيص إلى الدفاع أو التهدئة المفتوحة.",
    rootCause: "عدم وجود إطار ثابت للاعتراف بالمشاعر ثم إعادة الحوار إلى الوقائع والقرار القانوني.",
    action: "طبّق تسلسل: اعتراف مختصر، سؤال توضيحي، حد مهني، ثم خطوة قانونية محددة.",
    indicator: "ينخفض التكرار والانفعال ويخرج الحوار بقرار أو معلومة أو موعد واضح.",
  },
  legal_need_diagnosis: {
    diagnosis: "قد يتم تعريف المشكلة من خلال طلب العميل الأول بدل كشف حاجته القانونية والعملية الحقيقية.",
    rootCause: "الانتقال إلى الحل قبل فحص التوقيت، الأطراف، المخاطر، النتيجة المطلوبة، وما سيحدث إن لم يتغير الوضع.",
    action: "استخدم خمسة أسئلة تشخيصية ثابتة قبل تقديم أي مسار أو رأي أولي.",
    indicator: "يتغير تعريف القضية أو أولويتها بعد الأسئلة، ويصبح نطاق العمل أكثر دقة.",
  },
  case_qualification_client_fit: {
    diagnosis: "قد تُقبل استشارات أو ملفات لا تتناسب مع التخصص أو الجاهزية أو توقعات العميل.",
    rootCause: "عدم فصل جودة القضية عن جودة العلاقة المهنية ووضوح الميزانية والتوقعات وصاحب القرار.",
    action: "اعتمد بطاقة تأهيل تشمل الملاءمة القانونية، الاستعجال، التعاون، التوقعات، الميزانية، وتضارب المصالح.",
    indicator: "تقل الملفات غير المناسبة ويصبح قرار القبول أو الإحالة أسرع وأكثر اتساقًا.",
  },
};

export const LAWYER_SAMPLE_WEAKEST: SampleTreatment[] =
  LAWYER_SAMPLE_COMPETENCIES.slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((competency) => ({ ...competency, ...treatmentCopy[competency.id] }));

export const LAWYER_SAMPLE_SWOT = {
  strengths: [
    "قدرة قوية على تبسيط الاستراتيجية القانونية دون إغراق العميل في المصطلحات.",
    "حدود أخلاقية واضحة عند التأثير والإقناع وتوجيه القرار.",
  ],
  opportunities: [
    "تحويل المتابعة بعد الاستشارة إلى نظام يحمي القرارات المؤجلة.",
    "ربط الرد على اعتراضات الأتعاب بالقيمة والمخاطر بدل الدفاع عن السعر.",
  ],
  weaknesses: [
    "ضعف شديد في تقديم الأتعاب واتفاقية التوكيل بثقة وتسلسل.",
    "القيمة القانونية لا تتحول دائمًا إلى معنى عملي يراه العميل.",
  ],
  threats: [
    "فقدان عملاء مناسبين بعد استشارة جيدة بسبب غموض الخطوة التالية.",
    "استنزاف الوقت مع ملفات غير مناسبة أو عملاء غير جاهزين للتعاون.",
  ],
} as const;

const phases = [
  {
    name: "المرحلة الأولى — إصلاح التسرب الأساسي",
    from: 1,
    to: 21,
    focuses: LAWYER_SAMPLE_WEAKEST.slice(0, 3),
  },
  {
    name: "المرحلة الثانية — بناء الثقة والقيمة",
    from: 22,
    to: 45,
    focuses: LAWYER_SAMPLE_WEAKEST.slice(2, 6),
  },
  {
    name: "المرحلة الثالثة — التطبيق في الاستشارات الحقيقية",
    from: 46,
    to: 70,
    focuses: LAWYER_SAMPLE_COMPETENCIES.slice(0, 8),
  },
  {
    name: "المرحلة الرابعة — التثبيت والقياس",
    from: 71,
    to: 90,
    focuses: LAWYER_SAMPLE_COMPETENCIES.slice(0, 15),
  },
] as const;

const exerciseTemplates = [
  "اكتب صياغة مهنية من ثلاث جمل تستخدمها في المحادثة التالية.",
  "راجع استشارة سابقة وحدد اللحظة التي فقد فيها العميل الوضوح.",
  "تدرّب بصوت مرتفع على شرح الفكرة خلال 60 ثانية دون مصطلحات معقدة.",
  "أنشئ قائمة فحص قصيرة وطبّقها قبل أول استشارة اليوم.",
  "اختر سؤالًا تشخيصيًا واحدًا والتزم باستخدامه في كل محادثة مناسبة.",
  "أعد كتابة رسالة متابعة قديمة بحيث تنتهي بخطوة مؤرخة وواضحة.",
  "سجّل ملاحظة بعد الاستشارة: ما الذي فهمه العميل وما الذي بقي غامضًا؟",
] as const;

export const LAWYER_SAMPLE_90_DAY_PLAN: SamplePlanDay[] = Array.from(
  { length: 90 },
  (_, index) => {
    const day = index + 1;
    const phase = phases.find((item) => day >= item.from && day <= item.to)!;
    const focus = phase.focuses[index % phase.focuses.length];
    return {
      day,
      week: Math.ceil(day / 7),
      phase: phase.name,
      focus: focus.label,
      exercise: exerciseTemplates[index % exerciseTemplates.length],
      application: `طبّق التمرين على موقف حقيقي مرتبط بـ ${focus.label}، ثم دوّن العبارة أو السؤال الذي استخدمته.`,
      verification: `مؤشر اليوم: هل أصبح ${focus.label} أوضح للعميل ويمكن ملاحظته في الخطوة التالية؟`,
      reflection: "ما الذي تغيّر في استجابة العميل؟ وما تعديلك الصغير للمحاولة القادمة؟",
    };
  },
);

