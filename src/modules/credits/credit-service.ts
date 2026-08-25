import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export type CreditSort = "company" | "package" | "remaining" | "used" | "created";
export type SortDirection = "asc" | "desc";
export type CreditStatus = "Credits available" | "No credits remaining";

export type CreditListItem = {
  companyId: string;
  company: string;
  manager: string;
  assessment: string;
  packageSize: number;
  creditsPurchased: number;
  creditsUsed: number;
  creditsRemaining: number;
  createdAt: string;
  status: CreditStatus;
};

export type CreditListResult = {
  credits: CreditListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  sort: CreditSort;
  direction: SortDirection;
};

export type CreditHistoryItem = { amount: number; description: string };

export type CreditDetail = CreditListItem & {
  managerDashboardPath: string | null;
  history: CreditHistoryItem[];
  historyNetChange: number;
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
type AccessRow = { company_id: string | null; assessment_type: string | null };
type AssessmentRow = { id: string; title_en: string | null; name_en: string | null };
type HistoryRow = { amount: number | null; description: string | null };

function requireAdmin() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Credit administration is not configured.");
  return client;
}

function safeSearch(value: unknown) {
  return String(value || "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}

function positiveInteger(value: unknown, fallback: number, maximum?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function normalizeSort(value: unknown): CreditSort {
  return ["company", "package", "remaining", "used", "created"].includes(String(value)) ? String(value) as CreditSort : "created";
}

function normalizeDirection(value: unknown): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function nonNegative(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function databaseSort(sort: CreditSort) {
  if (sort === "company") return "name";
  if (sort === "package") return "package_size";
  if (sort === "remaining") return "credits_balance";
  return "created_at";
}

async function loadAssessmentContext(companyIds: string[]) {
  const supabase = requireAdmin();
  if (!companyIds.length) return { access: [] as AccessRow[], assessments: new Map<string, AssessmentRow>() };
  const { data: accessData, error: accessError } = await supabase.from("access_tokens").select("company_id, assessment_type").in("company_id", companyIds);
  if (accessError) throw new Error("Could not load credit assessment access.");
  const access = (accessData || []) as AccessRow[];
  const assessmentIds = Array.from(new Set(access.map((row) => row.assessment_type).filter(Boolean))) as string[];
  if (!assessmentIds.length) return { access, assessments: new Map<string, AssessmentRow>() };
  const { data, error } = await supabase.from("assessments").select("id, title_en, name_en").in("id", assessmentIds);
  if (error) throw new Error("Could not load credit assessments.");
  return { access, assessments: new Map(((data || []) as AssessmentRow[]).map((row) => [String(row.id), row])) };
}

function assessmentLabel(companyId: string, access: AccessRow[], assessments: Map<string, AssessmentRow>) {
  const ids = Array.from(new Set(access.filter((row) => String(row.company_id || "") === companyId).map((row) => String(row.assessment_type || "")).filter(Boolean)));
  if (!ids.length) return "Not assigned";
  return ids.map((id) => String(assessments.get(id)?.title_en || assessments.get(id)?.name_en || id).replace(/_/g, " ")).sort().join(", ");
}

function toListItem(row: CompanyRow, context: Awaited<ReturnType<typeof loadAssessmentContext>>): CreditListItem {
  const packageSize = nonNegative(row.package_size);
  const remaining = nonNegative(row.credits_balance);
  return {
    companyId: String(row.id),
    company: String(row.name || "Unnamed company"),
    manager: String(row.billing_email || "Not provided"),
    assessment: assessmentLabel(String(row.id), context.access, context.assessments),
    packageSize,
    creditsPurchased: packageSize,
    creditsUsed: Math.max(0, packageSize - remaining),
    creditsRemaining: remaining,
    createdAt: String(row.created_at || ""),
    status: remaining > 0 ? "Credits available" : "No credits remaining",
  };
}

export async function listCredits(input: { search?: unknown; sort?: unknown; direction?: unknown; page?: unknown; pageSize?: unknown }): Promise<CreditListResult> {
  const supabase = requireAdmin();
  const search = safeSearch(input.search);
  const sort = normalizeSort(input.sort);
  const direction = normalizeDirection(input.direction);
  const pageSize = positiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const requestedPage = positiveInteger(input.page, 1);

  let assessmentCompanyIds: string[] = [];
  if (search) {
    const { data: assessmentData, error: assessmentError } = await supabase.from("assessments").select("id").or(`id.ilike.%${search}%,title_en.ilike.%${search}%,name_en.ilike.%${search}%`);
    if (assessmentError) throw new Error("Could not search credit assessments.");
    const ids = (assessmentData || []).map((row: any) => String(row.id));
    if (ids.length) {
      const { data: accessData, error: accessError } = await supabase.from("access_tokens").select("company_id").in("assessment_type", ids);
      if (accessError) throw new Error("Could not search company credit access.");
      assessmentCompanyIds = Array.from(new Set((accessData || []).map((row: any) => String(row.company_id || "")).filter(Boolean)));
    }
  }

  const filters = search ? [`name.ilike.%${search}%`, `billing_email.ilike.%${search}%`, ...(assessmentCompanyIds.length ? [`id.in.(${assessmentCompanyIds.join(",")})`] : [])] : [];
  const applyFilter = (query: any) => filters.length ? query.or(filters.join(",")) : query;
  const countResult = await applyFilter(supabase.from("companies").select("id", { count: "exact", head: true }));
  if (countResult.error) throw new Error("Could not count credit accounts.");
  const total = Number(countResult.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * pageSize;

  let query = applyFilter(supabase.from("companies").select("id, name, billing_email, package_size, credits_balance, manager_token, created_at"));
  if (sort === "used") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order(databaseSort(sort), { ascending: direction === "asc" }).range(from, from + pageSize - 1);
  }
  const { data, error } = await query;
  if (error) throw new Error("Could not load credit accounts.");
  let rows = (data || []) as CompanyRow[];
  const context = await loadAssessmentContext(rows.map((row) => String(row.id)));
  let credits = rows.map((row) => toListItem(row, context));
  if (sort === "used") {
    credits.sort((a, b) => (a.creditsUsed - b.creditsUsed) * (direction === "asc" ? 1 : -1));
    credits = credits.slice(from, from + pageSize);
  }
  return { credits, page, pageSize, total, totalPages, search, sort, direction };
}

export async function getCreditDetail(companyId: string): Promise<CreditDetail | null> {
  const id = String(companyId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = requireAdmin();
  const [companyResult, historyResult] = await Promise.all([
    supabase.from("companies").select("id, name, billing_email, package_size, credits_balance, manager_token, created_at").eq("id", id).maybeSingle(),
    supabase.from("credit_transactions").select("amount, description").eq("company_id", id),
  ]);
  if (companyResult.error) throw new Error("Could not load the credit account.");
  if (!companyResult.data) return null;
  const context = await loadAssessmentContext([id]);
  const company = companyResult.data as CompanyRow;
  const base = toListItem(company, context);
  const history = historyResult.error ? [] : ((historyResult.data || []) as HistoryRow[]).map((row) => ({ amount: Number(row.amount || 0), description: String(row.description || "Credit transaction") }));
  const managerToken = String(company.manager_token || "");
  return { ...base, managerDashboardPath: managerToken ? `/company/outdoor-mri-dashboard?managerToken=${encodeURIComponent(managerToken)}` : null, history, historyNetChange: history.reduce((sum, entry) => sum + entry.amount, 0) };
}
