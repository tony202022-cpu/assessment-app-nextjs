import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import { assessmentRegistry, type AssessmentDefinition } from "@/modules/assessment-definition";
import { ReportAuthorizationService } from "@/modules/report-authorization";

type CompanyRow = { id: string; name: string | null; package_size: number | null; credits_balance: number | null };
type AttemptRow = { id: string; full_name: string | null; user_email: string | null; created_at: string | null; completed_at: string | null; total_percentage: number | null };

export type CompanyAssessmentParticipant = {
  id: string;
  name: string;
  email: string;
  status: "not-started" | "in-progress" | "completed";
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  percentage: number | null;
  reportPath: string | null;
};

export type CompanyAssessmentDashboardData = {
  company: { id: string; name: string };
  assessment: { id: string; slug: string; name: string; scoreSupported: boolean; managerReportSupported: boolean };
  credits: { allocated: number; used: number; remaining: number };
  participants: CompanyAssessmentParticipant[];
};

export type CompanyAssessmentDashboardResult =
  | { ok: true; data: CompanyAssessmentDashboardData }
  | { ok: false; reason: "invalid-request" | "invalid-manager" | "assessment-unavailable" | "access-expired-or-revoked" | "data-unavailable" };

export type CompanyAssessmentDashboardDependencies = {
  findCompanyByManagerToken(token: string): Promise<CompanyRow | null>;
  hasActiveAssessmentAccess(companyId: string, assessmentId: string, now: string): Promise<boolean>;
  findAttempts(companyId: string, assessmentId: string): Promise<AttemptRow[]>;
  authorizeManagerReport(attemptId: string, assessmentSlug: string, managerToken: string): Promise<boolean>;
};

function defaultDependencies(): CompanyAssessmentDashboardDependencies {
  const client = () => {
    const value = getSupabaseAdmin();
    if (!value) throw new Error("Company assessment dashboard data access is not configured.");
    return value;
  };
  const reports = new ReportAuthorizationService();
  return {
    async findCompanyByManagerToken(token) {
      const { data, error } = await client().from("companies").select("id,name,package_size,credits_balance").eq("manager_token", token).maybeSingle();
      if (error) throw error;
      return data as CompanyRow | null;
    },
    async hasActiveAssessmentAccess(companyId, assessmentId, now) {
      const { data, error } = await client()
        .from("access_tokens")
        .select("id")
        .eq("company_id", companyId)
        .eq("assessment_type", assessmentId)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.id);
    },
    async findAttempts(companyId, assessmentId) {
      const { data, error } = await client()
        .from("quiz_attempts")
        .select("id,full_name,user_email,created_at,completed_at,total_percentage")
        .eq("company_id", companyId)
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AttemptRow[];
    },
    async authorizeManagerReport(attemptId, assessmentSlug, managerToken) {
      const result = await reports.authorizeAttemptAccess({
        attemptId,
        expectedAssessmentSlug: assessmentSlug,
        managerToken,
        purpose: "view",
      });
      return result.authorized;
    },
  };
}

function supportsScore(definition: Readonly<AssessmentDefinition>): boolean {
  return definition.scoringStrategy.mode === "deterministic" && definition.questionSource.questionCount > 0;
}

function participantStatus(attempt: AttemptRow): CompanyAssessmentParticipant["status"] {
  if (attempt.completed_at) return "completed";
  if (attempt.created_at) return "in-progress";
  return "not-started";
}

export async function loadCompanyAssessmentDashboard(
  input: { managerToken: string; assessmentSlug: string; now?: Date },
  dependencies: CompanyAssessmentDashboardDependencies = defaultDependencies(),
): Promise<CompanyAssessmentDashboardResult> {
  const managerToken = String(input.managerToken || "").trim();
  const assessmentSlug = String(input.assessmentSlug || "").trim().toLowerCase();
  if (!managerToken || !assessmentSlug) return { ok: false, reason: "invalid-request" };

  const definition = assessmentRegistry.findCurrentBySlug(assessmentSlug);
  if (!definition || !definition.capabilities.corporateAvailability) return { ok: false, reason: "assessment-unavailable" };

  try {
    const company = await dependencies.findCompanyByManagerToken(managerToken);
    if (!company) return { ok: false, reason: "invalid-manager" };
    const active = await dependencies.hasActiveAssessmentAccess(company.id, definition.metadata.id, (input.now || new Date()).toISOString());
    if (!active) return { ok: false, reason: "access-expired-or-revoked" };

    const attempts = await dependencies.findAttempts(company.id, definition.metadata.id);
    const managerReportSupported = definition.capabilities.managerReport && definition.report.supportedAudiences.includes("manager");
    const scoreSupported = supportsScore(definition);
    const participants = await Promise.all(attempts.map(async (attempt): Promise<CompanyAssessmentParticipant> => {
      const status = participantStatus(attempt);
      const reportAllowed = status === "completed" && managerReportSupported
        ? await dependencies.authorizeManagerReport(attempt.id, definition.metadata.slug, managerToken)
        : false;
      return {
        id: attempt.id,
        name: String(attempt.full_name || "Participant"),
        email: String(attempt.user_email || ""),
        status,
        createdAt: attempt.created_at,
        startedAt: attempt.created_at,
        completedAt: attempt.completed_at,
        percentage: scoreSupported && status === "completed" && attempt.total_percentage != null ? Number(attempt.total_percentage) : null,
        reportPath: reportAllowed ? `/${definition.metadata.slug}/report?attemptId=${encodeURIComponent(attempt.id)}&managerToken=${encodeURIComponent(managerToken)}` : null,
      };
    }));
    const allocated = Math.max(0, Number(company.package_size || 0));
    const remaining = Math.max(0, Number(company.credits_balance || 0));
    return {
      ok: true,
      data: {
        company: { id: company.id, name: String(company.name || "Company") },
        assessment: { id: definition.metadata.id, slug: definition.metadata.slug, name: definition.metadata.name, scoreSupported, managerReportSupported },
        credits: { allocated, used: Math.max(0, allocated - remaining), remaining },
        participants,
      },
    };
  } catch {
    return { ok: false, reason: "data-unavailable" };
  }
}
