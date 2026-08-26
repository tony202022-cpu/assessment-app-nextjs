import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const action = read("src/modules/admin-actions/actions/regenerate-manager-token.ts");
const registry = read("src/modules/admin-actions/production-admin-actions.ts");
const route = read("app/api/admin/actions/companies/regenerate-manager-token/route.ts");
const ui = read("src/components/admin/regenerate-manager-token-action.tsx");
const futureActions = read("src/components/admin/future-actions.tsx");
const companyPage = read("app/admin/companies/[id]/page.tsx");

test("manager token regeneration uses the existing Admin Actions workflow", () => {
  assert.match(action, /id: "companies\.manager-token\.regenerate"/);
  assert.match(action, /anyOf: \["companies\.manager-token\.regenerate"\]/);
  assert.match(action, /async dryRun/);
  assert.match(action, /mode: "reason-required"/);
  assert.match(action, /reasonRequired: true/);
  assert.match(action, /refresh: \{ strategy: "current-route" \}/);
  assert.match(registry, /regenerateManagerTokenAction/);
  assert.match(route, /service\.prepare/);
  assert.match(route, /service\.execute/);
});

test("replacement is cryptographically random and invalidates the old token with compare-and-swap", () => {
  assert.match(action, /randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(action, /\.update\(\{ manager_token: replacementToken \}\)/);
  assert.match(action, /\.eq\("manager_token", previousToken\)/);
  assert.match(action, /Manager access changed during this request/);
  assert.match(action, /mode: "impossible"/);
});

test("tokens are returned only as the authorized dashboard URL and never audited or logged", () => {
  const auditBlock = action.slice(action.indexOf("auditMetadata"), action.indexOf("async execute"));
  assert.match(action, /managerDashboardPath:/);
  assert.match(action, /credentialType: "manager_token"/);
  assert.doesNotMatch(auditBlock, /manager_token\)|previousToken|replacementToken/);
  assert.doesNotMatch(action, /console\.(log|info|warn|error)/);
  assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
});

test("route enforces session, same origin, rate limiting, and capability context", () => {
  assert.match(route, /origin !== request\.nextUrl\.origin/);
  assert.match(route, /isValidAdminSession/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /ADMIN_ACTION_CAPABILITIES/);
  assert.match(route, /Cache-Control": "no-store"/);
});

test("only Regenerate Manager Token and authorized Restore Credit are enabled on the company action panel", () => {
  assert.match(futureActions, /RegenerateManagerTokenAction/);
  assert.match(futureActions, /RestoreCreditAction/);
  assert.match(futureActions, /canRestoreCredit \? <RestoreCreditAction/);
  assert.match(companyPage, /capabilities\.includes\("credits\.restore"\)/);
  assert.match(futureActions, /All other actions remain unavailable/);
  assert.match(futureActions, /actions\.map/);
  assert.match(futureActions, /disabled className="h-11/);
  assert.match(ui, /Preview/);
  assert.match(ui, /The previous manager dashboard link is now invalid/);
});
