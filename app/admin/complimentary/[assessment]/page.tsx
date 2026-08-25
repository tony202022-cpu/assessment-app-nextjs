import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplimentaryDetail } from "@/components/admin/complimentary-detail";
import { getComplimentaryAssessmentDetail } from "@/modules/complimentary/complimentary-access-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complimentary Assessment | Career Labs AI", robots: { index: false, follow: false } };

export default async function ComplimentaryAssessmentPage({ params, searchParams }: { params: { assessment: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const detail = await getComplimentaryAssessmentDetail(params.assessment, { search: first(searchParams.q), filter: first(searchParams.filter) });
  if (!detail) notFound();
  return <ComplimentaryDetail detail={detail} />;
}
