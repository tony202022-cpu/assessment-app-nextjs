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

/** ✅ ONE TRUTH: Normalize competency ids so labels + recs always match */
export function normalizeCompetencyId(id: string): string {
  const clean = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const map: Record<string, string> = {
    mental_toughness: "mental_toughness",
    opening_conversations: "opening_conversations",
    identifying_real_needs: "identifying_real_needs",
    destroying_objections: "handling_objections", // ✅ fix
    handling_objections: "handling_objections",
    creating_irresistible_offers: "creating_irresistible_offers",
    mastering_closing: "mastering_closing",
    follow_up_discipline: "follow_up_discipline",

    // ✅ overall block
    overall: "overall_score",
    overall_score: "overall_score",
    total: "overall_score",
    total_score: "overall_score",
  };

  return map[clean] || clean;
}

/** ✅ ONE TRUTH: Compute tier from % (never trust DB tier for Scan UI) */
export function tierFromPercentage(pct: number): Tier {
  const p = Number(pct) || 0;
  if (p >= 75) return "Strength";
  if (p >= 50) return "Opportunity";
  if (p >= 30) return "Threat";
  return "Weakness";
}

/** -----------------------------------------
 *  ACTIONABLE recommendations (7 days, clear)
 *  - 3 steps per tier
 *  - English + Arabic
 *  ----------------------------------------- */
export const RECOMMENDATIONS: Record<string, RecommendationTiers> = {
  // ✅ OVERALL SCORE (8th box)
  overall_score: {
    Strength: {
      en: [
        "For 7 days: repeat your top 2 strengths daily (15 minutes each) before your first call.",
        "Pick ONE metric to protect (e.g., follow-ups/day). Don’t let it drop for 7 days.",
        "Write a 1-page “winning routine” and follow it every morning (10 minutes).",
      ],
      ar: [
        "لمدة 7 أيام: كرّر أفضل نقطتي قوة لديك يوميًا (15 دقيقة لكل واحدة) قبل أول اتصال.",
        "اختر مؤشرًا واحدًا تحميه (مثل عدد المتابعات يوميًا) ولا تسمح بانخفاضه لمدة 7 أيام.",
        "اكتب صفحة واحدة “روتين الفوز” وطبّقها كل صباح (10 دقائق).",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: improve ONLY your weakest 2 competencies (20 minutes/day). Ignore the rest.",
        "Use a daily 3-step checklist: Open → Need → Next Step. Do it on every conversation today.",
        "Set a non-negotiable target: 10 outreach + 5 follow-ups daily for 7 days.",
      ],
      ar: [
        "لمدة 7 أيام: حسّن فقط أضعف كفاءتين لديك (20 دقيقة يوميًا). تجاهل الباقي.",
        "استخدم قائمة يومية من 3 خطوات: افتتاح → احتياج → خطوة تالية. طبّقها في كل محادثة اليوم.",
        "ضع هدفًا غير قابل للتفاوض: 10 تواصل + 5 متابعات يوميًا لمدة 7 أيام.",
      ],
    },
    Threat: {
      en: [
        "Today: block 60 minutes for pure activity (no admin). 20 outreach + 10 follow-ups.",
        "For 7 days: after every call, write ONE sentence: “Next step + date/time”.",
        "Remove the biggest leak: pick ONE common objection and master ONE response this week.",
      ],
      ar: [
        "اليوم: احجز 60 دقيقة نشاط فقط (بدون أعمال إدارية). 20 تواصل + 10 متابعات.",
        "لمدة 7 أيام: بعد كل مكالمة اكتب جملة واحدة: “الخطوة التالية + التاريخ/الوقت”.",
        "أغلق أكبر تسريب: اختر اعتراضًا شائعًا واحدًا وأتقن ردًا واحدًا عليه هذا الأسبوع.",
      ],
    },
    Weakness: {
      en: [
        "Today: run a reset day: 30 outreach + 15 follow-ups. No excuses. Momentum first.",
        "For 7 days: use a script card (opening + 3 questions + close). Read it every call.",
        "Get feedback fast: record 3 calls this week and review them with a peer for 20 minutes.",
      ],
      ar: [
        "اليوم: نفّذ يوم إعادة ضبط: 30 تواصل + 15 متابعة. بدون أعذار. الزخم أولًا.",
        "لمدة 7 أيام: استخدم بطاقة سكربت (افتتاح + 3 أسئلة + إغلاق). اقرأها في كل مكالمة.",
        "احصل على تغذية راجعة بسرعة: سجّل 3 مكالمات هذا الأسبوع وراجعها مع زميل لمدة 20 دقيقة.",
      ],
    },
  },

  mental_toughness: {
    Strength: {
      en: [
        "For 7 days: after any rejection, do a 60-second reset (inhale 4 / hold 2 / exhale 6) then make the next call immediately.",
        "Create a “rejection log”: 1 line per rejection + the next action. Do it for 7 days.",
        "Start every morning with a 10-minute pipeline review and choose the 3 toughest actions first.",
      ],
      ar: [
        "لمدة 7 أيام: بعد أي رفض، نفّذ إعادة ضبط 60 ثانية (شهيق 4 / حبس 2 / زفير 6) ثم اتصل مباشرة بالعميل التالي.",
        "أنشئ “سجل الرفض”: سطر واحد لكل رفض + الإجراء التالي. طبّقه 7 أيام.",
        "ابدأ كل صباح بمراجعة 10 دقائق للبايبلاين واختر أصعب 3 إجراءات أولًا.",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: set a “minimum activity floor” (e.g., 15 outreach/day) even on bad days.",
        "Use a 2-minute pre-call routine: stand up, shoulders back, read your opening script once.",
        "Midday check: ask “What would the confident version of me do next?” and do it immediately.",
      ],
      ar: [
        "لمدة 7 أيام: ضع حدًا أدنى للنشاط (مثل 15 تواصل يوميًا) حتى في الأيام الصعبة.",
        "روتين قبل الاتصال لمدة دقيقتين: قف، استقامة الكتفين، اقرأ سكربت الافتتاح مرة واحدة.",
        "فحص منتصف اليوم: اسأل “ماذا سيفعل النسخة الواثقة مني الآن؟” ثم نفّذ فورًا.",
      ],
    },
    Threat: {
      en: [
        "Today: identify your #1 energy drain (notifications/social). Turn it off for 3 hours.",
        "For 7 days: schedule 2 recovery blocks (10 minutes) — one before lunch, one at end of day.",
        "Reframe: replace “I need a win” with “I need reps”. Do 10 extra reps (calls) this week.",
      ],
      ar: [
        "اليوم: حدّد أكبر مستنزف للطاقة (إشعارات/سوشيال) وأغلقه 3 ساعات.",
        "لمدة 7 أيام: جدولة فترتي تعافي (10 دقائق) — قبل الغداء وفي نهاية اليوم.",
        "أعد الصياغة: استبدل “أحتاج صفقة” بـ “أحتاج تكرار”. نفّذ 10 تكرارات إضافية هذا الأسبوع.",
      ],
    },
    Weakness: {
      en: [
        "Today: do a “confidence rebuild” — 10 easy wins (follow-ups) before any cold outreach.",
        "For 7 days: end the day by writing 3 micro-wins (even small). Train your brain to notice progress.",
        "Use a buddy system: 10-minute check-in daily to report activity numbers (not feelings).",
      ],
      ar: [
        "اليوم: نفّذ “إعادة بناء الثقة” — 10 متابعات سهلة قبل أي تواصل بارد.",
        "لمدة 7 أيام: اختم اليوم بكتابة 3 انتصارات صغيرة. درّب دماغك على ملاحظة التقدم.",
        "نظام شريك: اتصال 10 دقائق يوميًا للإبلاغ عن أرقام النشاط (وليس المشاعر).",
      ],
    },
  },

  opening_conversations: {
    Strength: {
      en: [
        "For 7 days: write your best 3 openers and use each one at least 5 times.",
        "After every strong opening, ask: “What are you prioritizing this week?” to steer the conversation.",
        "Create a mini-playbook: opener + 2 follow-up questions. Use it daily.",
      ],
      ar: [
        "لمدة 7 أيام: اكتب أفضل 3 افتتاحيات لديك واستخدم كل واحدة 5 مرات على الأقل.",
        "بعد كل افتتاح قوي، اسأل: “ما أولوياتك هذا الأسبوع؟” لقيادة الحوار.",
        "أنشئ دليلًا مصغرًا: افتتاح + سؤالين متابعة. استخدمه يوميًا.",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: personalize the first line using ONE detail (industry/event/role).",
        "Use the permission opener: “Can I ask you a quick question?” then ask 1 strong question.",
        "Practice 10 reps/day: say your opener out loud to remove hesitation.",
      ],
      ar: [
        "لمدة 7 أيام: خصّص الجملة الأولى بتفصيل واحد (قطاع/حدث/منصب).",
        "استخدم افتتاح الإذن: “ممكن أسألك سؤالًا سريعًا؟” ثم اسأل سؤالًا قويًا واحدًا.",
        "تدريب 10 مرات يوميًا: قل الافتتاح بصوت عالٍ لإزالة التردد.",
      ],
    },
    Threat: {
      en: [
        "Today: tighten the first 10 seconds — name, purpose, question. No extra talk.",
        "For 7 days: open with a problem question: “What’s the biggest friction in X right now?”",
        "Record 5 openings this week and remove filler words in the next version.",
      ],
      ar: [
        "اليوم: شدّد أول 10 ثوانٍ — اسم، سبب، سؤال. بدون كلام زائد.",
        "لمدة 7 أيام: افتح بسؤال مشكلة: “ما أكبر احتكاك في X الآن؟”",
        "سجّل 5 افتتاحيات هذا الأسبوع واحذف الحشو في النسخة التالية.",
      ],
    },
    Weakness: {
      en: [
        "Today: use one safe opener all day: “Quick question — are you responsible for X?”",
        "For 7 days: do 20 low-stakes reps/day (messages or short calls) to build fluency.",
        "Keep it simple: opener + one question + stop talking. Let them answer.",
      ],
      ar: [
        "اليوم: استخدم افتتاحًا واحدًا ثابتًا طوال اليوم: “سؤال سريع — هل أنت المسؤول عن X؟”",
        "لمدة 7 أيام: نفّذ 20 تكرارًا يوميًا منخفض الضغط لبناء الطلاقة.",
        "بسّط: افتتاح + سؤال واحد + اصمت. دعهم يجيبون.",
      ],
    },
  },

  identifying_real_needs: {
    Strength: {
      en: [
        "For 7 days: use the 3-Whys method once per call (Why? Why now? What happens if not?).",
        "Summarize needs in one sentence and ask: “Did I get that right?” every time.",
        "Capture patterns: write the top 3 pains you hear this week and build questions around them.",
      ],
      ar: [
        "لمدة 7 أيام: استخدم تقنية الأسئلة الثلاثة مرة في كل مكالمة (لماذا؟ لماذا الآن؟ ماذا يحدث إن لم يحدث؟).",
        "لخّص الاحتياج بجملة واحدة واسأل: “هل فهمت بشكل صحيح؟” في كل مرة.",
        "التقاط الأنماط: اكتب أهم 3 آلام سمعتها هذا الأسبوع وابنِ أسئلة حولها.",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: after each feature, ask: “What matters most about that?”",
        "Use silence: after a key question, wait 3 seconds before speaking.",
        "Ask outcome-based: “What does success look like in 30 days?”",
      ],
      ar: [
        "لمدة 7 أيام: بعد كل ميزة اسأل: “ما الأكثر أهمية في ذلك؟”",
        "استخدم الصمت: بعد سؤال مهم، انتظر 3 ثوانٍ قبل الكلام.",
        "اسأل بالنتيجة: “كيف يبدو النجاح خلال 30 يومًا؟”",
      ],
    },
    Threat: {
      en: [
        "Today: stop pitching for one full call — ask only questions for 10 minutes.",
        "For 7 days: write down the exact customer words (verbatim) for pain and repeat them back.",
        "End discovery with: “If we solve X, what happens next?” to confirm priority.",
      ],
      ar: [
        "اليوم: توقف عن العرض في مكالمة واحدة كاملة — اسأل فقط لمدة 10 دقائق.",
        "لمدة 7 أيام: اكتب كلمات العميل حرفيًا للألم وأعدها عليهم.",
        "اختم الاستكشاف بـ: “إذا حللنا X، ماذا يحدث بعد ذلك؟” لتأكيد الأولوية.",
      ],
    },
    Weakness: {
      en: [
        "Use a fixed question ladder for 7 days: Problem → Impact → Current fix → Ideal outcome.",
        "After they answer, always ask: “Can you give me an example?” (forces clarity).",
        "Do 3 role-plays this week focused only on discovery (no pitching).",
      ],
      ar: [
        "استخدم سلم أسئلة ثابت 7 أيام: مشكلة → تأثير → حل حالي → نتيجة مثالية.",
        "بعد الإجابة اسأل دائمًا: “هل تعطي مثالًا؟” (يفرض الوضوح).",
        "نفّذ 3 تمارين محاكاة هذا الأسبوع تركز فقط على اكتشاف الاحتياج (بدون عرض).",
      ],
    },
  },

  handling_objections: {
    Strength: {
      en: [
        "For 7 days: preempt 1 common objection early (price/time/approval) before they say it.",
        "Build an objection bank: write 10 objections + your best 2-line response this week.",
        "Use proof: attach 1 case story after every objection response (30 seconds).",
      ],
      ar: [
        "لمدة 7 أيام: استبق اعتراضًا شائعًا واحدًا (السعر/الوقت/الموافقة) قبل أن يذكره العميل.",
        "بنك الاعتراضات: اكتب 10 اعتراضات + ردك الأفضل بسطرين هذا الأسبوع.",
        "استخدم الدليل: أضف قصة حالة واحدة بعد كل رد (30 ثانية).",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: use LAER every time: Listen → Acknowledge → Explore → Respond.",
        "Convert objections to questions: “What would need to be true for this to work?”",
        "Practice 10 minutes/day: pick one objection and rehearse your response out loud.",
      ],
      ar: [
        "لمدة 7 أيام: طبّق LAER دائمًا: استمع → اعترف → استكشف → رد.",
        "حوّل الاعتراض لسؤال: “ما الذي يجب أن يكون صحيحًا لكي ينجح هذا؟”",
        "تدريب 10 دقائق يوميًا: اختر اعتراضًا واحدًا ودرّب ردك بصوت عالٍ.",
      ],
    },
    Threat: {
      en: [
        "Today: stop defending. Ask: “Tell me more — what exactly worries you?”",
        "For 7 days: write down the 3 most common objections you get and prepare one clean response for each.",
        "After responding, ask a close question: “Does that address it enough to move forward?”",
      ],
      ar: [
        "اليوم: توقف عن الدفاع. اسأل: “قل لي أكثر — ما الذي يقلقك تحديدًا؟”",
        "لمدة 7 أيام: دوّن أكثر 3 اعتراضات شيوعًا وجهّز ردًا واضحًا لكل واحد.",
        "بعد الرد اسأل سؤال إغلاق: “هل هذا يكفي لنتقدم؟”",
      ],
    },
    Weakness: {
      en: [
        "Use the Feel–Felt–Found script for 7 days (memorize it and use it).",
        "Create a 1-page cheat sheet: top objections + your exact wording. Keep it open during calls.",
        "Do 5 role-plays this week focused only on objections (no pitching).",
      ],
      ar: [
        "استخدم سكربت شعرت–شعر–وجد لمدة 7 أيام (احفظه وطبّقه).",
        "أنشئ ورقة غش من صفحة واحدة: أهم الاعتراضات + صياغتك الدقيقة. افتحها أثناء المكالمات.",
        "نفّذ 5 محاكاة هذا الأسبوع للاعتراضات فقط (بدون عرض).",
      ],
    },
  },

  creating_irresistible_offers: {
    Strength: {
      en: [
        "For 7 days: present offers as outcomes: “In 30 days you’ll have X.” (not features).",
        "Add one bonus that removes friction (setup/training/support) to every offer this week.",
        "Close with a clear next step: “Shall we start with option A or B?”",
      ],
      ar: [
        "لمدة 7 أيام: قدّم العرض كناتج: “خلال 30 يوم ستحصل على X” (ليس ميزات).",
        "أضف بونصًا واحدًا يزيل الاحتكاك (تركيب/تدريب/دعم) لكل عرض هذا الأسبوع.",
        "اختم بخطوة واضحة: “نبدأ بالخيار A أم B؟”",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: write a one-liner offer: Problem → Outcome → Timeframe.",
        "Use proof: one short story (20 seconds) after you state the offer.",
        "Add urgency ethically: a deadline tied to capacity (not fake scarcity).",
      ],
      ar: [
        "لمدة 7 أيام: اكتب عرضًا بجملة واحدة: مشكلة → نتيجة → إطار زمني.",
        "استخدم دليلًا: قصة قصيرة (20 ثانية) بعد ذكر العرض.",
        "أضف إلحاحًا أخلاقيًا: موعد مرتبط بالسعة (بدون ندرة وهمية).",
      ],
    },
    Threat: {
      en: [
        "Today: stop listing features. Ask: “Which outcome matters most: speed, cost, or reliability?”",
        "For 7 days: bundle into 2 tiers (good/best) and guide them to a choice.",
        "Test 2 headlines this week and keep the one that gets more “yes, tell me more.”",
      ],
      ar: [
        "اليوم: توقف عن سرد الميزات. اسأل: “أي نتيجة أهم: السرعة أم التكلفة أم الاعتمادية؟”",
        "لمدة 7 أيام: اجمع العرض في مستويين (جيد/أفضل) ووجّه العميل للاختيار.",
        "اختبر عنوانين هذا الأسبوع واحتفظ بما يجلب “نعم… قل لي أكثر.”",
      ],
    },
    Weakness: {
      en: [
        "Use this template for 7 days: “You get X (outcome) in Y time, without Z (main fear).”",
        "Before you offer, confirm: “So the priority is X — correct?” (prevents mismatch).",
        "Build a before/after sentence and read it every time you present the offer.",
      ],
      ar: [
        "استخدم هذا القالب 7 أيام: “ستحصل على X (نتيجة) خلال Y، بدون Z (أكبر خوف).”",
        "قبل العرض أكد: “إذن الأولوية هي X — صحيح؟” (يمنع عدم التطابق).",
        "اكتب جملة قبل/بعد واقرأها كل مرة تعرض فيها العرض.",
      ],
    },
  },

  mastering_closing: {
    Strength: {
      en: [
        "For 7 days: end every call with a scheduled next step (date/time). No exceptions.",
        "Use the assumptive close: “When we start next week…” then confirm details.",
        "Track close signals: if they ask price/timeline, ask for commitment within 2 minutes.",
      ],
      ar: [
        "لمدة 7 أيام: اختم كل مكالمة بخطوة تالية مجدولة (تاريخ/وقت). بدون استثناء.",
        "استخدم الإغلاق الافتراضي: “عندما نبدأ الأسبوع القادم…” ثم أكد التفاصيل.",
        "راقب إشارات الإغلاق: إذا سألوا السعر/الوقت اطلب الالتزام خلال دقيقتين.",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: use the scale close: “On a 1–10, how ready are we?” then fix the gap.",
        "Use alternative choice: “Option A or B?” (forces a decision path).",
        "Practice one closing sentence daily until it feels automatic.",
      ],
      ar: [
        "لمدة 7 أيام: استخدم إغلاق المقياس: “من 1 إلى 10، ما مدى الجاهزية؟” ثم عالج الفجوة.",
        "استخدم خيارين: “الخيار A أم B؟” (يفرض مسار قرار).",
        "درّب جملة إغلاق واحدة يوميًا حتى تصبح تلقائية.",
      ],
    },
    Threat: {
      en: [
        "Today: ask for the close once — even if it feels early. Build the muscle.",
        "For 7 days: after you ask, stay silent for 3 seconds. Let them respond.",
        "Write your top 3 objections-to-close and prepare a 2-line answer for each.",
      ],
      ar: [
        "اليوم: اطلب الإغلاق مرة واحدة — حتى لو بدا مبكرًا. ابنِ العضلة.",
        "لمدة 7 أيام: بعد السؤال التزم الصمت 3 ثوانٍ. دعهم يجيبون.",
        "اكتب أهم 3 اعتراضات تمنع الإغلاق وجهّز ردًا بسطرين لكل واحد.",
      ],
    },
    Weakness: {
      en: [
        "For 7 days: insert 3 micro-closes in every call (“Does this make sense?” / “Are we aligned?”).",
        "Use a closing script card and read it word-for-word until confidence returns.",
        "Do 10 timed closing reps/day (1 minute each). Speed builds clarity.",
      ],
      ar: [
        "لمدة 7 أيام: أضف 3 إغلاقات صغيرة في كل مكالمة (“هل هذا منطقي؟” / “هل نحن متفقون؟”).",
        "استخدم بطاقة سكربت للإغلاق واقرأها حرفيًا حتى تعود الثقة.",
        "نفّذ 10 تكرارات إغلاق يوميًا بوقت محدد (دقيقة لكل مرة). السرعة تبني الوضوح.",
      ],
    },
  },

  follow_up_discipline: {
    Strength: {
      en: [
        "For 7 days: follow up same-day after any meeting (within 2 hours).",
        "Use a 5-touch sequence (Day 0, 2, 5, 9, 14). Set reminders now.",
        "Every follow-up must add value: a tip, a note, or a quick win — not “just checking in.”",
      ],
      ar: [
        "لمدة 7 أيام: تابع في نفس اليوم بعد أي اجتماع (خلال ساعتين).",
        "استخدم تسلسل 5 لمسات (اليوم 0، 2، 5، 9، 14). ضع التذكيرات الآن.",
        "كل متابعة يجب أن تضيف قيمة: نصيحة أو ملاحظة أو مكسب سريع — وليس “أتحقق فقط”.",
      ],
    },
    Opportunity: {
      en: [
        "For 7 days: block 30 minutes daily for follow-up. Treat it like a meeting.",
        "Use one template per stage (new lead / post-meeting / proposal).",
        "End each follow-up with a single clear question that requires a reply.",
      ],
      ar: [
        "لمدة 7 أيام: خصّص 30 دقيقة يوميًا للمتابعة. تعامل معها كاجتماع.",
        "استخدم قالبًا واحدًا لكل مرحلة (عميل جديد / بعد اجتماع / بعد عرض).",
        "اختم كل متابعة بسؤال واحد واضح يحتاج ردًا.",
      ],
    },
    Threat: {
      en: [
        "Today: clean your open loops — list all warm leads and schedule the next touch for each.",
        "For 7 days: batch follow-ups by channel (email block + WhatsApp block).",
        "Track reply timing: if no reply in 48h, send a shorter message with one choice question.",
      ],
      ar: [
        "اليوم: نظّف الصفقات المفتوحة — اكتب كل العملاء الدافئين وحدد متابعة قادمة لكل واحد.",
        "لمدة 7 أيام: اجمع المتابعات حسب القناة (بلوك إيميل + بلوك واتساب).",
        "تتبع وقت الرد: إذا لا يوجد رد خلال 48 ساعة، أرسل رسالة أقصر بسؤال خيار واحد.",
      ],
    },
    Weakness: {
      en: [
        "For 7 days: set a hard rule: every interaction ends with a scheduled next follow-up.",
        "Use “5 before 9”: send 5 follow-ups before 9 AM daily (builds momentum).",
        "Create a simple CRM habit: log → next date → reminder. Do it immediately after each call.",
      ],
      ar: [
        "لمدة 7 أيام: قاعدة صارمة: كل تواصل ينتهي بمتابعة مجدولة.",
        "قاعدة “5 قبل 9”: أرسل 5 متابعات قبل 9 صباحًا يوميًا (يبني الزخم).",
        "عادة CRM بسيطة: سجل → تاريخ قادم → تذكير. نفّذها فورًا بعد كل مكالمة.",
      ],
    },
  },
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
