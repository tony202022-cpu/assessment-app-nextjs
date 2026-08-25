import type { Metadata } from "next";
import OfflineCompanyActivation from "./OfflineCompanyActivation";
import { normalizeControlCenterReturnUrl } from "@/lib/admin-return-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offline Company Activation",
  robots: { index: false, follow: false },
};

export default function OfflineCompanyPage({ searchParams }: { searchParams?: { returnTo?: string | string[] } }) {
  const rawReturnUrl = Array.isArray(searchParams?.returnTo) ? searchParams?.returnTo[0] : searchParams?.returnTo;
  return <OfflineCompanyActivation returnTo={normalizeControlCenterReturnUrl(rawReturnUrl)} />;
}
