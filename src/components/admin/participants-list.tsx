import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ParticipantListResult, ParticipantStatus } from "@/modules/participants/participant-service";

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function StatusBadge({ status }: { status: ParticipantStatus }) {
  const styles: Record<ParticipantStatus, string> = {
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    "In Progress": "border-blue-200 bg-blue-50 text-blue-800",
    "Not Started": "border-slate-200 bg-slate-50 text-slate-700",
    Expired: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
}

function queryPath(result: ParticipantListResult, page: number) {
  const params = new URLSearchParams();
  if (result.search) params.set("q", result.search);
  if (result.filter !== "all") params.set("filter", result.filter);
  params.set("sort", result.sort);
  params.set("direction", result.direction);
  params.set("page", String(page));
  return `/admin/participants?${params}`;
}

export function ParticipantsList({ result }: { result: ParticipantListResult }) {
  const firstItem = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastItem = Math.min(result.page * result.pageSize, result.total);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Participant Management</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Participants</h1><p className="mt-2 text-sm text-slate-500">Read-only visibility across assessment attempts.</p></div>
        <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">{result.total} participant attempts</Badge>
      </div>

      <Card className="border-slate-200 shadow-sm"><CardContent className="p-4 sm:p-5">
        <form method="get" className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_150px_auto]" aria-label="Participant search and filters">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /><Input name="q" defaultValue={result.search} placeholder="Name, email, company, assessment, status" className="pl-9" aria-label="Search participants" /></div>
          <select name="filter" defaultValue={result.filter} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter status"><option value="all">All statuses</option><option value="completed">Completed</option><option value="in-progress">In Progress</option><option value="not-started">Not Started</option><option value="expired">Expired</option></select>
          <select name="sort" defaultValue={result.sort} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Sort participants"><option value="name">Name</option><option value="date">Date</option><option value="company">Company</option><option value="completion">Completion</option><option value="score">Score</option></select>
          <select name="direction" defaultValue={result.direction} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Sort direction"><option value="desc">Descending</option><option value="asc">Ascending</option></select>
          <Button type="submit" className="bg-slate-950">Apply</Button>
        </form>
      </CardContent></Card>

      {result.participants.length ? <>
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:block"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Assessment</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead><TableHead className="text-right">Overall Score</TableHead><TableHead className="text-right">Answers</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {result.participants.map((participant) => <TableRow key={participant.id}><TableCell className="font-bold">{participant.fullName}</TableCell><TableCell className="text-slate-600">{participant.email}</TableCell><TableCell>{participant.company}</TableCell><TableCell>{participant.assessment}</TableCell><TableCell><StatusBadge status={participant.status} /></TableCell><TableCell className="whitespace-nowrap">{dateLabel(participant.startedAt)}</TableCell><TableCell className="whitespace-nowrap">{dateLabel(participant.completedAt)}</TableCell><TableCell className="text-right font-bold tabular-nums">{participant.overallScore === null ? "—" : `${Math.round(participant.overallScore)}%`}</TableCell><TableCell className="text-right tabular-nums">{participant.answersCount}</TableCell><TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/admin/participants/${participant.id}`}>View <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button></TableCell></TableRow>)}
        </TableBody></Table></div>
        <div className="grid gap-4 xl:hidden">{result.participants.map((participant) => <Card key={participant.id} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-black">{participant.fullName}</h2><p className="mt-1 break-all text-xs text-slate-500">{participant.email}</p></div><StatusBadge status={participant.status} /></div><p className="mt-4 text-sm font-semibold">{participant.company}</p><p className="mt-1 text-sm text-slate-500">{participant.assessment}</p><dl className="mt-4 grid grid-cols-3 gap-3 border-y py-4 text-center"><div><dt className="text-[11px] uppercase text-slate-500">Started</dt><dd className="mt-1 text-xs font-bold">{dateLabel(participant.startedAt)}</dd></div><div><dt className="text-[11px] uppercase text-slate-500">Score</dt><dd className="mt-1 font-black">{participant.overallScore === null ? "—" : `${Math.round(participant.overallScore)}%`}</dd></div><div><dt className="text-[11px] uppercase text-slate-500">Answers</dt><dd className="mt-1 font-black">{participant.answersCount}</dd></div></dl><div className="mt-4 text-right"><Button asChild size="sm" className="bg-slate-950"><Link href={`/admin/participants/${participant.id}`}>View participant</Link></Button></div></CardContent></Card>)}</div>
      </> : <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><Users className="h-10 w-10 text-slate-300" aria-hidden="true" /><h2 className="mt-4 text-lg font-black">No participants found</h2><p className="mt-2 text-sm text-slate-500">Try a different search term or status filter.</p></CardContent></Card>}

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 sm:flex-row"><p className="text-sm text-slate-600">Showing <strong>{firstItem}–{lastItem}</strong> of <strong>{result.total}</strong></p><div className="flex items-center gap-2">{result.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={queryPath(result, result.page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</Link></Button> : <Button variant="outline" size="sm" disabled><ChevronLeft className="h-4 w-4" /> Previous</Button>}<span className="px-2 text-sm font-semibold">Page {result.page} of {result.totalPages}</span>{result.page < result.totalPages ? <Button asChild variant="outline" size="sm"><Link href={queryPath(result, result.page + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></Button> : <Button variant="outline" size="sm" disabled>Next <ChevronRight className="h-4 w-4" /></Button>}</div></div>
    </div>
  );
}
