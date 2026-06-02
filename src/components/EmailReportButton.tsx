"use client";

import { useState } from "react";

export default function EmailReportButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      alert("Please enter your email address");
      return;
    }

    try {
      setSending(true);

      // TEMPORARY
      // next step will call Supabase Edge Function

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);

      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setEmail("");
      }, 2500);

    } catch (err) {
      alert("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 transition-all shadow-lg text-sm min-h-[44px] w-full sm:w-auto"
      >
        📧 Email My Report
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="relative z-[10000] w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              📧 Email This Report
            </h3>

            <p className="text-slate-600 mb-4">
              Enter your email address and we'll send you a link to access this report anytime.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 mb-4"
            />

            {success && (
              <div className="mb-4 rounded-xl bg-green-100 text-green-800 px-4 py-3 font-bold">
                ✅ Report sent successfully
              </div>
            )}

            <div className="flex gap-3">

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-3 font-bold disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Report"}
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}