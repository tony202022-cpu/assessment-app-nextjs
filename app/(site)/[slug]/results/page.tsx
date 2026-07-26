import "server-only";

import { redirect } from "next/navigation";
import { isOfflineActivatedOutdoorMriAttempt } from "@/lib/offline-attempt-access";
import ResultsClient from "./ResultsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: { attemptId?: string | string[] };
};

function getAttemptId(searchParams: PageProps["searchParams"]) {
  const value = searchParams?.attemptId;
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const attemptId = getAttemptId(searchParams);

  if (attemptId && (await isOfflineActivatedOutdoorMriAttempt(attemptId))) {
    redirect(
      `/outdoor-mri/completed?attemptId=${encodeURIComponent(attemptId)}`,
    );
  }

  return <ResultsClient />;
}
