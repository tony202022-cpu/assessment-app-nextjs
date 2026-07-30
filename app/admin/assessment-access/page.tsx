import type { Metadata } from "next";
import AssessmentAccessConsole from "./AssessmentAccessConsole";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer Test Mode",
  robots: { index: false, follow: false },
};

export default function AssessmentAccessPage() {
  return <AssessmentAccessConsole />;
}
