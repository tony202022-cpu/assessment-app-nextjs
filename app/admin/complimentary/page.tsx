import type { Metadata } from "next";
import { ComplimentaryHome } from "@/components/admin/complimentary-home";
import { listComplimentaryAssessments } from "@/modules/complimentary/complimentary-access-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complimentary Access | Career Labs AI", robots: { index: false, follow: false } };

export default async function ComplimentaryPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const result = await listComplimentaryAssessments({ search: q });
  return <ComplimentaryHome result={result} />;
}
