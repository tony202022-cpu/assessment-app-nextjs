import "server-only";

import { getSupabaseAdmin } from "@/lib/offline-company";
import type {
  AssessmentIssuancePolicy,
  AssessmentIssuanceActor,
  CreateAssessmentIssuancePolicyInput,
} from "./assessment-issuance-policy";

type PolicyRow = {
  id: string;
  assessment_definition_id: string;
  assessment_definition_version: string;
  access_type: AssessmentIssuancePolicy["accessType"];
  funding_type: AssessmentIssuancePolicy["fundingType"];
  report_visibility: AssessmentIssuancePolicy["reportVisibility"];
  commercial_reference: string;
  issued_by: string;
  issued_at: string;
};

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;
type IssuancePolicyClient = {
  from(table: "assessment_issuance_policies"): {
    insert(values: Record<string, unknown>): {
      select(fields: string): { single(): QueryResult<PolicyRow> };
    };
    select(fields: string): {
      eq(field: "id", value: string): { maybeSingle(): QueryResult<PolicyRow> };
    };
  };
};

const POLICY_FIELDS =
  "id, assessment_definition_id, assessment_definition_version, access_type, funding_type, report_visibility, commercial_reference, issued_by, issued_at";

function toPolicy(row: PolicyRow): AssessmentIssuancePolicy {
  return {
    id: row.id,
    assessmentDefinition: {
      id: row.assessment_definition_id,
      version: row.assessment_definition_version,
    },
    accessType: row.access_type,
    fundingType: row.funding_type,
    reportVisibility: row.report_visibility,
    commercialReference: row.commercial_reference,
    issuedBy: row.issued_by,
    issuedAt: row.issued_at,
  };
}

export interface AssessmentIssuancePolicyRepository {
  create(
    input: CreateAssessmentIssuancePolicyInput,
    actor: AssessmentIssuanceActor,
  ): Promise<AssessmentIssuancePolicy>;
  findById(id: string): Promise<AssessmentIssuancePolicy | null>;
}

export class SupabaseAssessmentIssuancePolicyRepository
  implements AssessmentIssuancePolicyRepository
{
  constructor(private readonly client: IssuancePolicyClient) {}

  async create(
    input: CreateAssessmentIssuancePolicyInput,
    actor: AssessmentIssuanceActor,
  ): Promise<AssessmentIssuancePolicy> {
    const { data, error } = await this.client
      .from("assessment_issuance_policies")
      .insert({
        assessment_definition_id: input.assessmentDefinition.id,
        assessment_definition_version: input.assessmentDefinition.version,
        access_type: input.accessType,
        funding_type: input.fundingType,
        report_visibility: input.reportVisibility,
        commercial_reference: input.commercialReference,
        issued_by: actor.id,
      })
      .select(POLICY_FIELDS)
      .single();
    if (error || !data) throw new Error("Could not store the assessment issuance policy.");
    return toPolicy(data);
  }

  async findById(id: string): Promise<AssessmentIssuancePolicy | null> {
    const { data, error } = await this.client
      .from("assessment_issuance_policies")
      .select(POLICY_FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load the assessment issuance policy.");
    return data ? toPolicy(data) : null;
  }
}

export function createAssessmentIssuancePolicyRepository(): AssessmentIssuancePolicyRepository {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Assessment issuance policy persistence is not configured.");
  return new SupabaseAssessmentIssuancePolicyRepository(client as unknown as IssuancePolicyClient);
}
