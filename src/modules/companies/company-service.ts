import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export type CompanySort = "name" | "package" | "credits" | "created";
export type SortDirection = "asc" | "desc";

export type CompanyListItem = {
  id: string;
  name: string;
  managerContact: string;
  assessment: string;
  packageSize: number;
  creditsRemaining: number;
  creditsUsed: number;
  createdAt: string;
  managerDashboardEnabled: boolean;
};

export type CompanyListResult = {
  companies: CompanyListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  sort: CompanySort;
  direction: SortDirection;
};

export type CompanyParticipant = {
  attemptId: string;
  name: string;
  email: string;
  status: "Completed" | "In progress";
  startedAt: string;
  completedAt: string | null;
  overallPercentage: number | null;
  assessment: string;
  reportPath: string | null;
};

export type CompanyDetail = {
  id: string;
  name: string;
  managerContact: string;
  assessment: string;
  packageSize: number;
  creditsPurchased: number;
  creditsUsed: number;
  creditsRemaining: number;
  managerTokenStatus: "Active" | "Not configured";
  managerDashboardPath: string | null;
  createdAt: string;
  participants: CompanyParticipant[];
};

type CompanyRow = {
  id: string;
  name: string | null;
  billing_email: string | null;
  package_size: number | null;
  credits_balance: number | null;
  manager_token: string | null;
  created_at: string | null;
};

type AccessTokenRow = {
  company_id: string | null;
  assessment_type: string | null;
};

type AssessmentRow = {
  id: string;
  slug: string | null;
  title_en: string | null;
  name_en: string | null;
};

function requireSupabaseAdmin() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Company administration is not configured.");
  return client;
}

function positiveInteger(value: unknown, fallback: number, maximum?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function safeSearch(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizeSort(value: unknown): CompanySort {
  return ["name", "package", "credits", "created"].includes(String(value))
    ? (String(value) as CompanySort)
    : "created";
}

function normalizeDirection(value: unknown): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function databaseSort(sort: CompanySort) {
  if (sort === "name") return "name";
  if (sort === "package") return "package_size";
  if (sort === "credits") return "credits_balance";
  return "created_at";
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function labelForAssessment(row: AssessmentRow | undefined, fallback: string) {
  return String(row?.title_en || row?.name_en || fallback || "Not assigned")
    .replace(/_/g, " ")
    .trim();
}

function isAttemptCompleted(attempt: any) {
  return Boolean(
    attempt?.completed_at ||
      (Array.isArray(attempt?.answers) && attempt.answers.length > 0) ||
      (Array.isArray(attempt?.competency_results) && attempt.competency_results.length > 0) ||
      Number(attempt?.total_percentage || 0) > 0,
  );
}

async function getAssessmentContext(
  supabase: ReturnType<typeof requireSupabaseAdmin>,
  companyIds: string[],
  additionalAssessmentIds: string[] = [],
) {
  if (!companyIds.length) {
    return {
      tokenRows: [] as AccessTokenRow[],
      assessmentsById: new Map<string, AssessmentRow>(),
    };
  }

  const { data: tokenData, error: tokenError } = await supabase
    .from("access_tokens")
    .select("company_id, assessment_type")
    .in("company_id", companyIds);

  if (tokenError) throw new Error("Could not load company assessment access.");

  const tokenRows = (tokenData || []) as AccessTokenRow[];
  const assessmentIds = Array.from(
    new Set([
      ...tokenRows.map((row) => String(row.assessment_type || "")),
      ...additionalAssessmentIds,
    ].filter(Boolean)),
  );

  if (!assessmentIds.length) {
    return { tokenRows, assessmentsById: new Map<string, AssessmentRow>() };
  }

  const { data: assessmentData, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, slug, title_en, name_en")
    .in("id", assessmentIds);

  if (assessmentError) throw new Error("Could not load company assessments.");

  return {
    tokenRows,
    assessmentsById: new Map(
      ((assessmentData || []) as AssessmentRow[]).map((row) => [String(row.id), row]),
    ),
  };
}

function assessmentLabelForCompany(
  companyId: string,
  tokenRows: AccessTokenRow[],
  assessmentsById: Map<string, AssessmentRow>,
) {
  const ids = Array.from(
    new Set(
      tokenRows
        .filter((row) => String(row.company_id || "") === companyId)
        .map((row) => String(row.assessment_type || ""))
        .filter(Boolean),
    ),
  );
  if (!ids.length) return "Not assigned";
  return ids
    .map((id) => labelForAssessment(assessmentsById.get(id), id))
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

export async function listCompanies(input: {
  search?: unknown;
  page?: unknown;
  pageSize?: unknown;
  sort?: unknown;
  direction?: unknown;
}): Promise<CompanyListResult> {
  const supabase = requireSupabaseAdmin();
  const search = safeSearch(input.search);
  const pageSize = positiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const requestedPage = positiveInteger(input.page, 1);
  const sort = normalizeSort(input.sort);
  const direction = normalizeDirection(input.direction);

  let assessmentCompanyIds: string[] = [];
  if (search) {
    const { data: matchingAssessments, error: matchingAssessmentError } = await supabase
      .from("assessments")
      .select("id")
      .or(`id.ilike.%${search}%,slug.ilike.%${search}%,title_en.ilike.%${search}%,name_en.ilike.%${search}%`);
    if (matchingAssessmentError) throw new Error("Could not search assessments.");

    const matchingAssessmentIds = (matchingAssessments || []).map((row: any) => String(row.id));
    if (matchingAssessmentIds.length) {
      const { data: matchingTokens, error: matchingTokenError } = await supabase
        .from("access_tokens")
        .select("company_id")
        .in("assessment_type", matchingAssessmentIds);
      if (matchingTokenError) throw new Error("Could not search company assessments.");
      assessmentCompanyIds = Array.from(
        new Set((matchingTokens || []).map((row: any) => String(row.company_id || "")).filter(Boolean)),
      );
    }
  }

  const filters = search
    ? [
        `name.ilike.%${search}%`,
        `billing_email.ilike.%${search}%`,
        ...(assessmentCompanyIds.length ? [`id.in.(${assessmentCompanyIds.join(",")})`] : []),
      ]
    : [];

  const countQuery = supabase.from("companies").select("id", { count: "exact", head: true });
  const { count, error: countError } = filters.length
    ? await countQuery.or(filters.join(","))
    : await countQuery;
  if (countError) throw new Error("Could not count companies.");

  const total = Number(count || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let companyQuery = supabase
    .from("companies")
    .select("id, name, billing_email, package_size, credits_balance, manager_token, created_at")
    .order(databaseSort(sort), { ascending: direction === "asc" })
    .range(from, to);
  if (filters.length) companyQuery = companyQuery.or(filters.join(","));

  const { data: companyData, error: companyError } = await companyQuery;
  if (companyError) throw new Error("Could not load companies.");

  const rows = (companyData || []) as CompanyRow[];
  const { tokenRows, assessmentsById } = await getAssessmentContext(
    supabase,
    rows.map((row) => String(row.id)),
  );

  return {
    companies: rows.map((row) => {
      const packageSize = numberOrZero(row.package_size);
      const creditsRemaining = numberOrZero(row.credits_balance);
      return {
        id: String(row.id),
        name: String(row.name || "Unnamed company"),
        managerContact: String(row.billing_email || "Not provided"),
        assessment: assessmentLabelForCompany(String(row.id), tokenRows, assessmentsById),
        packageSize,
        creditsRemaining,
        creditsUsed: Math.max(0, packageSize - creditsRemaining),
        createdAt: String(row.created_at || ""),
        managerDashboardEnabled: Boolean(row.manager_token),
      };
    }),
    page,
    pageSize,
    total,
    totalPages,
    search,
    sort,
    direction,
  };
}

export async function getCompanyDetail(companyId: string): Promise<CompanyDetail | null> {
  const id = String(companyId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const supabase = requireSupabaseAdmin();
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("id, name, billing_email, package_size, credits_balance, manager_token, created_at")
    .eq("id", id)
    .maybeSingle();
  if (companyError) throw new Error("Could not load the company.");
  if (!companyData) return null;

  const company = companyData as CompanyRow;
  const { data: attemptData, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, assessment_id, full_name, user_email, created_at, completed_at, total_percentage, answers, competency_results")
    .eq("company_id", id)
    .order("created_at", { ascending: false });
  if (attemptError) throw new Error("Could not load company participants.");

  const { tokenRows, assessmentsById } = await getAssessmentContext(
    supabase,
    [id],
    (attemptData || []).map((attempt: any) => String(attempt.assessment_id || "")),
  );

  const packageSize = numberOrZero(company.package_size);
  const creditsRemaining = numberOrZero(company.credits_balance);
  const managerToken = String(company.manager_token || "");

  const participants: CompanyParticipant[] = (attemptData || []).map((attempt: any) => {
    const assessmentId = String(attempt.assessment_id || "");
    const assessment = assessmentsById.get(assessmentId);
    const completed = isAttemptCompleted(attempt);
    const slug = String(assessment?.slug || "").trim();
    const reportPath = completed && slug
      ? `/${slug}/report?attemptId=${encodeURIComponent(String(attempt.id))}${managerToken ? `&managerToken=${encodeURIComponent(managerToken)}` : ""}`
      : null;
    return {
      attemptId: String(attempt.id),
      name: String(attempt.full_name || "Not provided"),
      email: String(attempt.user_email || "Not provided"),
      status: completed ? "Completed" : "In progress",
      startedAt: String(attempt.created_at || ""),
      completedAt: attempt.completed_at ? String(attempt.completed_at) : null,
      overallPercentage: completed ? numberOrZero(attempt.total_percentage) : null,
      assessment: labelForAssessment(assessment, assessmentId),
      reportPath,
    };
  });

  return {
    id,
    name: String(company.name || "Unnamed company"),
    managerContact: String(company.billing_email || "Not provided"),
    assessment: assessmentLabelForCompany(id, tokenRows, assessmentsById),
    packageSize,
    creditsPurchased: packageSize,
    creditsUsed: Math.max(0, packageSize - creditsRemaining),
    creditsRemaining,
    managerTokenStatus: managerToken ? "Active" : "Not configured",
    managerDashboardPath: managerToken
      ? `/company/outdoor-mri-dashboard?managerToken=${encodeURIComponent(managerToken)}`
      : null,
    createdAt: String(company.created_at || ""),
    participants,
  };
}
