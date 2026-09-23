import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = 34681;
const origin = `http://localhost:${port}`;
const secret = "admin-auth-flow-regression-secret";
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const nextBin = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));

const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: projectRoot,
  env: { ...process.env, ADMIN_ACTIVATION_SECRET: secret, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next production server did not start.");
}

try {
  await waitForServer();

  const unauthenticated = await fetch(`${origin}/admin`, { redirect: "manual" });
  assert.equal(unauthenticated.status, 307);
  assert.equal(unauthenticated.headers.get("location"), "/admin/login?returnTo=%2Fadmin");

  const loginPage = await fetch(`${origin}${unauthenticated.headers.get("location")}`);
  const loginHtml = await loginPage.text();
  assert.equal(loginPage.status, 200);
  assert.match(loginHtml, /Admin Sign In|Admin access required/);
  assert.doesNotMatch(loginHtml, /Offline Company Activation/);

  const signIn = await fetch(`${origin}/api/admin/offline-company/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ secret }),
  });
  assert.equal(signIn.status, 200);
  const cookie = signIn.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie?.startsWith("offline_company_admin="));

  const destination = await fetch(`${origin}/admin`, { headers: { Cookie: cookie }, redirect: "manual" });
  const destinationHtml = await destination.text();
  assert.equal(destination.status, 200);
  assert.match(destinationHtml, /Executive overview/);
  assert.match(destinationHtml, /Control Center/);
  assert.doesNotMatch(destinationHtml, /Offline Company Activation/);

  const direct = await fetch(`${origin}/admin`, { headers: { Cookie: cookie }, redirect: "manual" });
  const directHtml = await direct.text();
  assert.equal(direct.status, 200);
  assert.match(directHtml, /Executive overview/);
  assert.doesNotMatch(directHtml, /Offline Company Activation/);

  console.log("admin authentication flow: passed");
} finally {
  server.kill("SIGTERM");
}
