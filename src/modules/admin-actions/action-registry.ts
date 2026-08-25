import "server-only";

import { AdminActionError } from "./action-errors";
import type { ConfirmationRequirement } from "./confirmation-model";
import type { AdminActionActor, AdminActionResource, PermissionRequirement } from "./permission-validator";
import type { DryRunPreview } from "./dry-run-model";
import type { ActionRefresh } from "./action-result";
import type { RollbackDeclaration } from "./rollback-metadata";

export type AdminActionContext = {
  requestId: string;
  actor: AdminActionActor;
  resource: AdminActionResource;
  now: Date;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
};

export type InputValidation<TInput> = { ok: true; value: TInput } | { ok: false; message: string; fields?: Record<string, string> };

export type AdminActionDefinition<TInput = unknown, TOutput = unknown> = {
  id: string;
  title: string;
  description: string;
  permission: PermissionRequirement;
  confirmation: ConfirmationRequirement;
  rollback: RollbackDeclaration<TInput, TOutput>;
  refresh?: ActionRefresh | ((input: TInput, output: TOutput) => ActionRefresh);
  validateInput(input: unknown): InputValidation<TInput>;
  dryRun?(input: TInput, context: AdminActionContext): Promise<DryRunPreview>;
  execute(input: TInput, context: AdminActionContext): Promise<TOutput>;
  auditMetadata?(input: TInput): Record<string, string | number | boolean | null>;
};

export class ActionRegistry {
  private readonly actions: ReadonlyMap<string, AdminActionDefinition<any, any>>;

  constructor(definitions: readonly AdminActionDefinition<any, any>[] = []) {
    const actions = new Map<string, AdminActionDefinition<any, any>>();
    for (const definition of definitions) {
      const id = definition.id.trim();
      if (!id || actions.has(id)) throw new Error(`Invalid or duplicate administrative action id: ${id || "(empty)"}`);
      if (!definition.rollback) throw new Error(`Administrative action ${id} must declare rollback metadata.`);
      actions.set(id, definition);
    }
    this.actions = actions;
  }

  get<TInput = unknown, TOutput = unknown>(actionId: string): AdminActionDefinition<TInput, TOutput> {
    const definition = this.actions.get(String(actionId || "").trim());
    if (!definition) throw new AdminActionError("ACTION_NOT_FOUND", "This administrative action is not available.");
    return definition as AdminActionDefinition<TInput, TOutput>;
  }

  list() {
    return Array.from(this.actions.values()).map(({ id, title, description, permission, confirmation, rollback }) => ({ id, title, description, permission, confirmation, rollback }));
  }
}

export const emptyAdminActionRegistry = new ActionRegistry();
