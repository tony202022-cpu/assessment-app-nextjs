import "server-only";

import type { ActionAudit } from "./action-audit";
import type { ActionResult } from "./action-result";
import { ActionExecutionPipeline, type ActionPipelineRequest, type PreparedActionWorkflow } from "./action-execution-pipeline";
import type { AdminActionContext } from "./action-registry";
import { ActionRegistry } from "./action-registry";
import type { ActionConfirmation } from "./confirmation-model";
import { ConfirmationModel } from "./confirmation-model";
import { PermissionValidator } from "./permission-validator";

export type PreparedAdminAction = PreparedActionWorkflow;

export type AdminActionRequest = {
  actionId: string;
  input: unknown;
  confirmation?: ActionConfirmation;
  context: AdminActionContext;
};

export class AdminActionService {
  private readonly pipeline: ActionExecutionPipeline;

  constructor(
    registry: ActionRegistry,
    permissions: PermissionValidator,
    confirmations: ConfirmationModel,
    audit: ActionAudit,
  ) {
    this.pipeline = new ActionExecutionPipeline(registry, permissions, confirmations, audit);
  }

  prepare(actionId: string, input: unknown, context: AdminActionContext): Promise<ActionResult<PreparedAdminAction>> {
    return this.pipeline.prepare({ actionId, input, context });
  }

  execute<TOutput = unknown>(request: AdminActionRequest): Promise<ActionResult<TOutput>> {
    return this.pipeline.execute<TOutput>(request as ActionPipelineRequest);
  }
}
