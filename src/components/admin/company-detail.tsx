import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, CalendarDays, CheckCircle2, ExternalLink, Mail, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompanyDetail as CompanyDetailModel } from "@/modules/companies/company-service";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { FutureActions } from "@/components/admin/future-actions";

function dateLabel(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{value}</p>
        {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export function CompanyDetail({ company }: { company: CompanyDetailModel }) {
  const reports = company.participants.filter((participant) => participant.reportPath);

  return (
    <div className="space-y-7">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-3 mb-3 gap-2 text-slate-600">
          <Link href="/admin/companies"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to companies</Link>
        </Button>
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Company profile</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{company.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" aria-hidden="true" />{company.managerContact}</span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />Created {dateLabel(company.createdAt)}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-800">Read-only company record</Badge>
        </div>
      </div>

      <section aria-labelledby="company-overview-title" className="space-y-4">
        <div><h2 id="company-overview-title" className="text-xl font-black text-slate-950">Company overview</h2><p className="mt-1 text-sm text-slate-500">Package and access information from the current production record.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Package Size" value={company.packageSize} helper="Current package allocation" />
          <Metric label="Credits Purchased" value={company.creditsPurchased} helper="Recorded package size" />
          <Metric label="Credits Used" value={company.creditsUsed} helper="Package minus remaining" />
          <Metric label="Credits Remaining" value={company.creditsRemaining} helper="Current stored balance" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Assessment access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assessment Type</p><p className="mt-1 font-semibold text-slate-950">{company.assessment}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Created Date</p><p className="mt-1 font-semibold text-slate-950">{dateLabel(company.createdAt, true)}</p></div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Manager dashboard</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Manager Token Status</p><p className="mt-1 font-semibold text-slate-950">{company.managerTokenStatus}</p></div><Badge variant="outline" className={company.managerDashboardPath ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}>{company.managerDashboardPath ? "Active" : "Unavailable"}</Badge></div>
              {company.managerDashboardPath ? <div className="flex flex-wrap gap-2"><Button asChild size="sm" className="gap-2 bg-slate-950"><Link href={company.managerDashboardPath} target="_blank" rel="noreferrer">Open Dashboard <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></Button><CopyLinkButton path={company.managerDashboardPath} label="Copy Dashboard Link" /></div> : <p className="text-sm text-slate-500">No manager dashboard link is configured.</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="participants-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="participants-title" className="text-xl font-black text-slate-950">Participants</h2><p className="mt-1 text-sm text-slate-500">Read-only attempts belonging to this company.</p></div><Badge variant="secondary" className="gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden="true" />{company.participants.length} participants</Badge></div>
        {company.participants.length ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead><TableHead className="text-right">Overall %</TableHead><TableHead className="text-right">Report</TableHead></TableRow></TableHeader>
              <TableBody>{company.participants.map((participant) => <TableRow key={participant.attemptId}><TableCell><p className="font-semibold text-slate-950">{participant.name}</p><p className="text-xs text-slate-500">{participant.assessment}</p></TableCell><TableCell className="text-slate-600">{participant.email}</TableCell><TableCell><Badge variant="outline" className={participant.status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{participant.status}</Badge></TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateLabel(participant.startedAt)}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateLabel(participant.completedAt)}</TableCell><TableCell className="text-right font-bold tabular-nums">{participant.overallPercentage === null ? "—" : `${participant.overallPercentage}%`}</TableCell><TableCell className="text-right">{participant.reportPath ? <Button asChild variant="outline" size="sm"><Link href={participant.reportPath} target="_blank" rel="noreferrer">Open Report</Link></Button> : <span className="text-xs text-slate-400">Not available</span>}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        ) : <Card className="border-dashed border-slate-300"><CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center"><Users className="h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 font-black text-slate-950">No participants yet</h3><p className="mt-1 text-sm text-slate-500">Company-linked attempts will appear here.</p></CardContent></Card>}
      </section>

      <section aria-labelledby="reports-title" className="space-y-4">
        <div><h2 id="reports-title" className="text-xl font-black text-slate-950">Reports</h2><p className="mt-1 text-sm text-slate-500">Completed company reports. Access remains governed by the existing report rules.</p></div>
        {reports.length ? <div className="grid gap-4 lg:grid-cols-2">{reports.map((report) => <Card key={`report-${report.attemptId}`} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-950">{report.name}</p><p className="mt-1 text-sm text-slate-500">{report.assessment}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />Completed {dateLabel(report.completedAt)}</div><div className="mt-5 flex flex-wrap gap-2"><Button asChild size="sm" className="gap-2 bg-slate-950"><Link href={report.reportPath!} target="_blank" rel="noreferrer">Open Report <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></Button><CopyLinkButton path={report.reportPath!} /></div></CardContent></Card>)}</div> : <Card className="border-dashed border-slate-300"><CardContent className="flex min-h-40 flex-col items-center justify-center p-8 text-center"><BarChart3 className="h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 font-black text-slate-950">No completed reports</h3><p className="mt-1 text-sm text-slate-500">Reports appear after company participants complete their assessments.</p></CardContent></Card>}
      </section>

      <FutureActions />
    </div>
  );
}

