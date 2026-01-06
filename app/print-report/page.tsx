import { Suspense } from "react";
import PrintReportClient from "./PrintReportClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrintReportClient />
    </Suspense>
  );
}
