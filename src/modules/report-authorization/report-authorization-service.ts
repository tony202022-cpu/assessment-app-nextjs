import "server-only";

import { getSupabaseAdmin, isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import {
  DEVELOPER_TEST_ACCESS_COOKIE,
  readDeveloperTestAccess,
} from "@/lib/admin-assessment-access";

export const REPORT_ACCESS_PURPOSES = ["view", "print", "pdf", "data", "email", "preview"] as const;
export type ReportAccessPurpose = (typeof REPORT_ACCESS_PURPOSES)[number];

export const REPORT_ACTOR_TYPES = [
  "participant",
  "company-manager",
  "administrator",
  "developer-test",
  "offline-company",
  "future-entitlement",
] as const;
export type ReportActorType = (typeof REPORT_ACTOR_TYPES)[number];

export type ReportAuthorizationDecision =
  | "DENIED"
  | "NOT_FOUND"
  | "INVALID_PROOF"
  | "INVALID_ACTOR"
  | "WRONG_ASSESSMENT"
  | "EXPIRED_PROOF"
  | "MISSING_CAPABILITY"
  | "PARTICIPANT_PROOF_UNAVAILABLE"
  | "ENTITLEMENT_NOT_SUPPORTED";

export type ReportAuthorizationAttempt = {
  id: string;
  userId: string | null;
  assessmentId: string;
  companyId: string | null;
  accessTokenId: string | null;
  isDeveloperTest: boolean;
  completedAt: string | null;
  isOfflineCompany: boolean;
};

export type ReportAuthorizationActor = {
  type: ReportActorType;
  id: string;
  companyId?: string;
};

export type ReportAuthorizationSuccess = {
  authorized: true;
  decision: "AUTHORIZED";
  purpose: ReportAccessPurpose;
  actor: ReportAuthorizationActor;
  attempt: ReportAuthorizationAttempt;
};

export type ReportAuthorizationFailure = {
  authorized: false;
  decision: ReportAuthorizationDecision;
  purpose: ReportAccessPurpose;
  actorType?: ReportActorType;
  attempt?: ReportAuthorizationAttempt;
};

export type ReportAuthorizationResult = ReportAuthorizationSuccess | ReportAuthorizationFailure;

export type ReportAuthorizationCookies =
  | Record<string, string | undefined>
  | { get(name: string): string | { value?: string } | null | undefined };

export type ReportAuthorizationHeaders =
  | Record<string, string | undefined>
  | { get(name: string): string | null };

export type AuthorizeAttemptAccessInput = {
  attemptId: string;
  expectedAssessmentSlug?: string;
  cookies?: ReportAuthorizationCookies;
  headers?: ReportAuthorizationHeaders;
  managerToken?: string;
  purpose: ReportAccessPurpose;
  actorHint?: ReportActorType | string;
};

type ManagerIdentity = { companyId: string; offline: boolean };
type ParticipantProof =
  | { status: "valid"; userId: string }
  | { status: "invalid" }
  | { status: "unavailable" };
type DeveloperProof =
  | { status: "valid"; attemptId: string; userId: string; assessmentId: string }
  | { status: "expired" }
  | { status: "invalid" };

export type ReportAuthorizationDependencies = {
  findAttempt(attemptId: string): Promise<ReportAuthorizationAttempt | null>;
  findAssessmentIdBySlug(slug: string): Promise<string | null>;
  findManagerByToken(token: string): Promise<ManagerIdentity | null>;
  verifyParticipantProof(headers?: ReportAuthorizationHeaders): Promise<ParticipantProof>;
  verifyAdministratorSession(cookieValue: string | undefined): boolean;
  administratorCapabilities(): readonly string[];
  administratorId(): string;
  verifyDeveloperProof(cookieValue: string | undefined): DeveloperProof;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_READ_CAPABILITY = "reports.read";

function readHeader(headers: ReportAuthorizationHeaders | undefined, name: string): string {
  if (!headers) return "";
  if ("get" in headers && typeof headers.get === "function") return String(headers.get(name) || "").trim();
  const record = headers as Record<string, string | undefined>;
  const key = Object.keys(record).find((item) => item.toLowerCase() === name.toLowerCase());
  return String(key ? record[key] : "").trim();
}

function readCookie(cookies: ReportAuthorizationCookies | undefined, name: string): string {
  if (!cookies) return "";
  if ("get" in cookies && typeof cookies.get === "function") {
    const value = cookies.get(name);
    return typeof value === "string" ? value : String(value?.value || "");
  }
  return String((cookies as Record<string, string | undefined>)[name] || "");
}

function defaultDependencies(): ReportAuthorizationDependencies {
  const requireClient = () => {
    const client = getSupabaseAdmin();
    if (!client) throw new Error("Report authorization data access is not configured.");
    return client;
  };

  return {
    async findAttempt(attemptId) {
      const { data, error } = await requireClient()
        .from("quiz_attempts")
        .select("id, user_id, assessment_id, company_id, access_token_id, is_developer_test, completed_at")
        .eq("id", attemptId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let isOfflineCompany = false;
      if (data.company_id && String(data.assessment_id || "") === "outdoor_sales_mri") {
        const { data: company, error: companyError } = await requireClient()
          .from("companies")
          .select("is_offline_activated")
          .eq("id", data.company_id)
          .maybeSingle();
        if (companyError) throw companyError;
        isOfflineCompany = company?.is_offline_activated === true;
      }
      return {
        id: String(data.id),
        userId: data.user_id ? String(data.user_id) : null,
        assessmentId: String(data.assessment_id || ""),
        companyId: data.company_id ? String(data.company_id) : null,
        accessTokenId: data.access_token_id ? String(data.access_token_id) : null,
        isDeveloperTest: data.is_developer_test === true,
        completedAt: data.completed_at ? String(data.completed_at) : null,
        isOfflineCompany,
      };
    },
    async findAssessmentIdBySlug(slug) {
      const { data, error } = await requireClient()
        .from("assessments")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data?.id ? String(data.id) : null;
    },
    async findManagerByToken(token) {
      const { data, error } = await requireClient()
        .from("companies")
        .select("id, is_offline_activated")
        .eq("manager_token", token)
        .maybeSingle();
      if (error) throw error;
      return data?.id
        ? { companyId: String(data.id), offline: data.is_offline_activated === true }
        : null;
    },
    async verifyParticipantProof(headers) {
      const authorization = readHeader(headers, "authorization");
      if (!authorization) return { status: "unavailable" };
      if (!authorization.startsWith("Bearer ")) return { status: "invalid" };
      const token = authorization.slice(7).trim();
      if (!token) return { status: "invalid" };
      const { data, error } = await requireClient().auth.getUser(token);
      return error || !data.user?.id
        ? { status: "invalid" }
        : { status: "valid", userId: String(data.user.id) };
    },
    verifyAdministratorSession: isValidAdminSession,
    administratorCapabilities() {
      return String(process.env.ADMIN_ACTION_CAPABILITIES || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    },
    administratorId() {
      return String(process.env.ADMIN_ACTION_ACTOR_ID || "control-center-admin-session").trim();
    },
    verifyDeveloperProof(cookieValue) {
      if (!cookieValue) return { status: "invalid" };
      const current = readDeveloperTestAccess(cookieValue);
      if (current) return { status: "valid", ...current };
      return readDeveloperTestAccess(cookieValue, 0)
        ? { status: "expired" }
        : { status: "invalid" };
    },
  };
}

export class ReportAuthorizationService {
  private readonly dependencies: ReportAuthorizationDependencies;

  constructor(dependencies: ReportAuthorizationDependencies = defaultDependencies()) {
    this.dependencies = dependencies;
  }

  async authorizeAttemptAccess(input: AuthorizeAttemptAccessInput): Promise<ReportAuthorizationResult> {
    const purpose = input.purpose;
    const attemptId = String(input.attemptId || "").trim();
    if (!REPORT_ACCESS_PURPOSES.includes(purpose) || !UUID_PATTERN.test(attemptId)) {
      return { authorized: false, decision: "INVALID_PROOF", purpose };
    }
    if (input.actorHint && !REPORT_ACTOR_TYPES.includes(input.actorHint as ReportActorType)) {
      return { authorized: false, decision: "INVALID_ACTOR", purpose };
    }

    const attempt = await this.dependencies.findAttempt(attemptId);
    if (!attempt) return { authorized: false, decision: "NOT_FOUND", purpose };

    const expectedSlug = String(input.expectedAssessmentSlug || "").trim().toLowerCase();
    if (expectedSlug) {
      const expectedAssessmentId = await this.dependencies.findAssessmentIdBySlug(expectedSlug);
      if (!expectedAssessmentId || expectedAssessmentId !== attempt.assessmentId) {
        return { authorized: false, decision: "WRONG_ASSESSMENT", purpose };
      }
    }

    const developerCookie = readCookie(input.cookies, DEVELOPER_TEST_ACCESS_COOKIE);
    if (attempt.isDeveloperTest || input.actorHint === "developer-test" || developerCookie) {
      return this.authorizeDeveloper(attempt, purpose, developerCookie);
    }

    const managerToken = String(input.managerToken || "").trim();
    if (attempt.isOfflineCompany) {
      if (input.actorHint && input.actorHint !== "offline-company") {
        return { authorized: false, decision: "INVALID_ACTOR", purpose, actorType: "offline-company" };
      }
      return this.authorizeManager(attempt, purpose, managerToken, "offline-company");
    }
    if (input.actorHint === "company-manager" || input.actorHint === "offline-company" || managerToken) {
      return this.authorizeManager(attempt, purpose, managerToken, input.actorHint);
    }

    const adminCookie = readCookie(input.cookies, OFFLINE_ADMIN_COOKIE);
    if (input.actorHint === "administrator" || adminCookie) {
      return this.authorizeAdministrator(attempt, purpose, adminCookie);
    }

    if (
      input.actorHint === "future-entitlement" ||
      readHeader(input.headers, "x-report-entitlement-proof")
    ) {
      return { authorized: false, decision: "ENTITLEMENT_NOT_SUPPORTED", purpose, actorType: "future-entitlement" };
    }

    const participant = await this.dependencies.verifyParticipantProof(input.headers);
    if (participant.status === "unavailable") {
      return { authorized: false, decision: "PARTICIPANT_PROOF_UNAVAILABLE", purpose, actorType: "participant", attempt };
    }
    if (participant.status === "invalid") {
      return { authorized: false, decision: "INVALID_PROOF", purpose, actorType: "participant" };
    }
    if (!attempt.userId || participant.userId !== attempt.userId) {
      return { authorized: false, decision: "DENIED", purpose, actorType: "participant" };
    }
    return this.allowed(attempt, purpose, { type: "participant", id: participant.userId });
  }

  private authorizeDeveloper(
    attempt: ReportAuthorizationAttempt,
    purpose: ReportAccessPurpose,
    cookieValue: string,
  ): ReportAuthorizationResult {
    if (!attempt.isDeveloperTest) {
      return { authorized: false, decision: "DENIED", purpose, actorType: "developer-test" };
    }
    const proof = this.dependencies.verifyDeveloperProof(cookieValue);
    if (proof.status === "expired") {
      return { authorized: false, decision: "EXPIRED_PROOF", purpose, actorType: "developer-test" };
    }
    if (proof.status === "invalid") {
      return { authorized: false, decision: "INVALID_PROOF", purpose, actorType: "developer-test" };
    }
    if (
      proof.attemptId !== attempt.id ||
      proof.assessmentId !== attempt.assessmentId ||
      !attempt.userId ||
      proof.userId !== attempt.userId
    ) {
      return { authorized: false, decision: "DENIED", purpose, actorType: "developer-test" };
    }
    return this.allowed(attempt, purpose, { type: "developer-test", id: proof.userId });
  }

  private async authorizeManager(
    attempt: ReportAuthorizationAttempt,
    purpose: ReportAccessPurpose,
    managerToken: string,
    actorHint?: string,
  ): Promise<ReportAuthorizationResult> {
    if (!managerToken) {
      return { authorized: false, decision: "INVALID_PROOF", purpose, actorType: actorHint === "offline-company" ? "offline-company" : "company-manager" };
    }
    const manager = await this.dependencies.findManagerByToken(managerToken);
    if (!manager) {
      return { authorized: false, decision: "INVALID_PROOF", purpose, actorType: actorHint === "offline-company" ? "offline-company" : "company-manager" };
    }
    const actorType: ReportActorType = manager.offline ? "offline-company" : "company-manager";
    if (actorHint && actorHint !== actorType) {
      return { authorized: false, decision: "INVALID_ACTOR", purpose, actorType };
    }
    if (!attempt.companyId || attempt.companyId !== manager.companyId) {
      return { authorized: false, decision: "DENIED", purpose, actorType };
    }
    return this.allowed(attempt, purpose, { type: actorType, id: manager.companyId, companyId: manager.companyId });
  }

  private authorizeAdministrator(
    attempt: ReportAuthorizationAttempt,
    purpose: ReportAccessPurpose,
    cookieValue: string,
  ): ReportAuthorizationResult {
    if (!cookieValue || !this.dependencies.verifyAdministratorSession(cookieValue)) {
      return { authorized: false, decision: "INVALID_PROOF", purpose, actorType: "administrator" };
    }
    if (!this.dependencies.administratorCapabilities().includes(REPORT_READ_CAPABILITY)) {
      return { authorized: false, decision: "MISSING_CAPABILITY", purpose, actorType: "administrator" };
    }
    const actorId = this.dependencies.administratorId();
    if (!actorId) {
      return { authorized: false, decision: "INVALID_ACTOR", purpose, actorType: "administrator" };
    }
    return this.allowed(attempt, purpose, { type: "administrator", id: actorId });
  }

  private allowed(
    attempt: ReportAuthorizationAttempt,
    purpose: ReportAccessPurpose,
    actor: ReportAuthorizationActor,
  ): ReportAuthorizationSuccess {
    return { authorized: true, decision: "AUTHORIZED", purpose, actor, attempt };
  }
}
