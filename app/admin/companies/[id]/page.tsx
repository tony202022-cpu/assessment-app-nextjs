import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyDetail } from "@/components/admin/company-detail";
import { getCompanyDetail } from "@/modules/companies/company-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Company Profile | Career Labs AI Control Center",
  robots: { index: false, follow: false },
};

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const company = await getCompanyDetail(params.id);
  if (!company) notFound();
  const capabilities = String(process.env.ADMIN_ACTION_CAPABILITIES || "")
    .split(",")
    .map((capability) => capability.trim())
    .filter(Boolean);
  return <CompanyDetail company={company} canRestoreCredit={capabilities.includes("credits.restore")} />;
}
