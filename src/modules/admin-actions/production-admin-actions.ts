import "server-only";

import { AdminActionService } from "./admin-action-service";
import { ActionRegistry } from "./action-registry";
import { ConfirmationModel } from "./confirmation-model";
import { PermissionValidator } from "./permission-validator";
import { SupabaseActionAudit } from "./supabase-action-audit";
import { restoreCreditAction } from "./actions/restore-credit";
import { generateComplimentaryTokenAction } from "./actions/generate-complimentary-token";

export const adminActionRegistry = new ActionRegistry([restoreCreditAction, generateComplimentaryTokenAction]);

export function createAdminActionService() {
  return new AdminActionService(
    adminActionRegistry,
    new PermissionValidator(),
    new ConfirmationModel(),
    new SupabaseActionAudit(),
  );
}
