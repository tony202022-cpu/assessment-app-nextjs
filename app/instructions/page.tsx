"use client";

import Link from "next/link";

export default function InstructionsPage() {
  const ar = true; // ← OPTIONAL: replace with your real language check later

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-2xl overflow-hidden">
        <div className="p-6 text-white">
          <h2 className="text-2xl font-extrabold text-center">
            {ar ? "قبل أن تبدأ ✅" : "Before you start ✅"}
          </h2>

          <div className="mt-5 space-y-3 text-sm leading-relaxed text-white/95">
            <div className="rounded-xl bg-white/10 border border-white/10 p-4">
              <div className="font-bold mb-1">{ar ? "🧠 هذا اختبار سلوكي" : "🧠 Behavioral assessment"}</div>
              <div className="text-white/85">
                {ar ? "يقيس السلوك وليس المعرفة." : "Measures behavior—not knowledge."}
              </div>
            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 p-4">
              <div className="font-bold mb-1">{ar ? "⏱️ المدة 20 دقيقة" : "⏱️ 20 minutes"}</div>
              <div className="text-white/85">
                {ar ? "عند انتهاء الوقت سيتم الإرسال تلقائيًا." : "When time ends, it auto-submits."}
              </div>
            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 p-4">
              <div className="font-bold mb-1">{ar ? "🎯 لا صح/خطأ" : "🎯 No right/wrong"}</div>
              <div className="text-white/85">
                {ar ? "الأسئلة مواقف واقعية—اختر ما ستفعله فعلاً في الميدان." : "Scenario-based—choose what you’d actually do in the field."}
              </div>
            </div>
          </div>

          <div className="mt-5 text-xs text-white/80 text-center">
            {ar ? "🔒 لن نشارك بياناتك مع أي طرف." : "🔒 We don’t share your data with third parties."}
          </div>

          {/* ✅ Choose ONE: go to login OR go to quiz. 
              If your flow requires login first, keep /login.
              If quiz starts directly, change to your quiz route. */}
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white text-slate-900 font-extrabold h-12 transition hover:bg-white/90 shadow-lg"
          >
            {ar ? "متابعة إلى تسجيل الدخول 🔐" : "Continue to login 🔐"}
          </Link>

          <div className="mt-3 text-center">
            <Link href="/welcome" className="text-xs text-white/80 underline underline-offset-4">
              {ar ? "⬅️ رجوع" : "⬅️ Back"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
