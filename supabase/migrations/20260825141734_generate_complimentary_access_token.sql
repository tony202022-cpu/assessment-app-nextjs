alter table public.assessments
  add column if not exists allows_individual_access boolean not null default false,
  add column if not exists allows_complimentary_access boolean not null default false;

-- Milestone 9A explicitly approves complimentary access for assessments that
-- are currently published. Future assessments remain deny-by-default.
update public.assessments
set allows_individual_access = true,
    allows_complimentary_access = true
where status = 'active'
  and (allows_individual_access = false or allows_complimentary_access = false);

alter table public.access_tokens
  alter column company_id drop not null,
  add column if not exists entitlement_type text not null default 'company',
  add column if not exists issued_by text,
  add column if not exists issuance_reason text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists used_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists remaining_uses integer;

alter table public.access_tokens
  drop constraint if exists access_tokens_entitlement_type_check,
  add constraint access_tokens_entitlement_type_check
    check (entitlement_type in ('company', 'complimentary')),
  drop constraint if exists access_tokens_remaining_uses_check,
  add constraint access_tokens_remaining_uses_check
    check (remaining_uses is null or remaining_uses between 0 and 1),
  drop constraint if exists access_tokens_entitlement_shape_check,
  add constraint access_tokens_entitlement_shape_check check (
    (entitlement_type = 'company' and company_id is not null)
    or
    (entitlement_type = 'complimentary' and company_id is null and remaining_uses is not null)
  );

create index if not exists access_tokens_entitlement_assessment_created_idx
  on public.access_tokens (assessment_type, created_at desc)
  where entitlement_type = 'complimentary';

create or replace function public.generate_complimentary_access_token_admin_action(
  p_assessment_id text,
  p_expires_at timestamptz,
  p_administrator_id text,
  p_administrator_role text,
  p_reason text,
  p_request_id text
)
returns table (
  token_id uuid,
  token_value text,
  assessment_id text,
  assessment_slug text,
  assessment_name text,
  expires_at timestamptz,
  token_status text,
  audit_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments%rowtype;
  v_token_id uuid;
  v_token_value text;
  v_audit_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if btrim(coalesce(p_assessment_id, '')) = '' then
    raise exception using errcode = '22023', message = 'assessment_not_found';
  end if;
  if btrim(coalesce(p_administrator_id, '')) = '' or btrim(coalesce(p_administrator_role, '')) = '' then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;
  if v_reason = '' or length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  if btrim(coalesce(p_request_id, '')) = '' then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '366 days' then
    raise exception using errcode = '22023', message = 'invalid_expiry';
  end if;

  select * into v_assessment
  from public.assessments
  where id = btrim(p_assessment_id)
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'assessment_not_found';
  end if;
  if lower(coalesce(v_assessment.status, '')) <> 'active' then
    raise exception using errcode = '22023', message = 'assessment_not_active';
  end if;
  if not v_assessment.allows_individual_access then
    raise exception using errcode = '22023', message = 'individual_access_not_supported';
  end if;
  if not v_assessment.allows_complimentary_access then
    raise exception using errcode = '22023', message = 'complimentary_access_not_permitted';
  end if;

  v_token_value := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.access_tokens (
    company_id, token_string, assessment_type, is_used, used_by_email,
    expires_at, entitlement_type, issued_by, issuance_reason, remaining_uses
  ) values (
    null, v_token_value, v_assessment.id, false, null,
    p_expires_at, 'complimentary', p_administrator_id, v_reason, 1
  ) returning id into v_token_id;

  insert into public.admin_action_audit (
    request_id, action_id, administrator_id, administrator_role,
    resource_type, resource_id, outcome, reason, metadata
  ) values (
    p_request_id, 'complimentary.generate', p_administrator_id, p_administrator_role,
    'assessment', v_assessment.id, 'succeeded', v_reason,
    jsonb_build_object(
      'assessmentId', v_assessment.id,
      'tokenId', v_token_id,
      'expiresAt', p_expires_at,
      'entitlementType', 'complimentary'
    )
  ) returning id into v_audit_id;

  return query select
    v_token_id,
    v_token_value,
    v_assessment.id,
    v_assessment.slug,
    coalesce(v_assessment.title_en, v_assessment.name_en, v_assessment.slug),
    p_expires_at,
    'active'::text,
    v_audit_id;
end;
$$;

revoke execute on function public.generate_complimentary_access_token_admin_action(text, timestamptz, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.generate_complimentary_access_token_admin_action(text, timestamptz, text, text, text, text)
  to service_role;

create or replace function public.start_assessment_with_credit(
  p_token text,
  p_assessment_slug text,
  p_lang text,
  p_full_name text,
  p_participant_company text,
  p_user_email text,
  p_user_id uuid
)
returns table(attempt_id uuid, credits_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.access_tokens%rowtype;
  v_company public.companies%rowtype;
  v_assessment public.assessments%rowtype;
  v_attempt_id uuid;
  v_existing_attempt_id uuid;
  v_remaining integer;
  v_email text := lower(btrim(coalesce(p_user_email, '')));
begin
  if v_email = '' then raise exception 'Participant email is required'; end if;

  select * into v_token
  from public.access_tokens
  where token_string = btrim(p_token)
  for update;

  if not found then raise exception 'Invalid access token'; end if;
  if v_token.revoked_at is not null then raise exception 'Access token has been revoked'; end if;
  if v_token.expires_at is not null and v_token.expires_at < now() then raise exception 'Access token has expired'; end if;

  select * into v_assessment
  from public.assessments
  where slug = lower(btrim(p_assessment_slug)) and status = 'active'
  limit 1;

  if not found then raise exception 'Assessment not found or inactive'; end if;
  if coalesce(v_token.assessment_type, '') <> '' and v_token.assessment_type <> v_assessment.id then
    raise exception 'This token is not valid for this assessment';
  end if;

  if v_token.entitlement_type = 'complimentary' then
    if v_token.is_used or coalesce(v_token.remaining_uses, 0) <> 1 then
      raise exception 'Complimentary access token has already been used';
    end if;

    update public.access_tokens
    set is_used = true,
        used_by_email = v_email,
        used_at = now(),
        remaining_uses = 0
    where id = v_token.id;

    insert into public.quiz_attempts (
      assessment_id, language, full_name, company, user_email, user_id,
      total_questions, score, total_percentage, answers, competency_results,
      company_id, access_token_id
    ) values (
      v_assessment.id, p_lang, nullif(btrim(p_full_name), ''),
      nullif(btrim(p_participant_company), ''), v_email, p_user_id,
      coalesce(v_assessment.num_questions, 75), 0, 0, '[]'::jsonb, '[]'::jsonb,
      null, v_token.id
    ) returning id into v_attempt_id;

    return query select v_attempt_id, null::integer;
    return;
  end if;

  select * into v_company
  from public.companies
  where id = v_token.company_id
  for update;

  if not found then raise exception 'Company not found for this token'; end if;

  select qa.id into v_existing_attempt_id
  from public.quiz_attempts qa
  where qa.company_id = v_company.id
    and qa.assessment_id = v_assessment.id
    and lower(btrim(coalesce(qa.user_email, ''))) = v_email
  order by qa.created_at desc
  limit 1;

  if v_existing_attempt_id is not null then
    return query select v_existing_attempt_id, coalesce(v_company.credits_balance, 0);
    return;
  end if;

  if coalesce(v_company.credits_balance, 0) <= 0 then raise exception 'No credits remaining'; end if;

  update public.companies
  set credits_balance = credits_balance - 1
  where id = v_company.id
  returning credits_balance into v_remaining;

  insert into public.credit_transactions (company_id, amount, description)
  values (v_company.id, -1, 'Used 1 credit for ' || p_assessment_slug || ' by ' || coalesce(v_email, 'unknown participant'));

  insert into public.quiz_attempts (
    assessment_id, language, full_name, company, user_email, user_id,
    total_questions, score, total_percentage, answers, competency_results,
    company_id, access_token_id
  ) values (
    v_assessment.id, p_lang, nullif(btrim(p_full_name), ''),
    nullif(btrim(p_participant_company), ''), v_email, p_user_id,
    coalesce(v_assessment.num_questions, 75), 0, 0, '[]'::jsonb, '[]'::jsonb,
    v_company.id, v_token.id
  ) returning id into v_attempt_id;

  return query select v_attempt_id, v_remaining;
end;
$$;

revoke execute on function public.start_assessment_with_credit(text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.start_assessment_with_credit(text, text, text, text, text, text, uuid)
  to service_role;
