"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const ResultsClient = dynamic(() => import("./ResultsClient"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResultsClient />
    </Suspense>
  );
}
