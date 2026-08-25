import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ControlCenterDashboardView } from "@/components/admin/control-center-dashboard";
import { CONTROL_CENTER_RETURN_HEADER, offlineAdminLoginUrl } from "@/lib/admin-return-url";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { getControlCenterDashboard } from "@/modules/control-center/dashboard-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Control Center Overview", robots: { index: false, follow: false } };

export default async function ControlCenterPage() {
  const session = cookies().get(OFFLINE_ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    redirect(offlineAdminLoginUrl(headers().get(CONTROL_CENTER_RETURN_HEADER), "/admin"));
  }
  const dashboard = await getControlCenterDashboard();
  return <AdminShell><ControlCenterDashboardView dashboard={dashboard} /></AdminShell>;
}
