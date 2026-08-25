import "server-only";

import { AdminActionError } from "./action-errors";

export type AdminRole = "super-admin" | "admin" | "support" | "finance" | "auditor" | "manager";
export type AdminCapability = string;

export type AdminActionActor = {
  id: string;
  role: AdminRole;
  capabilities: readonly AdminCapability[];
  companyIds?: readonly string[];
};

export type AdminActionResource = {
  type: string;
  id: string;
  companyId?: string | null;
};

export type PermissionRequirement = {
  anyOf: readonly AdminCapability[];
  companyScoped?: boolean;
};

export class PermissionValidator {
  assertAllowed(actor: AdminActionActor, resource: AdminActionResource, requirement: PermissionRequirement) {
    if (!actor.id || !requirement.anyOf.length) {
      throw new AdminActionError("ACTION_FORBIDDEN", "You are not permitted to perform this action.");
    }
    const allowed = requirement.anyOf.some((capability) => actor.capabilities.includes(capability));
    if (!allowed) throw new AdminActionError("ACTION_FORBIDDEN", "You are not permitted to perform this action.");
    if (requirement.companyScoped && resource.companyId && !actor.companyIds?.includes(resource.companyId)) {
      throw new AdminActionError("ACTION_FORBIDDEN", "You are not permitted to act on this company.");
    }
  }
}
