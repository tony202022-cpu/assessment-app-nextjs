// lib/pdf-recommendations.ts

export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

type RecommendationBlock = { en: string[]; ar: string[] };
type RecommendationTiers = {
  Strength: RecommendationBlock;
  Opportunity: RecommendationBlock;
  Threat: RecommendationBlock;
  Weakness: RecommendationBlock;
};

/** Normalize competency ids so recommendations always match */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "handling_objections",
    handling_objections: "handling_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",
    consultative_selling: "consultative_selling",
    time_territory_management: "time_territory_management",
    product_expertise: "product_expertise",
    negotiation_skills: "negotiation_skills",
    attitude_motivation_mindset: "attitude_motivation_mindset",
    dealing_with_boss: "dealing_with_boss",
    handling_difficult_customers: "handling_difficult_customers",
    handling_difficult_colleagues: "handling_difficult_colleagues",
  };

  return map[key] || key;
}

export const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  mental_toughness: {
    Weakness: {
      en: ["Reset fast: take one 30-second breath break after any tough interaction.", "Rehearse the hardest stop: visualize handling it calmly before you arrive."],
      ar: ["أعد ضبط حالتك فوراً: خذ 30 ثانية تنفّس بعد أي موقف صعب.", "درّب أصعب محطة: تخيّل التعامل معها بثبات قبل أن تصل."]
    },
    Threat: {
      en: ["Use a bounce-back line to recover quickly.", "Lower pressure: set daily conversation targets, not closing targets."],
      ar: ["استخدم «جملة ارتداد» لتستعيد توازنك بسرعة.", "خفّف الضغط: استهدف عدد محادثات يومي… لا عدد إغلاقات."]
    },
    Opportunity: {
      en: ["Review one hesitation moment daily.", "Prime your mindset before the route with a short ritual."],
      ar: ["راجع لحظة تردد واحدة يومياً.", "هيّئ عقلك قبل الجولة بطقس قصير."]
    },
    Strength: {
      en: ["Model composure visibly for the team.", "Route strategically: align key visits with peak-energy hours."],
      ar: ["كن قدوة في الثبات أمام الفريق.", "خطّط مسارك بذكاء: ضع الزيارات الأهم في ساعات ذروتك."]
    }
  },
  // ... (Keeping existing 7 competencies)
  consultative_selling: {
    Weakness: {
      en: ["Stop pitching features; start asking about business outcomes.", "Research the client's industry for 5 minutes before every meeting."],
      ar: ["توقف عن عرض الميزات؛ ابدأ بالسؤال عن نتائج الأعمال.", "ابحث في مجال عمل العميل لمدة 5 دقائق قبل كل اجتماع."]
    },
    Threat: {
      en: ["Focus on solving one specific problem rather than selling a whole catalog.", "Use case studies to show you understand their specific challenges."],
      ar: ["ركز على حل مشكلة محددة بدلاً من بيع كتالوج كامل.", "استخدم دراسات الحالة لتظهر فهمك لتحدياتهم المحددة."]
    },
    Opportunity: {
      en: ["Ask 'What happens if you don't solve this?' to build urgency.", "Position yourself as a partner, not just a vendor."],
      ar: ["اسأل 'ماذا يحدث إذا لم تحل هذه المشكلة؟' لبناء الاستعجال.", "ضع نفسك كشريك، وليس مجرد مورد."]
    },
    Strength: {
      en: ["Lead with insights that the customer hasn't considered yet.", "Build long-term roadmaps for clients instead of one-off deals."],
      ar: ["ابدأ برؤى لم يأخذها العميل في الاعتبار بعد.", "ابنِ خرائط طريق طويلة الأجل للعملاء بدلاً من الصفقات لمرة واحدة."]
    }
  },
  time_territory_management: {
    Weakness: {
      en: ["Use a map app to cluster your visits and reduce driving time.", "Set a strict 'stop time' for each visit to stay on schedule."],
      ar: ["استخدم تطبيق خرائط لتجميع زياراتك وتقليل وقت القيادة.", "حدد 'وقت توقف' صارم لكل زيارة للالتزام بالجدول الزمني."]
    },
    Threat: {
      en: ["Identify your 'A' clients and visit them during your most productive hours.", "Reduce administrative tasks during peak selling hours."],
      ar: ["حدد عملاءك من الفئة 'أ' وقم بزيارتهم خلال ساعاتك الأكثر إنتاجية.", "قلل المهام الإدارية خلال ساعات البيع الذروة."]
    },
    Opportunity: {
      en: ["Review your route the night before to optimize travel paths.", "Use 'gap time' between meetings for quick follow-up calls."],
      ar: ["راجع مسارك في الليلة السابقة لتحسين مسارات السفر.", "استخدم 'وقت الفراغ' بين الاجتماعات لمكالمات متابعة سريعة."]
    },
    Strength: {
      en: ["Analyze your territory data to find untapped pockets of opportunity.", "Automate your scheduling to maximize face-to-face time."],
      ar: ["حلل بيانات منطقتك للعثور على فرص غير مستغلة.", "أتمت جدولة مواعيدك لزيادة وقت المقابلة وجهاً لوجه."]
    }
  },
  product_expertise: {
    Weakness: {
      en: ["Spend 15 minutes daily reading product manuals or technical specs.", "Shadow a technical expert to see how they explain complex features."],
      ar: ["اقضِ 15 دقيقة يومياً في قراءة أدلة المنتج أو المواصفات الفنية.", "رافق خبيراً فنياً لترى كيف يشرح الميزات المعقدة."]
    },
    Threat: {
      en: ["Focus on learning the top 3 benefits for your 3 best-selling products.", "Practice explaining technical concepts in simple, everyday language."],
      ar: ["ركز على تعلم أهم 3 فوائد لأكثر 3 منتجات مبيعاً لديك.", "تدرب على شرح المفاهيم الفنية بلغة بسيطة ويومية."]
    },
    Opportunity: {
      en: ["Learn how your product compares specifically to your top 2 competitors.", "Stay updated on new feature releases and their practical applications."],
      ar: ["تعلم كيف يقارن منتجك تحديداً بأهم منافسين اثنين لك.", "ابقَ على اطلاع على إصدارات الميزات الجديدة وتطبيقاتها العملية."]
    },
    Strength: {
      en: ["Create a 'cheat sheet' of technical FAQs for the rest of the team.", "Conduct a training session on a complex product feature."],
      ar: ["أنشئ 'ورقة غش' للأسئلة الفنية الشائعة لبقية الفريق.", "قم بإجراء جلسة تدريبية حول ميزة منتج معقدة."]
    }
  },
  negotiation_skills: {
    Weakness: {
      en: ["Never give a discount without asking for something in return (e.g., volume).", "Prepare your 'walk-away' point before entering any negotiation."],
      ar: ["لا تقدم خصماً أبداً دون طلب شيء في المقابل (مثل الكمية).", "جهز نقطة 'الانسحاب' الخاصة بك قبل الدخول في أي مفاوضات."]
    },
    Threat: {
      en: ["Focus on building value so price becomes a secondary conversation.", "Practice silence after making an offer; let the other side speak first."],
      ar: ["ركز على بناء القيمة بحيث يصبح السعر حواراً ثانوياً.", "تدرب على الصمت بعد تقديم العرض؛ دع الطرف الآخر يتحدث أولاً."]
    },
    Opportunity: {
      en: ["Identify multiple variables you can trade (terms, delivery, service).", "Ask 'What else is important to you besides price?'"],
      ar: ["حدد متغيرات متعددة يمكنك مقايضتها (الشروط، التسليم، الخدمة).", "اسأل 'ما هو المهم الآخر بالنسبة لك بجانب السعر؟'"]
    },
    Strength: {
      en: ["Aim for win-win outcomes that strengthen the long-term relationship.", "Master the art of 'anchoring' the conversation with high initial value."],
      ar: ["استهدف نتائج مربحة للطرفين تعزز العلاقة طويلة الأمد.", "أتقن فن 'تثبيت' الحوار بقيمة أولية عالية."]
    }
  },
  attitude_motivation_mindset: {
    Weakness: {
      en: ["Start your day with 5 minutes of positive visualization or reading.", "Identify one negative trigger and create a plan to avoid or counter it."],
      ar: ["ابدأ يومك بـ 5 دقائق من التخيل الإيجابي أو القراءة.", "حدد محفزاً سلبياً واحداً وضع خطة لتجنبه أو مواجهته."]
    },
    Threat: {
      en: ["Focus on your 'Why'—the personal reason you want to succeed in sales.", "Surround yourself with high-performers who have a growth mindset."],
      ar: ["ركز على 'لماذا' الخاصة بك - السبب الشخصي لرغبتك في النجاح في المبيعات.", "أحط نفسك بالمتفوقين الذين لديهم عقلية نمو."]
    },
    Opportunity: {
      en: ["Set small, achievable daily goals to build a sense of momentum.", "Practice gratitude by listing 3 things that went well at the end of each day."],
      ar: ["ضع أهدافاً يومية صغيرة وقابلة للتحقيق لبناء شعور بالزخم.", "مارس الامتنان من خلال إدراج 3 أشياء سارت بشكل جيد في نهاية كل يوم."]
    },
    Strength: {
      en: ["Mentor a struggling colleague to reinforce your own positive mindset.", "Take on a challenging project to push your boundaries and grow."],
      ar: ["قم بتوجيه زميل يعاني لتعزيز عقليتك الإيجابية.", "تولَّ مشروعاً صعباً لتجاوز حدودك والنمو."]
    }
  },
  dealing_with_boss: {
    Weakness: {
      en: ["Schedule a 10-minute weekly update to keep your manager informed.", "Ask for specific feedback on one area you want to improve."],
      ar: ["حدد موعداً لتحديث أسبوعي لمدة 10 دقائق لإبقاء مديرك على اطلاع.", "اطلب ملاحظات محددة حول منطقة واحدة تريد تحسينها."]
    },
    Threat: {
      en: ["Focus on delivering results that help your manager achieve their goals.", "Communicate challenges early, along with potential solutions."],
      ar: ["ركز على تقديم النتائج التي تساعد مديرك على تحقيق أهدافه.", "تواصل بشأن التحديات مبكراً، مع الحلول المحتملة."]
    },
    Opportunity: {
      en: ["Align your personal career goals with the company's objectives.", "Volunteer for a task that demonstrates your leadership potential."],
      ar: ["اربط أهدافك المهنية الشخصية بأهداف الشركة.", "تطوع لمهمة تظهر إمكاناتك القيادية."]
    },
    Strength: {
      en: ["Act as a bridge between your manager and the rest of the team.", "Proactively suggest process improvements that benefit the department."],
      ar: ["اعمل كجسر بين مديرك وبقية الفريق.", "اقترح استباقياً تحسينات في العمليات تفيد القسم."]
    }
  },
  handling_difficult_customers: {
    Weakness: {
      en: ["Practice active listening: repeat back what the customer said to show empathy.", "Stay calm and professional, even if the customer becomes emotional."],
      ar: ["مارس الاستماع النشط: كرر ما قاله العميل لإظهار التعاطف.", "ابقَ هادئاً ومهنياً، حتى لو أصبح العميل عاطفياً."]
    },
    Threat: {
      en: ["Focus on finding a solution rather than winning the argument.", "Set clear boundaries politely if a customer becomes disrespectful."],
      ar: ["ركز على إيجاد حل بدلاً من الفوز بالجدال.", "ضع حدوداً واضحة بأدب إذا أصبح العميل غير محترم."]
    },
    Opportunity: {
      en: ["Use the 'HEARD' method: Hear, Empathize, Apologize, Resolve, Diagnose.", "Turn a complaint into an opportunity to demonstrate exceptional service."],
      ar: ["استخدم طريقة 'HEARD': استمع، تعاطف، اعتذر، حل، شخص.", "حول الشكوى إلى فرصة لإظهار خدمة استثنائية."]
    },
    Strength: {
      en: ["Master the art of de-escalation and turning critics into fans.", "Share your strategies for handling tough accounts with the team."],
      ar: ["أتقن فن تهدئة الأمور وتحويل المنتقدين إلى معجبين.", "شارك استراتيجياتك للتعامل مع الحسابات الصعبة مع الفريق."]
    }
  },
  handling_difficult_colleagues: {
    Weakness: {
      en: ["Focus on the work and the common goal, not personal differences.", "Communicate directly and professionally about any friction points."],
      ar: ["ركز على العمل والهدف المشترك، وليس الاختلافات الشخصية.", "تواصل مباشرة ومهنياً بشأن أي نقاط احتكاك."]
    },
    Threat: {
      en: ["Seek to understand their perspective before reacting to their behavior.", "Involve a neutral third party if a conflict cannot be resolved directly."],
      ar: ["اسعَ لفهم وجهة نظرهم قبل الرد على سلوكهم.", "أشرك طرفاً ثالثاً محايداً إذا تعذر حل النزاع مباشرة."]
    },
    Opportunity: {
      en: ["Find common ground or shared interests to build a better rapport.", "Practice 'radical candor'—challenge directly while caring personally."],
      ar: ["ابحث عن أرضية مشتركة أو اهتمامات مشتركة لبناء علاقة أفضل.", "مارس 'الصراحة المطلقة' - واجه مباشرة مع الاهتمام الشخصي."]
    },
    Strength: {
      en: ["Act as a mediator to help resolve conflicts within the team.", "Lead by example in fostering a collaborative and supportive culture."],
      ar: ["اعمل كوسيط للمساعدة في حل النزاعات داخل الفريق.", "كن قدوة في تعزيز ثقافة تعاونية وداعمة."]
    }
  }
};

export function getRecommendations(
  competencyId: string,
  tier: Tier,
  lang: "en" | "ar"
): string[] {
  const key = normalizeCompetencyId(competencyId);

  const rec = RECOMMENDATIONS[key]?.[tier];
  if (!rec) return [];

  const list = lang === "ar" ? rec.ar : rec.en;

  // Safety: never return undefined items
  return Array.isArray(list) ? list.filter(Boolean) : [];
}