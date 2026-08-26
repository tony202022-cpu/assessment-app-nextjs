import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

class TestAdminActionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function loadPermissionValidator() {
  const source = readFileSync(
    new URL("../src/modules/admin-actions/permission-validator.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "./action-errors") return { AdminActionError: TestAdminActionError };
    throw new Error(`Unexpected test dependency: ${specifier}`);
  };
  new Function("require", "exports", "module", compiled)(localRequire, module.exports, module);
  return module.exports.PermissionValidator;
}

test("Restore Credit permission denies a missing capability and accepts the explicit capability", () => {
  const PermissionValidator = loadPermissionValidator();
  const validator = new PermissionValidator();
  const resource = { type: "company", id: "company-1", companyId: "company-1" };
  const requirement = { anyOf: ["credits.restore"] };

  assert.throws(
    () => validator.assertAllowed({ id: "admin-1", role: "admin", capabilities: [] }, resource, requirement),
    (error) => error instanceof TestAdminActionError && error.code === "ACTION_FORBIDDEN",
  );
  assert.doesNotThrow(() =>
    validator.assertAllowed(
      { id: "admin-1", role: "admin", capabilities: ["credits.restore"] },
      resource,
      requirement,
    ),
  );
});
