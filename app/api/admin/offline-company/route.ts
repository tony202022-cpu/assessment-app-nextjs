import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isValidAdminSession,
  OFFLINE_ADMIN_COOKIE,
  validateActivationInput,
} from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic = "force-dynamic";

function safeCompany(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    billingEmail: String(row.billing_email || ""),
    packageSize: Number(row.package_size || 0),
    creditsBalance: Number(row.credits_balance || 0),
    createdAt: String(row.created_at || ""),
  };
}

function normalizeCompanyName(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeIlikeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function findDuplicateCompany(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  companyName: string,
  billingEmail: string
) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, billing_email, package_size, credits_balance, created_at")
    .ilike("billing_email", escapeIlikeLiteral(billingEmail));

  if (error) return { duplicate: null, error };

  const normalizedName = normalizeCompanyName(companyName);
  const duplicate = (data || []).find(
    (company) =>
      normalizeCompanyName(company.name) === normalizedName &&
      String(company.billing_email || "").trim().toLowerCase() === billingEmail
  );

  return { duplicate: duplicate || null, error: null };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorised admin." }, { status: 401 });
  }

  const client =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = consumeRateLimit(`activate:${client}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Activation limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const validation = validateActivationInput(body);
  if ("fields" in validation) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: validation.fields },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Offline activation: Supabase server configuration is missing.");
    return NextResponse.json(
      { error: "The activation service is not configured." },
      { status: 500 }
    );
  }

  const input = validation.data;
  const { duplicate: existing, error: lookupError } = await findDuplicateCompany(
    supabase,
    input.companyName,
    input.billingEmail
  );

  if (lookupError) {
    console.error("Offline activation duplicate lookup failed:", lookupError.code);
    return NextResponse.json(
      { error: "Could not safely check for an existing company." },
      { status: 500 }
    );
  }
  if (existing) {
    return NextResponse.json(
      { error: "A matching company already exists.", duplicate: safeCompany(existing) },
      { status: 409 }
    );
  }

  const { data, error } = await supabase.rpc("activate_offline_company", {
    p_company_name: input.companyName,
    p_billing_email: input.billingEmail,
    p_package_size: input.packageSize,
    p_assessment_type: input.assessmentType,
    p_expires_at: input.expiresAt,
  });

  if (error) {
    console.error("Offline activation transaction failed:", error.code);
    if (error.code === "23505" || error.message?.includes("duplicate_company")) {
      const { duplicate } = await findDuplicateCompany(
        supabase,
        input.companyName,
        input.billingEmail
      );
      return NextResponse.json(
        {
          error: "A matching company already exists.",
          duplicate: duplicate ? safeCompany(duplicate) : undefined,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Company activation failed. No partial activation was saved." },
      { status: 500 }
    );
  }

  const result = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!result?.company_id || !result?.employee_token || !result?.manager_token) {
    console.error("Offline activation returned an incomplete result.");
    return NextResponse.json({ error: "Company activation returned an invalid result." }, { status: 500 });
  }

  const appUrl = "https://app.careerlabsai.com";
  return NextResponse.json({
    company: {
      id: String(result.company_id),
      name: String(result.company_name),
      billingEmail: String(result.billing_email),
      packageSize: Number(result.package_size),
      creditsBalance: Number(result.credits_balance),
      expiresAt: result.expires_at ? String(result.expires_at) : null,
    },
    employeeLink: `${appUrl}/outdoor-mri?token=${encodeURIComponent(String(result.employee_token))}`,
    managerLink: `${appUrl}/company/outdoor-mri-dashboard?managerToken=${encodeURIComponent(String(result.manager_token))}`,
  });
}
