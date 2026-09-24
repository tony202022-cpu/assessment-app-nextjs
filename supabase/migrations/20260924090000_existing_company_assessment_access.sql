begin;

-- Extend the unified issuance transaction with an explicit existing-company path.
-- The previous overload is retained for compatibility; the application calls this
-- overload by named parameters and supplies p_existing_company_id (or null).
create or replace function public.issue_company_assessment_access_admin_action(
  p_request_id text,p_existing_company_id uuid,p_assessment_definition_id text,p_assessment_definition_version text,p_company_name text,
  p_manager_name text,p_manager_email text,p_credits integer,p_report_visibility text,p_commercial_reference text,
  p_issuance_type text,p_language_mode text,p_expires_at timestamptz,
  p_administrator_id text,p_administrator_role text
) returns table(policy_id uuid,company_id uuid,company_name text,manager_name text,manager_email text,credits integer,manager_token text,employee_token text,issued_at timestamptz,audit_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  v_company public.companies%rowtype; v_assessment public.assessments%rowtype; v_policy uuid; v_access uuid; v_audit uuid;
  v_employee text; v_manager text; v_issued timestamptz; v_name text:=regexp_replace(btrim(coalesce(p_company_name,'')),'\s+',' ','g');
  v_email text:=lower(btrim(coalesce(p_manager_email,''))); v_mname text:=regexp_replace(btrim(coalesce(p_manager_name,'')),'\s+',' ','g');
  v_ref text:=regexp_replace(btrim(coalesce(p_commercial_reference,'')),'\s+',' ','g'); v_existing public.admin_action_audit%rowtype;
begin
  if btrim(coalesce(p_request_id,''))='' then raise exception 'request_id_required'; end if;
  if btrim(coalesce(p_administrator_id,''))='' then raise exception 'administrator_required'; end if;
  if char_length(v_name)<2 or char_length(v_mname)<2 then raise exception 'invalid_company_details'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_manager_email'; end if;
  if p_credits is null or p_credits < (case when p_existing_company_id is null then 1 else 0 end) or p_credits>100000 then raise exception 'invalid_credits'; end if;
  if p_report_visibility not in ('participant-only','manager-only','participant-and-manager','admin-only') then raise exception 'invalid_report_visibility'; end if;
  if p_issuance_type not in ('offline-paid','online-paid','complimentary') then raise exception 'invalid_issuance_type'; end if;
  if p_language_mode not in ('participant-choice','en','ar') then raise exception 'invalid_language_mode'; end if;
  if p_expires_at is not null and (p_expires_at<=now() or p_expires_at>now()+interval '366 days') then raise exception 'invalid_expiry'; end if;
  if v_ref='' or char_length(v_ref)>200 then raise exception 'invalid_commercial_reference'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id,0));
  select * into v_existing from public.admin_action_audit where request_id=p_request_id and action_id='assessment-access.company.issue' and outcome='succeeded' limit 1;
  if found then
    if v_existing.administrator_id is distinct from p_administrator_id
       or nullif(v_existing.metadata->>'existingCompanyId','') is distinct from p_existing_company_id::text
       or v_existing.metadata->>'assessmentDefinitionId' is distinct from p_assessment_definition_id
       or v_existing.metadata->>'companyName' is distinct from v_name
       or v_existing.metadata->>'managerEmail' is distinct from v_email
       or v_existing.metadata->>'reportVisibility' is distinct from p_report_visibility
       or (v_existing.metadata->>'credits')::integer is distinct from p_credits then
      raise exception using errcode='23505',message='request_id_conflict';
    end if;
    select * into v_company from public.companies where id=v_existing.company_id;
    select at.token_string into v_employee from public.access_tokens at where at.company_id=v_company.id and at.assessment_type=p_assessment_definition_id and at.revoked_at is null order by at.created_at limit 1;
    return query select (v_existing.metadata->>'policyId')::uuid,v_company.id,v_company.name,coalesce(v_company.manager_name,v_mname),v_company.billing_email,p_credits,v_company.manager_token,v_employee,v_existing.created_at,v_existing.id; return;
  end if;

  select * into v_assessment from public.assessments where id=p_assessment_definition_id and status='active' for share;
  if not found then raise exception 'assessment_not_supported'; end if;

  if p_existing_company_id is not null then
    select * into v_company from public.companies where id=p_existing_company_id for update;
    if not found then raise exception 'company_not_found'; end if;
    if lower(regexp_replace(btrim(v_company.name),'\s+',' ','g'))<>lower(v_name)
       or lower(btrim(v_company.billing_email))<>v_email
       or (nullif(btrim(coalesce(v_company.manager_name,'')),'') is not null and regexp_replace(btrim(v_company.manager_name),'\s+',' ','g')<>v_mname) then
      raise exception 'company_identity_mismatch';
    end if;
    if p_credits > 0 then
      update public.companies as c
         set package_size=coalesce(package_size,0)+p_credits,
             credits_balance=coalesce(credits_balance,0)+p_credits,
             manager_name=coalesce(nullif(btrim(c.manager_name),''),v_mname)
       where id=v_company.id returning * into v_company;
      insert into public.credit_transactions(company_id,amount,description)
        values(v_company.id,p_credits,'Assessment access issuance: '||v_ref);
    end if;
  else
    if exists(select 1 from public.companies c where lower(regexp_replace(btrim(c.name),'\s+',' ','g'))=lower(v_name) and lower(btrim(c.billing_email))=v_email) then
      raise exception 'duplicate_company';
    end if;
    v_manager:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.companies(name,billing_email,credits_balance,package_size,manager_token,manager_name,is_offline_activated)
      values(v_name,v_email,p_credits,p_credits,v_manager,v_mname,p_issuance_type<>'online-paid') returning * into v_company;
  end if;

  if v_company.manager_token is null then
    update public.companies set manager_token=encode(extensions.gen_random_bytes(32),'hex') where id=v_company.id returning * into v_company;
  end if;
  select id,token_string into v_access,v_employee from public.access_tokens at where at.company_id=v_company.id and assessment_type=v_assessment.id and revoked_at is null order by created_at limit 1;
  if v_access is null then
    v_employee:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.access_tokens(company_id,token_string,assessment_type,is_used,entitlement_type,expires_at)
      values(v_company.id,v_employee,v_assessment.id,false,'company',p_expires_at) returning id into v_access;
  end if;
  insert into public.assessment_issuance_policies as aip(assessment_definition_id,assessment_definition_version,access_type,funding_type,report_visibility,commercial_reference,issued_by,company_id,access_token_id,manager_name,manager_email,quantity,issuance_type,language_mode,expires_at,internal_note)
    values(v_assessment.id,p_assessment_definition_version,'company',case when p_issuance_type='complimentary' then 'complimentary' else 'paid' end,p_report_visibility,v_ref,p_administrator_id,v_company.id,v_access,coalesce(v_company.manager_name,v_mname),v_company.billing_email,case when p_existing_company_id is not null and p_credits = 0 then 1 else p_credits end,p_issuance_type,p_language_mode,p_expires_at,v_ref)
    returning aip.id,aip.issued_at into v_policy,v_issued;
  update public.access_tokens set issuance_policy_id=v_policy where id=v_access;
  insert into public.admin_action_audit(request_id,action_id,administrator_id,administrator_role,resource_type,resource_id,company_id,outcome,reason,metadata)
    values(p_request_id,'assessment-access.company.issue',p_administrator_id,p_administrator_role,'company',v_company.id::text,v_company.id,'succeeded',v_ref,
      pg_catalog.jsonb_build_object('policyId',v_policy,'existingCompanyId',p_existing_company_id,'assessmentDefinitionId',v_assessment.id,'assessmentDefinitionVersion',p_assessment_definition_version,'companyName',v_company.name,'managerName',coalesce(v_company.manager_name,v_mname),'managerEmail',v_company.billing_email,'credits',p_credits,'commercialReference',v_ref,'reportVisibility',p_report_visibility))
    returning id into v_audit;
  return query select v_policy,v_company.id,v_company.name,coalesce(v_company.manager_name,v_mname),v_company.billing_email,p_credits,v_company.manager_token,v_employee,v_issued,v_audit;
end; $$;

revoke all on function public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text) to service_role;

commit;
