begin;

create or replace function public.issue_company_assessment_access_admin_action(
  p_request_id text,
  p_assessment_definition_id text,
  p_assessment_definition_version text,
  p_company_name text,
  p_manager_name text,
  p_manager_email text,
  p_credits integer,
  p_report_visibility text,
  p_commercial_reference text,
  p_administrator_id text,
  p_administrator_role text
)
returns table (
  policy_id uuid,
  company_id uuid,
  company_name text,
  manager_name text,
  manager_email text,
  credits integer,
  manager_token text,
  employee_token text,
  issued_at timestamptz,
  audit_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activation record;
  v_policy_id uuid;
  v_audit_id uuid;
  v_issued_at timestamptz;
  v_existing_audit public.admin_action_audit%rowtype;
  v_existing_company public.companies%rowtype;
  v_existing_manager_token text;
  v_existing_employee_token text;
  v_company_name text := regexp_replace(btrim(coalesce(p_company_name, '')), '\s+', ' ', 'g');
  v_manager_name text := regexp_replace(btrim(coalesce(p_manager_name, '')), '\s+', ' ', 'g');
  v_manager_email text := lower(btrim(coalesce(p_manager_email, '')));
  v_commercial_reference text := regexp_replace(btrim(coalesce(p_commercial_reference, '')), '\s+', ' ', 'g');
begin
  if btrim(coalesce(p_request_id, '')) = '' or length(p_request_id) > 200 then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if btrim(coalesce(p_administrator_id, '')) = '' or btrim(coalesce(p_administrator_role, '')) = '' then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;
  if p_assessment_definition_id <> 'outdoor_sales_mri' then
    raise exception using errcode = '22023', message = 'assessment_not_supported';
  end if;
  if coalesce(p_assessment_definition_version, '') !~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' then
    raise exception using errcode = '22023', message = 'invalid_assessment_version';
  end if;
  if char_length(v_manager_name) < 2 or char_length(v_manager_name) > 200 then
    raise exception using errcode = '22023', message = 'invalid_manager_name';
  end if;
  if p_credits is null or p_credits < 2 or p_credits > 100000 then
    raise exception using errcode = '22023', message = 'invalid_credits';
  end if;
  if p_report_visibility not in ('participant', 'manager-only') then
    raise exception using errcode = '22023', message = 'invalid_report_visibility';
  end if;
  if char_length(v_commercial_reference) < 1 or char_length(v_commercial_reference) > 200 then
    raise exception using errcode = '22023', message = 'invalid_commercial_reference';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id, 0));

  select * into v_existing_audit
  from public.admin_action_audit a
  where a.request_id = p_request_id
    and a.action_id = 'assessment-access.company.issue'
    and a.outcome = 'succeeded'
  limit 1;

  if found then
    if v_existing_audit.administrator_id is distinct from p_administrator_id
       or v_existing_audit.company_id is null
       or v_existing_audit.metadata ->> 'assessmentDefinitionId' is distinct from p_assessment_definition_id
       or v_existing_audit.metadata ->> 'assessmentDefinitionVersion' is distinct from p_assessment_definition_version
       or v_existing_audit.metadata ->> 'companyName' is distinct from v_company_name
       or v_existing_audit.metadata ->> 'managerName' is distinct from v_manager_name
       or v_existing_audit.metadata ->> 'managerEmail' is distinct from v_manager_email
       or v_existing_audit.metadata ->> 'commercialReference' is distinct from v_commercial_reference
       or v_existing_audit.metadata ->> 'reportVisibility' is distinct from p_report_visibility
       or (v_existing_audit.metadata ->> 'credits')::integer is distinct from p_credits then
      raise exception using errcode = '23505', message = 'request_id_conflict';
    end if;

    select * into v_existing_company
    from public.companies c
    where c.id = v_existing_audit.company_id;

    select at.token_string into v_existing_employee_token
    from public.access_tokens at
    where at.company_id = v_existing_company.id
      and at.assessment_type = 'outdoor_sales_mri'
    limit 1;

    v_existing_manager_token := v_existing_company.manager_token;
    v_policy_id := (v_existing_audit.metadata ->> 'policyId')::uuid;

    return query select
      v_policy_id,
      v_existing_company.id,
      v_existing_company.name,
      v_manager_name,
      v_manager_email,
      v_existing_company.package_size,
      v_existing_manager_token,
      v_existing_employee_token,
      v_existing_audit.created_at,
      v_existing_audit.id;
    return;
  end if;

  select * into v_activation
  from public.activate_offline_company(
    v_company_name,
    v_manager_email,
    p_credits,
    'outdoor_sales_mri',
    null
  );

  insert into public.assessment_issuance_policies (
    assessment_definition_id,
    assessment_definition_version,
    access_type,
    funding_type,
    report_visibility,
    commercial_reference,
    issued_by
  ) values (
    p_assessment_definition_id,
    p_assessment_definition_version,
    'company',
    'paid',
    p_report_visibility,
    v_commercial_reference,
    p_administrator_id
  )
  returning id, issued_at into v_policy_id, v_issued_at;

  insert into public.admin_action_audit (
    request_id,
    action_id,
    administrator_id,
    administrator_role,
    resource_type,
    resource_id,
    company_id,
    outcome,
    metadata
  ) values (
    p_request_id,
    'assessment-access.company.issue',
    p_administrator_id,
    p_administrator_role,
    'company',
    v_activation.company_id::text,
    v_activation.company_id,
    'succeeded',
    pg_catalog.jsonb_build_object(
      'policyId', v_policy_id,
      'assessmentDefinitionId', p_assessment_definition_id,
      'assessmentDefinitionVersion', p_assessment_definition_version,
      'companyName', v_activation.company_name,
      'managerName', v_manager_name,
      'managerEmail', v_manager_email,
      'credits', p_credits,
      'commercialReference', v_commercial_reference,
      'reportVisibility', p_report_visibility
    )
  ) returning id into v_audit_id;

  return query select
    v_policy_id,
    v_activation.company_id,
    v_activation.company_name,
    v_manager_name,
    v_manager_email,
    p_credits,
    v_activation.manager_token,
    v_activation.employee_token,
    v_issued_at,
    v_audit_id;
end;
$$;

comment on function public.issue_company_assessment_access_admin_action(
  text, text, text, text, text, text, integer, text, text, text, text
) is 'Atomically reuses production company activation and records its issuance policy and administrative audit.';

revoke all on function public.issue_company_assessment_access_admin_action(
  text, text, text, text, text, text, integer, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.issue_company_assessment_access_admin_action(
  text, text, text, text, text, text, integer, text, text, text, text
) to service_role;

commit;
