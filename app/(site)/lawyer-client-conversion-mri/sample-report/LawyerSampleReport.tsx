"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  FileText,
  Gauge,
  Lightbulb,
  Printer,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import {
  LAWYER_SAMPLE_90_DAY_PLAN,
  LAWYER_SAMPLE_COMPETENCIES,
  LAWYER_SAMPLE_IDENTITY,
  LAWYER_SAMPLE_OVERALL_SCORE,
  LAWYER_SAMPLE_SWOT,
  LAWYER_SAMPLE_WEAKEST,
} from "@/data/lawyer-mri-sample-report";

type Mode = "executive" | "guide";

function scoreTone(score: number) {
  if (score >= 75) return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (score >= 50) return "border-blue-300 bg-blue-50 text-blue-900";
  if (score >= 30) return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-rose-300 bg-rose-50 text-rose-950";
}

function scoreLabel(score: number) {
  if (score >= 75) return "قوة";
  if (score >= 50) return "فرصة";
  if (score >= 30) return "تهديد";
  return "ضعف";
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 max-w-4xl leading-8 text-slate-600">{body}</p>}
    </header>
  );
}

function TopButton({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
        active
          ? "bg-blue-700 text-white shadow-lg shadow-blue-900/20"
          : "border border-slate-300 bg-white text-slate-800 hover:border-blue-400"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export default function LawyerSampleReport() {
  const [mode, setMode] = useState<Mode>("executive");
  const phaseGroups = useMemo(
    () =>
      Array.from(new Set(LAWYER_SAMPLE_90_DAY_PLAN.map((day) => day.phase))).map(
        (phase) => ({
          phase,
          days: LAWYER_SAMPLE_90_DAY_PLAN.filter((day) => day.phase === phase),
        }),
      ),
    [],
  );

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      id="sample-report-top"
      dir="rtl"
      className="sample-report min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-950"
    >
      <style>{`
        .sample-card { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          @page { size: A4; margin: 12mm; }
          .sample-nav, .print-hide { display: none !important; }
          .sample-report { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .sample-card { break-inside: avoid; page-break-inside: avoid; }
          .sample-section { break-before: auto; }
        }
      `}</style>

      <div className="sample-nav sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black text-blue-700">معيار كسب الموكلين™ من Career Labs AI</p>
            <p className="text-sm font-bold text-slate-600">نموذج تقرير عام للعرض فقط</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TopButton
              active={mode === "executive"}
              onClick={() => setMode("executive")}
              icon={<FileText className="h-4 w-4" />}
            >
              عرض التقرير التنفيذي
            </TopButton>
            <TopButton
              active={mode === "guide"}
              onClick={() => setMode("guide")}
              icon={<BookOpenCheck className="h-4 w-4" />}
            >
              عرض دليل التطبيق
            </TopButton>
            <TopButton
              onClick={() => window.print()}
              icon={<Printer className="h-4 w-4" />}
            >
              طباعة النموذج
            </TopButton>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        <div className="sample-card rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-center font-black text-amber-950 shadow-sm">
          نموذج توضيحي — جميع البيانات المعروضة تجريبية
        </div>

        {mode === "executive" ? (
          <ExecutiveReport />
        ) : (
          <ImplementationGuide phaseGroups={phaseGroups} />
        )}

        <button
          type="button"
          onClick={scrollTop}
          className="print-hide mx-auto flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm"
        >
          <ArrowUp className="h-4 w-4" />
          العودة إلى أعلى التقرير
        </button>
      </main>
    </div>
  );
}

function ExecutiveReport() {
  const remaining = LAWYER_SAMPLE_COMPETENCIES.filter(
    (item) => !LAWYER_SAMPLE_WEAKEST.some((weak) => weak.id === item.id),
  );

  return (
    <div className="space-y-8">
      <section className="sample-card overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07111f] via-[#0b1d38] to-[#153d74] text-white shadow-2xl">
        <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.25fr_.75fr] lg:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-4 py-2 text-sm font-black text-blue-100">
              <Sparkles className="h-4 w-4" />
              التقرير التنفيذي
            </div>
            <h1 className="mt-7 text-3xl font-black leading-tight sm:text-5xl">
              تقرير معيار كسب الموكلين™
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-9 text-blue-100">
              تشخيص متقدم لتجربة العميل القانونية من أول استفسار إلى وضوح القيمة،
              عرض الأتعاب، القرار، والمتابعة المهنية.
            </p>
            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["الاسم", LAWYER_SAMPLE_IDENTITY.name],
                ["البريد الإلكتروني", LAWYER_SAMPLE_IDENTITY.email],
                ["الخبرة", LAWYER_SAMPLE_IDENTITY.experience],
                ["مرجع التقرير", LAWYER_SAMPLE_IDENTITY.reference],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-blue-200">{label}</p>
                  <p className="mt-1 break-all font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-[14px] border-white/10 bg-white/5 shadow-2xl">
              <div className="absolute inset-3 rounded-full border-[10px] border-amber-400" />
              <div className="text-center">
                <p className="text-7xl font-black">{LAWYER_SAMPLE_OVERALL_SCORE}%</p>
                <p className="mt-2 font-bold text-amber-200">منطقة تهديد</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading
          eyebrow="القراءة القيادية"
          title="التفسير التنفيذي وصحة رحلة العميل القانونية"
          body="النتيجة لا تقيس القدرة القانونية، بل تقيس مدى تحوّل الخبرة القانونية إلى تجربة يفهمها العميل ويثق بها ويتخذ من خلالها الخطوة المناسبة."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Insight
            icon={<Gauge />}
            title="الصورة العامة"
            body="الصحة العامة لتجربة العميل تقع في منطقة تهديد. توجد قدرات مهنية واضحة، لكنها لا تعمل بعد كنظام متصل من الاستفسار إلى التوكيل."
          />
          <Insight
            icon={<BrainCircuit />}
            title="التفسير المهني"
            body="أقوى جانب هو تبسيط الاستراتيجية القانونية، بينما يتسع التسرب عند ترجمة القيمة وعرض الأتعاب بثقة."
          />
          <Insight
            icon={<Compass />}
            title="اتجاه العلاج"
            body="الأولوية ليست تقديم معلومات أكثر، بل بناء تسلسل مهني يجعل التشخيص والقيمة والأتعاب والخطوة التالية مفهومة ومترابطة."
          />
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading
          eyebrow="لوحة التشخيص"
          title="خريطة الكفاءات الخمس عشرة"
          body="توضح الألوان مستوى الصحة في كل نقطة من رحلة العميل القانونية."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LAWYER_SAMPLE_COMPETENCIES.map((item) => (
            <article key={item.id} className={`sample-card rounded-2xl border p-5 ${scoreTone(item.score)}`}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-black leading-7">{item.label}</h3>
                <span className="text-2xl font-black">{item.score}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-current" style={{ width: `${item.score}%` }} />
              </div>
              <p className="mt-3 text-sm font-bold">{scoreLabel(item.score)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sample-section rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <SectionHeading
          eyebrow="خريطة السبب الجذري"
          title="أين يحدث التسرب؟"
          body="المشكلة ليست في نقطة واحدة، بل في انتقال القيمة بين مراحل الرحلة."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["الاستفسار", "الاستجابة جيدة نسبيًا، لكن التأهيل يحتاج إلى اتساق أكبر."],
            ["الاستشارة", "التشخيص والثقة لا يسبقان الحل دائمًا بما يكفي."],
            ["القيمة والأتعاب", "أكبر فجوة: القيمة لا تمهد لعرض الأتعاب واتفاقية التوكيل."],
            ["القرار والمتابعة", "المتابعة موجودة، لكن الخطوة المؤرخة لا تُغلق كل محادثة."],
          ].map(([title, body], index) => (
            <div key={title} className="sample-card rounded-2xl border border-white/15 bg-white/10 p-5">
              <p className="text-sm font-black text-blue-300">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-black">{title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading eyebrow="الأولويات" title="مجالات التطوير ذات الأولوية" />
        <div className="grid gap-4 md:grid-cols-3">
          {LAWYER_SAMPLE_WEAKEST.slice(0, 3).map((item, index) => (
            <div key={item.id} className="sample-card rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-700 font-black text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 font-black text-rose-950">{item.label}</h3>
              <p className="mt-2 text-sm leading-7 text-rose-900">{item.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading eyebrow="التحليل الاستراتيجي" title="تحليل SWOT لتجربة العميل" />
        <div className="grid gap-4 md:grid-cols-2">
          <Swot title="نقاط القوة" items={LAWYER_SAMPLE_SWOT.strengths} tone="emerald" />
          <Swot title="الفرص" items={LAWYER_SAMPLE_SWOT.opportunities} tone="blue" />
          <Swot title="نقاط الضعف" items={LAWYER_SAMPLE_SWOT.weaknesses} tone="rose" />
          <Swot title="التهديدات" items={LAWYER_SAMPLE_SWOT.threats} tone="amber" />
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-blue-200 bg-blue-950 p-6 text-white shadow-xl sm:p-8">
        <SectionHeading eyebrow="ملخص النمط" title="نمط تجربة العميل الحالي" />
        <p className="max-w-5xl text-lg leading-9 text-blue-100">
          النمط الحالي هو «خبرة قانونية أقوى من تجربة الشراء المهنية». يستطيع المحامي
          شرح المسار القانوني بوضوح ويحافظ على الحدود الأخلاقية، لكن العميل قد يصل إلى
          لحظة الأتعاب دون أن تكون القيمة والمخاطر ونطاق المسؤولية قد تجمعت في صورة
          واحدة. النتيجة المحتملة: استشارة جيدة لا تتحول دائمًا إلى قرار واضح.
        </p>
      </section>

      <section className="sample-section space-y-5">
        <SectionHeading
          eyebrow="صفحات التشخيص"
          title="التشخيص التفصيلي لأضعف ست كفاءات"
        />
        {LAWYER_SAMPLE_WEAKEST.map((item, index) => (
          <article key={item.id} className="sample-card rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-blue-700">الأولوية {index + 1}</p>
                <h3 className="mt-2 text-2xl font-black">{item.label}</h3>
              </div>
              <div className={`rounded-2xl border px-5 py-3 text-center ${scoreTone(item.score)}`}>
                <p className="text-3xl font-black">{item.score}%</p>
                <p className="text-xs font-bold">{scoreLabel(item.score)}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Detail title="التشخيص المهني" body={item.diagnosis} icon={<BrainCircuit />} />
              <Detail title="السبب الجذري" body={item.rootCause} icon={<Target />} />
              <Detail title="التدخل المقترح" body={item.action} icon={<Lightbulb />} />
              <Detail title="مؤشر التحقق" body={item.indicator} icon={<CheckCircle2 />} />
            </div>
          </article>
        ))}
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading eyebrow="الصورة المتبقية" title="ملخص الكفاءات التسع الأخرى" />
        <div className="grid gap-3 md:grid-cols-2">
          {remaining.map((item) => (
            <div key={item.id} className="sample-card flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <p className="font-bold">{item.label}</p>
              <span className={`rounded-lg border px-3 py-1 font-black ${scoreTone(item.score)}`}>
                {item.score}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sample-section rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-950 to-blue-900 p-6 text-white shadow-xl sm:p-8">
        <SectionHeading eyebrow="نظرة 90 يومًا" title="خارطة طريق من صفحة واحدة" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["الأيام 1–21", "إصلاح تقديم الأتعاب، صياغة القيمة، وبناء الثقة."],
            ["الأيام 22–45", "تعميق التشخيص والتأهيل وإدارة العملاء الصعبين."],
            ["الأيام 46–70", "تطبيق التسلسل الجديد في استشارات حقيقية وقياسه."],
            ["الأيام 71–90", "تثبيت الأدوات، مراجعة المؤشرات، وبناء معيار مهني مستدام."],
          ].map(([title, body]) => (
            <div key={title} className="sample-card rounded-2xl border border-white/15 bg-white/10 p-5">
              <h3 className="font-black text-blue-200">{title}</h3>
              <p className="mt-3 leading-7 text-white">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sample-card rounded-3xl border border-emerald-200 bg-emerald-50 p-7 shadow-lg sm:p-10">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-2xl font-black text-emerald-950">التوصية الختامية</h2>
            <p className="mt-4 text-lg leading-9 text-emerald-900">
              لا تبدأ بمحاولة تحسين جميع الكفاءات في وقت واحد. ابدأ بجسر القيمة
              والأتعاب، ثم ثبّت أسئلة التشخيص والتأهيل، وبعدها طبّق النظام كاملًا في
              الاستشارات الحقيقية. الهدف خلال 90 يومًا هو أن تصبح الخبرة القانونية
              مرئية ومفهومة وقابلة لاتخاذ القرار من منظور العميل.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ImplementationGuide({
  phaseGroups,
}: {
  phaseGroups: Array<{ phase: string; days: typeof LAWYER_SAMPLE_90_DAY_PLAN }>;
}) {
  return (
    <div className="space-y-8">
      <section className="sample-card rounded-[2rem] bg-gradient-to-br from-[#07111f] via-[#132c53] to-[#1e4a82] p-7 text-white shadow-2xl sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black">
          <BriefcaseBusiness className="h-4 w-4" />
          دليل التطبيق المهني لمدة 90 يومًا
        </div>
        <h1 className="mt-7 text-3xl font-black sm:text-5xl">من التشخيص إلى السلوك المهني اليومي</h1>
        <p className="mt-5 max-w-4xl text-lg leading-9 text-blue-100">
          أربع مراحل، ثلاثة عشر أسبوعًا، وتمرين عملي كل يوم لتحويل نقاط التشخيص
          إلى أسئلة وأدوات ورسائل ومؤشرات قابلة للتطبيق والتحقق.
        </p>
      </section>

      <section className="sample-section rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <SectionHeading eyebrow="طريقة الاستخدام" title="الهيكل الأسبوعي" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["1", "اقرأ تمرين اليوم وحدد السلوك المستهدف."],
            ["2", "طبّق السلوك في موقف مهني حقيقي."],
            ["3", "تحقق من المؤشر بدل الاعتماد على الانطباع."],
            ["4", "أجب عن سؤال التأمل وعدّل المحاولة التالية."],
          ].map(([number, body]) => (
            <div key={number} className="sample-card rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 font-black text-white">{number}</span>
              <p className="mt-4 font-bold leading-7 text-blue-950">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {phaseGroups.map((group, phaseIndex) => (
        <section key={group.phase} className="sample-section space-y-4">
          <div className="sample-card rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <p className="text-sm font-black text-blue-300">المرحلة {phaseIndex + 1} من 4</p>
            <h2 className="mt-2 text-2xl font-black">{group.phase}</h2>
            <p className="mt-3 text-slate-300">
              الأسابيع {Math.min(...group.days.map((day) => day.week))}–{Math.max(...group.days.map((day) => day.week))}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.days.map((day) => (
              <article key={day.day} className="sample-card rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                      الأسبوع {day.week}
                    </p>
                    <h3 className="mt-1 text-xl font-black">اليوم {day.day}</h3>
                  </div>
                  <span className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-900">
                    {day.focus}
                  </span>
                </div>
                <div className="mt-5 space-y-4 text-sm leading-7">
                  <PlanField icon={<Lightbulb />} title="التمرين اليومي" body={day.exercise} />
                  <PlanField icon={<BriefcaseBusiness />} title="التطبيق المهني" body={day.application} />
                  <PlanField icon={<CheckCircle2 />} title="مؤشر التحقق" body={day.verification} />
                  <PlanField icon={<BrainCircuit />} title="سؤال التأمل" body={day.reflection} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="sample-card rounded-3xl border border-emerald-200 bg-emerald-50 p-7 shadow-lg">
        <h2 className="text-2xl font-black text-emerald-950">معيار إتمام الخطة</h2>
        <p className="mt-4 text-lg leading-9 text-emerald-900">
          لا يُقاس النجاح بعدد الصفحات المقروءة، بل بظهور سلوك مهني متكرر: تشخيص
          أعمق، قيمة أوضح، عرض أتعاب أكثر ثقة، خطوة تالية مؤرخة، ومتابعة يمكن قياسها.
        </p>
      </section>
    </div>
  );
}

function Insight({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="sample-card rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="text-blue-700">{icon}</div>
      <h3 className="mt-4 text-lg font-black text-blue-950">{title}</h3>
      <p className="mt-3 leading-7 text-blue-900">{body}</p>
    </article>
  );
}

function Detail({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="sample-card rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-blue-700">{icon}<h4 className="font-black">{title}</h4></div>
      <p className="mt-3 leading-8 text-slate-700">{body}</p>
    </div>
  );
}

function Swot({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "emerald" | "blue" | "rose" | "amber";
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <article className={`sample-card rounded-2xl border p-5 ${tones[tone]}`}>
      <h3 className="text-lg font-black">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-7">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlanField({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 font-black text-slate-900">
        <span className="text-blue-700">{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-slate-600">{body}</p>
    </div>
  );
}
