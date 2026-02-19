"use client";

import React from "react";

interface PrintButtonProps {
  ar: boolean;
  className?: string;
}

export default function PrintButton({ ar, className = "" }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`no-print inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10V9z" />
      </svg>
      {ar ? "تحميل PDF" : "Download PDF"}
    </button>
  );
}
