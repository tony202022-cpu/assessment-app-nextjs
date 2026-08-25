import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export type ParticipantStatus = "Completed" | "In Progress" | "Not Started" | "Expired";
export type ParticipantFilter = "all" | "completed" | "in-progress" | "not-started" | "expired";
export type ParticipantSort = "name" | "date" | "company" | "completion" | "score";
export type SortDirection = "asc" | "desc";

export type ParticipantListItem = {
  id: string;
  fullName: string;
  email: string;
  company: string;
  assessment: string;
  status: ParticipantStatus;
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  answersCount: number;
};

export type ParticipantListResult = {
  participants: ParticipantListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  filter: ParticipantFilter;
  sort: ParticipantSort;
  direction: SortDirection;
};

export type ParticipantCompetency = {
  name: string;
  percentage: number | null;
};

export type ParticipantDetail = ParticipantListItem & {
  attemptId: string;
  score: number | null;
  percentage: number | null;
  competencies: ParticipantCompetency[];
  reportStatus: "Available" | "Not available";
  reportPath: string | null;
  reportGeneratedAt: string | null;
};

type AttemptRow = {
  id: string;
  assessment_id: string | null;
  company_id: string | null;
  access_token_id: string | null;
  full_name: string | null;
  user_email: string | null;
  company: string | null;
  created_at: string | null;
  completed_at: string | null;
  score: number | null;
  total_percentage: number | null;
  answers: unknown;
  competency_results: unknown;
};

type CompanyRow = { id: string; name: string | null; manager_token: string | null };
type AssessmentRow = { id: string; slug: string | null; title_en: string | null; name_en: string | null };
type TokenRow = { id: string; expires_at: string | null };

function requireSupabaseAdmin() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Participant administration is not configured.");
  return client;
}

function safeSearch(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120).toLocaleLowerCase();
}

function positiveInteger(value: unknown, fallback: number, maximum?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function normalizeFilter(value: unknown): ParticipantFilter {
  return ["completed", "in-progress", "not-started", "expired"].includes(String(value))
    ? (String(value) as ParticipantFilter)
    : "all";
}

function normalizeSort(value: unknown): ParticipantSort {
  return ["name", "date", "company", "completion", "score"].includes(String(value))
    ? (String(value) as ParticipantSort)
    : "date";
}

function normalizeDirection(value: unknown): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function isCompleted(row: AttemptRow) {
  return Boolean(
    row.completed_at ||
      arrayLength(row.answers) > 0 ||
      arrayLength(row.competency_results) > 0 ||
      Number(row.total_percentage || 0) > 0,
  );
}

function participantStatus(row: AttemptRow, token: TokenRow | undefined): ParticipantStatus {
  if (isCompleted(row)) return "Completed";
  if (token?.expires_at && new Date(token.expires_at).getTime() < Date.now()) return "Expired";
  if (arrayLength(row.answers) === 0 && arrayLength(row.competency_results) === 0) return "Not Started";
  return "In Progress";
}

function assessmentLabel(row: AssessmentRow | undefined, fallback: string) {
  return String(row?.title_en || row?.name_en || fallback || "Not assigned").replace(/_/g, " ").trim();
}

function competencyModels(value: unknown): ParticipantCompetency[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry: any, index) => ({
    name: String(entry?.competency_name || entry?.competency || entry?.name || entry?.competency_id || `Competency ${index + 1}`),
    percentage: finiteNumber(entry?.percentage ?? entry?.percentage_score ?? entry?.score),
  }));
}

async function loadReferenceMaps(rows: AttemptRow[]) {
  const supabase = requireSupabaseAdmin();
  const companyIds = Array.from(new Set(rows.map((row) => row.company_id).filter(Boolean))) as string[];
  const assessmentIds = Array.from(new Set(rows.map((row) => row.assessment_id).filter(Boolean))) as string[];
  const tokenIds = Array.from(new Set(rows.map((row) => row.access_token_id).filter(Boolean))) as string[];

  const [companiesResult, assessmentsResult, tokensResult] = await Promise.all([
    companyIds.length
      ? supabase.from("companies").select("id, name, manager_token").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    assessmentIds.length
      ? supabase.from("assessments").select("id, slug, title_en, name_en").in("id", assessmentIds)
      : Promise.resolve({ data: [], error: null }),
    tokenIds.length
      ? supabase.from("access_tokens").select("id, expires_at").in("id", tokenIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (companiesResult.error || assessmentsResult.error || tokensResult.error) {
    throw new Error("Could not load participant reference data.");
  }

  return {
    companies: new Map(((companiesResult.data || []) as CompanyRow[]).map((row) => [String(row.id), row])),
    assessments: new Map(((assessmentsResult.data || []) as AssessmentRow[]).map((row) => [String(row.id), row])),
    tokens: new Map(((tokensResult.data || []) as TokenRow[]).map((row) => [String(row.id), row])),
  };
}

function toListItem(
  row: AttemptRow,
  references: Awaited<ReturnType<typeof loadReferenceMaps>>,
): ParticipantListItem {
  const company = references.companies.get(String(row.company_id || ""));
  const assessment = references.assessments.get(String(row.assessment_id || ""));
  const token = references.tokens.get(String(row.access_token_id || ""));
  const status = participantStatus(row, token);
  return {
    id: String(row.id),
    fullName: String(row.full_name || "Not provided"),
    email: String(row.user_email || "Not provided"),
    company: String(company?.name || row.company || "Independent"),
    assessment: assessmentLabel(assessment, String(row.assessment_id || "")),
    status,
    startedAt: status === "Not Started" ? null : row.created_at ? String(row.created_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    overallScore: status === "Completed" ? finiteNumber(row.total_percentage) : null,
    answersCount: arrayLength(row.answers),
  };
}

function compareParticipants(a: ParticipantListItem, b: ParticipantListItem, sort: ParticipantSort) {
  if (sort === "name") return a.fullName.localeCompare(b.fullName);
  if (sort === "company") return a.company.localeCompare(b.company);
  if (sort === "completion") return String(a.completedAt || "").localeCompare(String(b.completedAt || ""));
  if (sort === "score") return (a.overallScore ?? -1) - (b.overallScore ?? -1);
  return String(a.startedAt || "").localeCompare(String(b.startedAt || ""));
}

const ATTEMPT_FIELDS = "id, assessment_id, company_id, access_token_id, full_name, user_email, company, created_at, completed_at, score, total_percentage, answers, competency_results";

export async function listParticipants(input: {
  search?: unknown;
  filter?: unknown;
  sort?: unknown;
  direction?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): Promise<ParticipantListResult> {
  const supabase = requireSupabaseAdmin();
  const search = safeSearch(input.search);
  const filter = normalizeFilter(input.filter);
  const sort = normalizeSort(input.sort);
  const direction = normalizeDirection(input.direction);
  const pageSize = positiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const requestedPage = positiveInteger(input.page, 1);

  const { data, error } = await supabase.from("quiz_attempts").select(ATTEMPT_FIELDS);
  if (error) throw new Error("Could not load participants.");
  const rows = (data || []) as AttemptRow[];
  const references = await loadReferenceMaps(rows);
  let participants = rows.map((row) => toListItem(row, references));

  if (search) {
    participants = participants.filter((participant) =>
      [participant.fullName, participant.email, participant.company, participant.assessment, participant.status]
        .some((value) => value.toLocaleLowerCase().includes(search)),
    );
  }
  if (filter !== "all") {
    const expected: Record<Exclude<ParticipantFilter, "all">, ParticipantStatus> = {
      completed: "Completed",
      "in-progress": "In Progress",
      "not-started": "Not Started",
      expired: "Expired",
    };
    participants = participants.filter((participant) => participant.status === expected[filter]);
  }

  participants.sort((a, b) => compareParticipants(a, b, sort) * (direction === "asc" ? 1 : -1));
  const total = participants.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;

  return { participants: participants.slice(start, start + pageSize), page, pageSize, total, totalPages, search, filter, sort, direction };
}

export async function getParticipantDetail(attemptId: string): Promise<ParticipantDetail | null> {
  const id = String(attemptId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;

  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.from("quiz_attempts").select(ATTEMPT_FIELDS).eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load the participant attempt.");
  if (!data) return null;

  const row = data as AttemptRow;
  const references = await loadReferenceMaps([row]);
  const participant = toListItem(row, references);
  const assessment = references.assessments.get(String(row.assessment_id || ""));
  const company = references.companies.get(String(row.company_id || ""));
  const completed = participant.status === "Completed";
  const slug = String(assessment?.slug || "").trim();
  const managerToken = String(company?.manager_token || "");
  const reportPath = completed && slug
    ? `/${slug}/report?attemptId=${encodeURIComponent(id)}${managerToken ? `&managerToken=${encodeURIComponent(managerToken)}` : ""}`
    : null;

  return {
    ...participant,
    attemptId: id,
    score: finiteNumber(row.score),
    percentage: completed ? finiteNumber(row.total_percentage) : null,
    competencies: competencyModels(row.competency_results),
    reportStatus: reportPath ? "Available" : "Not available",
    reportPath,
    reportGeneratedAt: reportPath ? participant.completedAt : null,
  };
}
