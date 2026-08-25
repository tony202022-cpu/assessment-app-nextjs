export type AssessmentAccessChannel = "public" | "authenticated" | "entitlement" | "invitation" | "company" | "developer";
export type AssessmentEntitlementType = "purchased" | "corporate" | "complimentary" | "trial" | "coupon" | "partner" | "employee" | "internal-qa" | "vip" | "custom";

export type AssessmentEntitlementPolicy = {
  type: AssessmentEntitlementType;
  enabled: boolean;
  usage: "single-use" | "limited-use" | "reusable";
  maximumUses?: number;
  maximumLifetimeDays?: number;
  organizationRequired?: boolean;
};

export type AssessmentAccessPolicy = {
  channels: AssessmentAccessChannel[];
  authenticationRequired: boolean;
  individualEnabled: boolean;
  corporateEnabled: boolean;
  managerAccessEnabled: boolean;
  entitlementPolicies: AssessmentEntitlementPolicy[];
  tokenPolicy?: { required: boolean; exchangeForSession: boolean; purpose: string };
};
