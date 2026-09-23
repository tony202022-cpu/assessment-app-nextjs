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
  assert.equal(normalizeControlCenterReturnUrl("/admin"), "/admin");
  assert.equal(offlineAdminLoginUrl(null, "/admin"), "/admin/login?returnTo=%2Fadmin");
  assert.equal(normalizeControlCenterReturnUrl("/admin/companies/abc?q=Acme&page=2"), "/admin/companies/abc?q=Acme&page=2");
  assert.equal(normalizeControlCenterReturnUrl("/admin/participants/user-1"), "/admin/participants/user-1");
  assert.equal(offlineAdminLoginUrl("/admin/credits/company-1?sort=used", "/admin/credits"), "/admin/login?returnTo=%2Fadmin%2Fcredits%2Fcompany-1%3Fsort%3Dused");
});

test("return URL validation rejects open redirects and unrelated admin paths", () => {
  assert.equal(normalizeControlCenterReturnUrl("/admin/offline-company"), "/admin/offline-company");
  for (const value of ["https://evil.example/admin/companies", "//evil.example/path", "/\\evil.example", "/admin/login", "/admin/assessment-access", "/dashboard", "companies"]) {
    assert.equal(normalizeControlCenterReturnUrl(value), null, value);
  }
});

test("middleware only captures protected Control Center routes", () => {
  const middleware = read("middleware.ts");
  assert.match(middleware, /x-control-center-return-url|CONTROL_CENTER_RETURN_HEADER/);
  for (const route of ["companies", "participants", "credits", "complimentary"]) assert.match(middleware, new RegExp(`/admin/${route}/:path\\*`));
  assert.match(middleware, /["']\/admin["']/);
  assert.ok(middleware.includes('"/admin/system-tools/:path*"'));
  assert.ok(middleware.includes('"/admin/offline-company/:path*"'));
  assert.doesNotMatch(middleware, /\/admin\/login\/:path/);
});

test("authenticated authorized /admin renders the Control Center overview", () => {
  const page = read("app/admin/page.tsx");
  const authGuard = page.indexOf("if (!isValidAdminSession(session))");
  const dashboardLoad = page.indexOf("getControlCenterDashboard()");
  const overviewRender = page.indexOf("<ControlCenterDashboardView dashboard={dashboard}");
  assert.ok(authGuard >= 0);
  assert.ok(dashboardLoad > authGuard);
  assert.ok(overviewRender > dashboardLoad);
  assert.doesNotMatch(page, /redirect\(["']\/admin\/offline-company["']\)/);
});

test("Admin navigation resolves the completed modules and System Tools route", () => {
  const shell = read("src/components/admin/admin-shell.tsx");
  for (const route of ["/admin", "/admin/companies", "/admin/participants", "/admin/credits", "/admin/access-center", "/admin/complimentary", "/admin/system-tools"]) {
    assert.match(shell, new RegExp(`href: ["']${route.replaceAll("/", "\\/")}["']|href=["']${route.replaceAll("/", "\\/")}["']`));
  }
  assert.match(read("app/admin/system-tools/page.tsx"), /AssessmentAccessConsole/);
});

test("server layouts preserve authentication and redirect through the validated helper", () => {
  for (const route of ["companies", "participants", "credits", "complimentary"]) {
    const layout = read(`app/admin/${route}/layout.tsx`);
    assert.match(layout, /isValidAdminSession\(session\)/);
    assert.match(layout, /offlineAdminLoginUrl\(headers\(\)\.get\(CONTROL_CENTER_RETURN_HEADER\)/);
  }
});

test("complete authentication flow returns to the Control Center, never the legacy activation tool", () => {
  const login = read("app/admin/login/AdminLogin.tsx");
  const loginPage = read("app/admin/login/page.tsx");
  const adminPage = read("app/admin/page.tsx");
  const legacyPage = read("app/admin/offline-company/page.tsx");
  assert.match(loginPage, /returnTo=.*\|\| ["']\/admin["']/);
  assert.ok(login.indexOf("if (!response.ok)") < login.indexOf("window.location.assign(returnTo)"));
  assert.match(login, /window\.location\.assign\(returnTo\)/);
  assert.doesNotMatch(login, /Offline Company Activation/);
  assert.match(adminPage, /ControlCenterDashboardView/);
  assert.match(legacyPage, /isValidAdminSession\(session\)/);
  assert.match(legacyPage, /<OfflineCompanyActivation/);
});
