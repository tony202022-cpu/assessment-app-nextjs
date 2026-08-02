import type { Metadata } from "next";
import LawyerSampleReport from "./LawyerSampleReport";

export const metadata: Metadata = {
  title: "نموذج تقرير معيار كسب الموكلين™",
  robots: { index: false, follow: false },
};

export default function LawyerSampleReportPage() {
  return <LawyerSampleReport />;
}
