// lib/pdf-recommendations.ts

export type Tier = "Strength" | "Opportunity" | "Threat" | "Weakness";

type RecommendationBlock = { en: string[]; ar: string[] };
type RecommendationTiers = {
  Strength: RecommendationBlock;
  Opportunity: RecommendationBlock;
  Threat: RecommendationBlock;
  Weakness: RecommendationBlock;
};

/** Normalize competency ids so recommendations always match (EN/AR, spaces, hyphens, etc.) */
function normalizeCompetencyId(id: string): string {
  const clean = String(id || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "destroying_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    // common label variations
    "mental toughness": "mental_toughness",
    "opening conversations": "opening_conversations",
    "identifying real needs": "identifying_real_needs",
    "handling objections": "destroying_objections", // map legacy name → correct key
    "destroying objections": "destroying_objections",
    "creating irresistible offers": "creating_irresistible_offers",
    "mastering closing": "mastering_closing",
    "follow-up discipline": "follow_up_discipline",
    "follow up discipline": "follow_up_discipline",

    // Arabic labels (if stored as Arabic in DB)
    "الصلابة الذهنية": "mental_toughness",
    "فتح المحادثات": "opening_conversations",
    "تحديد الاحتياجات الحقيقية": "identifying_real_needs",
    "التعامل مع الاعتراضات": "destroying_objections",
    "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",
    "إتقان الإغلاق": "mastering_closing",
    "انضباط المتابعة": "follow_up_discipline",
  };

  return map[clean] || map[key] || key;
}

export const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  mental_toughness: {
    Weakness: {
      en: [
        "Reset fast: take one 30-second breath break after any tough interaction.",
        "Rehearse the hardest stop: visualize handling it calmly before you arrive.",
        "Build confidence daily: track one micro-win and repeat it on purpose.",
      ],
      ar: [
        "أعد ضبط حالتك فوراً: خذ 30 ثانية تنفّس بعد أي موقف صعب.",
        "درّب أصعب محطة: تخيّل التعامل معها بثبات قبل أن تصل.",
        "ابنِ الثقة يومياً: سجّل «انتصاراً صغيراً» واحداً وكرّره بوعي.",
      ],
    },
    Threat: {
      en: [
        "Use a bounce-back line to recover quickly and keep your rhythm.",
        "Spot your biggest drain (heat, fatigue, rejection) and counter it with one move.",
        "Lower pressure: set daily conversation targets, not closing targets.",
      ],
      ar: [
        "استخدم «جملة ارتداد» لتستعيد توازنك بسرعة وتحافظ على الإيقاع.",
        "حدّد أكبر مصدر استنزاف (حرارة/تعب/رفض) ثم واجهه بخطوة واحدة.",
        "خفّف الضغط: استهدف عدد محادثات يومي… لا عدد إغلاقات.",
      ],
    },
    Opportunity: {
      en: [
        "Review one hesitation moment daily and turn it into a simple adjustment.",
        "Prime your mindset before the route with one short ritual you can repeat.",
        "Ask midday: “What would my best version do now?”—then do it once.",
      ],
      ar: [
        "راجع لحظة تردد واحدة يومياً… وحوّلها إلى تعديل بسيط مباشر.",
        "هيّئ عقلك قبل الجولة بطقس قصير واحد يمكنك تكراره.",
        "اسأل منتصف اليوم: «ماذا سيفعل أفضل إصدار مني الآن؟» ثم نفّذ خطوة واحدة.",
      ],
    },
    Strength: {
      en: [
        "Model composure visibly and share one routine that keeps you steady.",
        "Choose tougher streets/time slots where your calm becomes an advantage.",
        "Route strategically: align key visits with your peak-energy hours.",
      ],
      ar: [
        "قدّم الثبات كقدوة… وشارك عادة واحدة تحافظ على توازنك.",
        "اختر شوارع/أوقاتاً أصعب حيث يصبح هدوؤك ميزة تنافسية.",
        "خطّط مسارك بذكاء: ضع الزيارات الأهم في ساعات ذروتك.",
      ],
    },
  },

  opening_conversations: {
    Weakness: {
      en: [
        "Practice one 3-second opener until it sounds natural—then stick to it.",
        "Warm up on low-pressure contacts to build momentum before the main route.",
        "Ask permission first: “Do you have 30 seconds?” to reduce resistance.",
      ],
      ar: [
        "تمرّن على افتتاحية من 3 ثوانٍ حتى تصبح طبيعية… ثم التزم بها.",
        "ابدأ بتواصل منخفض الضغط لتبني الزخم قبل الجولة الأساسية.",
        "اطلب الإذن أولاً: «هل لديك 30 ثانية؟» لتقليل المقاومة.",
      ],
    },
    Threat: {
      en: [
        "Record your first 10 seconds and adjust tone for warmth and clarity.",
        "Prepare three smooth pivots to move from hello to value in one breath.",
        "Start with two easy doors to lock your rhythm before tougher visits.",
      ],
      ar: [
        "سجّل أول 10 ثوانٍ… ثم عدّل النبرة لتصبح أدفأ وأوضح.",
        "جهّز 3 انتقالات بسيطة لتنتقل من التحية إلى القيمة بسلاسة.",
        "ابدأ بزيارتين سهلتين لتثبيت الإيقاع قبل الأصعب.",
      ],
    },
    Opportunity: {
      en: [
        "Test curiosity openers and keep only what earns real engagement.",
        "Track which opener performs best and repeat it intentionally.",
        "Pair your opener with confident body language: smile, eye contact, open posture.",
      ],
      ar: [
        "اختبر افتتاحيات الفضول… واحتفظ بما يحقق تفاعلاً حقيقياً.",
        "تتبّع الافتتاحية الأعلى أداءً… وكرّرها بوعي.",
        "ادمج الافتتاحية مع لغة جسد واثقة: ابتسامة، تواصل بصري، وضعية منفتحة.",
      ],
    },
    Strength: {
      en: [
        "Coach one teammate on your signature opener that builds instant rapport.",
        "Experiment with advanced hooks (story/humor) while staying authentic.",
        "Document your top three openers and turn them into team standards.",
      ],
      ar: [
        "درّب زميلاً واحداً على افتتاحيتك التي تبني الألفة بسرعة.",
        "جرّب خطافات متقدمة (قصة/لمسة خفيفة) مع الحفاظ على العفوية.",
        "وثّق أفضل 3 افتتاحيات لديك… وحوّلها إلى معيار للفريق.",
      ],
    },
  },

  identifying_real_needs: {
    Weakness: {
      en: [
        "Ask “What matters most about this?” right after any feature mention.",
        "Listen for emotion words and follow with one deeper question.",
        "Pause two seconds after they answer—let the real reason surface.",
      ],
      ar: [
        "اسأل: «ما الأهم لك في هذا؟» مباشرة بعد ذكر أي ميزة.",
        "التقط الكلمات العاطفية… ثم اسأل سؤالاً أعمق واحداً.",
        "توقّف ثانيتين بعد الإجابة… ودع السبب الحقيقي يظهر.",
      ],
    },
    Threat: {
      en: [
        "Replace “Do you need this?” with “What would solving this change for you?”",
        "Capture repeated pain points and build a simple pattern list.",
        "Summarize their need in your words before offering any solution.",
      ],
      ar: [
        "استبدل «هل تحتاج هذا؟» بـ «ماذا سيغيّر حلّ هذا بالنسبة لك؟»",
        "دوّن الأوجاع المتكررة… وابنِ قائمة أنماط بسيطة.",
        "لخّص احتياجهم بكلماتك قبل أن تعرض أي حل.",
      ],
    },
    Opportunity: {
      en: [
        "Go one level deeper with: “Why is that important?” to reach the real driver.",
        "Link stated needs to hidden motives (security/pride/freedom) without overtalking.",
        "Use silence intentionally—let them fill the gap with what truly matters.",
      ],
      ar: [
        "انزل مستوى أعمق بسؤال: «لماذا هذا مهم؟» لتصل للدافع الحقيقي.",
        "اربط الاحتياج بدافع خفي (أمان/فخر/حرية) دون إطالة.",
        "استخدم الصمت بذكاء… ودعهم يكمّلون بما يهم فعلاً.",
      ],
    },
    Strength: {
      en: [
        "Teach the “3 Whys” habit without turning it into an interrogation.",
        "Build a simple discovery checklist based on your best conversations.",
        "Create one personalized value line on the spot using their exact words.",
      ],
      ar: [
        "علّم عادة «3 لماذا» دون أن تبدو استجواباً.",
        "ابنِ قائمة اكتشاف مختصرة من أفضل محادثاتك.",
        "اصنع «جملة قيمة» شخصية فوراً باستخدام كلمات العميل نفسها.",
      ],
    },
  },

  destroying_objections: {
    Weakness: {
      en: [
        "Reframe “I don’t have time” into: “When would be better?”—and stay calm.",
        "Mirror their concern briefly, then ask: “What’s your biggest worry?”",
        "Prepare three short replies for price, timing, and trust—keep them tight.",
      ],
      ar: [
        "أعد صياغة «ليس لدي وقت» إلى: «متى يكون الوقت أفضل؟» وبهدوء.",
        "اعكس قلقه باختصار… ثم اسأل: «ما أكبر مخاوفك؟»",
        "جهّز 3 ردود مختصرة للسعر والتوقيت والثقة… وقلها بثبات.",
      ],
    },
    Threat: {
      en: [
        "Treat objections as signals and respond with curiosity, not defense.",
        "Use a simple feel-felt-found line—human, not robotic.",
        "Pause before answering to show respect and avoid rushed rebuttals.",
      ],
      ar: [
        "اعتبر الاعتراض «إشارة»… ورد بفضول لا بدفاع.",
        "استخدم أسلوب «تشعر/شعر/وجد» ببساطة وبنبرة إنسانية.",
        "توقّف لحظة قبل الرد… لتُظهر احتراماً وتمنع الاندفاع.",
      ],
    },
    Opportunity: {
      en: [
        "Pre-frame common objections early so they feel handled before they appear.",
        "Turn price pushback into value: “What would this outcome be worth?”",
        "Collect objection patterns and build a mini-FAQ for sharper answers.",
      ],
      ar: [
        "مهّد للاعتراضات الشائعة مبكراً… لتبدو مُعالجة قبل أن تُقال.",
        "حوّل اعتراض السعر إلى قيمة: «ما الذي تستحقه النتيجة بالنسبة لك؟»",
        "اجمع أنماط الاعتراضات… وابنِ «أسئلة شائعة» مصغرة لردود أدق.",
      ],
    },
    Strength: {
      en: [
        "Model calm objection handling so others copy your tone, not just your words.",
        "Build an objection→opportunity cheat sheet for new reps.",
        "Reframe resistance quickly and guide the conversation back to value.",
      ],
      ar: [
        "كن قدوة في هدوء التعامل مع الاعتراض… ليتعلموا النبرة لا الكلمات فقط.",
        "اصنع «ورقة مختصرة» لتحويل الاعتراض إلى فرصة للمندوبين الجدد.",
        "أعد صياغة المقاومة سريعاً… وأعد الحوار إلى القيمة.",
      ],
    },
  },

  creating_irresistible_offers: {
    Weakness: {
      en: [
        "Start with a personalized outcome (time saved, stress reduced, money protected).",
        "Use plain language and remove jargon so the value lands instantly.",
        "Anchor the offer with a one-sentence before/after contrast.",
      ],
      ar: [
        "ابدأ بنتيجة شخصية (وقت/ضغط/مال)… لتصل القيمة فوراً.",
        "استخدم لغة بسيطة واترك المصطلحات… لتصبح الفكرة واضحة مباشرة.",
        "ثبّت العرض بجملة «قبل/بعد» واحدة واضحة.",
      ],
    },
    Threat: {
      en: [
        "Translate features into outcomes instead of listing specs.",
        "Add gentle urgency with a natural deadline (end of week/month).",
        "Test two angles (benefit-first vs proof-first) and keep the winner.",
      ],
      ar: [
        "حوّل الميزات إلى نتائج… بدل سرد المواصفات.",
        "أضف إلحاحاً هادئاً بموعد طبيعي (نهاية الأسبوع/الشهر).",
        "اختبر زاويتين (فائدة أولاً vs دليل أولاً)… واحتفظ بالأقوى.",
      ],
    },
    Opportunity: {
      en: [
        "Use their exact words in the offer to make it feel tailor-made.",
        "Add light proof (one metric or outcome) without overpromising.",
        "Open with a short hook: “A client like you was stuck… then this changed.”",
      ],
      ar: [
        "استخدم كلمات العميل نفسها داخل العرض… ليبدو مفصّلاً عليه.",
        "أضف دليلاً خفيفاً (رقم/نتيجة) دون مبالغة.",
        "ابدأ بخطاف قصة قصيرة: «عميل كان مثلك… ثم تغيّر هذا».",
      ],
    },
    Strength: {
      en: [
        "Turn your best offer into a repeatable template the team can copy.",
        "Use scarcity/exclusivity carefully to sharpen the edge without hype.",
        "Blend emotion and logic into one clean offer line—then stop talking.",
      ],
      ar: [
        "حوّل أفضل عروضك إلى قالب متكرر يمكن للفريق نسخه.",
        "استخدم الندرة/الحصرية بحذر لتحسين القوة دون مبالغة.",
        "ادمج العاطفة والمنطق في جملة عرض واحدة… ثم توقّف عن الإطالة.",
      ],
    },
  },

  mastering_closing: {
    Weakness: {
      en: [
        "Use an alternative close: “Option A or B?” instead of “Are you ready?”",
        "Rehearse one closing line daily until it feels natural and confident.",
        "Ask for the next step gently: “Does it make sense to move forward?”",
      ],
      ar: [
        "استخدم إغلاق الاختيار: «الخيار أ أم ب؟» بدل «هل أنت مستعد؟»",
        "تمرّن يومياً على جملة إغلاق واحدة حتى تصبح طبيعية وواثقة.",
        "اطلب الخطوة التالية بلطف: «هل يبدو منطقياً أن نتابع؟»",
      ],
    },
    Threat: {
      en: [
        "Close right after agreement or positive emotion—then stop talking.",
        "Use a trial close to check readiness: “How does this sound so far?”",
        "Hold silence after the close and let them answer first.",
      ],
      ar: [
        "أغلق بعد لحظة موافقة أو شعور إيجابي… ثم توقّف عن الكلام.",
        "استخدم إغلاقاً تجريبياً: «كيف يبدو هذا حتى الآن؟»",
        "اصمت بعد الإغلاق… ودع العميل يجيب أولاً.",
      ],
    },
    Opportunity: {
      en: [
        "Create urgency with a natural deadline—without pressure or drama.",
        "Bundle next steps: “If we agree today, I’ll set it up by tomorrow.”",
        "Offer a simple channel choice: “Email or WhatsApp for the details?”",
      ],
      ar: [
        "اصنع إلحاحاً بموعد طبيعي… دون ضغط أو مبالغة.",
        "اجمع الخطوات التالية: «إذا اتفقنا اليوم، أجهزه لك غداً».",
        "قدّم خيار قناة بسيط: «إيميل أم واتساب للتفاصيل؟»",
      ],
    },
    Strength: {
      en: [
        "Teach your closing rhythm so others copy your flow, not just your words.",
        "Track which closing tactic wins most and double down on it.",
        "Convert momentum into action with a clear next-step ask every time.",
      ],
      ar: [
        "علّم إيقاع الإغلاق… ليقلدوا التدفق لا الكلمات فقط.",
        "تتبّع أسلوب الإغلاق الأكثر نجاحاً… وركّز عليه.",
        "حوّل الزخم إلى خطوة واضحة بطلب «الخطوة التالية» دائماً.",
      ],
    },
  },

  follow_up_discipline: {
    Weakness: {
      en: [
        "Block 10 minutes daily and send follow-ups in one focused sprint.",
        "Use one simple template and keep it warm—never robotic.",
        "Schedule the follow-up before you leave the conversation.",
      ],
      ar: [
        "خصص 10 دقائق يومياً… وأرسل المتابعات دفعة واحدة بتركيز.",
        "استخدم قالباً بسيطاً واجعله دافئاً… لا آلياً.",
        "جدول المتابعة قبل أن تغادر المحادثة مباشرة.",
      ],
    },
    Threat: {
      en: [
        "Batch follow-ups by time of day and protect the routine.",
        "Add one small value item in every follow-up (tip, link, insight).",
        "Track response timing to learn when prospects reply most.",
      ],
      ar: [
        "جمّع المتابعات حسب الوقت… واحمِ الروتين من الانقطاع.",
        "أضف قيمة صغيرة في كل متابعة (نصيحة/رابط/فكرة).",
        "تتبّع توقيت الرد… لتعرف متى يستجيب العملاء أكثر.",
      ],
    },
    Opportunity: {
      en: [
        "Personalize the follow-up with one reference from the last conversation.",
        "Use reminders quietly while keeping the message warm and personal.",
        "Test cadence (3 touches vs 5) and keep what performs best.",
      ],
      ar: [
        "خصّص المتابعة بإشارة واحدة من آخر محادثة.",
        "استخدم التذكيرات بهدوء… مع رسالة شخصية ودافئة.",
        "اختبر وتيرة المتابعة (3 لمسات vs 5)… واحتفظ بالأفضل.",
      ],
    },
    Strength: {
      en: [
        "Turn your follow-up system into a team standard others can copy.",
        "Build a mini follow-up playbook with templates for key scenarios.",
        "Use consistency to build trust—then let trust finish the deal.",
      ],
      ar: [
        "حوّل نظام المتابعة إلى معيار للفريق يمكن نسخه بسهولة.",
        "اصنع دليلاً مصغراً للمتابعة بقوالب لأهم السيناريوهات.",
        "استخدم الانتظام لبناء الثقة… ثم دع الثقة تُكمل الصفقة.",
      ],
    },
  },
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
