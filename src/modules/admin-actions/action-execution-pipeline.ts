import "server-only";

import { createActionAuditRecord, type ActionAudit, type ActionAuditOutcome } from "./action-audit";
import { AdminActionError, toAdminActionError } from "./action-errors";
import { actionFailure, actionSuccess, type ActionRefresh, type ActionResult } from "./action-result";
import { type AdminActionContext, ActionRegistry } from "./action-registry";
import { type ActionConfirmation, ConfirmationModel } from "./confirmation-model";
import type { DryRunPreview } from "./dry-run-model";
import { PermissionValidator } from "./permission-validator";
import { ProgressStateModel } from "./progress-state";
import { resolveRollbackMetadata, type RollbackMetadata } from "./rollback-metadata";

export type ActionPipelineRequest = {
  actionId: string;
  input: unknown;
  confirmation?: ActionConfirmation;
  context: AdminActionContext;
};

export type PreparedActionWorkflow = {
  id: string;
  title: string;
  description: string;
  confirmation: ReturnType<ActionRegistry["list"]>[number]["confirmation"];
  dryRun: DryRunPreview | null;
  rollback: RollbackMetadata;
};

const NOT_EXECUTED_ROLLBACK: RollbackMetadata = {
  mode: "impossible",
  summary: "No rollback is required because the action did not complete.",
};

export class ActionExecutionPipeline {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly permissions: PermissionValidator,
    private readonly confirmations: ConfirmationModel,
    private readonly audit: ActionAudit,
  ) {}

  async prepare(request: Omit<ActionPipelineRequest, "confirmation">): Promise<ActionResult<PreparedActionWorkflow>> {
    const progress = new ProgressStateModel();
    const { actionId, context } = request;
    try {
      const definition = this.registry.get(actionId);
      progress.mark("permission", "running");
      this.permissions.assertAllowed(context.actor, context.resource, definition.permission);
      progress.mark("permission", "completed");

      progress.mark("validation", "running");
      const validation = definition.validateInput(request.input);
      if (validation.ok === false) throw new AdminActionError("INPUT_INVALID", validation.message, { fieldErrors: validation.fields });
      progress.mark("validation", "completed");

      let dryRun: DryRunPreview | null = null;
      if (definition.dryRun) {
        progress.mark("dry-run", "running");
        dryRun = await definition.dryRun(validation.value, context);
        if (Object.keys(dryRun.validationErrors).length) {
          throw new AdminActionError("DRY_RUN_FAILED", "The action preview found validation errors.", { fieldErrors: dryRun.validationErrors });
        }
        progress.mark("dry-run", "completed");
      } else {
        progress.mark("dry-run", "skipped");
      }

      progress.mark("confirmation", "pending");
      const rollback = typeof definition.rollback === "function"
        ? { mode: "manual" as const, summary: "Rollback details will be resolved after execution." }
        : definition.rollback;
      return actionSuccess({
        data: { id: definition.id, title: definition.title, description: definition.description, confirmation: definition.confirmation, dryRun, rollback },
        requestId: context.requestId,
        actionId: definition.id,
        completedAt: context.now.toISOString(),
        workflow: { progress: progress.snapshot(), refresh: { strategy: "none" }, rollback },
      });
    } catch (error) {
      const failure = toAdminActionError(error);
      progress.mark(progress.snapshot().current, "failed");
      return actionFailure({ code: failure.code, message: failure.message, fields: failure.fieldErrors, requestId: context.requestId, actionId, failedAt: context.now.toISOString(), workflow: { progress: progress.snapshot(), refresh: { strategy: "none" }, rollback: NOT_EXECUTED_ROLLBACK } });
    }
  }

  async execute<TOutput = unknown>(request: ActionPipelineRequest): Promise<ActionResult<TOutput>> {
    const progress = new ProgressStateModel();
    const { actionId, context } = request;
    let definition;
    let validatedInput: unknown;
    let executionCompleted = false;
    let executedOutput: TOutput | undefined;
    try {
      definition = this.registry.get<unknown, TOutput>(actionId);
      progress.mark("permission", "running");
      this.permissions.assertAllowed(context.actor, context.resource, definition.permission);
      progress.mark("permission", "completed");

      progress.mark("validation", "running");
      const validation = definition.validateInput(request.input);
      if (validation.ok === false) throw new AdminActionError("INPUT_INVALID", validation.message, { fieldErrors: validation.fields });
      validatedInput = validation.value;
      progress.mark("validation", "completed");

      if (definition.dryRun) {
        progress.mark("dry-run", "running");
        const preview = await definition.dryRun(validatedInput, context);
        if (Object.keys(preview.validationErrors).length) throw new AdminActionError("DRY_RUN_FAILED", "The action preview found validation errors.", { fieldErrors: preview.validationErrors });
        progress.mark("dry-run", "completed");
      } else {
        progress.mark("dry-run", "skipped");
      }

      progress.mark("confirmation", "running");
      const confirmation = this.confirmations.normalize(actionId, request.confirmation);
      this.confirmations.validate(definition.confirmation, confirmation);
      progress.mark("confirmation", "completed");

      // The attempted record is a pre-execution safety gate. The lifecycle audit
      // phase below records the authoritative outcome after execution.
      await this.recordAudit("attempted", { ...request, confirmation }, definition.auditMetadata?.(validatedInput));
    } catch (error) {
      const failure = toAdminActionError(error);
      progress.mark(progress.snapshot().current, "failed");
      const reported = await this.recordFailureAudit(failure.code === "ACTION_FORBIDDEN" ? "denied" : "failed", request, failure);
      return actionFailure({ code: reported.code, message: reported.message, fields: reported.fieldErrors, requestId: context.requestId, actionId, failedAt: context.now.toISOString(), workflow: { progress: progress.snapshot(), refresh: { strategy: "none" }, rollback: NOT_EXECUTED_ROLLBACK } });
    }

    try {
      progress.mark("execution", "running");
      const data = await definition.execute(validatedInput, context);
      executionCompleted = true;
      executedOutput = data;
      progress.mark("execution", "completed");

      progress.mark("audit", "running");
      await this.recordAudit("succeeded", request, definition.auditMetadata?.(validatedInput));
      progress.mark("audit", "completed");

      progress.mark("refresh", "running");
      const refresh: ActionRefresh = typeof definition.refresh === "function"
        ? definition.refresh(validatedInput, data)
        : definition.refresh || { strategy: "current-route" };
      progress.mark("refresh", "completed");
      progress.mark("success", "completed");

      progress.mark("rollback", "running");
      const rollback = resolveRollbackMetadata(definition.rollback, validatedInput, data);
      progress.mark("rollback", "completed");
      return actionSuccess({ data, requestId: context.requestId, actionId: definition.id, completedAt: new Date().toISOString(), workflow: { progress: progress.snapshot(), refresh, rollback } });
    } catch (error) {
      const failure = toAdminActionError(error);
      progress.mark(progress.snapshot().current, "failed");
      const reported = await this.recordFailureAudit("failed", request, failure);
      const rollback = executionCompleted && definition
        ? resolveRollbackMetadata(definition.rollback, validatedInput, executedOutput as TOutput)
        : NOT_EXECUTED_ROLLBACK;
      return actionFailure({ code: reported.code, message: reported.message, fields: reported.fieldErrors, requestId: context.requestId, actionId, failedAt: new Date().toISOString(), workflow: { progress: progress.snapshot(), refresh: { strategy: "none" }, rollback } });
    }
  }

  private async recordAudit(outcome: ActionAuditOutcome, request: ActionPipelineRequest, metadata?: Record<string, string | number | boolean | null>) {
    try {
      await this.audit.record(createActionAuditRecord({ requestId: request.context.requestId, actionId: request.actionId, actor: { id: request.context.actor.id, role: request.context.actor.role }, resource: request.context.resource, outcome, occurredAt: new Date().toISOString(), reason: request.confirmation?.reason?.trim() || undefined, context: { ipAddress: request.context.ipAddress, userAgent: request.context.userAgent, correlationId: request.context.correlationId }, metadata }));
    } catch (error) {
      throw new AdminActionError("AUDIT_FAILED", "The action was stopped because its audit record could not be written.", { cause: error });
    }
  }

  private async recordFailureAudit(outcome: ActionAuditOutcome, request: ActionPipelineRequest, failure: AdminActionError) {
    try {
      await this.audit.record(createActionAuditRecord({ requestId: request.context.requestId, actionId: request.actionId, actor: { id: request.context.actor.id, role: request.context.actor.role }, resource: request.context.resource, outcome, occurredAt: new Date().toISOString(), reason: request.confirmation?.reason?.trim() || undefined, errorCode: failure.code, context: { ipAddress: request.context.ipAddress, userAgent: request.context.userAgent, correlationId: request.context.correlationId } }));
      return failure;
    } catch (error) {
      return new AdminActionError("AUDIT_FAILED", "The action failed and its audit record could not be written.", { cause: error });
    }
  }
}
