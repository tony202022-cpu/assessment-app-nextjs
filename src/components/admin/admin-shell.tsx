import Link from "next/link";
import { Building2, Coins, FlaskConical, Gift, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, enabled: true },
  { label: "Companies", href: "/admin/companies", icon: Building2, enabled: true },
  { label: "Participants", href: "/admin/participants", icon: Users, enabled: true },
  { label: "Credits", href: "/admin/credits", icon: Coins, enabled: true },
  { label: "Complimentary Access", href: "/admin/complimentary", icon: Gift, enabled: true },
  { label: "System Tools", href: "/admin/assessment-access", icon: FlaskConical, enabled: true },
  { label: "Settings", href: "#", icon: Settings, enabled: false },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950 px-5 py-7 text-white lg:flex lg:flex-col">
          <Link href="/admin/companies" className="flex items-center gap-3 rounded-2xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-950/40">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black tracking-wide">CAREER LABS AI</span>
              <span className="block text-xs text-slate-400">Control Center</span>
            </span>
          </Link>

          <nav className="mt-10 space-y-1" aria-label="Administration">
            {navigation.map((item) => {
              const Icon = item.icon;
              return item.enabled ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600" aria-disabled="true">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Milestone 5</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Companies and participants are read-only. Attempts, reports, credits, and tokens cannot be changed here.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="lg:hidden">
                <p className="text-sm font-black tracking-wide text-slate-950">CAREER LABS AI</p>
                <p className="text-xs text-slate-500">Control Center · Read-only operations</p>
              </div>
              <nav className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Mobile administration">
                <Link href="/admin" className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Overview</Link>
                <Link href="/admin/companies" className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Companies</Link>
                <Link href="/admin/participants" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Participants</Link>
                <Link href="/admin/credits" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Credits</Link>
                <Link href="/admin/complimentary" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Complimentary</Link>
                <Link href="/admin/assessment-access" className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">System Tools</Link>
              </nav>
              <div className="ms-auto hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Read-only operations
              </div>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
