import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreditDetail } from "@/components/admin/credit-detail";
import { getCreditDetail } from "@/modules/credits/credit-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Credit Account | Career Labs AI", robots: { index: false, follow: false } };

export default async function CreditDetailPage({ params }: { params: { companyId: string } }) {
  const credit = await getCreditDetail(params.companyId);
  if (!credit) notFound();
  return <CreditDetail credit={credit} />;
}
