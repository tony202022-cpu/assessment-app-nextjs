import type { Metadata } from "next";
import OfflineCompanyActivation from "./OfflineCompanyActivation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offline Company Activation",
  robots: { index: false, follow: false },
};

export default function OfflineCompanyPage() {
  return <OfflineCompanyActivation />;
}

