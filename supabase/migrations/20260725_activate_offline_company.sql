create extension if not exists pgcrypto with schema extensions;

create or replace function public.activate_offline_company(
  p_company_name text,
  p_billing_email text,
  p_package_size integer,
  p_assessment_type text default 'outdoor_sales_mri',
  p_expires_at timestamptz default null
)
returns table (
  company_id uuid,
  company_name text,
  billing_email text,
  package_size integer,
  credits_balance integer,
  manager_token text,
  employee_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_company_id public.companies.id%type;
  v_manager_token text;
  v_employee_token text;
  v_name text := regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g');
  v_email text := lower(trim(coalesce(p_billing_email, '')));
begin
  if char_length(v_name) < 2 or char_length(v_name) > 200 then
    raise exception using errcode = '22023', message = 'invalid_company_name';
  end if;
  if char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_billing_email';
  end if;
  if p_package_size is null or p_package_size < 1 or p_package_size > 100000 then
    raise exception using errcode = '22023', message = 'invalid_package_size';
  end if;
  if p_assessment_type <> 'outdoor_sales_mri' then
    raise exception using errcode = '22023', message = 'invalid_assessment_type';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_expiry';
  end if;

  -- Serializes equivalent names/emails so two simultaneous requests cannot
  -- both pass the duplicate check.
  perform pg_advisory_xact_lock(hashtextextended(lower(v_name) || '|' || v_email, 0));

  if exists (
    select 1
    from public.companies c
    where lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = lower(v_name)
      and lower(trim(c.billing_email)) = v_email
  ) then
    raise exception using errcode = '23505', message = 'duplicate_company';
  end if;

  v_manager_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_employee_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.companies (
    name, billing_email, credits_balance, package_size, manager_token
  )
  values (
    v_name, v_email, p_package_size, p_package_size, v_manager_token
  )
  returning id into v_company_id;

  insert into public.access_tokens (
    company_id, token_string, assessment_type, is_used, used_by_email, expires_at
  )
  values (
    v_company_id, v_employee_token, p_assessment_type, false, null, p_expires_at
  );

  return query
  select
    v_company_id,
    v_name,
    v_email,
    p_package_size,
    p_package_size,
    v_manager_token,
    v_employee_token,
    p_expires_at;
end;
$function$;

revoke all on function public.activate_offline_company(text, text, integer, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_offline_company(text, text, integer, text, timestamptz)
  to service_role;

