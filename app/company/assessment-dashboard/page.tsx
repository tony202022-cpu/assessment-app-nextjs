import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { loadCompanyAssessmentDashboard } from "@/modules/company-assessment-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Company Assessment Dashboard | Career Labs AI",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ managerToken?: string | string[]; assessment?: string | string[] }> };
const first = (value: string | string[] | undefined) => String(Array.isArray(value) ? value[0] : value || "").trim();

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(date);
}

function AccessDenied() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="max-w-md text-center"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3 text-slate-300">This private manager dashboard link is invalid, expired, revoked, or is not enabled for the selected assessment.</p></div></main>;
}

const statusLabels = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed" } as const;

export default async function AssessmentDashboard({ searchParams }: Props) {
  const query = await searchParams;
  const result = await loadCompanyAssessmentDashboard({ managerToken: first(query.managerToken), assessmentSlug: first(query.assessment) });
  if (!result.ok) return <AccessDenied />;

  const { company, assessment, credits, participants } = result.data;
  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <section className="bg-slate-950 px-6 py-10 text-white"><div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Private Manager Dashboard</p><h1 className="mt-2 text-3xl font-black">{assessment.name}</h1><p className="mt-2 text-slate-300">{company.name}</p></div></section>
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Package / allocated", credits.allocated],
        ["Used", credits.used],
        ["Remaining", credits.remaining],
        ["Participants", participants.length],
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b p-5"><h2 className="text-xl font-black">Participants</h2><p className="mt-1 text-sm text-slate-500">Only attempts belonging to this company and assessment are shown.</p></div>
        <div className="divide-y">{participants.map(participant => <article key={participant.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
          <div><p className="font-bold">{participant.name}</p><p className="text-sm text-slate-500">{participant.email || "Email unavailable"}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${participant.status === "completed" ? "bg-emerald-50 text-emerald-700" : participant.status === "in-progress" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{statusLabels[participant.status]}</span></div>
          <dl className="grid grid-cols-3 gap-3 text-sm"><div><dt className="text-slate-500">Created</dt><dd className="font-semibold">{formatDate(participant.createdAt)}</dd></div><div><dt className="text-slate-500">Started</dt><dd className="font-semibold">{formatDate(participant.startedAt)}</dd></div><div><dt className="text-slate-500">Completed</dt><dd className="font-semibold">{formatDate(participant.completedAt)}</dd></div></dl>
          <div className="flex min-w-32 flex-col items-end gap-2">{assessment.scoreSupported && participant.percentage != null ? <p className="text-2xl font-black">{Math.round(participant.percentage)}%</p> : null}{participant.reportPath ? <Link className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white" href={participant.reportPath}>View Report</Link> : <span className="text-sm font-semibold text-slate-400">{participant.status === "completed" && !assessment.managerReportSupported ? "Manager report unavailable" : participant.status === "completed" ? "Report restricted" : "Report not available"}</span>}</div>
        </article>)}{participants.length === 0 ? <p className="p-8 text-center text-slate-500">No participant attempts yet.</p> : null}</div>
      </section>
    </div>
  </main>;
}
