import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

export type DashboardMetric = number | null;

export type DashboardActivity = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
};

export type DashboardCompletion = {
  id: string;
  participant: string;
  assessment: string;
  completedAt: string;
};

export type DashboardProductActivity = {
  assessment: string;
  attempts: number;
};

export type ControlCenterDashboard = {
  totalCompanies: DashboardMetric;
  totalParticipants: DashboardMetric;
  totalReports: DashboardMetric;
  creditsRemaining: DashboardMetric;
  complimentaryAccessIssued: DashboardMetric;
  todaysAttempts: DashboardMetric;
  completedToday: DashboardMetric;
  recentActivity: DashboardActivity[];
  recentCompletions: DashboardCompletion[];
  productActivity: DashboardProductActivity[];
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
  const [companies, participants, reports, attemptsToday, completedToday, complimentary, activity, completions, productRows, assessments] = await Promise.all([
    supabase.from("companies").select("credits_balance", { count: "exact" }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).gte("completed_at", today),
    supabase.from("access_tokens").select("id", { count: "exact", head: true }).eq("entitlement_type", "complimentary"),
    supabase.from("admin_action_audit").select("id, action_id, resource_type, created_at").eq("outcome", "succeeded").order("created_at", { ascending: false }).limit(8),
    supabase.from("quiz_attempts").select("id, full_name, user_email, assessment_id, completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(5),
    supabase.from("quiz_attempts").select("assessment_id"),
    supabase.from("assessments").select("id, title_en, name_en"),
  ]);

  const assessmentLabels = new Map((assessments.data || []).map((row: any) => [String(row.id), String(row.title_en || row.name_en || row.id).replace(/_/g, " ")]));
  const actionLabels: Record<string, string> = {
    "assessment-access.company.issue": "Company assessment access issued",
    "assessment-access.individual.issue": "Individual assessment access issued",
    "assessment-access.complimentary.issue": "Complimentary assessment access issued",
    "credits.add": "Company credits added",
    "credits.remove": "Company credits removed",
    "credits.restore": "Company credit restored",
    "manager-token.regenerate": "Manager token regenerated",
  };
  const productCounts = new Map<string, number>();
  if (!productRows.error) {
    for (const row of productRows.data || []) {
      const id = String((row as any).assessment_id || "").trim();
      if (id) productCounts.set(id, (productCounts.get(id) || 0) + 1);
    }
  }

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
    complimentaryAccessIssued: complimentary.error ? null : Number(complimentary.count || 0),
    todaysAttempts: attemptsToday.error ? null : Number(attemptsToday.count || 0),
    completedToday: completedToday.error ? null : Number(completedToday.count || 0),
    recentActivity: activity.error ? [] : (activity.data || []).map((row: any) => ({
      id: String(row.id),
      label: actionLabels[String(row.action_id)] || String(row.action_id || "Administrative action").replace(/[.-]/g, " "),
      detail: String(row.resource_type || "Administrative record").replace(/[_-]/g, " "),
      occurredAt: String(row.created_at),
    })),
    recentCompletions: completions.error ? [] : (completions.data || []).map((row: any) => ({
      id: String(row.id),
      participant: String(row.full_name || row.user_email || "Participant"),
      assessment: assessmentLabels.get(String(row.assessment_id || "")) || String(row.assessment_id || "Assessment").replace(/_/g, " "),
      completedAt: String(row.completed_at),
    })),
    productActivity: productRows.error || assessments.error ? [] : Array.from(productCounts.entries())
      .map(([id, attempts]) => ({ assessment: assessmentLabels.get(id) || id.replace(/_/g, " "), attempts }))
      .sort((a, b) => b.attempts - a.attempts || a.assessment.localeCompare(b.assessment))
      .slice(0, 6),
    generatedAt: now.toISOString(),
  };
}
