import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { CONTROL_CENTER_RETURN_HEADER, offlineAdminLoginUrl } from "@/lib/admin-return-url";

export default function CompaniesAdminLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get(OFFLINE_ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    redirect(offlineAdminLoginUrl(headers().get(CONTROL_CENTER_RETURN_HEADER), "/admin/companies"));
  }

  return <AdminShell>{children}</AdminShell>;
}
