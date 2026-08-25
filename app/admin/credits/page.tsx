import type { Metadata } from "next";
import { CreditsList } from "@/components/admin/credits-list";
import { listCredits } from "@/modules/credits/credit-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Credits | Career Labs AI", robots: { index: false, follow: false } };

export default async function CreditsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const result = await listCredits({ search: first(searchParams.q), sort: first(searchParams.sort), direction: first(searchParams.direction), page: first(searchParams.page) });
  return <CreditsList result={result} />;
}
