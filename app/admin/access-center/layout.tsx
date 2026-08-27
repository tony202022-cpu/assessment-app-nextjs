import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { CONTROL_CENTER_RETURN_HEADER, offlineAdminLoginUrl } from "@/lib/admin-return-url";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";

export default function AssessmentAccessCenterLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get(OFFLINE_ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    redirect(offlineAdminLoginUrl(headers().get(CONTROL_CENTER_RETURN_HEADER), "/admin/access-center"));
  }
  return <AdminShell>{children}</AdminShell>;
}
