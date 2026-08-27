begin;

create table public.assessment_issuance_policies (
  id uuid primary key default gen_random_uuid(),
  assessment_definition_id text not null,
  assessment_definition_version text not null,
  access_type text not null,
  funding_type text not null,
  report_visibility text not null,
  commercial_reference text not null,
  issued_by text not null,
  issued_at timestamptz not null default now(),

  constraint assessment_issuance_policies_definition_id_check
    check (assessment_definition_id = lower(trim(assessment_definition_id))
      and assessment_definition_id ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint assessment_issuance_policies_definition_version_check
    check (assessment_definition_version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'),
  constraint assessment_issuance_policies_access_type_check
    check (access_type in ('company', 'individual')),
  constraint assessment_issuance_policies_funding_type_check
    check (funding_type in ('paid', 'complimentary')),
  constraint assessment_issuance_policies_report_visibility_check
    check (report_visibility in ('participant', 'manager-only')),
  constraint assessment_issuance_policies_commercial_reference_check
    check (length(trim(commercial_reference)) between 1 and 200),
  constraint assessment_issuance_policies_issued_by_check
    check (length(trim(issued_by)) between 1 and 200)
);

comment on table public.assessment_issuance_policies is
  'Immutable Version 1.0 policy captured when an administrator issues assessment access. It does not execute or authorize access.';

create index assessment_issuance_policies_definition_idx
  on public.assessment_issuance_policies (assessment_definition_id, assessment_definition_version);

create index assessment_issuance_policies_issued_at_idx
  on public.assessment_issuance_policies (issued_at desc);

alter table public.assessment_issuance_policies enable row level security;

revoke all on table public.assessment_issuance_policies from public, anon, authenticated;
revoke all on table public.assessment_issuance_policies from service_role;
grant select, insert on table public.assessment_issuance_policies to service_role;

commit;
