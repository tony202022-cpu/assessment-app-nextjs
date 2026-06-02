"use client";

import { useState } from "react";

export default function EmailReportButton() {
  const [open, setOpen] = useState(false);
const [email, setEmail] = useState("");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              📧 Email This Report
            </h3>

            <p className="text-slate-600 mb-4">
              Enter your email address.
            </p>

         <input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter your email"
  className="w-full rounded-xl border border-slate-300 px-4 py-3 mb-4"
/>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 font-bold"
            >
              Close
            </button>

          </div>
        </div>
      )}
    </>
  );
}