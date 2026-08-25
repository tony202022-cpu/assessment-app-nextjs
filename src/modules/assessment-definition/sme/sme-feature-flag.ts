import type { SmeParityResult } from "./sme-parity";

export type SmeAssessmentPipeline = "legacy" | "universal";

/**
 * The universal path is never selected by the flag alone. An approved, clean
 * parity result is also required, leaving the legacy path as the safe default.
 */
export function selectSmeAssessmentPipeline(
  parity: SmeParityResult | null,
  enabled = process.env.SME_UNIVERSAL_ARCHITECTURE_ENABLED === "true",
): SmeAssessmentPipeline {
  return enabled && parity?.equivalent === true ? "universal" : "legacy";
}
