import "server-only";

export type RollbackMode = "supported" | "manual" | "impossible";

export type RollbackMetadata = {
  mode: RollbackMode;
  summary: string;
  instructions?: string;
  rollbackActionId?: string;
  snapshot?: Record<string, string | number | boolean | null>;
};

export type RollbackDeclaration<TInput = unknown, TOutput = unknown> =
  | RollbackMetadata
  | ((input: TInput, output: TOutput) => RollbackMetadata);

export function resolveRollbackMetadata<TInput, TOutput>(
  declaration: RollbackDeclaration<TInput, TOutput>,
  input: TInput,
  output: TOutput,
): RollbackMetadata {
  const metadata = typeof declaration === "function" ? declaration(input, output) : declaration;
  return { ...metadata, snapshot: metadata.snapshot ? { ...metadata.snapshot } : undefined };
}
