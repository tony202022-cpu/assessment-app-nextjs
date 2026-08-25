import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

export type DashboardMetric = number | null;

export type ControlCenterDashboard = {
  totalCompanies: DashboardMetric;
  totalParticipants: DashboardMetric;
  totalReports: DashboardMetric;
  creditsRemaining: DashboardMetric;
  complimentaryAccessIssued: DashboardMetric;
  todaysAttempts: DashboardMetric;
  completedToday: DashboardMetric;
  generatedAt: string;
};

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function getControlCenterDashboard(): Promise<ControlCenterDashboard> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Control Center metrics are not configured.");

  const now = new Date();
  const today = startOfUtcDay(now);
  const [companies, participants, reports, attemptsToday, completedToday] = await Promise.all([
    supabase.from("companies").select("credits_balance", { count: "exact" }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).gte("completed_at", today),
  ]);

  const credits = companies.error
    ? null
    : (companies.data || []).reduce((total: number, company: any) => {
        const balance = Number(company.credits_balance);
        return total + (Number.isFinite(balance) ? Math.max(0, balance) : 0);
      }, 0);

  return {
    totalCompanies: companies.error ? null : Number(companies.count || 0),
    totalParticipants: participants.error ? null : Number(participants.count || 0),
    totalReports: reports.error ? null : Number(reports.count || 0),
    creditsRemaining: credits,
    complimentaryAccessIssued: null,
    todaysAttempts: attemptsToday.error ? null : Number(attemptsToday.count || 0),
    completedToday: completedToday.error ? null : Number(completedToday.count || 0),
    generatedAt: now.toISOString(),
  };
}
