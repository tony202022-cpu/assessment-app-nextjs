const CONTROL_CENTER_PREFIXES = [
  "/admin/companies",
  "/admin/participants",
  "/admin/credits",
  "/admin/complimentary",
  "/admin/access-center",
] as const;

export const CONTROL_CENTER_RETURN_HEADER = "x-control-center-return-url";

export function normalizeControlCenterReturnUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return null;

  try {
    const base = new URL("https://control-center.invalid");
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base.origin || parsed.username || parsed.password) return null;
    const allowed = CONTROL_CENTER_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${parsed.pathname}${parsed.search}` : null;
  } catch {
    return null;
  }
}

export function offlineAdminLoginUrl(value: unknown, fallback: string): string {
  const returnUrl = normalizeControlCenterReturnUrl(value) || normalizeControlCenterReturnUrl(fallback);
  return returnUrl
    ? `/admin/offline-company?returnTo=${encodeURIComponent(returnUrl)}`
    : "/admin/offline-company";
}
