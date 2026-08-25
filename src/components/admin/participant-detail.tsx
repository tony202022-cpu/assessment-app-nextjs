import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, Mail, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { ParticipantFutureActions } from "@/components/admin/participant-future-actions";
import type { ParticipantDetail as ParticipantDetailModel, ParticipantStatus } from "@/modules/participants/participant-service";

function dateLabel(value: string | null, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(date);
}

function StatusBadge({ status }: { status: ParticipantStatus }) {
  const styles: Record<ParticipantStatus, string> = { Completed: "border-emerald-200 bg-emerald-50 text-emerald-800", "In Progress": "border-blue-200 bg-blue-50 text-blue-800", "Not Started": "border-slate-200 bg-slate-50 text-slate-700", Expired: "border-amber-200 bg-amber-50 text-amber-800" };
  return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border-b border-slate-100 py-3 last:border-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4"><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-slate-950 sm:mt-0">{value}</dd></div>;
}

export function ParticipantDetail({ participant }: { participant: ParticipantDetailModel }) {
  const timeline = [
    { label: "Assessment Started", date: participant.startedAt, visible: Boolean(participant.startedAt) },
    { label: "Assessment Completed", date: participant.completedAt, visible: Boolean(participant.completedAt) },
    { label: "Report Generated", date: participant.reportGeneratedAt, visible: Boolean(participant.reportGeneratedAt) },
  ].filter((event) => event.visible);

  return <div className="space-y-7">
    <div><Button asChild variant="ghost" size="sm" className="-ms-3 mb-3 gap-2 text-slate-600"><Link href="/admin/participants"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to participants</Link></Button><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg"><UserRound className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Participant profile</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{participant.fullName}</h1><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" aria-hidden="true" />{participant.email}</p></div></div><StatusBadge status={participant.status} /></div></div>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Participant metrics"><Card><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Percentage</p><p className="mt-2 text-3xl font-black tabular-nums">{participant.percentage === null ? "—" : `${Math.round(participant.percentage)}%`}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Score</p><p className="mt-2 text-3xl font-black tabular-nums">{participant.score ?? "—"}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Answers</p><p className="mt-2 text-3xl font-black tabular-nums">{participant.answersCount}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Competencies</p><p className="mt-2 text-3xl font-black tabular-nums">{participant.competencies.length}</p></CardContent></Card></section>

    <section className="grid gap-6 xl:grid-cols-2" aria-label="Participant attempt information">
      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Attempt details</CardTitle></CardHeader><CardContent><dl><Fact label="Name" value={participant.fullName} /><Fact label="Email" value={participant.email} /><Fact label="Company" value={participant.company} /><Fact label="Assessment" value={participant.assessment} /><Fact label="Attempt ID" value={<code className="text-xs">{participant.attemptId}</code>} /><Fact label="Status" value={<StatusBadge status={participant.status} />} /><Fact label="Started" value={dateLabel(participant.startedAt)} /><Fact label="Completed" value={dateLabel(participant.completedAt)} /><Fact label="Score" value={participant.score ?? "—"} /><Fact label="Percentage" value={participant.percentage === null ? "—" : `${Math.round(participant.percentage)}%`} /><Fact label="Answers" value={participant.answersCount} /><Fact label="Report Status" value={participant.reportStatus} /></dl></CardContent></Card>
      <div className="space-y-6"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-700" aria-hidden="true" />Competencies</CardTitle></CardHeader><CardContent>{participant.competencies.length ? <div className="space-y-3">{participant.competencies.map((competency, index) => <div key={`${competency.name}-${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold">{competency.name}</span><span className="font-black tabular-nums">{competency.percentage === null ? "—" : `${Math.round(competency.percentage)}%`}</span></div>)}</div> : <p className="text-sm text-slate-500">No competency results are stored for this attempt.</p>}</CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-blue-700" aria-hidden="true" />Timeline</CardTitle></CardHeader><CardContent>{timeline.length ? <ol className="space-y-4">{timeline.map((event) => <li key={event.label} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><p className="text-sm font-bold">{event.label}</p><time className="text-xs text-slate-500">{dateLabel(event.date)}</time></div></li>)}</ol> : <p className="text-sm text-slate-500">No assessment activity has been recorded.</p>}</CardContent></Card></div>
    </section>

    <section aria-labelledby="participant-report" className="space-y-4"><div><h2 id="participant-report" className="text-xl font-black">Report</h2><p className="mt-1 text-sm text-slate-500">Read-only access to the existing report surface.</p></div><Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex gap-3"><FileText className="h-5 w-5 text-blue-700" aria-hidden="true" /><div><p className="font-bold">Assessment report</p><p className="text-sm text-slate-500">{participant.reportStatus}</p></div></div>{participant.reportPath ? <div className="flex flex-wrap gap-2"><Button asChild size="sm" className="gap-2 bg-slate-950"><Link href={participant.reportPath} target="_blank" rel="noreferrer">Open Report <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></Button><CopyLinkButton path={participant.reportPath} label="Copy Report Link" /></div> : <Button size="sm" variant="outline" disabled>Report unavailable</Button>}</CardContent></Card></section>

    <ParticipantFutureActions />
  </div>;
}
