import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

function loadReturnUrlModule() {
  const source = read("src/lib/admin-return-url.ts");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => {
    throw new Error("Unexpected dependency");
  });
  return module.exports;
}

const { normalizeControlCenterReturnUrl, offlineAdminLoginUrl } = loadReturnUrlModule();

test("return URLs preserve Control Center detail paths and query strings", () => {
  assert.equal(normalizeControlCenterReturnUrl("/admin/companies/abc?q=Acme&page=2"), "/admin/companies/abc?q=Acme&page=2");
  assert.equal(normalizeControlCenterReturnUrl("/admin/participants/user-1"), "/admin/participants/user-1");
  assert.equal(offlineAdminLoginUrl("/admin/credits/company-1?sort=used", "/admin/credits"), "/admin/offline-company?returnTo=%2Fadmin%2Fcredits%2Fcompany-1%3Fsort%3Dused");
});

test("return URL validation rejects open redirects and unrelated admin paths", () => {
  for (const value of ["https://evil.example/admin/companies", "//evil.example/path", "/\\evil.example", "/admin/offline-company", "/admin/assessment-access", "/dashboard", "companies"]) {
    assert.equal(normalizeControlCenterReturnUrl(value), null, value);
  }
});

test("middleware only captures protected Control Center routes", () => {
  const middleware = read("middleware.ts");
  assert.match(middleware, /x-control-center-return-url|CONTROL_CENTER_RETURN_HEADER/);
  for (const route of ["companies", "participants", "credits", "complimentary"]) assert.match(middleware, new RegExp(`/admin/${route}/:path\\*`));
  assert.doesNotMatch(middleware, /offline-company\/:path/);
});

test("server layouts preserve authentication and redirect through the validated helper", () => {
  for (const route of ["companies", "participants", "credits", "complimentary"]) {
    const layout = read(`app/admin/${route}/layout.tsx`);
    assert.match(layout, /isValidAdminSession\(session\)/);
    assert.match(layout, /offlineAdminLoginUrl\(headers\(\)\.get\(CONTROL_CENTER_RETURN_HEADER\)/);
  }
});

test("existing login redirects only after a successful session response", () => {
  const login = read("app/admin/offline-company/OfflineCompanyActivation.tsx");
  assert.ok(login.indexOf("if (!response.ok)") < login.indexOf("router.replace(returnTo)"));
  assert.match(login, /router\.replace\(returnTo\)/);
  assert.match(login, /router\.refresh\(\)/);
});
