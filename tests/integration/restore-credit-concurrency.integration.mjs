import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const confirmed = process.env.RESTORE_CREDIT_INTEGRATION_CONFIRM === "isolated-test-database";
const url = process.env.RESTORE_CREDIT_TEST_SUPABASE_URL || "";
const key = process.env.RESTORE_CREDIT_TEST_SERVICE_ROLE_KEY || "";
const companyId = process.env.RESTORE_CREDIT_TEST_COMPANY_ID || "";

test("concurrent retries with one operation ID restore exactly one credit", { skip: !confirmed || !url || !key || !companyId }, async () => {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: before, error: beforeError } = await supabase
    .from("companies")
    .select("id, package_size, credits_balance")
    .eq("id", companyId)
    .single();
  assert.ifError(beforeError);
  assert.ok(Number(before.credits_balance) < Number(before.package_size), "fixture must have at least one restorable credit");

  const operationId = randomUUID();
  const parameters = {
    p_company_id: companyId,
    p_administrator_id: "integration-concurrency-admin",
    p_administrator_role: "admin",
    p_reason: "Approved concurrent retry integration test",
    p_request_id: operationId,
  };
  const [first, second] = await Promise.all([
    supabase.rpc("restore_company_credit_admin_action", parameters),
    supabase.rpc("restore_company_credit_admin_action", parameters),
  ]);
  assert.ifError(first.error);
  assert.ifError(second.error);

  const firstResult = Array.isArray(first.data) ? first.data[0] : first.data;
  const secondResult = Array.isArray(second.data) ? second.data[0] : second.data;
  assert.equal(firstResult.audit_id, secondResult.audit_id);
  assert.equal(firstResult.old_balance, secondResult.old_balance);
  assert.equal(firstResult.new_balance, secondResult.new_balance);

  const [{ data: after, error: afterError }, { count: ledgerCount, error: ledgerError }, { count: auditCount, error: auditError }] = await Promise.all([
    supabase.from("companies").select("credits_balance").eq("id", companyId).single(),
    supabase.from("credit_transactions").select("*", { count: "exact", head: true }).eq("company_id", companyId).like("description", `%${operationId}%`),
    supabase.from("admin_action_audit").select("id", { count: "exact", head: true }).eq("request_id", operationId).eq("action_id", "credits.restore").eq("outcome", "succeeded"),
  ]);
  assert.ifError(afterError);
  assert.ifError(ledgerError);
  assert.ifError(auditError);
  assert.equal(Number(after.credits_balance), Number(before.credits_balance) + 1);
  assert.equal(ledgerCount, 1);
  assert.equal(auditCount, 1);
});
