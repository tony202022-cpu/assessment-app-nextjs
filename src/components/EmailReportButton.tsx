"use client";

import { useState } from "react";

export default function EmailReportButton({ arabic = false }: { arabic?: boolean }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      alert(arabic ? "يرجى إدخال بريدك الإلكتروني" : "Please enter your email address");
      return;
    }

    try {
      setSending(true);

const response = await fetch("/api/send-report", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    reportUrl: window.location.href,
  }),
});

if (!response.ok) {
  throw new Error("Failed to send email");
}

setSuccess(true);

setTimeout(() => {
  setSuccess(false);
}, 3000);

    } catch (err) {
      alert(arabic ? "حدث خطأ أثناء إرسال التقرير" : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full lg:w-auto">

      <div className="flex flex-col sm:flex-row gap-3">

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={arabic ? "أدخل بريدك الإلكتروني" : "Enter your email"}
          className="w-full sm:w-72 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 transition-all shadow-lg text-sm min-h-[44px] disabled:opacity-50"
        >
          {sending
            ? arabic ? "جارٍ الإرسال..." : "Sending..."
            : arabic ? "📧 إرسال تقريري عبر البريد الإلكتروني" : "📧 Send My Report by Email"}
        </button>

      </div>

      {success && (
        <div className="text-sm font-bold text-green-700">
          {arabic ? "✅ تم إرسال التقرير بنجاح" : "✅ Report sent successfully"}
        </div>
      )}

    </div>
  );
}
