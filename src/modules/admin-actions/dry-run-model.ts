import "server-only";

export type DryRunRecord = {
  type: string;
  id: string;
  label?: string;
};

export type DryRunPreview = {
  currentState: Record<string, unknown>;
  expectedResult: Record<string, unknown>;
  affectedRecords: DryRunRecord[];
  warnings: string[];
  validationErrors: Record<string, string>;
};

export function createDryRunPreview(input: Partial<DryRunPreview> = {}): DryRunPreview {
  return {
    currentState: { ...(input.currentState || {}) },
    expectedResult: { ...(input.expectedResult || {}) },
    affectedRecords: [...(input.affectedRecords || [])],
    warnings: [...(input.warnings || [])],
    validationErrors: { ...(input.validationErrors || {}) },
  };
}
