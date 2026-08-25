import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("../src/modules/report-engine/", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");
const source = () => readdirSync(root).filter((name) => name.endsWith(".ts")).map(read).join("\n");

test("report engine provides every required infrastructure contract", () => {
  const files = readdirSync(root);
  for (const name of [
    "report-engine.ts", "report-renderer.ts", "section-registry.ts", "widget-registry.ts",
    "chart-renderer.ts", "recommendation-renderer.ts", "report-definition.ts",
    "report-context.ts", "report-theme.ts", "report-template.ts", "report-exporter.ts",
  ]) assert.ok(files.includes(name), `${name} is missing`);
  assert.match(read("report-engine.ts"), /export class ReportEngine/);
  assert.match(read("report-renderer.ts"), /export class ReportRenderer/);
  assert.match(read("report-exporter.ts"), /"pdf" \| "docx"/);
});

test("definitions support all requested configurable report sections", () => {
  const template = read("report-template.ts");
  for (const section of ["executive-summary", "competencies", "charts", "strengths", "weaknesses", "recommendations", "ninety-day-plan", "daily-schedule", "manager", "executive"]) {
    assert.match(template, new RegExp(`"${section}"`));
  }
  assert.match(read("report-definition.ts"), /ai-summary/);
  assert.match(read("report-definition.ts"), /LocalizedText/);
  assert.match(read("report-theme.ts"), /export type ReportTheme/);
});

test("rendering accepts canonical facts without data access or calculations", () => {
  const all = source();
  assert.doesNotMatch(all, /@\/integrations\/supabase|@supabase|\.from\(|\.rpc\(|fetch\(/);
  assert.doesNotMatch(all, /src\/lib\/actions|premium-report|pdf-recommendations|sales-manager-90day|sme-business-revival-90day/);
  assert.match(read("report-context.ts"), /already-calculated report facts/);
  assert.match(read("chart-renderer.ts"), /pre-calculated chart model/);
  assert.match(read("recommendation-renderer.ts"), /canonical recommendation records/);
});

test("audience filtering supports participant, manager, and executive output", () => {
  assert.match(read("report-context.ts"), /"participant" \| "manager" \| "executive"/);
  assert.match(read("report-renderer.ts"), /audienceSections/);
  assert.match(read("report-renderer.ts"), /section\.audiences/);
});

test("registries reject duplicates and exporters require explicit adapters", () => {
  assert.match(read("section-registry.ts"), /Invalid or duplicate section renderer/);
  assert.match(read("widget-registry.ts"), /Invalid or duplicate widget renderer/);
  assert.match(read("report-exporter.ts"), /Report export format is not configured/);
});
