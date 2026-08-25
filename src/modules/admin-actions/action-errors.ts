import "server-only";

export type AdminActionErrorCode =
  | "ACTION_NOT_FOUND"
  | "ACTION_FORBIDDEN"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMATION_INVALID"
  | "INPUT_INVALID"
  | "DRY_RUN_FAILED"
  | "ACTION_CONFLICT"
  | "COMPANY_NOT_FOUND"
  | "ASSESSMENT_NOT_FOUND"
  | "ASSESSMENT_NOT_ELIGIBLE"
  | "INVALID_EXPIRY"
  | "INVALID_CREDIT_BALANCE"
  | "CREDITS_AT_MAXIMUM"
  | "AUDIT_FAILED"
  | "ACTION_FAILED";

export class AdminActionError extends Error {
  readonly code: AdminActionErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly cause?: unknown;

  constructor(code: AdminActionErrorCode, message: string, options: { fieldErrors?: Record<string, string>; cause?: unknown } = {}) {
    super(message);
    this.name = "AdminActionError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.cause = options.cause;
  }
}

export function toAdminActionError(error: unknown) {
  if (error instanceof AdminActionError) return error;
  return new AdminActionError("ACTION_FAILED", "The administrative action could not be completed.", { cause: error });
}
