import type { Metadata } from "next";
import { CompaniesList } from "@/components/admin/companies-list";
import { listCompanies } from "@/modules/companies/company-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Companies | Career Labs AI Control Center",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: {
    q?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    direction?: string;
  };
};

export default async function CompaniesPage({ searchParams }: PageProps) {
  const result = await listCompanies({
    search: searchParams?.q,
    page: searchParams?.page,
    pageSize: searchParams?.pageSize,
    sort: searchParams?.sort,
    direction: searchParams?.direction,
  });

  return <CompaniesList result={result} />;
}

