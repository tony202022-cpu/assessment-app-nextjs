import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";

export type ComplimentaryHistoryFilter = "all" | "active" | "used" | "expired";
export type ComplimentaryTokenStatus = "Active" | "Used" | "Expired";

export type ComplimentaryAssessment = {
  id: string;
  name: string;
  slug: string;
  status: string;
  languages: Array<"English" | "Arabic">;
  individualAvailability: string;
  corporateAvailability: string;
  complimentaryCapability: "Available" | "Not permitted";
  currentAccessModel: string;
  individualFlow: string;
  corporateFlow: string;
  tokenRequirement: string;
};

export type ComplimentaryTokenRecord = {
  id: string;
  createdAt: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  assessment: string;
  email: string | null;
  status: ComplimentaryTokenStatus;
};

export type ComplimentaryAssessmentDetail = ComplimentaryAssessment & {
  tokens: ComplimentaryTokenRecord[];
  statistics: { total: number; active: number; used: number; expired: number };
  search: string;
  filter: ComplimentaryHistoryFilter;
};

type AssessmentRow = {
  id: string;
  slug: string | null;
  status: string | null;
  type: string | null;
  price: number | null;
  title_en: string | null;
  title_ar: string | null;
  name_en: string | null;
  name_ar: string | null;
};
type AccessRow = { id: string; assessment_type: string | null; entitlement_type: string | null; is_used: boolean | null; used_by_email: string | null; created_at: string | null; expires_at: string | null; used_at: string | null; revoked_at: string | null };

function requireAdmin() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Complimentary access inspection is not configured.");
  return client;
}

function safeSearch(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120).toLocaleLowerCase();
}

function normalizeFilter(value: unknown): ComplimentaryHistoryFilter {
  return ["active", "used", "expired"].includes(String(value)) ? String(value) as ComplimentaryHistoryFilter : "all";
}

function toAssessment(row: AssessmentRow & { allows_complimentary_access?: boolean }, corporateAssessmentIds: Set<string>): ComplimentaryAssessment {
  const id = String(row.id);
  const slug = String(row.slug || id).trim();
  const active = String(row.status || "unknown").toLocaleLowerCase() === "active";
  const corporate = corporateAssessmentIds.has(id);
  const languages: Array<"English" | "Arabic"> = ["English"];
  if (row.title_ar || row.name_ar) languages.push("Arabic");
  return {
    id,
    name: String(row.title_en || row.name_en || slug || id),
    slug,
    status: String(row.status || "Unknown"),
    languages,
    individualAvailability: active ? "Assessment entry available" : "Not currently active",
    corporateAvailability: corporate ? "Corporate token access configured" : "No corporate token access found",
    complimentaryCapability: row.allows_complimentary_access ? "Available" : "Not permitted",
    currentAccessModel: [active ? "Individual assessment entry" : null, corporate ? "Corporate token-backed access" : null].filter(Boolean).join(" + ") || String(row.type || "No active access evidence"),
    individualFlow: active ? `Participants enter through /${slug}.` : "The assessment is not currently active.",
    corporateFlow: corporate ? "Company access uses the existing token and credit flow." : "No company access token is linked to this assessment.",
    tokenRequirement: corporate ? "A company token is required for the corporate flow." : "No corporate token requirement is configured.",
  };
}

async function loadRegisteredAssessments() {
  const supabase = requireAdmin();
  const [assessmentResult, accessResult] = await Promise.all([
    supabase.from("assessments").select("id, slug, status, type, price, title_en, title_ar, name_en, name_ar, allows_complimentary_access").order("title_en", { ascending: true }),
    supabase.from("access_tokens").select("assessment_type").eq("entitlement_type", "company"),
  ]);
  if (assessmentResult.error) throw new Error("Could not load registered assessments.");
  if (accessResult.error) throw new Error("Could not inspect assessment access models.");
  const corporateIds = new Set(((accessResult.data || []) as AccessRow[]).map((row) => String(row.assessment_type || "")).filter(Boolean));
  return ((assessmentResult.data || []) as AssessmentRow[]).map((row) => toAssessment(row, corporateIds));
}

export async function listComplimentaryAssessments(input: { search?: unknown } = {}) {
  const search = safeSearch(input.search);
  const assessments = await loadRegisteredAssessments();
  return {
    search,
    assessments: search
      ? assessments.filter((assessment) => [assessment.name, assessment.slug, assessment.status].some((value) => value.toLocaleLowerCase().includes(search)))
      : assessments,
  };
}

export async function getComplimentaryAssessmentDetail(
  assessmentSlug: string,
  input: { search?: unknown; filter?: unknown } = {},
): Promise<ComplimentaryAssessmentDetail | null> {
  const slug = String(assessmentSlug || "").trim().toLocaleLowerCase();
  if (!slug || slug.length > 160) return null;
  const assessments = await loadRegisteredAssessments();
  const assessment = assessments.find((item) => item.slug.toLocaleLowerCase() === slug || item.id.toLocaleLowerCase() === slug);
  if (!assessment) return null;

  const search = safeSearch(input.search);
  const filter = normalizeFilter(input.filter);
  const { data, error } = await requireAdmin().from("access_tokens").select("id, assessment_type, entitlement_type, is_used, used_by_email, created_at, expires_at, used_at, revoked_at").eq("entitlement_type", "complimentary").eq("assessment_type", assessment.id).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Could not load complimentary access history.");
  const now = Date.now();
  const rows = (data || []) as AccessRow[];
  const classify = (row: AccessRow): ComplimentaryTokenStatus => row.is_used ? "Used" : row.revoked_at || (row.expires_at && new Date(row.expires_at).getTime() <= now) ? "Expired" : "Active";
  const tokens = rows.map((row): ComplimentaryTokenRecord => ({ id: row.id, createdAt: row.created_at, expiresAt: row.expires_at, usedAt: row.used_at, assessment: assessment.name, email: row.used_by_email, status: classify(row) })).filter((token) => {
    const searchMatch = !search || [token.assessment, token.email, token.id, token.status].some((value) => String(value || "").toLocaleLowerCase().includes(search));
    return searchMatch && (filter === "all" || token.status.toLocaleLowerCase() === filter);
  });
  const statistics = rows.reduce((counts, row) => { counts.total += 1; const status = classify(row).toLocaleLowerCase() as "active" | "used" | "expired"; counts[status] += 1; return counts; }, { total: 0, active: 0, used: 0, expired: 0 });
  return { ...assessment, tokens, statistics, search, filter };
}
