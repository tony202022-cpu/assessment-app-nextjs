export const PAID_MRI_ASSESSMENT_BY_SLUG: Record<string, string> = {
  "outdoor-mri": "outdoor_sales_mri",
  "sales-manager-mri": "sales_manager_mri",
  "sme-business-health-mri": "sme_business_health_mri",
  "lawyer-client-conversion-mri": "lawyer_client_conversion_mri",
};

export function normalizeAccessSlug(value: any) {
  return String(value || "").toLowerCase().trim();
}

export function expectedPaidMriAssessmentId(slug: any) {
  return PAID_MRI_ASSESSMENT_BY_SLUG[normalizeAccessSlug(slug)] || "";
}

export function isPaidMriSlug(slug: any) {
  return !!expectedPaidMriAssessmentId(slug);
}

export function isPaidMriAssessmentId(assessmentId: any) {
  const id = normalizeAccessSlug(assessmentId);
  return Object.values(PAID_MRI_ASSESSMENT_BY_SLUG).includes(id);
}

export function isDeveloperTestAttemptOwner(attempt: any, authenticatedUserId: any) {
  const attemptUserId = normalizeAccessSlug(attempt?.user_id);
  const currentUserId = normalizeAccessSlug(authenticatedUserId);
  return (
    attempt?.is_developer_test === true &&
    !!attemptUserId &&
    !!currentUserId &&
    attemptUserId === currentUserId
  );
}

export function isTokenBackedPaidAttempt(attempt: any, authenticatedUserId?: any) {
  return !!(
    attempt?.access_token_id ||
    attempt?.company_id ||
    isDeveloperTestAttemptOwner(attempt, authenticatedUserId)
  );
}

export function isAuthorizedPaidMriAttempt(
  slug: any,
  attempt: any,
  authenticatedUserId?: any,
) {
  const expectedAssessmentId = expectedPaidMriAssessmentId(slug);
  if (!expectedAssessmentId) return true;

  return (
    normalizeAccessSlug(attempt?.assessment_id) === expectedAssessmentId &&
    isTokenBackedPaidAttempt(attempt, authenticatedUserId)
  );
}
