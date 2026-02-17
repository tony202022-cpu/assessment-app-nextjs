// FILE: app/reports/pdf/scan/[attemptId]/page.tsx
import ReportPage from "@/app/(site)/[slug]/report/page";

export default function PdfScanReport(props: any) {
  // We reuse the existing scan report renderer, but force slug="scan"
  return ReportPage({
    params: { slug: "scan" },
    searchParams: { attemptId: props.params.attemptId, lang: props.searchParams?.lang },
  } as any);
}
