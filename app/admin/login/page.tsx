import type { Metadata } from "next";
import AdminLogin from "./AdminLogin";
import { normalizeControlCenterReturnUrl } from "@/lib/admin-return-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({ searchParams }: { searchParams?: { returnTo?: string | string[] } }) {
  const rawReturnUrl = Array.isArray(searchParams?.returnTo) ? searchParams.returnTo[0] : searchParams?.returnTo;
  return <AdminLogin returnTo={normalizeControlCenterReturnUrl(rawReturnUrl) || "/admin"} />;
}
