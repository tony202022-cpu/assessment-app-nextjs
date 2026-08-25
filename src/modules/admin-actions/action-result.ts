import "server-only";

import type { AdminActionErrorCode } from "./action-errors";
import type { ActionProgressState } from "./progress-state";
import type { RollbackMetadata } from "./rollback-metadata";

export type ActionRefresh = {
  strategy: "none" | "current-route" | "paths";
  paths?: string[];
};

export type ActionWorkflowMetadata = {
  progress: ActionProgressState;
  refresh: ActionRefresh;
  rollback: RollbackMetadata;
};

export type ActionSuccess<T> = {
  ok: true;
  data: T;
  error: null;
  meta: { requestId: string; actionId: string; completedAt: string; workflow: ActionWorkflowMetadata };
};

export type ActionFailure = {
  ok: false;
  data: null;
  error: { code: AdminActionErrorCode; message: string; fields?: Record<string, string> };
  meta: { requestId: string; actionId: string; failedAt: string; workflow: ActionWorkflowMetadata };
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

const EMPTY_PROGRESS: ActionProgressState = { current: "permission", status: "failed", events: [] };
const NO_REFRESH: ActionRefresh = { strategy: "none" };
const NO_ROLLBACK: RollbackMetadata = { mode: "impossible", summary: "No rollback metadata is available." };

export function actionSuccess<T>(input: { data: T; requestId: string; actionId: string; completedAt: string; workflow?: ActionWorkflowMetadata }): ActionSuccess<T> {
  return { ok: true, data: input.data, error: null, meta: { requestId: input.requestId, actionId: input.actionId, completedAt: input.completedAt, workflow: input.workflow || { progress: EMPTY_PROGRESS, refresh: NO_REFRESH, rollback: NO_ROLLBACK } } };
}

export function actionFailure(input: { code: AdminActionErrorCode; message: string; requestId: string; actionId: string; failedAt: string; fields?: Record<string, string>; workflow?: ActionWorkflowMetadata }): ActionFailure {
  return { ok: false, data: null, error: { code: input.code, message: input.message, ...(input.fields ? { fields: input.fields } : {}) }, meta: { requestId: input.requestId, actionId: input.actionId, failedAt: input.failedAt, workflow: input.workflow || { progress: EMPTY_PROGRESS, refresh: NO_REFRESH, rollback: NO_ROLLBACK } } };
}
