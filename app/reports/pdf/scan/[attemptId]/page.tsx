// FILE: app/reports/pdf/scan/[attemptId]/page.tsx

import ReportPage from "../../../../(site)/[slug]/report/page";

export default function PdfScanReport(props: any) {
  // Reuse the existing report renderer, but force slug="scan"
  return ReportPage({
    params: { slug: "scan" },
    searchParams: {
      attemptId: props.params.attemptId,
      lang: props.searchParams?.lang,
    },
  } as any);
}
