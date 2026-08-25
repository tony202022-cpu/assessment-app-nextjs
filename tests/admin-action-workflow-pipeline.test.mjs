import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../src/modules/admin-actions/", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");

test("workflow exposes dry-run, rollback, confirmation, progress, and standard result contracts", () => {
  assert.match(read("dry-run-model.ts"), /currentState:[\s\S]*expectedResult:[\s\S]*affectedRecords:[\s\S]*warnings:[\s\S]*validationErrors:/);
  assert.match(read("rollback-metadata.ts"), /"supported" \| "manual" \| "impossible"/);
  assert.match(read("confirmation-model.ts"), /"simple" \| "dangerous" \| "typed" \| "reason-required"/);
  assert.match(read("progress-state.ts"), /"permission" \| "validation" \| "dry-run" \| "confirmation" \| "execution" \| "audit" \| "refresh" \| "success" \| "rollback"/);
  assert.match(read("action-result.ts"), /workflow: ActionWorkflowMetadata/);
});

test("pipeline owns the lifecycle and AdminActionService remains its facade", () => {
  const pipeline = read("action-execution-pipeline.ts");
  const service = read("admin-action-service.ts");
  const marks = ["permission", "validation", "dry-run", "confirmation", "execution", "audit", "refresh", "success", "rollback"]
    .map((phase) => pipeline.indexOf(`progress.mark("${phase}"`, pipeline.indexOf("async execute")));
  assert.ok(marks.every((position) => position >= 0));
  assert.deepEqual([...marks].sort((a, b) => a - b), marks);
  assert.match(service, /this\.pipeline\.prepare/);
  assert.match(service, /this\.pipeline\.execute/);
  assert.doesNotMatch(service, /definition\.execute/);
});

test("every registered action must declare rollback metadata", () => {
  assert.match(read("action-registry.ts"), /if \(!definition\.rollback\)/);
  assert.match(read("actions/restore-credit.ts"), /rollback:[\s\S]*mode: "manual"/);
});
