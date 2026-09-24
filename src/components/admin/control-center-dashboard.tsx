import Link from "next/link";
import { Activity, BarChart3, Building2, CheckCircle2, Coins, FileText, Gift, KeyRound, Settings, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ControlCenterDashboard } from "@/modules/control-center/dashboard-service";

const metricCards = [
  { key: "totalCompanies", label: "Total Companies", helper: "Active company records", icon: Building2, tone: "bg-blue-50 text-blue-700" },
  { key: "totalParticipants", label: "Participants", helper: "Assessment attempts", icon: Users, tone: "bg-violet-50 text-violet-700" },
  { key: "totalReports", label: "Reports", helper: "Completed attempts", icon: FileText, tone: "bg-emerald-50 text-emerald-700" },
  { key: "creditsRemaining", label: "Credits Remaining", helper: "Across company packages", icon: Coins, tone: "bg-amber-50 text-amber-700" },
  { key: "complimentaryAccessIssued", label: "Complimentary Access Issued", helper: "Typed complimentary access tokens", icon: Gift, tone: "bg-rose-50 text-rose-700" },
  { key: "todaysAttempts", label: "Today’s Attempts", helper: "Created since 00:00 UTC", icon: Activity, tone: "bg-cyan-50 text-cyan-700" },
  { key: "completedToday", label: "Completed Today", helper: "Completed since 00:00 UTC", icon: CheckCircle2, tone: "bg-teal-50 text-teal-700" },
] as const;

export function ControlCenterDashboardView({ dashboard }: { dashboard: ControlCenterDashboard }) {
  return <div className="space-y-8">
    <header className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Executive overview</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Control Center</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Live operational visibility across companies, participants, credits, issuance, and completions.</p>
    </header>

    <section aria-labelledby="platform-kpis" className="space-y-4">
      <div><h2 id="platform-kpis" className="text-xl font-black text-slate-950">Platform metrics</h2><p className="mt-1 text-sm text-slate-500">Live totals from existing production records.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ key, label, helper, icon: Icon, tone }) => {
          const value = dashboard[key];
          return <Card key={key} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className={`mt-2 font-black tracking-tight text-slate-950 ${value === null ? "text-lg" : "text-3xl tabular-nums"}`}>{value === null ? "Not Available" : value.toLocaleString("en-US")}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span></div><p className="mt-3 text-xs text-slate-500">{helper}</p></CardContent></Card>;
        })}
      </div>
    </section>

    <section aria-labelledby="workspace-links" className="space-y-4">
      <div><h2 id="workspace-links" className="text-xl font-black text-slate-950">Operational workspaces</h2><p className="mt-1 text-sm text-slate-500">Move directly into the production modules available today.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[{ href: "/admin/companies", label: "Companies", detail: "Company profiles and reporting", icon: Building2 }, { href: "/admin/participants", label: "Participants", detail: "Attempt and completion records", icon: Users }, { href: "/admin/credits", label: "Credits", detail: "Package balances and history", icon: Coins }, { href: "/admin/access-center", label: "Assessment Access", detail: "Company and individual issuance", icon: KeyRound }, { href: "/admin/complimentary", label: "Complimentary Access", detail: "Governed complimentary issuance", icon: Gift }, { href: "/admin/system-tools", label: "System Tools", detail: "Safe administrative diagnostics", icon: ShieldCheck }].map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Icon className="h-6 w-6 text-blue-700" aria-hidden="true" /><h3 className="mt-4 font-black text-slate-950">{label}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></Link>)}
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2" aria-label="Recent operations">
      <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-700" aria-hidden="true" /><h2 className="text-xl font-black">Recent activity</h2></div><div className="mt-4 divide-y">{dashboard.recentActivity.length ? dashboard.recentActivity.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-3"><div><p className="font-bold text-slate-950">{item.label}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.detail}</p></div><time className="shrink-0 text-xs text-slate-500">{dateTimeLabel(item.occurredAt)}</time></div>) : <p className="py-6 text-sm text-slate-500">No successful administrative activity is recorded yet.</p>}</div></CardContent></Card>
      <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" /><h2 className="text-xl font-black">Recent completions</h2></div><div className="mt-4 divide-y">{dashboard.recentCompletions.length ? dashboard.recentCompletions.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-3"><div><p className="font-bold text-slate-950">{item.participant}</p><p className="mt-1 text-xs text-slate-500">{item.assessment}</p></div><time className="shrink-0 text-xs text-slate-500">{dateTimeLabel(item.completedAt)}</time></div>) : <p className="py-6 text-sm text-slate-500">No completed assessments are recorded yet.</p>}</div></CardContent></Card>
    </section>

    <section aria-labelledby="product-activity" className="space-y-4"><div><h2 id="product-activity" className="text-xl font-black">Assessment activity</h2><p className="mt-1 text-sm text-slate-500">Stored assessment attempts by product.</p></div><Card className="border-slate-200 shadow-sm"><CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{dashboard.productActivity.length ? dashboard.productActivity.map((item) => <div key={item.assessment} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold capitalize text-slate-700">{item.assessment}</span><span className="font-black tabular-nums text-slate-950">{item.attempts.toLocaleString("en-US")}</span></div>) : <p className="text-sm text-slate-500">No product activity is available.</p>}</CardContent></Card></section>

    <section aria-labelledby="planned-capabilities" className="space-y-4">
      <div><h2 id="planned-capabilities" className="text-xl font-black text-slate-950">Planned capabilities</h2><p className="mt-1 text-sm text-slate-500">Reserved areas remain inactive until their implementation milestones.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[{ label: "Report analytics workspace", detail: "Cross-company trends and executive reporting will appear here when approved.", icon: BarChart3 }, { label: "Platform settings", detail: "Central configuration will become available through a controlled future milestone.", icon: Settings }].map(({ label, detail, icon: Icon }) => <Card key={label} className="border-dashed border-slate-300 bg-slate-50/70"><CardContent className="p-5"><Icon className="h-5 w-5 text-slate-500" aria-hidden="true" /><h3 className="mt-3 font-bold text-slate-800">{label}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p></CardContent></Card>)}
      </div>
    </section>
  </div>;
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
