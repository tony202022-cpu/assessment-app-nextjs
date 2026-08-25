import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../src/modules/admin-actions/", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");

test("admin action framework is server-only and ships without registered actions", () => {
  const files = [
    "admin-action-service.ts",
    "action-execution-pipeline.ts",
    "action-registry.ts",
    "permission-validator.ts",
    "confirmation-model.ts",
    "action-result.ts",
    "action-audit.ts",
    "action-errors.ts",
    "dry-run-model.ts",
    "rollback-metadata.ts",
    "progress-state.ts",
    "index.ts",
  ];
  for (const file of files) assert.match(read(file), /import "server-only";/);
  assert.match(read("action-registry.ts"), /emptyAdminActionRegistry = new ActionRegistry\(\)/);
});

test("framework requires permission, confirmation, validation, and audit before handlers", () => {
  const pipeline = read("action-execution-pipeline.ts");
  assert.match(pipeline, /permissions\.assertAllowed/);
  assert.match(pipeline, /definition\.validateInput/);
  assert.match(pipeline, /confirmations\.validate/);
  assert.match(pipeline, /recordAudit\("attempted"/);
  assert.ok(pipeline.indexOf('recordAudit("attempted"') < pipeline.indexOf("definition.execute"));
});

test("framework contains no persistence client or administrative business action", () => {
  const source = [
    read("admin-action-service.ts"),
    read("action-execution-pipeline.ts"),
    read("action-registry.ts"),
    read("permission-validator.ts"),
    read("confirmation-model.ts"),
    read("action-result.ts"),
    read("action-audit.ts"),
    read("action-errors.ts"),
  ].join("\n");
  assert.doesNotMatch(source, /supabase|\.from\(["']|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i);
  assert.doesNotMatch(source, /restore credit|generate complimentary token|reset assessment|delete duplicate|change email|transfer credits|regenerate manager token/i);
});
