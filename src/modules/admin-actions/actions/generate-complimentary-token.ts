import "server-only";

import { getDeveloperTestBaseUrl } from "@/lib/admin-assessment-access";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type GenerateComplimentaryTokenInput = {
  assessmentId: string;
  expiresAt: string;
  reason: string;
};

export type GenerateComplimentaryTokenOutput = {
  assessmentName: string;
  assessmentUrl: string;
  expiresAt: string;
  status: "Active";
};

type EligibleAssessment = {
  id: string;
  slug: string;
  status: string;
  title_en: string | null;
  name_en: string | null;
  allows_individual_access: boolean;
  allows_complimentary_access: boolean;
};

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,159}$/i;
const MAX_LIFETIME_MS = 366 * 24 * 60 * 60 * 1000;

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminActionError("ACTION_FAILED", "Complimentary access is not configured.");
  return supabase;
}

async function loadAssessment(assessmentId: string): Promise<EligibleAssessment> {
  const { data, error } = await client()
    .from("assessments")
    .select("id, slug, status, title_en, name_en, allows_individual_access, allows_complimentary_access")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new AdminActionError("ACTION_FAILED", "The assessment eligibility could not be verified.", { cause: error });
  if (!data) throw new AdminActionError("ASSESSMENT_NOT_FOUND", "The assessment could not be found.");
  return data as EligibleAssessment;
}

function assertEligible(assessment: EligibleAssessment) {
  if (assessment.status.toLocaleLowerCase() !== "active") throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "The assessment is not active.");
  if (!assessment.allows_individual_access) throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "The assessment does not support individual access.");
  if (!assessment.allows_complimentary_access) throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "Complimentary access is not permitted for this assessment.");
}

function mapDatabaseError(error: any): never {
  const message = String(error?.message || "");
  if (message.includes("assessment_not_found")) throw new AdminActionError("ASSESSMENT_NOT_FOUND", "The assessment could not be found.");
  if (message.includes("assessment_not_active") || message.includes("individual_access_not_supported") || message.includes("complimentary_access_not_permitted")) {
    throw new AdminActionError("ASSESSMENT_NOT_ELIGIBLE", "This assessment is not eligible for complimentary access.");
  }
  if (message.includes("invalid_expiry")) throw new AdminActionError("INVALID_EXPIRY", "Choose a valid future expiry within one year.");
  throw new AdminActionError("ACTION_FAILED", "The complimentary token could not be generated.", { cause: error });
}

export const generateComplimentaryTokenAction: AdminActionDefinition<GenerateComplimentaryTokenInput, GenerateComplimentaryTokenOutput> = {
  id: "complimentary.generate",
  title: "Generate Complimentary Token",
  description: "Issue one time-limited individual assessment entitlement for an approved complimentary purpose.",
  permission: { anyOf: ["complimentary.generate"] },
  confirmation: {
    level: "dangerous",
    mode: "reason-required",
    title: "Generate complimentary access",
    message: "Generate one complimentary assessment token for the selected assessment.",
    confirmLabel: "Generate",
    reasonRequired: true,
  },
  rollback: {
    mode: "manual",
    summary: "The generated token can be neutralized through the future authorized revoke action.",
    instructions: "Until revocation is enabled, record the token ID from the audit event and perform an approved manual revocation.",
  },
  refresh: { strategy: "current-route" },
  validateInput(input) {
    const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const assessmentId = String(value.assessmentId || "").trim();
    const reason = String(value.reason || "").trim().replace(/\s+/g, " ");
    const expiry = new Date(String(value.expiresAt || ""));
    const fields: Record<string, string> = {};
    if (!ID_PATTERN.test(assessmentId)) fields.assessmentId = "Choose a valid assessment.";
    if (!reason) fields.reason = "A reason is required.";
    else if (reason.length > 500) fields.reason = "Reason must be 500 characters or fewer.";
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + MAX_LIFETIME_MS) {
      fields.expiresAt = "Choose a future expiry within one year.";
    }
    return Object.keys(fields).length
      ? { ok: false, message: "Correct the highlighted fields.", fields }
      : { ok: true, value: { assessmentId, reason, expiresAt: expiry.toISOString() } };
  },
  async dryRun(input) {
    const assessment = await loadAssessment(input.assessmentId);
    const validationErrors: Record<string, string> = {};
    try { assertEligible(assessment); } catch (error) {
      validationErrors.assessmentId = error instanceof Error ? error.message : "This assessment is not eligible.";
    }
    const expiresAt = new Date(input.expiresAt);
    const lifetimeHours = Math.ceil((expiresAt.getTime() - Date.now()) / 3_600_000);
    return createDryRunPreview({
      currentState: { assessment: assessment.title_en || assessment.name_en || assessment.slug, status: assessment.status, complimentaryAccessPermitted: assessment.allows_complimentary_access },
      expectedResult: { accessType: "Individual complimentary", expiry: input.expiresAt, tokenLifetimeHours: lifetimeHours, result: "One active, single-use access token" },
      affectedRecords: [{ type: "assessment", id: assessment.id, label: assessment.title_en || assessment.name_en || assessment.slug }, { type: "access_token", id: "new", label: "One new complimentary entitlement" }],
      warnings: ["This grant does not use or modify company credits.", "The assessment URL contains a bearer credential and must be shared securely."],
      validationErrors,
    });
  },
  auditMetadata(input) {
    return { assessmentId: input.assessmentId, expiresAt: input.expiresAt, entitlementType: "complimentary" };
  },
  async execute(input, context) {
    const { data, error } = await client().rpc("generate_complimentary_access_token_admin_action", {
      p_assessment_id: input.assessmentId,
      p_expires_at: input.expiresAt,
      p_administrator_id: context.actor.id,
      p_administrator_role: context.actor.role,
      p_reason: input.reason,
      p_request_id: context.requestId,
    });
    if (error) mapDatabaseError(error);
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row?.token_value || !row?.assessment_slug) throw new AdminActionError("ACTION_FAILED", "Token generation returned no result.");
    const origin = getDeveloperTestBaseUrl();
    return {
      assessmentName: String(row.assessment_name || row.assessment_slug),
      assessmentUrl: `${origin}/${encodeURIComponent(String(row.assessment_slug))}?token=${encodeURIComponent(String(row.token_value))}`,
      expiresAt: String(row.expires_at),
      status: "Active",
    };
  },
};
