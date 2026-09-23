import type { Metadata } from "next";
import AssessmentAccessConsole from "../assessment-access/AssessmentAccessConsole";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "System Tools",
  robots: { index: false, follow: false },
};

export default function SystemToolsPage() {
  return <AssessmentAccessConsole />;
}
