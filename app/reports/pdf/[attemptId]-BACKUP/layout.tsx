// app/reports/pdf/[attemptId]/layout.tsx
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PdfLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

