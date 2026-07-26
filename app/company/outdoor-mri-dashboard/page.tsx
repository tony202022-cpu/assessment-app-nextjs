import "server-only";

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PackageCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { MRI_REPORT_SECTIONS } from "@/lib/reportSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Outdoor Sales MRI | Company Results",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: { managerToken?: string | string[] };
};

type CompanyRow = {
  id: string;
  name: string | null;
  package_size: number | null;
  credits_balance: number | null;
  is_offline_activated: boolean;
};

type AttemptRow = {
  id: string;
  full_name: string | null;
  user_email: string | null;
  company: string | null;
  created_at: string | null;
  completed_at: string | null;
  total_percentage: number | null;
  competency_results: unknown;
};

type WeakCompetency = {
  id: string;
  label: string;
  percentage: number;
};

const competencyLabels: Record<string, string> = Object.fromEntries(
  MRI_REPORT_SECTIONS.filter((section) => section.type === "competency").map(
    (section) => ["key" in section ? section.key : "", section.title_en]
  )
);

competencyLabels.dealing_with_boss = "Managing Up & Internal Alignment";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getManagerToken(value: PageProps["searchParams"]): string {
  const token = value?.managerToken;
  return (Array.isArray(token) ? token[0] : token || "").trim();
}

function isCompleted(attempt: AttemptRow): boolean {
  const results = Array.isArray(attempt.competency_results)
    ? attempt.competency_results
    : [];

  return Number(attempt.total_percentage || 0) > 0 || results.length > 0;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function weakestSix(value: unknown): WeakCompetency[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => {
      const id = String(item?.competencyId || item?.key || "").trim();
      const percentage = Math.max(
        0,
        Math.min(100, Math.round(Number(item?.percentage) || 0))
      );

      return {
        id,
        label:
          competencyLabels[id] ||
          String(item?.name || id.replace(/_/g, " ") || "Competency"),
        percentage,
      };
    })
    .filter((item) => item.id)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 6);
}

function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-white">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This private company dashboard link is missing or invalid.
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function OutdoorMriCompanyDashboard({ searchParams }: PageProps) {
  const managerToken = getManagerToken(searchParams);
  const supabase = getSupabaseAdmin();

  if (!managerToken || !supabase) return <AccessDenied />;

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("id, name, package_size, credits_balance, is_offline_activated")
    .eq("manager_token", managerToken)
    .maybeSingle();

  if (companyError || !companyData) return <AccessDenied />;

  const company = companyData as CompanyRow;

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("id")
    .eq("slug", "outdoor-mri")
    .maybeSingle();

  if (assessmentError || !assessment?.id) return <AccessDenied />;

  const { data: attemptData, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select(
      "id, full_name, user_email, company, created_at, completed_at, total_percentage, competency_results"
    )
    .eq("company_id", company.id)
    .eq("assessment_id", assessment.id)
    .order("created_at", { ascending: false });

  if (attemptsError) return <AccessDenied />;

  const attempts = (attemptData || []) as AttemptRow[];
  const packageSize = Math.max(0, Number(company.package_size ?? 0));
  const creditsRemaining = Math.max(0, Number(company.credits_balance ?? 0));
  const creditsUsed = Math.max(0, packageSize - creditsRemaining);
  const completedCount = attempts.filter(isCompleted).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                <ShieldCheck size={15} /> Private Manager / HR Dashboard
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                Outdoor Sales MRI Results
              </h1>
              <div className="mt-4 flex items-center gap-2 text-slate-300">
                <Building2 size={18} className="text-blue-300" />
                <span className="font-semibold">{company.name || "Company"}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Completion
              </p>
              <p className="mt-1 text-2xl font-black">
                {completedCount}{" "}
                <span className="text-base text-slate-400">of {attempts.length}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Package size"
            value={packageSize}
            helper="Outdoor Sales MRI assessments"
            icon={<PackageCheck size={22} />}
          />
          <SummaryCard
            label="Credits used"
            value={creditsUsed}
            helper="Assessment starts consumed"
            icon={<UsersRound size={22} />}
          />
          <SummaryCard
            label="Credits remaining"
            value={creditsRemaining}
            helper="Available participant starts"
            icon={<Clock3 size={22} />}
          />
          <SummaryCard
            label="Completed"
            value={completedCount}
            helper="Reports currently available"
            icon={<CheckCircle2 size={22} />}
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-xl font-black">Participant results</h2>
              <p className="mt-1 text-sm text-slate-500">
                Participants connected to this company&apos;s Outdoor Sales MRI package.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {attempts.length} participant{attempts.length === 1 ? "" : "s"}
            </span>
          </div>

          {attempts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UsersRound className="mx-auto text-slate-300" size={42} />
              <h3 className="mt-4 font-bold text-slate-900">No participant attempts yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Results will appear here after participants start the assessment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1460px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Participant</th>
                    <th className="px-5 py-4 font-bold">Email</th>
                    <th className="px-5 py-4 font-bold">Company</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold">Started</th>
                    <th className="px-5 py-4 font-bold">Completed</th>
                    <th className="px-5 py-4 font-bold">Overall</th>
                    <th className="px-5 py-4 font-bold">Weakest 6 competencies</th>
                    <th className="px-5 py-4 font-bold">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((attempt) => {
                    const completed = isCompleted(attempt);
                    const weakCompetencies = weakestSix(attempt.competency_results);
                    const reportUrl = company.is_offline_activated
                      ? `https://app.careerlabsai.com/outdoor-mri/report?attemptId=${attempt.id}&managerToken=${encodeURIComponent(managerToken)}`
                      : `https://app.careerlabsai.com/outdoor-mri/report?attemptId=${attempt.id}`;

                    return (
                      <tr key={attempt.id} className="align-top hover:bg-slate-50/70">
                        <td className="px-5 py-5 font-bold text-slate-900">
                          {attempt.full_name || "—"}
                        </td>
                        <td className="px-5 py-5 text-slate-600">
                          {attempt.user_email || "—"}
                        </td>
                        <td className="px-5 py-5 text-slate-600">
                          {attempt.company || "—"}
                        </td>
                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              completed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {completed ? "Completed" : "Started / In Progress"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                          {formatDate(attempt.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                          {completed ? formatDate(attempt.completed_at) : "—"}
                        </td>
                        <td className="px-5 py-5">
                          <span className="text-lg font-black text-slate-950">
                            {completed
                              ? `${Math.round(Number(attempt.total_percentage) || 0)}%`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          {weakCompetencies.length ? (
                            <div className="flex max-w-xl flex-wrap gap-1.5">
                              {weakCompetencies.map((competency) => (
                                <span
                                  key={competency.id}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                >
                                  {competency.label} · {competency.percentage}%
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-5">
                          {completed ? (
                            <a
                              href={reportUrl}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              View report <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Not available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
