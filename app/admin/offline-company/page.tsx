import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import OfflineCompanyActivation from "./OfflineCompanyActivation";
import { CONTROL_CENTER_RETURN_HEADER, offlineAdminLoginUrl } from "@/lib/admin-return-url";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offline Company Activation",
  robots: { index: false, follow: false },
};

export default function OfflineCompanyPage() {
  const session = cookies().get(OFFLINE_ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    redirect(offlineAdminLoginUrl(headers().get(CONTROL_CENTER_RETURN_HEADER), "/admin/offline-company"));
  }
  return <OfflineCompanyActivation />;
}
