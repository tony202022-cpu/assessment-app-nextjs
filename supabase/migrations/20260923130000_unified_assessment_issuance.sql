begin;

create extension if not exists pgcrypto with schema extensions;

-- Some production environments predate the complimentary-entitlement
-- migration. Keep legacy company tokens nullable and classify them as company
-- entitlements in start_assessment_with_credit without rewriting token rows.
alter table public.assessments
  add column if not exists allows_individual_access boolean not null default false,
  add column if not exists allows_complimentary_access boolean not null default false;

update public.assessments
set allows_individual_access = true,
    allows_complimentary_access = true
where id = 'outdoor_sales_scan'
  and status = 'active'
  and (allows_individual_access = false or allows_complimentary_access = false);

alter table public.companies add column if not exists manager_name text;

alter table public.assessment_issuance_policies
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists access_token_id uuid references public.access_tokens(id),
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists manager_name text,
  add column if not exists manager_email text,
  add column if not exists quantity integer not null default 1,
  add column if not exists issuance_type text not null default 'offline-paid',
  add column if not exists language_mode text not null default 'participant-choice',
  add column if not exists expires_at timestamptz,
  add column if not exists internal_note text,
  add column if not exists status text not null default 'active';

alter table public.assessment_issuance_policies
  drop constraint if exists assessment_issuance_policies_report_visibility_check,
  add constraint assessment_issuance_policies_report_visibility_check
    check (report_visibility in ('participant','participant-only','manager-only','participant-and-manager','admin-only')),
  add constraint assessment_issuance_policies_issuance_type_check
    check (issuance_type in ('offline-paid','online-paid','complimentary','internal-test')),
  add constraint assessment_issuance_policies_language_mode_check
    check (language_mode in ('participant-choice','en','ar')),
  add constraint assessment_issuance_policies_quantity_check check (quantity between 1 and 100000),
  add constraint assessment_issuance_policies_status_check check (status in ('active','used','expired','revoked'));

alter table public.access_tokens
  add column if not exists entitlement_type text,
  add column if not exists issued_by text,
  add column if not exists issuance_reason text,
  add column if not exists used_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists remaining_uses integer,
  add column if not exists issuance_policy_id uuid references public.assessment_issuance_policies(id),
  add column if not exists recipient_name text,
  add column if not exists recipient_email text;

alter table public.quiz_attempts
  add column if not exists issuance_policy_id uuid references public.assessment_issuance_policies(id);

alter table public.access_tokens drop constraint if exists access_tokens_entitlement_type_check;
alter table public.access_tokens add constraint access_tokens_entitlement_type_check
  check (entitlement_type is null or entitlement_type in ('company','individual','complimentary'));
alter table public.access_tokens drop constraint if exists access_tokens_remaining_uses_check;
alter table public.access_tokens add constraint access_tokens_remaining_uses_check
  check (remaining_uses is null or remaining_uses between 0 and 1);
alter table public.access_tokens drop constraint if exists access_tokens_entitlement_shape_check;
alter table public.access_tokens add constraint access_tokens_entitlement_shape_check check (
  (entitlement_type is null and company_id is not null)
  or (entitlement_type = 'company' and company_id is not null)
  or (entitlement_type in ('individual','complimentary') and company_id is null and remaining_uses is not null)
);

create index if not exists assessment_issuance_policies_company_issued_idx
  on public.assessment_issuance_policies(company_id, issued_at desc);
create index if not exists access_tokens_issuance_policy_idx
  on public.access_tokens(issuance_policy_id) where issuance_policy_id is not null;

create or replace function public.issue_individual_assessment_access_admin_action(
  p_request_id text, p_assessment_id text, p_assessment_version text,
  p_participant_name text, p_participant_email text, p_funding_type text,
  p_issuance_type text, p_report_visibility text, p_language_mode text,
  p_expires_at timestamptz, p_reason text, p_administrator_id text, p_administrator_role text
)
returns table(policy_id uuid, token_id uuid, token_value text, assessment_slug text,
  participant_name text, participant_email text, report_visibility text,
  language_mode text, issued_at timestamptz, audit_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_assessment public.assessments%rowtype; v_policy uuid; v_token uuid; v_value text;
  v_audit uuid; v_issued timestamptz; v_name text := regexp_replace(btrim(coalesce(p_participant_name,'')), '\s+', ' ', 'g');
  v_email text := lower(btrim(coalesce(p_participant_email,''))); v_reason text := btrim(coalesce(p_reason,''));
  v_existing public.admin_action_audit%rowtype;
begin
  if btrim(coalesce(p_request_id,'')) = '' then raise exception 'request_id_required'; end if;
  if btrim(coalesce(p_administrator_id,'')) = '' then raise exception 'administrator_required'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 200 then raise exception 'invalid_participant_name'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_participant_email'; end if;
  if p_funding_type not in ('paid','complimentary') then raise exception 'invalid_funding_type'; end if;
  if p_issuance_type not in ('offline-paid','online-paid','complimentary') then raise exception 'invalid_issuance_type'; end if;
  if p_report_visibility not in ('participant-only','manager-only','participant-and-manager','admin-only') then raise exception 'invalid_report_visibility'; end if;
  if p_language_mode not in ('participant-choice','en','ar') then raise exception 'invalid_language_mode'; end if;
  if v_reason = '' or char_length(v_reason) > 500 then raise exception 'reason_required'; end if;
  if p_expires_at is not null and (p_expires_at <= now() or p_expires_at > now() + interval '366 days') then raise exception 'invalid_expiry'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id, 0));
  select * into v_existing from public.admin_action_audit where request_id=p_request_id and action_id='assessment-access.individual.issue' and outcome='succeeded' limit 1;
  if found then
    if v_existing.administrator_id is distinct from p_administrator_id
       or v_existing.metadata->>'assessmentId' is distinct from p_assessment_id
       or v_existing.metadata->>'participantEmail' is distinct from v_email
       or v_existing.metadata->>'fundingType' is distinct from p_funding_type
       or v_existing.metadata->>'reportVisibility' is distinct from p_report_visibility
       or v_existing.metadata->>'issuanceType' is distinct from p_issuance_type then
      raise exception using errcode='23505',message='request_id_conflict';
    end if;
    select at.id, at.token_string, a.slug, aip.id, aip.issued_at into v_token,v_value,v_assessment.slug,v_policy,v_issued
    from public.assessment_issuance_policies aip join public.access_tokens at on at.issuance_policy_id=aip.id
    join public.assessments a on a.id=aip.assessment_definition_id where aip.id=(v_existing.metadata->>'policyId')::uuid;
    return query select v_policy,v_token,v_value,v_assessment.slug,v_name,v_email,p_report_visibility,p_language_mode,v_issued,v_existing.id; return;
  end if;
  select * into v_assessment from public.assessments where id=btrim(p_assessment_id) and status='active' for share;
  if not found then raise exception 'assessment_not_found'; end if;
  if not v_assessment.allows_individual_access then raise exception 'individual_access_not_supported'; end if;
  if p_funding_type='complimentary' and not v_assessment.allows_complimentary_access then raise exception 'complimentary_access_not_permitted'; end if;
  insert into public.assessment_issuance_policies as aip(assessment_definition_id,assessment_definition_version,access_type,funding_type,report_visibility,commercial_reference,issued_by,recipient_name,recipient_email,quantity,issuance_type,language_mode,expires_at,internal_note)
  values(v_assessment.id,p_assessment_version,'individual',p_funding_type,p_report_visibility,v_reason,p_administrator_id,v_name,v_email,1,p_issuance_type,p_language_mode,p_expires_at,v_reason)
  returning aip.id,aip.issued_at into v_policy,v_issued;
  v_value := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.access_tokens(company_id,token_string,assessment_type,is_used,expires_at,entitlement_type,issued_by,issuance_reason,remaining_uses,issuance_policy_id,recipient_name,recipient_email)
  values(null,v_value,v_assessment.id,false,p_expires_at,case when p_funding_type='complimentary' then 'complimentary' else 'individual' end,p_administrator_id,v_reason,1,v_policy,v_name,v_email)
  returning id into v_token;
  update public.assessment_issuance_policies set access_token_id=v_token where id=v_policy;
  insert into public.admin_action_audit(request_id,action_id,administrator_id,administrator_role,resource_type,resource_id,outcome,reason,metadata)
  values(p_request_id,'assessment-access.individual.issue',p_administrator_id,p_administrator_role,'access_token',v_token::text,'succeeded',v_reason,
    pg_catalog.jsonb_build_object('policyId',v_policy,'tokenId',v_token,'assessmentId',v_assessment.id,'participantEmail',v_email,'fundingType',p_funding_type,'reportVisibility',p_report_visibility,'issuanceType',p_issuance_type)) returning id into v_audit;
  return query select v_policy,v_token,v_value,v_assessment.slug,v_name,v_email,p_report_visibility,p_language_mode,v_issued,v_audit;
end; $$;

revoke all on function public.issue_individual_assessment_access_admin_action(text,text,text,text,text,text,text,text,text,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.issue_individual_assessment_access_admin_action(text,text,text,text,text,text,text,text,text,timestamptz,text,text,text) to service_role;

-- Preserve the existing company-credit branch verbatim; paid individual and complimentary
-- entitlements share the already-established single-use path.
create or replace function public.start_assessment_with_credit(
  p_token text,p_assessment_slug text,p_lang text,p_full_name text,p_participant_company text,p_user_email text,p_user_id uuid
) returns table(attempt_id uuid,credits_remaining integer)
language plpgsql security definer set search_path='' as $$
declare v_token public.access_tokens%rowtype; v_company public.companies%rowtype; v_assessment public.assessments%rowtype;
  v_attempt uuid; v_existing uuid; v_remaining integer; v_email text:=lower(btrim(coalesce(p_user_email,'')));
begin
  if v_email='' then raise exception 'Participant email is required'; end if;
  select * into v_token from public.access_tokens where token_string=btrim(p_token) for update;
  if not found then raise exception 'Invalid access token'; end if;
  if v_token.revoked_at is not null then raise exception 'Access token has been revoked'; end if;
  if v_token.expires_at is not null and v_token.expires_at<now() then raise exception 'Access token has expired'; end if;
  select * into v_assessment from public.assessments where slug=lower(btrim(p_assessment_slug)) and status='active' limit 1;
  if not found then raise exception 'Assessment not found or inactive'; end if;
  if coalesce(v_token.assessment_type,'')<>'' and v_token.assessment_type<>v_assessment.id then raise exception 'This token is not valid for this assessment'; end if;
  if v_token.entitlement_type in ('individual','complimentary') then
    if v_token.is_used or coalesce(v_token.remaining_uses,0)<>1 then raise exception 'Individual access token has already been used'; end if;
    if v_token.recipient_email is not null and lower(v_token.recipient_email)<>v_email then raise exception 'This access link was issued to a different email'; end if;
    update public.access_tokens set is_used=true,used_by_email=v_email,used_at=now(),remaining_uses=0 where id=v_token.id;
    insert into public.quiz_attempts(assessment_id,language,full_name,company,user_email,user_id,total_questions,score,total_percentage,answers,competency_results,company_id,access_token_id,issuance_policy_id)
    values(v_assessment.id,p_lang,coalesce(nullif(btrim(p_full_name),''),v_token.recipient_name),nullif(btrim(p_participant_company),''),v_email,p_user_id,coalesce(v_assessment.num_questions,75),0,0,'[]'::jsonb,'[]'::jsonb,null,v_token.id,v_token.issuance_policy_id) returning id into v_attempt;
    return query select v_attempt,null::integer; return;
  end if;
  select * into v_company from public.companies where id=v_token.company_id for update;
  if not found then raise exception 'Company not found for this token'; end if;
  select qa.id into v_existing from public.quiz_attempts qa where qa.company_id=v_company.id and qa.assessment_id=v_assessment.id and lower(btrim(coalesce(qa.user_email,'')))=v_email order by qa.created_at desc limit 1;
  if v_existing is not null then return query select v_existing,coalesce(v_company.credits_balance,0); return; end if;
  if coalesce(v_company.credits_balance,0)<=0 then raise exception 'No credits remaining'; end if;
  update public.companies set credits_balance=credits_balance-1 where id=v_company.id returning credits_balance into v_remaining;
  insert into public.credit_transactions(company_id,amount,description) values(v_company.id,-1,'Used 1 credit for '||p_assessment_slug||' by '||coalesce(v_email,'unknown participant'));
  insert into public.quiz_attempts(assessment_id,language,full_name,company,user_email,user_id,total_questions,score,total_percentage,answers,competency_results,company_id,access_token_id,issuance_policy_id)
  values(v_assessment.id,p_lang,nullif(btrim(p_full_name),''),nullif(btrim(p_participant_company),''),v_email,p_user_id,coalesce(v_assessment.num_questions,75),0,0,'[]'::jsonb,'[]'::jsonb,v_company.id,v_token.id,v_token.issuance_policy_id) returning id into v_attempt;
  return query select v_attempt,v_remaining;
end; $$;
revoke all on function public.start_assessment_with_credit(text,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.start_assessment_with_credit(text,text,text,text,text,text,uuid) to service_role;

create or replace function public.issue_company_assessment_access_admin_action(
  p_request_id text,p_assessment_definition_id text,p_assessment_definition_version text,p_company_name text,
  p_manager_name text,p_manager_email text,p_credits integer,p_report_visibility text,p_commercial_reference text,
  p_issuance_type text,p_language_mode text,p_expires_at timestamptz,
  p_administrator_id text,p_administrator_role text
) returns table(policy_id uuid,company_id uuid,company_name text,manager_name text,manager_email text,credits integer,manager_token text,employee_token text,issued_at timestamptz,audit_id uuid)
language plpgsql security definer set search_path='' as $$
declare v_company public.companies%rowtype; v_assessment public.assessments%rowtype; v_policy uuid; v_access uuid; v_audit uuid;
 v_employee text; v_manager text; v_issued timestamptz; v_name text:=regexp_replace(btrim(coalesce(p_company_name,'')),'\s+',' ','g');
 v_email text:=lower(btrim(coalesce(p_manager_email,''))); v_mname text:=regexp_replace(btrim(coalesce(p_manager_name,'')),'\s+',' ','g');
 v_ref text:=regexp_replace(btrim(coalesce(p_commercial_reference,'')),'\s+',' ','g'); v_existing public.admin_action_audit%rowtype;
begin
 if btrim(coalesce(p_request_id,''))='' then raise exception 'request_id_required'; end if;
 if btrim(coalesce(p_administrator_id,''))='' then raise exception 'administrator_required'; end if;
 if char_length(v_name)<2 or char_length(v_mname)<2 then raise exception 'invalid_company_details'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_manager_email'; end if;
 if p_credits is null or p_credits<1 or p_credits>100000 then raise exception 'invalid_credits'; end if;
 if p_report_visibility not in ('participant-only','manager-only','participant-and-manager','admin-only') then raise exception 'invalid_report_visibility'; end if;
 if p_issuance_type not in ('offline-paid','online-paid','complimentary') then raise exception 'invalid_issuance_type'; end if;
 if p_language_mode not in ('participant-choice','en','ar') then raise exception 'invalid_language_mode'; end if;
 if p_expires_at is not null and (p_expires_at<=now() or p_expires_at>now()+interval '366 days') then raise exception 'invalid_expiry'; end if;
 if v_ref='' or char_length(v_ref)>200 then raise exception 'invalid_commercial_reference'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id,0));
 select * into v_existing from public.admin_action_audit where request_id=p_request_id and action_id='assessment-access.company.issue' and outcome='succeeded' limit 1;
 if found then
   if v_existing.administrator_id is distinct from p_administrator_id
      or v_existing.metadata->>'assessmentDefinitionId' is distinct from p_assessment_definition_id
      or v_existing.metadata->>'companyName' is distinct from v_name
      or v_existing.metadata->>'managerEmail' is distinct from v_email
      or v_existing.metadata->>'reportVisibility' is distinct from p_report_visibility
      or (v_existing.metadata->>'credits')::integer is distinct from p_credits then
     raise exception using errcode='23505',message='request_id_conflict';
   end if;
   select * into v_company from public.companies where id=v_existing.company_id;
   select at.token_string into v_employee from public.access_tokens at where at.company_id=v_company.id and at.assessment_type=p_assessment_definition_id order by at.created_at limit 1;
   return query select (v_existing.metadata->>'policyId')::uuid,v_company.id,v_company.name,coalesce(v_company.manager_name,v_mname),v_company.billing_email,v_company.package_size,v_company.manager_token,v_employee,v_existing.created_at,v_existing.id; return;
 end if;
 select * into v_assessment from public.assessments where id=p_assessment_definition_id and status='active' for share;
 if not found then raise exception 'assessment_not_supported'; end if;
 select * into v_company from public.companies c where lower(regexp_replace(btrim(c.name),'\s+',' ','g'))=lower(v_name) and lower(btrim(c.billing_email))=v_email for update;
 if found then
   update public.companies set package_size=coalesce(package_size,0)+p_credits,credits_balance=coalesce(credits_balance,0)+p_credits,manager_name=coalesce(manager_name,v_mname) where id=v_company.id returning * into v_company;
   insert into public.credit_transactions(company_id,amount,description) values(v_company.id,p_credits,'Assessment access issuance: '||v_ref);
 else
   v_manager:=encode(extensions.gen_random_bytes(32),'hex');
   insert into public.companies(name,billing_email,credits_balance,package_size,manager_token,manager_name,is_offline_activated)
   values(v_name,v_email,p_credits,p_credits,v_manager,v_mname,p_issuance_type<>'online-paid') returning * into v_company;
 end if;
 if v_company.manager_token is null then update public.companies set manager_token=encode(extensions.gen_random_bytes(32),'hex') where id=v_company.id returning * into v_company; end if;
 select id,token_string into v_access,v_employee from public.access_tokens where company_id=v_company.id and assessment_type=v_assessment.id and revoked_at is null order by created_at limit 1;
 if v_access is null then v_employee:=encode(extensions.gen_random_bytes(32),'hex'); insert into public.access_tokens(company_id,token_string,assessment_type,is_used,entitlement_type,expires_at) values(v_company.id,v_employee,v_assessment.id,false,'company',p_expires_at) returning id into v_access; end if;
 insert into public.assessment_issuance_policies(assessment_definition_id,assessment_definition_version,access_type,funding_type,report_visibility,commercial_reference,issued_by,company_id,access_token_id,manager_name,manager_email,quantity,issuance_type,language_mode,internal_note)
 values(v_assessment.id,p_assessment_definition_version,'company',case when p_issuance_type='complimentary' then 'complimentary' else 'paid' end,p_report_visibility,v_ref,p_administrator_id,v_company.id,v_access,v_mname,v_email,p_credits,p_issuance_type,p_language_mode,p_expires_at,v_ref) returning id,issued_at into v_policy,v_issued;
 update public.access_tokens set issuance_policy_id=v_policy where id=v_access;
 insert into public.admin_action_audit(request_id,action_id,administrator_id,administrator_role,resource_type,resource_id,company_id,outcome,reason,metadata)
 values(p_request_id,'assessment-access.company.issue',p_administrator_id,p_administrator_role,'company',v_company.id::text,v_company.id,'succeeded',v_ref,pg_catalog.jsonb_build_object('policyId',v_policy,'assessmentDefinitionId',v_assessment.id,'assessmentDefinitionVersion',p_assessment_definition_version,'companyName',v_company.name,'managerName',v_mname,'managerEmail',v_email,'credits',p_credits,'commercialReference',v_ref,'reportVisibility',p_report_visibility)) returning id into v_audit;
 return query select v_policy,v_company.id,v_company.name,v_mname,v_email,p_credits,v_company.manager_token,v_employee,v_issued,v_audit;
end; $$;
revoke all on function public.issue_company_assessment_access_admin_action(text,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.issue_company_assessment_access_admin_action(text,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text) to service_role;

commit;
