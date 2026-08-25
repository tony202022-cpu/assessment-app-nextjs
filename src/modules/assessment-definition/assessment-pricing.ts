export type AssessmentPrice = { currency: string; amountMinor: number };

export type AssessmentPricing = {
  model: "free" | "fixed" | "package" | "subscription" | "quote";
  individual?: AssessmentPrice;
  corporate?: { minimumPackageSize?: number; unitPrice?: AssessmentPrice; quoteRequired?: boolean };
  taxCategory?: string;
  pricingProviderId?: string;
};
