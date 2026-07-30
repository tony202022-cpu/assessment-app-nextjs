alter table public.quiz_attempts
  add column if not exists is_developer_test boolean not null default false;

create table if not exists public.developer_test_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_id text not null references public.assessments(id),
  assessment_slug text not null,
  language text not null check (language in ('en', 'ar')),
  participant_email text not null,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  attempt_id uuid not null unique references public.quiz_attempts(id) on delete cascade,
  launch_token_hash text not null unique,
  launch_expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists developer_test_attempts_created_at_idx
  on public.developer_test_attempts (created_at desc);

alter table public.developer_test_attempts enable row level security;
revoke all on public.developer_test_attempts from anon, authenticated;

create or replace function public.create_developer_test_attempt(
  p_assessment_id text,
  p_assessment_slug text,
  p_language text,
  p_participant_email text,
  p_participant_name text,
  p_auth_user_id uuid,
  p_launch_token_hash text,
  p_launch_expires_at timestamptz
)
returns table (
  developer_test_id uuid,
  attempt_id uuid
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_assessment public.assessments%rowtype;
  v_attempt_id uuid;
  v_developer_test_id uuid;
begin
  if p_assessment_id not in (
    'outdoor_sales_mri',
    'sales_manager_mri',
    'sme_business_health_mri',
    'lawyer_client_conversion_mri'
  ) then
    raise exception using errcode = '22023', message = 'invalid_assessment';
  end if;

  select *
  into v_assessment
  from public.assessments
  where id = p_assessment_id
    and slug = lower(trim(p_assessment_slug))
    and status = 'active';

  if not found then
    raise exception using errcode = '22023', message = 'assessment_not_active';
  end if;
  if p_language not in ('en', 'ar') then
    raise exception using errcode = '22023', message = 'invalid_language';
  end if;
  if p_auth_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_auth_user';
  end if;
  if trim(coalesce(p_participant_email, '')) = '' then
    raise exception using errcode = '22023', message = 'invalid_email';
  end if;
  if length(trim(coalesce(p_participant_name, ''))) < 2 then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;
  if length(trim(coalesce(p_launch_token_hash, ''))) <> 64 then
    raise exception using errcode = '22023', message = 'invalid_launch_token';
  end if;
  if p_launch_expires_at is null or p_launch_expires_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_launch_expiry';
  end if;

  insert into public.quiz_attempts (
    assessment_id,
    language,
    full_name,
    company,
    user_email,
    user_id,
    total_questions,
    score,
    total_percentage,
    answers,
    competency_results,
    company_id,
    access_token_id,
    is_developer_test
  )
  values (
    v_assessment.id,
    p_language,
    trim(p_participant_name),
    null,
    lower(trim(p_participant_email)),
    p_auth_user_id,
    coalesce(v_assessment.num_questions, 0),
    0,
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    null,
    null,
    true
  )
  returning id into v_attempt_id;

  insert into public.developer_test_attempts (
    assessment_id,
    assessment_slug,
    language,
    participant_email,
    auth_user_id,
    attempt_id,
    launch_token_hash,
    launch_expires_at
  )
  values (
    v_assessment.id,
    lower(trim(p_assessment_slug)),
    p_language,
    lower(trim(p_participant_email)),
    p_auth_user_id,
    v_attempt_id,
    lower(trim(p_launch_token_hash)),
    p_launch_expires_at
  )
  returning id into v_developer_test_id;

  return query select v_developer_test_id, v_attempt_id;
end;
$function$;

revoke all on function public.create_developer_test_attempt(
  text, text, text, text, text, uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_developer_test_attempt(
  text, text, text, text, text, uuid, text, timestamptz
) to service_role;
