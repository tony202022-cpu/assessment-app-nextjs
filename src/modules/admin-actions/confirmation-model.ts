import "server-only";

import { AdminActionError } from "./action-errors";

export type ConfirmationLevel = "none" | "standard" | "dangerous";
export type ConfirmationMode = "simple" | "dangerous" | "typed" | "reason-required";

export type ConfirmationRequirement = {
  level: ConfirmationLevel;
  mode?: ConfirmationMode;
  title: string;
  message: string;
  confirmLabel: string;
  expectedPhrase?: string;
  reasonRequired?: boolean;
};

export type ActionConfirmation = {
  acknowledged: boolean;
  actionId?: string;
  phrase?: string;
  reason?: string;
  acknowledgedAt?: string;
};

export type StandardConfirmationPayload = Required<Pick<ActionConfirmation, "acknowledged">> &
  Omit<ActionConfirmation, "acknowledged">;

export class ConfirmationModel {
  validate(requirement: ConfirmationRequirement, confirmation?: StandardConfirmationPayload) {
    if (requirement.level === "none") return;
    if (!confirmation?.acknowledged) {
      throw new AdminActionError("CONFIRMATION_REQUIRED", "Confirm this administrative action before continuing.");
    }
    const mode = requirement.mode || (requirement.expectedPhrase ? "typed" : requirement.reasonRequired ? "reason-required" : requirement.level === "dangerous" ? "dangerous" : "simple");
    if (mode === "typed" && !requirement.expectedPhrase) {
      throw new AdminActionError("CONFIRMATION_INVALID", "This action has an invalid typed-confirmation configuration.");
    }
    if (requirement.expectedPhrase && confirmation.phrase?.trim() !== requirement.expectedPhrase) {
      throw new AdminActionError("CONFIRMATION_INVALID", "The confirmation phrase does not match.", { fieldErrors: { phrase: "Enter the required confirmation phrase exactly." } });
    }
    if ((mode === "reason-required" || requirement.reasonRequired) && !confirmation.reason?.trim()) {
      throw new AdminActionError("CONFIRMATION_INVALID", "A reason is required for this action.", { fieldErrors: { reason: "Provide a reason for the audit record." } });
    }
  }

  normalize(actionId: string, confirmation?: ActionConfirmation): StandardConfirmationPayload {
    return {
      acknowledged: Boolean(confirmation?.acknowledged),
      actionId: confirmation?.actionId || actionId,
      phrase: confirmation?.phrase?.trim() || undefined,
      reason: confirmation?.reason?.trim() || undefined,
      acknowledgedAt: confirmation?.acknowledgedAt || undefined,
    };
  }
}
