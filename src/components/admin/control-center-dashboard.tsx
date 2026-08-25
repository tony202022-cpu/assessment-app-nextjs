import Link from "next/link";
import { Activity, BarChart3, Building2, CheckCircle2, Coins, FileText, Gift, Settings, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ControlCenterDashboard } from "@/modules/control-center/dashboard-service";

const metricCards = [
  { key: "totalCompanies", label: "Total Companies", helper: "Active company records", icon: Building2, tone: "bg-blue-50 text-blue-700" },
  { key: "totalParticipants", label: "Participants", helper: "Assessment attempts", icon: Users, tone: "bg-violet-50 text-violet-700" },
  { key: "totalReports", label: "Reports", helper: "Completed attempts", icon: FileText, tone: "bg-emerald-50 text-emerald-700" },
  { key: "creditsRemaining", label: "Credits Remaining", helper: "Across company packages", icon: Coins, tone: "bg-amber-50 text-amber-700" },
  { key: "complimentaryAccessIssued", label: "Complimentary Access Issued", helper: "No trusted aggregate field", icon: Gift, tone: "bg-rose-50 text-rose-700" },
  { key: "todaysAttempts", label: "Today’s Attempts", helper: "Created since 00:00 UTC", icon: Activity, tone: "bg-cyan-50 text-cyan-700" },
  { key: "completedToday", label: "Completed Today", helper: "Completed since 00:00 UTC", icon: CheckCircle2, tone: "bg-teal-50 text-teal-700" },
] as const;

export function ControlCenterDashboardView({ dashboard }: { dashboard: ControlCenterDashboard }) {
  return <div className="space-y-8">
    <header className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Executive overview</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Control Center</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">A read-only operational view of companies, participation, reports, and access capacity.</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        {[{ href: "/admin/companies", label: "Companies", detail: "Company profiles and reporting", icon: Building2 }, { href: "/admin/participants", label: "Participants", detail: "Attempt and completion records", icon: Users }, { href: "/admin/credits", label: "Credits", detail: "Package balances and history", icon: Coins }].map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Icon className="h-6 w-6 text-blue-700" aria-hidden="true" /><h3 className="mt-4 font-black text-slate-950">{label}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></Link>)}
      </div>
    </section>

    <section aria-labelledby="planned-capabilities" className="space-y-4">
      <div><h2 id="planned-capabilities" className="text-xl font-black text-slate-950">Planned capabilities</h2><p className="mt-1 text-sm text-slate-500">Reserved areas remain inactive until their implementation milestones.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[{ label: "Report analytics workspace", detail: "Cross-company trends and executive reporting will appear here when approved.", icon: BarChart3 }, { label: "Platform settings", detail: "Central configuration will become available through a controlled future milestone.", icon: Settings }].map(({ label, detail, icon: Icon }) => <Card key={label} className="border-dashed border-slate-300 bg-slate-50/70"><CardContent className="p-5"><Icon className="h-5 w-5 text-slate-500" aria-hidden="true" /><h3 className="mt-3 font-bold text-slate-800">{label}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p></CardContent></Card>)}
      </div>
    </section>
  </div>;
}
