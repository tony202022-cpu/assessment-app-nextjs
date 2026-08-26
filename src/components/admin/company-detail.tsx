import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, CalendarDays, CheckCircle2, ExternalLink, Mail, Target, TrendingDown, TrendingUp, Users } from "lucide-react";
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

export function CompanyDetail({ company, canRestoreCredit }: { company: CompanyDetailModel; canRestoreCredit: boolean }) {
  const reports = company.participants.filter((participant) => participant.reportPath);
  const analytics = company.analytics;
  const maximumDistribution = Math.max(1, ...analytics.scoreDistribution.map((bucket) => bucket.count));

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

      <section aria-labelledby="executive-metrics-title" className="space-y-4">
        <div><h2 id="executive-metrics-title" className="text-xl font-black text-slate-950">Executive metrics</h2><p className="mt-1 text-sm text-slate-500">Operational analytics derived only from stored attempt and report values.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Completion Rate" value={analytics.completionRate === null ? "Not Available" : `${analytics.completionRate}%`} helper="Completed attempts / total attempts" />
          <Metric label="Average Score" value={analytics.averageScore === null ? "Not Available" : `${analytics.averageScore}%`} helper="Stored completed percentages" />
          <Metric label="Highest Score" value={analytics.highestScore === null ? "Not Available" : `${analytics.highestScore}%`} helper="Highest stored percentage" />
          <Metric label="Lowest Score" value={analytics.lowestScore === null ? "Not Available" : `${analytics.lowestScore}%`} helper="Lowest stored percentage" />
          <Metric label="Completed Reports" value={analytics.completedReports} helper="Reports currently available" />
          <Metric label="In Progress" value={analytics.inProgress} helper="Attempts with saved progress" />
          <Metric label="Not Started" value={analytics.notStarted} helper="Attempts without saved answers" />
          <Metric label="Expired" value={analytics.expired} helper="Expired before completion" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Strongest competency</p><p className="mt-1 font-black text-slate-950">{analytics.strongestCompetency?.name || "Not Available"}</p></div></div>{analytics.strongestCompetency ? <p className="mt-4 text-2xl font-black tabular-nums text-emerald-700">{analytics.strongestCompetency.percentage}%</p> : <p className="mt-4 text-sm text-slate-500">No stored competency percentages are available.</p>}</CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><TrendingDown className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Development priority</p><p className="mt-1 font-black text-slate-950">{analytics.weakestCompetency?.name || "Not Available"}</p></div></div>{analytics.weakestCompetency ? <p className="mt-4 text-2xl font-black tabular-nums text-amber-700">{analytics.weakestCompetency.percentage}%</p> : <p className="mt-4 text-sm text-slate-500">No stored competency percentages are available.</p>}</CardContent></Card>
        </div>
      </section>

      <section aria-labelledby="participants-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="participants-title" className="text-xl font-black text-slate-950">Participants</h2><p className="mt-1 text-sm text-slate-500">Read-only attempts belonging to this company.</p></div><Badge variant="secondary" className="gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden="true" />{company.participants.length} participants</Badge></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Participant status summary">
          {[{ label: "Total", value: company.participants.length }, { label: "Completed", value: analytics.completed }, { label: "In Progress", value: analytics.inProgress }, { label: "Expired", value: analytics.expired }, { label: "Not Started", value: analytics.notStarted }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-1 text-xl font-black tabular-nums text-slate-950">{item.value}</p></div>)}
        </div>
        {company.participants.length ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead><TableHead className="text-right">Overall %</TableHead><TableHead className="text-right">Report</TableHead></TableRow></TableHeader>
              <TableBody>{company.participants.map((participant) => <TableRow key={participant.attemptId}><TableCell><p className="font-semibold text-slate-950">{participant.name}</p><p className="text-xs text-slate-500">{participant.assessment}</p></TableCell><TableCell className="text-slate-600">{participant.email}</TableCell><TableCell><Badge variant="outline" className={participant.status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : participant.status === "Expired" ? "border-rose-200 bg-rose-50 text-rose-800" : participant.status === "Not started" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{participant.status}</Badge></TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateLabel(participant.startedAt)}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateLabel(participant.completedAt)}</TableCell><TableCell className="text-right font-bold tabular-nums">{participant.overallPercentage === null ? "—" : `${participant.overallPercentage}%`}</TableCell><TableCell className="text-right">{participant.reportPath ? <Button asChild variant="outline" size="sm"><Link href={participant.reportPath} target="_blank" rel="noreferrer">Open Report</Link></Button> : <span className="text-xs text-slate-400">Not available</span>}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        ) : <Card className="border-dashed border-slate-300"><CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center"><Users className="h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 font-black text-slate-950">No participants yet</h3><p className="mt-1 text-sm text-slate-500">Company-linked attempts will appear here.</p></CardContent></Card>}
      </section>

      <section aria-labelledby="report-analytics-title" className="space-y-4">
        <div><h2 id="report-analytics-title" className="text-xl font-black text-slate-950">Report analytics</h2><p className="mt-1 text-sm text-slate-500">Read-only distribution of stored overall percentages; no scores are recalculated.</p></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card className="border-slate-200 shadow-sm"><CardContent className="grid grid-cols-2 gap-4 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Average</p><p className="mt-2 text-2xl font-black text-slate-950">{analytics.averageScore === null ? "—" : `${analytics.averageScore}%`}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completion</p><p className="mt-2 text-2xl font-black text-slate-950">{analytics.completionRate === null ? "—" : `${analytics.completionRate}%`}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Highest</p><p className="mt-2 text-2xl font-black text-slate-950">{analytics.highestScore === null ? "—" : `${analytics.highestScore}%`}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lowest</p><p className="mt-2 text-2xl font-black text-slate-950">{analytics.lowestScore === null ? "—" : `${analytics.lowestScore}%`}</p></div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-700" aria-hidden="true" /><h3 className="font-black text-slate-950">Score distribution</h3></div><div className="mt-5 space-y-4">{analytics.scoreDistribution.map((bucket) => <div key={bucket.label}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold text-slate-700">{bucket.label}</span><span className="font-bold tabular-nums text-slate-950">{bucket.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${bucket.label}: ${bucket.count} reports`} aria-valuemin={0} aria-valuemax={maximumDistribution} aria-valuenow={bucket.count}><div className="h-full rounded-full bg-blue-600" style={{ width: `${(bucket.count / maximumDistribution) * 100}%` }} /></div></div>)}</div></CardContent></Card>
        </div>
      </section>

      <section aria-labelledby="reports-title" className="space-y-4">
        <div><h2 id="reports-title" className="text-xl font-black text-slate-950">Reports</h2><p className="mt-1 text-sm text-slate-500">Completed company reports. Access remains governed by the existing report rules.</p></div>
        {reports.length ? <div className="grid gap-4 lg:grid-cols-2">{reports.map((report) => <Card key={`report-${report.attemptId}`} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-950">{report.name}</p><p className="mt-1 text-sm text-slate-500">{report.assessment}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />Completed {dateLabel(report.completedAt)}</div><div className="mt-5 flex flex-wrap gap-2"><Button asChild size="sm" className="gap-2 bg-slate-950"><Link href={report.reportPath!} target="_blank" rel="noreferrer">Open Report <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></Button><CopyLinkButton path={report.reportPath!} /></div></CardContent></Card>)}</div> : <Card className="border-dashed border-slate-300"><CardContent className="flex min-h-40 flex-col items-center justify-center p-8 text-center"><BarChart3 className="h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 font-black text-slate-950">No completed reports</h3><p className="mt-1 text-sm text-slate-500">Reports appear after company participants complete their assessments.</p></CardContent></Card>}
      </section>

      <FutureActions companyId={company.id} companyName={company.name} canRegenerateManagerToken={company.managerTokenStatus === "Active"} canRestoreCredit={canRestoreCredit} />
    </div>
  );
}
