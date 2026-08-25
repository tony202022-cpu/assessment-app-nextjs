import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";

export default function ParticipantsAdminLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get(OFFLINE_ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) redirect("/admin/offline-company");
  return <AdminShell>{children}</AdminShell>;
}
