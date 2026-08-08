import "server-only";

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { normalizeCompetencyId, tierFromPercentage, type Tier } from "@/lib/pdf-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Language = "ar" | "en";

type PageProps = {
  searchParams?: { attemptId?: string; lang?: string };
};

type SignalRow = {
  competencyId: string;
  label: string;
  percentage: number;
  tier: Tier;
};

const LABELS: Record<string, { ar: string; en: string }> = {
  prospecting_finding_new_clients: { ar: "استقطاب العملاء المحتملين", en: "Prospecting & Finding New Clients" },
  mental_toughness: { ar: "الصلابة الذهنية", en: "Mental Toughness" },
  opening_conversations: { ar: "فتح المحادثات", en: "Opening Conversations" },
  identifying_real_needs: { ar: "تحديد الاحتياجات الحقيقية", en: "Identifying Real Needs" },
  handling_objections: { ar: "التعامل مع الاعتراضات", en: "Handling Objections" },
  destroying_objections: { ar: "التعامل مع الاعتراضات", en: "Handling Objections" },
  creating_irresistible_offers: { ar: "بناء عرض قيمة مقنع", en: "Creating Compelling Offers" },
  mastering_closing: { ar: "إدارة الإغلاق والخطوة التالية", en: "Closing & Next-Step Control" },
  follow_up_discipline: { ar: "انضباط المتابعة", en: "Follow-Up Discipline" },
};

const DIMENSION_MEANINGS: Record<string, { ar: string; en: string }> = {
  mental_toughness: {
    ar: "قد تشير النتيجة إلى نمط أولي في الاستجابة للضغط والرفض وعدم اليقين. ولا تحدد ما إذا كانت الإشارة ناتجة عن الفرد أو ظروف العمل أو الإدارة أو طبيعة المنطقة.",
    en: "The result may indicate a preliminary pattern in responses to pressure, rejection, and uncertainty. It does not establish whether the signal originates with the individual, management, working conditions, or territory.",
  },
  opening_conversations: {
    ar: "قد تشير النتيجة إلى تفاوت في بدء التواصل وخلق فرصة لاستمرار الحوار. ولا تحسم ما إذا كان السبب هو الثقة أو وضوح الرسالة أو الاستهداف أو ظروف السوق.",
    en: "The result may indicate variation in initiating contact and creating an opportunity for dialogue. It does not establish whether the cause is confidence, message clarity, targeting, or market conditions.",
  },
  identifying_real_needs: {
    ar: "قد تشير النتيجة إلى نمط في استكشاف احتياجات العميل وفهم ما يؤثر في قراره. ولا تثبت ما إذا كان مصدره الفرد أو العملية أو ضغط الوقت أو جودة الفرص.",
    en: "The result may indicate a pattern in exploring customer needs and decision factors. It does not establish whether its source is the individual, process, time pressure, or opportunity quality.",
  },
  handling_objections: {
    ar: "قد تشير النتيجة إلى تفاوت في الاستجابة لتردد العميل وأسئلته. ولا تحدد ما إذا كان السبب هو السلوك أو وضوح القيمة أو التسعير أو العرض أو توقعات السوق.",
    en: "The result may indicate variation in responses to customer hesitation and questions. It does not determine whether the cause is behaviour, value clarity, pricing, the offer, or market expectations.",
  },
  destroying_objections: {
    ar: "قد تشير النتيجة إلى تفاوت في الاستجابة لتردد العميل وأسئلته. ولا تحدد ما إذا كان السبب هو السلوك أو وضوح القيمة أو التسعير أو العرض أو توقعات السوق.",
    en: "The result may indicate variation in responses to customer hesitation and questions. It does not determine whether the cause is behaviour, value clarity, pricing, the offer, or market expectations.",
  },
  creating_irresistible_offers: {
    ar: "قد تشير النتيجة إلى نمط في ربط العرض باحتياجات العميل والقيمة المتوقعة. ولا تثبت ما إذا كان مصدره الفرد أو المنتج أو التسعير أو الصلاحيات أو الشروط التجارية.",
    en: "The result may indicate a pattern in connecting the offer to customer needs and expected value. It does not establish whether its source is the individual, product, pricing, authority, or commercial terms.",
  },
  mastering_closing: {
    ar: "قد تشير النتيجة إلى تفاوت في الانتقال من الحوار إلى قرار أو خطوة تالية واضحة. ولا تحسم ما إذا كان السبب سلوكيًا أو مرتبطًا بجودة الفرصة أو الموافقات أو دورة القرار.",
    en: "The result may indicate variation in moving from dialogue to a decision or clear next step. It does not establish whether the cause is behavioural, opportunity-related, approval-related, or part of the decision cycle.",
  },
  follow_up_discipline: {
    ar: "قد تشير النتيجة إلى نمط في استمرارية التواصل وإدارة الخطوات التالية. ولا توضح ما إذا كان مصدره الفرد أو عبء العمل أو العملية أو الأدوات أو الأولويات الإدارية.",
    en: "The result may indicate a pattern in maintaining contact and managing next steps. It does not establish whether its source is the individual, workload, process, tools, or management priorities.",
  },
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function pct(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function first(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractIdentity(attempt: any) {
  const blocks = [
    attempt,
    attempt?.participant,
    attempt?.candidate,
    attempt?.user,
    attempt?.profile,
    attempt?.registration,
    attempt?.contact,
    attempt?.meta,
    attempt?.metadata,
    attempt?.data,
    attempt?.payload,
    attempt?.details,
    attempt?.info,
    attempt?.user_info,
    attempt?.userInfo,
  ].filter(Boolean);

  const names = blocks.map((b) => first(b?.full_name, b?.fullname, b?.fullName, b?.name, b?.participant_name, b?.candidate_name, b?.display_name, b?.displayName, b?.first_name && b?.last_name ? `${b.first_name} ${b.last_name}` : ""));
  const emails = blocks.map((b) => first(b?.user_email, b?.email, b?.participant_email, b?.candidate_email, b?.work_email, b?.workEmail));
  const companies = blocks.map((b) => first(b?.company, b?.company_name, b?.companyName, b?.organization, b?.organization_name, b?.org, b?.employer));
  const email = first(...emails) || "—";
  let fullName = first(...names);
  if (!fullName && email.includes("@")) fullName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, " ").trim();
  return { fullName: fullName || "—", email, company: first(...companies) || "—" };
}

function signalLabel(tier: Tier, lang: Language) {
  const labels = {
    ar: { Strength: "إشارات تحذير محدودة", Opportunity: "إشارات تحذير ناشئة", Threat: "إشارات تحذير جوهرية", Weakness: "إشارات تحذير مرتفعة" },
    en: { Strength: "Limited Warning Signals", Opportunity: "Emerging Warning Signals", Threat: "Material Warning Signals", Weakness: "Elevated Warning Signals" },
  } as const;
  return labels[lang][tier];
}

type PracticalGuide = { why: string; observe: string; action: string };

const PRACTICAL_GUIDES: Record<string, PracticalGuide> = {
  prospecting_finding_new_clients: {
    why: "ضعف تدفق الفرص الجديدة قد يضغط بقية مسار البيع حتى عندما تكون المحادثات جيدة.",
    observe: "عدد الفرص الجديدة التي أُنشئت خلال خمسة أيام عمل.",
    action: "سجّل محاولات الاستقطاب والفرص الجديدة يومياً لمدة أسبوع.",
  },
  mental_toughness: {
    why: "تراجع الاتساق بعد الرفض أو الضغط قد يؤثر في استمرار النشاط البيعي.",
    observe: "ما يحدث للنشاط والمتابعة بعد رفض عميل أو تعثر فرصة.",
    action: "راجع آخر خمس فرص متعثرة وما الإجراء الذي تلا كل واحدة.",
  },
  opening_conversations: {
    why: "جودة البداية تؤثر في انتقال التواصل الأولي إلى محادثة بيعية حقيقية.",
    observe: "نسبة الاتصالات التي انتقلت إلى حوار واضح أو موعد تالٍ.",
    action: "راجع عشر بدايات حديثة وسجّل أيها أنتج خطوة تالية.",
  },
  identifying_real_needs: {
    why: "ضعف فهم الاحتياج قد يجعل العرض أقل ارتباطاً بما يهم العميل فعلاً.",
    observe: "هل توثّق كل فرصة احتياج العميل ومعيار قراره بوضوح؟",
    action: "راجع آخر عشر فرص وحدد ما إذا كان الاحتياج ومعيار القرار موثقين.",
  },
  handling_objections: {
    why: "الاعتراض غير المفهوم قد يوقف فرصة كان يمكن توضيحها أو تأهيلها أفضل.",
    observe: "أكثر الاعتراضات تكراراً وما إذا انتهت بخطوة محددة.",
    action: "صنّف اعتراضات آخر عشر فرص وحدد أين توقفت المحادثة.",
  },
  destroying_objections: {
    why: "الاعتراض غير المفهوم قد يوقف فرصة كان يمكن توضيحها أو تأهيلها أفضل.",
    observe: "أكثر الاعتراضات تكراراً وما إذا انتهت بخطوة محددة.",
    action: "صنّف اعتراضات آخر عشر فرص وحدد أين توقفت المحادثة.",
  },
  creating_irresistible_offers: {
    why: "العرض غير المرتبط باحتياج واضح قد يضعف إدراك العميل للقيمة.",
    observe: "هل يربط العرض بين احتياج العميل والنتيجة والقيمة المتوقعة؟",
    action: "راجع خمسة عروض حديثة وحدد مدى وضوح الارتباط بالاحتياج والقيمة.",
  },
  mastering_closing: {
    why: "غياب الخطوة التالية الواضحة قد يترك فرصاً جيدة معلقة دون تقدم.",
    observe: "عدد المحادثات التي انتهت بقرار أو موعد أو التزام محدد.",
    action: "افحص آخر عشر فرص وتحقق من وجود خطوة تالية بتاريخ ومسؤول واضحين.",
  },
  follow_up_discipline: {
    why: "عدم اكتمال المتابعة قد يفقد فرصاً بعد بداية بيعية جيدة.",
    observe: "نسبة المتابعات المنفذة في موعدها خلال أسبوع.",
    action: "تتبّع اكتمال جميع المتابعات المستحقة لخمسة أيام عمل.",
  },
};

function guideFor(row: SignalRow | null): PracticalGuide {
  return (row && PRACTICAL_GUIDES[row.competencyId]) || {
    why: "قد يؤثر هذا المؤشر في اتساق مسار البيع إذا تكرر في العمل الفعلي.",
    observe: "راقب السلوك المرتبط بهذا المؤشر في الفرص الحالية.",
    action: "راجع عشر فرص حديثة وسجّل ما يحدث في هذه المرحلة.",
  };
}

function shortArabicInterpretation(row: SignalRow) {
  if (row.tier === "Strength") return "يظهر المؤشر اتساقاً جيداً نسبياً يمكن البناء عليه، مع ضرورة التحقق منه في الميدان.";
  if (row.tier === "Opportunity") return "يظهر أساساً مقبولاً مع تفاوت يستحق المراقبة قبل اعتباره نقطة قوة ثابتة.";
  if (row.tier === "Threat") return "يشير إلى فجوة ملحوظة قد تؤثر في هذه المرحلة من مسار البيع إذا تكررت.";
  return "يشير إلى أولوية واضحة للملاحظة والتحقق، من دون أن يحدد سببها بمفرده.";
}

function ArabicProfilePattern({ rows }: { rows: SignalRow[] }) {
  const ranked = [...rows].sort((a, b) => b.percentage - a.percentage);
  const high = ranked.slice(0, 2);
  const low = [...ranked].reverse().slice(0, 2);
  const gap = (high[0]?.percentage || 0) - (low[0]?.percentage || 0);
  if (!high[0] || !low[0]) return <>لا توجد بيانات كافية لتكوين قراءة مقارنة.</>;
  if (gap <= 10) return <>النتائج متقاربة نسبياً عبر الأبعاد السبعة؛ الأولوية هي التحقق من اتساق الأداء في الميدان، لا عزل كفاءة واحدة.</>;
  return <>يبدو الأداء أقوى نسبياً في <strong>{high.map((r) => r.label).join(" و")}</strong>، وأقل اتساقاً في <strong>{low.map((r) => r.label).join(" و")}</strong>. الفارق البالغ {gap} نقطة يشير إلى أن مراحل مسار البيع لا تعمل بالمستوى نفسه.</>;
}

function safeVisible(value: string, lang: Language) {
  const fallback = lang === "ar" ? "غير متوفر" : "Not available";
  const text = String(value || "").trim();
  if (!text || text === "—" || /(developer|devtest|internal\.test|placeholder|dummy|token)/i.test(text)) return fallback;
  return text;
}

function formattedDate(value: unknown, lang: Language) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return lang === "ar" ? "غير متوفر" : "Not available";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function severityCopy(tier: Tier, lang: Language) {
  const copy = {
    ar: {
      Strength: "تكشف الإجابات الحالية إشارات تحذير محدودة نسبيًا، لكنها لا تثبت ثبات السلوك في جميع المواقف البيعية الفعلية.",
      Opportunity: "تكشف الإجابات أساسًا سلوكيًا إيجابيًا إلى جانب إشارات ناشئة قد تعكس تفاوتًا أو عدم ثبات. سبب هذا التفاوت غير محسوم.",
      Threat: "تكشف الإجابات نمطًا جوهريًا من الإشارات التي تستحق اهتمامًا أعمق، من دون أن تحدد مصدر النمط أو سببه.",
      Weakness: "تكشف الإجابات إشارات مرتفعة تستحق اهتمامًا جادًا، لكنها لا تمثل حكمًا نهائيًا على قدرة المشارك أو أدائه المستقبلي.",
    },
    en: {
      Strength: "The current responses reveal relatively limited warning signals, but they do not prove consistent behaviour across all field situations.",
      Opportunity: "The responses reveal a positive foundation alongside emerging signals of variation or inconsistency. The cause remains undetermined.",
      Threat: "The responses reveal a material signal pattern warranting closer attention without identifying its source or cause.",
      Weakness: "The responses reveal elevated signals deserving serious attention, but they are not a final judgment of capability or future performance.",
    },
  } as const;
  return copy[lang][tier];
}

function tierBorder(tier: Tier) {
  if (tier === "Strength") return "border-emerald-200 bg-emerald-50";
  if (tier === "Opportunity") return "border-blue-200 bg-blue-50";
  if (tier === "Threat") return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

function tierBadge(tier: Tier) {
  if (tier === "Strength") return "bg-emerald-600 text-white";
  if (tier === "Opportunity") return "bg-blue-600 text-white";
  if (tier === "Threat") return "bg-amber-500 text-white";
  return "bg-rose-600 text-white";
}

function PageShell({ number, eyebrow, title, subtitle, children, dark = false }: { number: number; eyebrow: string; title: string; subtitle: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={`report-page avoid-break rounded-3xl border shadow-xl p-6 sm:p-8 ${dark ? "border-slate-800 bg-gradient-to-br from-slate-950 to-blue-950 text-white shadow-2xl" : "border-slate-200 bg-white text-slate-950"}`}>
      <div className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className={`text-xs font-black uppercase tracking-widest ${dark ? "text-blue-200" : "text-slate-500"}`}>{eyebrow}</div>
          <div className={`text-xs font-black ${dark ? "text-blue-200" : "text-slate-400"}`}>{String(number).padStart(2, "0")}</div>
        </div>
        <h2 className={`mt-3 text-2xl font-black tracking-tight sm:text-3xl rtl-text ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
        <p className={`mt-2 text-sm leading-relaxed sm:text-base rtl-text ${dark ? "text-blue-100" : "text-slate-600"}`}>{subtitle}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function InfoCard({ title, children, dark = false }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <article className={`rounded-3xl border p-5 sm:p-6 ${dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50"}`}>
      <h3 className={`text-lg font-black rtl-text ${dark ? "text-white" : "text-slate-950"}`}>{title}</h3>
      <div className={`mt-3 text-sm sm:text-base leading-7 rtl-text ${dark ? "text-blue-100" : "text-slate-600"}`}>{children}</div>
    </article>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-7 rtl-text">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Progress({ value }: { value: number }) {
  return <div className="h-3 overflow-hidden rounded-full border border-slate-200 bg-white/80"><div className="h-full rounded-full bg-slate-900" style={{ width: `${value}%` }} /></div>;
}

function IdentityChip({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"><div className="text-[10px] font-black uppercase tracking-widest text-blue-100">{label}</div><div className={`mt-1 break-words text-sm font-bold text-white ${ltr ? "force-ltr" : "rtl-text"}`}>{value || "—"}</div></div>;
}

export default async function OutdoorSalesScanReportPreview({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const attemptId = String(searchParams?.attemptId || "").trim();
  if (!attemptId) {
    return <div className="mx-auto max-w-xl p-10 text-center text-slate-800">Missing attemptId</div>;
  }

  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase.from("quiz_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (error || !attempt) return <div className="mx-auto max-w-xl p-10 text-center text-slate-800">Preview attempt not found.</div>;
  if (String((attempt as any).assessment_id || "").toLowerCase() !== "outdoor_sales_scan") notFound();

  const lang: Language = String(searchParams?.lang || (attempt as any).language || "ar").toLowerCase() === "en" ? "en" : "ar";
  return <ApprovedOutdoorSalesScanReport attemptId={attemptId} attempt={attempt} lang={lang} previewMode />;
}

export function ApprovedOutdoorSalesScanReport({ attemptId, attempt, lang, previewMode = false }: { attemptId: string; attempt: any; lang: Language; previewMode?: boolean }) {
  const ar = lang === "ar";
  const identity = extractIdentity(attempt);
  const overall = pct((attempt as any).total_percentage);
  const overallTier = tierFromPercentage(overall);
  const rawRows = Array.isArray((attempt as any).competency_results) ? (attempt as any).competency_results : [];
  const rows: SignalRow[] = rawRows.map((raw: any) => {
    const competencyId = normalizeCompetencyId(String(raw?.competencyId || raw?.key || ""));
    const percentage = pct(raw?.percentage);
    const labels = LABELS[competencyId];
    return { competencyId, percentage, tier: tierFromPercentage(percentage), label: labels?.[lang] || competencyId.replace(/_/g, " ") };
  });
  const sorted = [...rows].sort((a, b) => b.percentage - a.percentage);
  const strongest = sorted[0] || null;
  const weakest = [...rows].sort((a, b) => a.percentage - b.percentage)[0] || null;
  const priorityRows = [...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
  const topTwoPriorities = priorityRows.slice(0, 2);
  const grouped = {
    Strength: rows.filter((row) => row.tier === "Strength"),
    Opportunity: rows.filter((row) => row.tier === "Opportunity"),
    Threat: rows.filter((row) => row.tier === "Threat"),
    Weakness: rows.filter((row) => row.tier === "Weakness"),
  };
  const visibleName = safeVisible(identity.fullName, lang);
  const visibleCompany = safeVisible(identity.company, lang);
  const visibleEmail = safeVisible(identity.email, lang);
  const visibleDate = formattedDate((attempt as any).completed_at || (attempt as any).created_at, lang);

  const x = {
    ar: {
      preview: "معاينة آمنة — بيانات فعلية للعرض فقط",
      philosophy: "شخّص أولًا. قرر ثانيًا. درّب ثالثًا.",
      participant: "المشارك", company: "الشركة", email: "البريد الإلكتروني", reportId: "معرّف التقرير",
    },
    en: {
      preview: "Safe preview — live attempt data, review only",
      philosophy: "Diagnose First. Decide Second. Train Third.",
      participant: "Participant", company: "Company", email: "Email", reportId: "Report ID",
    },
  }[lang];

  return (
    <div dir={ar ? "rtl" : "ltr"} data-rtl={ar ? "true" : "false"} className="scan-report-container min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        [data-rtl="true"] .rtl-text { text-align: right; }
        [data-rtl="false"] .rtl-text { text-align: left; }
        @media print { .preview-banner { display:none!important; } .report-page { break-after: page; box-shadow:none!important; min-height: 100vh; } }
      ` }} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8">
        <div className="preview-banner print-hide flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-md backdrop-blur-sm">
          <div className="text-xs font-bold text-slate-600 sm:text-sm rtl-text">{x.reportId}: <span className="force-ltr font-mono text-blue-700">{attemptId.slice(0, 8)}</span></div>
          {previewMode && <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">{x.preview}</div>}
        </div>
        <section className="report-page avoid-break relative overflow-hidden rounded-3xl border border-slate-800/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />
          <div className="absolute inset-0 opacity-30"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-400 blur-3xl" /><div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-400 blur-3xl" /></div>
          <div className="relative p-7 sm:p-10 md:p-14">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.3fr_.7fr] lg:gap-12">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-100 sm:text-sm">🧪 {ar ? "فحص تنفيذي للإنذار المبكر" : "Executive Early-Warning Screening"}</div>
                <div><h1 className="text-3xl font-black leading-tight text-white sm:text-5xl md:text-6xl rtl-text">{ar ? "التشخيص المبدئي (Scan) لأداء المبيعات الميدانية" : "Outdoor Sales Scan"}</h1><h2 className="mt-3 text-xl font-black text-blue-100 sm:text-2xl rtl-text">{ar ? "قراءة أولية لأداء المبيعات ومجالات التحسين ذات الأولوية" : "Behavioural Warning-Signal Report"}</h2><p className="mt-4 max-w-3xl text-base leading-relaxed text-blue-100 sm:text-xl rtl-text">{ar ? "يكشف أين تظهر المؤشرات الأهم في أداء المبيعات الميدانية، وما الأولويات والخطوات العملية التي تستحق أن تبدأ بها." : "The Executive Career Blood Test is a preliminary behavioural screening across seven core areas. It shows where closer attention may be justified; it does not diagnose cause."}</p></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{ar ? <><IdentityChip label="المشارك" value={visibleName} /><IdentityChip label="الشركة" value={visibleCompany} /><IdentityChip label="تاريخ التقرير" value={visibleDate} /></> : <><IdentityChip label="Name" value={visibleName} /><IdentityChip label="Company" value={visibleCompany} /><IdentityChip label="Email" value={visibleEmail} ltr /></>}</div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-7 text-blue-100 rtl-text">{ar ? <><p className="font-black text-white">كيف تستخدم هذا التقرير؟</p><p className="mt-2">لا تبحث فقط عن أقل نتيجة. اقرأ النمط، وابدأ بالأولويات المحددة، وتذكّر أن التشخيص يوضح أين تبدأ ولا يثبت جميع الأسباب.</p><p className="mt-3 font-black text-amber-200">شخّص أولاً. قرر ثانياً. درّب ثالثاً.</p></> : "This Scan is not a complete diagnosis and should not be used alone for consequential management decisions."}</div>
              </div>
              <div className="relative flex justify-center"><div className="relative flex h-64 w-64 items-center justify-center rounded-full border-[12px] border-white/10 bg-white/10 shadow-2xl backdrop-blur-md sm:h-72 sm:w-72"><div className="absolute inset-6 rounded-full border border-white/10" /><div className="text-center"><div className="text-6xl font-black text-white sm:text-7xl">{overall}%</div><div className="mt-2 text-xs font-black uppercase tracking-widest text-blue-100">{ar ? "مؤشر الصحة البيعية العام" : "Overall Sales Health Score"}</div><span className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${tierBadge(overallTier)}`}>{signalLabel(overallTier, lang)}</span></div></div></div>
            </div>
          </div>
        </section>

        <PageShell number={2} eyebrow={ar ? "النتيجة العامة" : "OVERALL RESULT"} title={ar ? "النتيجة العامة" : "Overall Early-Warning Index"} subtitle={ar ? "قراءة أولية لما تكشفه النتائج عن نمط الأداء الحالي" : "An executive interpretation of what the overall score suggests—and what it cannot establish."}>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[28px] bg-slate-950 p-7 text-white shadow-xl">
              <div className="text-xs font-black tracking-widest text-amber-200">{ar ? "منطقة الإشارات الأولية" : "PRELIMINARY SIGNAL ZONE"}</div>
              <div className="mt-5 text-7xl font-black">{overall}%</div>
              <div className="mt-4 inline-flex rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">{signalLabel(overallTier, lang)}</div>
              <div className="mt-7"><Progress value={overall} /></div>
            </div>
            <InfoCard title={ar ? "ماذا تكشف النتيجة؟" : "What does this score suggest?"}>
              {ar ? <><p>تعكس النتيجة اتساق السلوكيات عبر سبعة أبعاد، لكن قيمتها تظهر عند مقارنة الأبعاد لا قراءة الرقم وحده.</p><p className="mt-3"><ArabicProfilePattern rows={rows} /></p><p className="mt-3"><strong className="text-slate-950">أولوية الاهتمام:</strong> {topTwoPriorities.map((row) => row.label).join("، ") || "لا توجد بيانات كافية"}.</p><p className="mt-3">لا تفترض أن أقل نتيجة هي المشكلة الوحيدة أو أن التدريب فيها هو الحل تلقائياً. اسأل: لماذا لا تنتقل قوة {strongest?.label || "المراحل الأقوى"} إلى اتساق أفضل في {weakest?.label || "المراحل الأضعف"}؟</p></> : <><p>{severityCopy(overallTier, lang)}</p><p className="mt-4">The Scan does not determine whether the pattern originates with the individual, management, team, process, territory, or working environment. The result is an early-warning indicator—not a diagnosis of cause or final verdict on performance.</p></>}
            </InfoCard>
          </div>
        </PageShell>

        <PageShell number={3} eyebrow={ar ? "مواضع الإشارات" : "SIGNAL LOCATION"} title={ar ? "خريطة المؤشرات السلوكية" : "Behavioural Signal Map"} subtitle={ar ? "ليست كل النتائج المتوسطة أو المنخفضة متساوية في أهميتها — الأهم هو النمط الذي تصنعه معاً." : "A comparative view of where signals appear across seven behavioural dimensions. The map shows where signals appear; it does not explain why."}>
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((row, index) => (
              <article key={`${row.competencyId}-${index}`} className={`rounded-3xl border-2 p-5 ${tierBorder(row.tier)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div><div className="text-xs font-black uppercase tracking-widest text-slate-500">{ar ? `الإشارة السلوكية ${index + 1}` : `Behavioural Signal ${index + 1}`}</div><h3 className="mt-2 text-xl font-black rtl-text">{row.label}</h3></div>
                  <div className="text-3xl font-black">{row.percentage}%</div>
                </div>
                <div className="mt-4"><Progress value={row.percentage} /></div>
                <div className="mt-4 text-sm font-black">{signalLabel(row.tier, lang)}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600 rtl-text">{ar ? shortArabicInterpretation(row) : DIMENSION_MEANINGS[row.competencyId]?.en || severityCopy(row.tier, lang)}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-3xl bg-slate-950 p-6 text-white">
            <div className="text-sm font-black text-amber-200">{ar ? "ماذا تكشف الخريطة ولا تكشفه الدرجة العامة؟" : "Executive Insight"}</div>
            <p className="mt-3 leading-8 text-blue-100 rtl-text">{ar ? <ArabicProfilePattern rows={rows} /> : "A lower score does not prove that the salesperson is the problem, and a higher score does not prove consistent field performance. Signals may be influenced by management, team, territory, process, culture, or systems."}</p>
            {ar && <><h3 className="mt-4 font-black text-white">لا تتسرع في الاستنتاج</h3><p className="mt-2 leading-8 text-blue-100 rtl-text">كون {weakest?.label || "أحد المؤشرات"} الأقل لا يثبت أن التدريب عليها هو الحل؛ فقد تتأثر بمراحل أخرى. الخريطة تساعدك على رؤية العلاقة وتحديد أين يستحق الأمر مزيداً من الاهتمام.</p></>}
          </div>
        </PageShell>

        <PageShell number={4} eyebrow={ar ? "قيمة عملية" : "COMMERCIAL RELEVANCE"} title={ar ? "3 مخاطر عملية قد تكون تؤثر على نتائج المبيعات" : "Commercial Exposure"} subtitle={ar ? "هذه ليست استنتاجات نهائية، لكنها أكثر المناطق التي تستحق التحقق منها فوراً بناءً على نمط النتائج الحالي." : "Possible commercial consequences if signals repeat in the field or across the team—without assuming proven financial loss or cause."} dark>
          {ar ? <>
            <div className="grid gap-4 md:grid-cols-2">{priorityRows.slice(0, 2).map((row, index) => { const guide = guideFor(row); return <InfoCard key={row.competencyId} dark title={`${index + 1}. ${row.label} · ${row.percentage}%`}><p>{guide.why}</p><p className="mt-3"><strong className="text-white">راقب:</strong> {guide.observe}</p></InfoCard> })}</div>
            <div className="mt-5 grid gap-4 md:grid-cols-3"><InfoCard dark title={`3. ${priorityRows[2]?.label || "منطقة إضافية"}`}><p>{guideFor(priorityRows[2] || null).why}</p></InfoCard><InfoCard dark title="إجراءات هذا الأسبوع"><BulletList items={priorityRows.map((row) => guideFor(row).action)} /></InfoCard><InfoCard dark title="السؤال بعد 7 أيام"><p>هل تظهر الفجوة فعلاً في {weakest?.label || "منطقة الأولوية"}، أم يبدأ التعطل في مرحلة أخرى؟</p></InfoCard></div>
            <blockquote className="mt-5 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-lg font-black leading-8 text-amber-100 rtl-text">هذه الإجراءات تحسن الملاحظة، لكنها لا تثبت سبب النمط أو التدخل طويل المدى الأنسب.</blockquote>
          </> : <>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard dark title={ar ? "الإشارة ذات التعرّض النسبي الأقل" : "Comparatively Lower Exposure Signal"}><p className="text-xl font-black text-white">{strongest?.label || "—"} · {strongest?.percentage ?? 0}%</p><p className="mt-2">{strongest ? severityCopy(strongest.tier, lang) : "—"}</p></InfoCard>
            <InfoCard dark title={ar ? "الإشارة ذات الأولوية الأعلى للتحقق" : "Highest-Priority Exposure Signal"}><p className="text-xl font-black text-white">{weakest?.label || "—"} · {weakest?.percentage ?? 0}%</p><p className="mt-2">{ar ? "هذه هي الإشارة الأكثر وضوحًا في النتائج الحالية. قد تكون ذات صلة بجودة التنفيذ إذا تكررت، لكنها لا تثبت خسارة تجارية ولا تحدد السبب." : "This is the most visible signal in the current results. It may be relevant to execution if repeated, but it does not prove commercial loss or establish cause."}</p></InfoCard>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <InfoCard dark title={ar ? "أوجه التعرّض المحتملة" : "Possible Exposure"}><BulletList items={ar ? ["الإيرادات ومسار الفرص", "وقت الإدارة", "قرارات الأفراد", "ميزانية التطوير", "تجربة العملاء"] : ["Revenue and pipeline", "Management time", "People decisions", "Development budget", "Customer experience"]} /></InfoCard>
            <InfoCard dark title={ar ? "تكلفة تفسير العرض كسبب" : "The Cost of Acting on Symptoms"}><p>{ar ? "قد تنتج إشارة ضعيفة في الإغلاق عن المهارة أو التسعير أو التأهيل أو العرض أو الموافقات أو المنطقة أو الإدارة. اختلاف الأسباب يعني أن التفسير الظاهر قد لا يكون التفسير الصحيح." : "A weak closing signal may relate to skill, pricing, qualification, value proposition, approvals, territory, or management. Different causes mean the visible explanation may not be the correct one."}</p></InfoCard>
            <InfoCard dark title={ar ? "الإشارات والمجهولات" : "Signals & Unknowns"}><p>{ar ? `التوزيع الحالي: ${grouped.Strength.length} محدودة، ${grouped.Opportunity.length} ناشئة، ${grouped.Threat.length} جوهرية، ${grouped.Weakness.length} مرتفعة. لا يحدد هذا التوزيع السبب أو الأثر المالي.` : `Current distribution: ${grouped.Strength.length} limited, ${grouped.Opportunity.length} emerging, ${grouped.Threat.length} material, ${grouped.Weakness.length} elevated. This distribution does not establish cause or financial impact.`}</p></InfoCard>
          </div>
          <blockquote className="mt-5 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-lg font-black leading-8 text-amber-100 rtl-text">{ar ? "الخطأ الأعلى تكلفة ليس ظهور إشارة ضعيفة؛ بل اتخاذ قرار إداري بناءً على تفسير خاطئ لها. الإشارة تحدد موضع السؤال، ولا تقدم الإجابة." : "The costliest mistake is not discovering a weak signal. It is making a management decision based on the wrong explanation. The signal locates the question; it does not answer it."}</blockquote>
          </>}
        </PageShell>

        <PageShell number={5} eyebrow={ar ? "مسؤولية القرار" : "DECISION RESPONSIBILITY"} title={ar ? "قرارات إدارية قد يكون من المبكر اتخاذها الآن" : "Management Decision Risk"} subtitle={ar ? "النتائج الحالية تساعدك على تحديد أين تنظر، لكنها لا تمنح بعد أدلة كافية لاختيار العلاج الصحيح." : "The Scan identifies signals warranting attention, but does not independently provide sufficient evidence for final decisions about people, investment, or responsibility."}>
          {ar ? <>
            <blockquote className="rounded-3xl bg-slate-950 p-6 text-lg font-black leading-8 text-white rtl-text">هل أعرف فعلاً لماذا ظهرت هذه النتائج؟ إذا كانت الإجابة «أعتقد…» لا «لدينا أدلة تشير إلى…»، فما زال هناك تشخيص ناقص.</blockquote>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><InfoCard title="لا ترسل المندوب مباشرة إلى تدريب عام"><p>النتيجة المنخفضة لا تعني تلقائياً نقصاً في المهارة؛ قد ترتبط بالتطبيق أو الإدارة أو النظام أو ظروف العمل.</p></InfoCard><InfoCard title="لا تحكم من أقل درجة فقط"><p>الأداء أقوى في {strongest?.label || "بعض المراحل"} وأقل في {weakest?.label || "مراحل أخرى"}. لماذا لا تتحول نقاط القوة إلى اتساق عبر مسار البيع؟</p></InfoCard><InfoCard title="لا تغيّر الحوافز أو المنطقة بالتخمين"><p>الإدارة والعملية والمنطقة والسوق فرضيات محتملة، لا نتائج أثبتها الـScan.</p></InfoCard><InfoCard title="لا تغيّر طريقة العمل قبل التحقق"><p>قد يؤدي التدخل المبكر الخاطئ إلى معالجة العرض وترك السبب كما هو.</p></InfoCard></div>
            <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-6"><h3 className="font-black text-slate-950">تكلفة التخمين</h3><BulletList items={["تدريب لا يعالج السبب الحقيقي.", "ضغط إضافي أو تغيير نظام يعمل أصلاً.", "فقدان وقت ومبيعات قبل اكتشاف المشكلة.", "معالجة العرض وترك السبب كما هو."]} /><p className="mt-4 font-black text-slate-950 rtl-text">الـScan يقلل التخمين، لكنه لا يحدد وحده أي تدخل هو الأنسب ولماذا.</p></div>
          </> : <>
          <blockquote className="rounded-3xl bg-slate-950 p-6 text-lg font-black leading-8 text-white rtl-text">{ar ? "يتخذ المديرون الجيدون القرارات. أما المديرون الاستثنائيون فيعرفون متى لا تزال الأدلة غير كافية. تأجيل الحكم ليس ترددًا عندما يكون الغرض حماية جودة القرار." : "Good managers make decisions. Exceptional managers recognise when the evidence is not yet sufficient. Delaying judgment is not indecision when its purpose is to protect decision quality."}</blockquote>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard title={ar ? "الدخول والتقدم الوظيفي" : "Entry & Progression"}><p>{ar ? "التوظيف والترقية والتعاقب تتطلب أدلة عن ملاءمة الدور والسجل الفعلي والجاهزية والحكم والأداء عبر الزمن." : "Recruitment, promotion, and succession require evidence about role fit, actual history, readiness, judgment, and performance over time."}</p></InfoCard>
            <InfoCard title={ar ? "الأداء والتطوير" : "Performance & Development"}><p>{ar ? "تقييم الأداء والتوجيه والاستثمار التدريبي وخطط التحسين تتطلب فهم السبب والسياق والعوامل الواقعة ضمن سيطرة الفرد." : "Performance evaluation, coaching, training investment, and improvement plans require understanding cause, context, and factors within the individual’s control."}</p></InfoCard>
            <InfoCard title={ar ? "التوزيع والمكافأة" : "Deployment & Reward"}><p>{ar ? "توزيع المناطق والحسابات والحوافز يتطلب أدلة عن المنطقة والسوق وجودة الفرص وتصميم الأهداف، لا الإشارة السلوكية وحدها." : "Territory, account, and incentive decisions require evidence about market, opportunity quality, and target design—not a behavioural signal alone."}</p></InfoCard>
            <InfoCard title={ar ? "الاحتفاظ والمسؤولية" : "Retention & Responsibility"}><p>{ar ? "لا ينبغي تحويل إشارة أولية إلى حكم نهائي على قيمة الفرد أو مستقبله؛ فقد تتأثر بالدور أو الإدارة أو البيئة أو النظام." : "A preliminary signal should not become a final judgment about an individual’s value or future; role, management, environment, or system may influence it."}</p></InfoCard>
          </div>
          <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-6"><h3 className="font-black">{ar ? "مخاطر التصرف قبل اكتمال الأدلة" : "The Risk of Acting Too Early"}</h3><p className="mt-3 leading-8 text-slate-700 rtl-text">{ar ? "التدخل المبكر ليس المشكلة. المشكلة هي الانتقال من إشارة أولية إلى تفسير نهائي قبل التحقق من السبب والسياق. السرعة ذات قيمة؛ أما الافتراض غير المختبر فقد يكون مكلفًا." : "Early intervention is not the problem. The risk lies in moving from a preliminary signal to a final explanation before cause and context are validated. Speed is valuable; untested assumption is expensive."}</p></div>
          </>}
        </PageShell>

        <PageShell number={6} eyebrow={ar ? "قبل اختيار الحل" : "EVIDENCE BOUNDARY"} title={ar ? "قبل أن تختار الحل… حدّد نوع المشكلة أولاً" : "Evidence Still Missing"} subtitle={ar ? "النتيجة المتشابهة قد تنتج عن أسباب مختلفة تماماً، ولذلك قد تحتاج إلى حلول مختلفة أيضاً." : "The Scan has shown where signals appear. It cannot independently establish their causes, origins, consistency, or wider effects across the team and sales system."} dark>
          {ar ? <>
            <blockquote className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-xl font-black leading-9 text-amber-100 rtl-text">انخفاض نتيجة {weakest?.label || "منطقة الأولوية"} إلى {weakest?.percentage ?? 0}% لا يثبت تلقائياً وجود نقص في المهارة.</blockquote>
            <div className="mt-5 grid gap-4 md:grid-cols-2">{[["1. المهارة", "هل يعرف المندوب كيف ينفذ السلوك المطلوب؟"], ["2. التطبيق والانضباط", "هل يستطيع التنفيذ لكنه لا يطبقه باستمرار؟"], ["3. الإدارة والنظام", "هل القياس والمتابعة والأدوات تدعم التنفيذ؟"], ["4. ظروف العمل", "هل السوق أو المنطقة أو جودة الفرص تجعل التنفيذ أصعب؟"], ["هل يعرف المطلوب؟", "هل التوقعات محددة وواضحة؟"], ["هل يستطيع تنفيذه؟", "هل تظهر القدرة عندما يريد؟"], ["هل يطبقه باستمرار؟", "هل السلوك حاضر في العمل الفعلي؟"], ["هل يقيسه المدير؟", "هل توجد مراجعة ومتابعة منتظمة؟"]].map(([title, body]) => <InfoCard key={title} dark title={title}><p>{body}</p></InfoCard>)}</div>
            <div className="mt-5 rounded-3xl border border-white/15 bg-white/5 p-6"><h3 className="font-black text-white">السؤال الخامس والقاعدة</h3><p className="mt-3 leading-8 text-blue-100 rtl-text">هل هناك عامل في النظام أو السوق يجعل التنفيذ أصعب؟ لا تسأل فقط «ما المشكلة؟» بل «ما نوع المشكلة التي أمامي؟» الإجابات المختلفة تقود إلى تدخلات مختلفة.</p><p className="mt-3 font-black text-amber-200 rtl-text">حدد الـScan أين تركز وما الذي تراقبه، لكنه لم يثبت أي تفسير هو الصحيح.</p></div>
          </> : <>
          <blockquote className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-xl font-black leading-9 text-amber-100 rtl-text">{ar ? "الخطر الأكبر ليس وجود أسئلة بلا إجابة. الخطر الأكبر هو الاعتقاد بأنه لم تعد هناك أسئلة. جودة القرار تبدأ بالتمييز بين ما تشير إليه الأدلة وما تثبته." : "The greatest risk is not having unanswered questions. It is believing no questions remain. Decision quality begins with distinguishing between what evidence suggests and what it establishes."}</blockquote>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(ar ? [
              ["الفرد أم الفريق؟", "هل الإشارة خاصة بهذا المشارك، أم يظهر النمط نفسه لدى آخرين؟"],
              ["القدرة أم الثبات؟", "هل تعكس الإشارة فجوة قدرة، أم سلوكًا صحيحًا لا يظهر بصورة ثابتة؟"],
              ["السلوك أم الإدارة؟", "هل تسهم التوقعات والمتابعة والمساءلة وإيقاع الإدارة؟"],
              ["الفرد أم النظام؟", "هل تدعم العملية والأدوات السلوك الفعال أم تخلق احتكاكًا؟"],
              ["السلوك أم المنطقة؟", "هل ترتبط الإشارة بالفرد أم بجودة المنطقة والحسابات والفرص؟"],
              ["مؤقت أم مستمر؟", "هل تعكس النتيجة ظرفًا مؤقتًا أم نمطًا متكررًا عبر الوقت؟"],
              ["الإشارة أم الأثر؟", "أي الإشارات يرتبط فعليًا بنتيجة تجارية مهمة؟"],
              ["العرض أم السبب؟", "هل البعد الأقل نتيجة هو السبب أم عرض لعامل آخر؟"],
            ] : [
              ["Individual or team-wide?", "Is the signal specific to this participant or repeated among others?"],
              ["Capability or consistency?", "Is this a capability gap or correct behaviour applied inconsistently?"],
              ["Behaviour or management?", "Are expectations, follow-through, accountability, or management rhythm contributing?"],
              ["Individual or system?", "Do process and tools support effective behaviour or create friction?"],
              ["Behaviour or territory?", "Is the signal associated with the individual or territory and opportunity quality?"],
              ["Temporary or persistent?", "Is this a temporary condition or a repeated pattern over time?"],
              ["Signal or impact?", "Which signals are genuinely associated with important commercial outcomes?"],
              ["Symptom or cause?", "Is the lowest result the cause or a symptom of another factor?"],
            ]).map(([title, body]) => <InfoCard key={title} dark title={title}><p>{body}</p></InfoCard>)}
          </div>
          <div className="mt-5 rounded-3xl border border-white/15 bg-white/5 p-6"><h3 className="font-black text-white">{ar ? "ما الذي حققه التقرير؟" : "What the Report Has Achieved"}</h3><p className="mt-3 leading-8 text-blue-100 rtl-text">{ar ? "حدد الإشارات، وقارن الأبعاد، وأبرز مواضع الاهتمام، ووضح حدود القرار، وحوّل الانطباعات إلى أسئلة تنفيذية منظمة. لقد أنجز الفحص مهمته عندما رفع جودة الأسئلة؛ ولم تكن مهمته إصدار حكم نهائي." : "It located signals, compared dimensions, highlighted attention areas, clarified decision boundaries, and converted impressions into structured executive questions. The Scan fulfilled its purpose by improving the quality of the questions—not by delivering a final judgment."}</p></div>
          </>}
        </PageShell>

        <PageShell number={7} eyebrow={ar ? "التشخيص المتقدم" : "DIAGNOSTIC CONTINUITY"} title={ar ? "من تحديد المشكلة إلى معرفة ما الذي يجب تغييره" : "From Early Warning to Decision-Grade Evidence"} subtitle={ar ? "الـScan يحدد أين يستحق الأداء الانتباه. التشخيص المتقدم يذهب أعمق لفهم النمط السلوكي وتحديد أولويات التطوير." : "Screening locates where signals appear. Deeper diagnosis expands the evidence needed to understand patterns and context before consequential decisions."}>
          <blockquote className="rounded-3xl bg-slate-950 p-6 text-xl font-black leading-9 text-white rtl-text">{ar ? <>أظهر الـScan أن {weakest?.label || "منطقة الأولوية"} تستحق الانتباه. السؤال التالي ليس فقط: <strong className="text-amber-200">أين تظهر المشكلة؟</strong> بل: <strong className="text-amber-200">ما النمط الذي يقف خلفها، وما الأولوية الصحيحة لمعالجتها؟</strong></> : "The value of screening lies in knowing where to investigate. The value of diagnosis lies in knowing where decisions should focus."}</blockquote>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard title={ar ? "ماذا أعطاك الـScan حتى الآن؟" : "Outdoor Sales Scan"}><BulletList items={ar ? ["أين تظهر أقوى وأضعف المؤشرات.", "أين قد تتعطل الفرص.", "ما الذي يستحق المراقبة.", "ما الإجراءات السريعة التي يمكن تجربتها.", "ما الأسئلة التي يجب طرحها قبل اختيار الحل."] : ["Locates signals", "Provides early warning", "Screens seven core dimensions", "Supports the decision to investigate"]} /></InfoCard>
            <InfoCard title={ar ? "هنا يأتي دور التشخيص المتقدم (MRI)" : "Outdoor Sales MRI"}><BulletList items={ar ? ["75 موقفاً وسيناريو بيعياً.", "15 كفاءة سلوكية.", "أنماط اتخاذ القرار في المواقف البيعية.", "الفجوات المتكررة ونقاط القوة المساندة.", "الترابط بين الكفاءات وأولويات التطوير."] : ["Investigates patterns behind signals", "Expands decision evidence", "Uses 75 scenario-based questions", "Supports individual and team interpretation"]} /></InfoCard>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <InfoCard title={ar ? "أنماط أعمق" : "Deeper Pattern Recognition"}><p>{ar ? "يكشف كيف يتخذ المشارك قراراته عبر مواقف بيعية متنوعة." : "Broader scenarios help reveal relationships among behaviours rather than treating percentages as isolated."}</p></InfoCard>
            <InfoCard title={ar ? "أولويات أوضح" : "Root-Factor Investigation"}><p>{ar ? "يوضح المجالات التي تتكرر فيها الفجوة، والتدخل الذي يستحق البدء به." : "Helps test multiple explanations and identify those better supported without converting association into proven causation."}</p></InfoCard>
            <InfoCard title={ar ? "قيمة الأدلة" : "Decision Support"}><p>{ar ? "القيمة ليست في الحصول على أسئلة أكثر. القيمة في الحصول على أدلة أعمق قبل اختيار ما الذي ستطوره." : "Adds a more detailed behavioural layer to performance data, interviews, observation, and organisational context."}</p></InfoCard>
          </div>
        </PageShell>

        <PageShell number={8} eyebrow={ar ? "صورة الفريق" : "ORGANISATIONAL INTELLIGENCE"} title={ar ? "من نتيجة الفرد إلى صورة الفريق" : "From Individual Insight to Team Intelligence"} subtitle={ar ? "نتيجة مندوب واحد قد تكشف حالة فردية. أما تكرار النمط نفسه لدى عدة مندوبين فقد يكشف شيئاً أكبر يستحق انتباه الإدارة." : "An individual result reveals one pattern. Interpreting results together helps management see trends, variation, and shared influences no individual report can reveal."} dark>
          <blockquote className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-xl font-black leading-9 text-amber-100 rtl-text">{ar ? "نتيجة واحدة = إشارة فردية. تكرار النتيجة عبر الفريق = نمط يستحق التحقيق، لا حكماً نهائياً." : "Team diagnosis is not about ranking people. It is about understanding the behavioural system management is leading: what repeats, what varies, and where decisions require clearer evidence."}</blockquote>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <InfoCard dark title={ar ? "فرد واحد" : "One Employee"}><p>{ar ? "هذه النتيجة تخص مشاركاً واحداً ولا تمثل الفريق كله." : "One result provides a reading of one participant within a defined context."}</p></InfoCard>
            <InfoCard dark title={ar ? "تخيل أن…" : "One Team"}><p>{ar ? `تخيل أن ${weakest?.label || "المؤشر نفسه"} ظهر كأولوية لدى عدة مندوبين؛ عندها يصبح السؤال إدارياً وفريقياً، لا فردياً فقط.` : "A collection of results adds comparative context, revealing similarities, differences, and distributions."}</p></InfoCard>
            <InfoCard dark title={ar ? "الفريق الواحد لا يعني مشكلة واحدة" : "Executive Intelligence"}><p>{ar ? "قد يحتاج كل فرد إلى تدخل مختلف حتى عندما تتشابه النتيجة الظاهرة." : "Trends help management ask better questions about people, management, process, territory, culture, and systems."}</p></InfoCard>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard dark title={ar ? "قيمة المقارنة بين أعضاء الفريق" : "What Can Team Interpretation Reveal?"}><BulletList items={ar ? ["المجالات الضعيفة المتكررة.", "اختلاف احتياجات التطوير.", "نقاط القوة التي يمكن الاستفادة منها.", "الأولويات المشتركة.", "توزيع أفضل لموارد التدريب والتوجيه."] : ["Recurring behaviours", "Consistency and variation", "Capability distribution", "High-performing patterns", "Leadership opportunities", "Organisational blind spots"]} /></InfoCard>
            <InfoCard dark title={ar ? "سؤال المدير" : "Executive Outcome"}><p>{ar ? "إذا طُلب مني اليوم تحديد أهم ثلاث أولويات تطوير لفريق المبيعات… هل أملك بيانات كافية لأحددها بثقة؟" : "Trends help management ask better questions about people, management, process, territory, culture, and systems."}</p></InfoCard>
          </div>
          <p className="mt-5 text-sm leading-7 text-blue-100 rtl-text">{ar ? "الأداء الفردي يخبرك أين يحتاج الفرد إلى الاهتمام. أما نمط الفريق فيساعد الإدارة على تحديد أين تركز وقتها وميزانيتها." : "Aggregated evidence does not prove causation or replace individual understanding. It adds an organisational layer that helps management see the system—not only the cases."}</p>
        </PageShell>

        <PageShell number={9} eyebrow={ar ? "الخطوة التالية" : "CONCLUSION"} title={ar ? "أنت تعرف الآن أين تبدأ." : "Final Executive Recommendation"} subtitle={ar ? "الخطوة التالية هي معرفة ما الذي يجب تطويره أولاً، وكيف تحوّل النتائج إلى تحسن فعلي في أداء المبيعات." : "Diagnostic depth should reflect decision significance, the population affected, and the evidence required to decide responsibly."}>
          {ar ? <>
            <p className="text-lg leading-9 text-slate-700 rtl-text">أعطاك الـScan أقوى وأضعف جوانب الأداء، والمراحل التي تستحق الانتباه، ومخاطر للمراقبة، وأسئلة وإجراءات يمكن البدء بها هذا الأسبوع. استخدمها، راقب النتائج، ولا تتسرع في اختيار الحل.</p>
            <blockquote className="mt-5 rounded-3xl bg-slate-950 p-6 text-xl font-black leading-9 text-white rtl-text">انتقل من «أين المشكلة؟» إلى «ماذا يجب أن أطور تحديداً؟ وما الأولوية؟ وكيف؟»</blockquote>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><InfoCard title="التشخيص المبدئي (Scan)"><p>يحدد أين تبدأ وما الذي تراقبه في الأداء الحالي.</p></InfoCard><InfoCard title="التشخيص المتقدم (MRI)"><p>75 موقفاً بيعياً و15 كفاءة لفهم الأنماط وتحديد أولوية التطوير.</p></InfoCard><InfoCard title="للأفراد"><p>ما الذي ينبغي تطويره أولاً، ونقاط القوة التي يمكن البناء عليها، وخطة تطوير لمدة 90 يوماً.</p></InfoCard><InfoCard title="للفرق والشركات"><p>تطوير الأشخاص المناسبين، في المجالات المناسبة، بالطريقة المناسبة.</p></InfoCard></div>
            <div className="mt-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-6"><h3 className="text-xl font-black rtl-text">عندما تحتاج إلى الذهاب أعمق</h3><p className="mt-3 leading-8 text-slate-700 rtl-text">هل أعرف بالضبط ما الذي أريد تغييره، لدى مَن، ولماذا؟ التشخيص المتقدم يساعد على تحويل الإشارات إلى أولويات تطوير أوضح.</p><p className="mt-4 font-black text-slate-950">شخّص أولاً. قرر ثانياً. درّب ثالثاً.</p></div>
            <div className="mt-6 text-center"><a href="https://www.levelupbusinessconsulting.com/courses/outdoor-sales-page-arabic-mri" className="inline-flex rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-xl hover:bg-blue-950">اكتشف التشخيص المتقدم (MRI)</a><p className="mt-3 text-sm font-black text-slate-600">اعرف ماذا يجب تطويره أولاً، ولماذا، وكيف تبني خطة تحسين لمدة 90 يوماً.</p></div>
          </> : <>
          <p className="text-lg leading-9 text-slate-700 rtl-text">{ar ? `أنجز Outdoor Sales Scan الغرض الذي صُمم من أجله للمشارك ${identity.fullName}. فقد حدد إشارات أولية، وأبرز المجالات التي قد تستحق اهتمامًا أعمق، وحدد حدود ما تستطيع الأدلة الحالية إثباته.` : `The Outdoor Sales Scan has fulfilled its intended purpose for ${identity.fullName}. It identified preliminary signals, highlighted areas warranting closer attention, and clarified what the current evidence can establish.`}</p>
          <blockquote className="mt-5 rounded-3xl bg-slate-950 p-6 text-xl font-black leading-9 text-white rtl-text">{ar ? "نادرًا ما تبدأ القرارات الإدارية الاستثنائية بإجابات أكثر ثقة. إنها تبدأ بأدلة أفضل، وحدود أوضح، وانضباط يطابق عمق التشخيص مع أهمية القرار." : "Outstanding management decisions rarely begin with more confident answers. They begin with better evidence, clearer boundaries, and discipline matching diagnostic depth to decision significance."}</blockquote>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard title="Outdoor Sales Scan"><p>{ar ? "مناسب عندما يكون الهدف تحديد إشارات الإنذار المبكر والحاجة إلى مزيد من التحقيق." : "Appropriate for identifying early-warning signals and whether further investigation is warranted."}</p></InfoCard>
            <InfoCard title={ar ? "Outdoor Sales MRI — فردي" : "Outdoor Sales MRI — Individual"}><p>{ar ? "مناسب للقرارات المتعلقة بشخص واحد والتي تتطلب فهمًا سلوكيًا أعمق." : "Appropriate for decisions concerning one person that require deeper behavioural understanding."}</p></InfoCard>
            <InfoCard title={ar ? "Outdoor Sales MRI — فريق" : "Outdoor Sales MRI — Team"}><p>{ar ? "مناسب للقرارات التي تتطلب رؤية الاتجاهات والأنماط والتفاوتات عبر فريق المبيعات." : "Appropriate for decisions requiring visibility into trends, patterns, and variation across a sales team."}</p></InfoCard>
            <InfoCard title={ar ? "البرامج التشخيصية المؤسسية" : "Enterprise Diagnostic Programmes"}><p>{ar ? "مناسبة للقرارات التي تمتد عبر عدة فرق أو مناطق أو إدارات وتتطلب تصميمًا يتوافق مع بنية المؤسسة." : "Appropriate for decisions extending across multiple teams, territories, or functions and requiring organisation-aligned diagnostic design."}</p></InfoCard>
          </div>
          <div className="mt-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-6">
            <h3 className="text-xl font-black rtl-text">{ar ? "التوصية" : "Recommendation"}</h3>
            <p className="mt-3 leading-8 text-slate-700 rtl-text">{ar ? "استنادًا إلى الأدلة السلوكية الأولية التي جمعها فحص الدم المهني التنفيذي، فإن توصيتنا هي مطابقة عمق التشخيص مع أهمية القرار ونطاقه. كلما زادت أهمية القرار واتسع أثره، وجب أن تكون الأدلة أقوى وأكثر ملاءمة لنطاقه." : "Based on the preliminary behavioural evidence gathered through this Executive Career Blood Test, our recommendation is to match diagnostic depth to decision significance and scope. The greater the decision and its impact, the stronger and more proportionate the evidence should be."}</p>
            <p className="mt-4 font-black text-slate-950">{x.philosophy}</p>
          </div>
          <div className="mt-6 text-center">
            <a href="mailto:support@careerlabsai.com?subject=Executive%20diagnostic%20discussion" className="inline-flex rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-xl hover:bg-blue-950">{ar ? "اطلب مناقشة تشخيصية تنفيذية" : "Request an Executive Diagnostic Discussion"}</a>
          </div>
          </>}
        </PageShell>
      </main>
    </div>
  );
}
