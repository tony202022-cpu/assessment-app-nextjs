import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const OFFLINE_ADMIN_COOKIE = "offline_company_admin";
export const OFFLINE_ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ALLOWED_ASSESSMENT_TYPES = ["outdoor_sales_mri"] as const;

export type ActivationInput = {
  companyName: string;
  billingEmail: string;
  packageSize: number;
  assessmentType: (typeof ALLOWED_ASSESSMENT_TYPES)[number];
  expiresAt: string | null;
};

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function secret(): string {
  return process.env.ADMIN_ACTIVATION_SECRET || "";
}

export function secretsMatch(candidate: string): boolean {
  const expected = Buffer.from(secret());
  const supplied = Buffer.from(candidate);
  return (
    expected.length >= 24 &&
    expected.length === supplied.length &&
    timingSafeEqual(expected, supplied)
  );
}

export function createAdminSession(): string {
  const expires = Math.floor(Date.now() / 1000) + OFFLINE_ADMIN_SESSION_SECONDS;
  const payload = `v1.${expires}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isValidAdminSession(value: string | undefined): boolean {
  if (!value || !secret()) return false;
  const [version, expiresText, signature] = value.split(".");
  if (version !== "v1" || !expiresText || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = createHmac("sha256", secret())
    .update(`${version}.${expiresText}`)
    .digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function validateActivationInput(value: unknown):
  | { ok: true; data: ActivationInput }
  | { ok: false; fields: Record<string, string> } {
  const body = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const companyName = String(body.companyName || "").trim().replace(/\s+/g, " ");
  const billingEmail = String(body.billingEmail || "").trim().toLowerCase();
  const packageSize = Number(body.packageSize);
  const assessmentType = String(body.assessmentType || "").trim();
  const expiresAtText = String(body.expiresAt || "").trim();
  const fields: Record<string, string> = {};

  if (companyName.length < 2 || companyName.length > 200) {
    fields.companyName = "Enter a company name between 2 and 200 characters.";
  }
  if (
    billingEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)
  ) {
    fields.billingEmail = "Enter a valid HR or billing email address.";
  }
  if (!Number.isSafeInteger(packageSize) || packageSize < 1 || packageSize > 100000) {
    fields.packageSize = "Credits must be a positive whole number (maximum 100,000).";
  }
  if (!ALLOWED_ASSESSMENT_TYPES.includes(assessmentType as ActivationInput["assessmentType"])) {
    fields.assessmentType = "This assessment type is not allowed.";
  }

  let expiresAt: string | null = null;
  if (expiresAtText) {
    const parsed = new Date(expiresAtText);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      fields.expiresAt = "Choose a future expiry date, or leave it blank.";
    } else {
      expiresAt = parsed.toISOString();
    }
  }

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    data: {
      companyName,
      billingEmail,
      packageSize,
      assessmentType: assessmentType as ActivationInput["assessmentType"],
      expiresAt,
    },
  };
}

