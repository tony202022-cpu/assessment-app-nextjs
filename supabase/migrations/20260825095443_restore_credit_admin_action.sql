create table if not exists public.admin_action_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  action_id text not null,
  administrator_id text not null,
  administrator_role text not null,
  resource_type text not null,
  resource_id text not null,
  company_id uuid null references public.companies(id),
  outcome text not null check (outcome in ('attempted', 'succeeded', 'denied', 'failed')),
  reason text null,
  error_code text null,
  old_balance integer null,
  new_balance integer null,
  metadata jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (request_id, action_id, outcome)
);

alter table public.admin_action_audit enable row level security;
revoke all on table public.admin_action_audit from anon, authenticated;
grant select, insert on table public.admin_action_audit to service_role;

create index if not exists admin_action_audit_company_created_idx
  on public.admin_action_audit (company_id, created_at desc);

create or replace function public.restore_company_credit_admin_action(
  p_company_id uuid,
  p_administrator_id text,
  p_administrator_role text,
  p_reason text,
  p_request_id text
)
returns table (
  company_id uuid,
  company_name text,
  package_size integer,
  old_balance integer,
  new_balance integer,
  audit_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.companies%rowtype;
  v_audit_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'company_not_found';
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

  select * into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'company_not_found';
  end if;
  if v_company.package_size is null or v_company.package_size < 1 or
     v_company.credits_balance is null or v_company.credits_balance < 0 or
     v_company.credits_balance > v_company.package_size then
    raise exception using errcode = '22023', message = 'invalid_credit_balance';
  end if;
  if v_company.credits_balance = v_company.package_size then
    raise exception using errcode = 'P0001', message = 'credits_already_at_maximum';
  end if;

  update public.companies
  set credits_balance = v_company.credits_balance + 1
  where id = v_company.id;

  insert into public.credit_transactions (company_id, amount, description)
  values (
    v_company.id,
    1,
    'Admin action credits.restore by ' || p_administrator_id ||
    '; old balance ' || v_company.credits_balance ||
    '; new balance ' || (v_company.credits_balance + 1) ||
    '; reason: ' || v_reason
  );

  insert into public.admin_action_audit (
    request_id, action_id, administrator_id, administrator_role,
    resource_type, resource_id, company_id, outcome, reason,
    old_balance, new_balance, metadata
  ) values (
    p_request_id, 'credits.restore', p_administrator_id, p_administrator_role,
    'company', v_company.id::text, v_company.id, 'succeeded', v_reason,
    v_company.credits_balance, v_company.credits_balance + 1,
    jsonb_build_object('companyName', v_company.name, 'packageSize', v_company.package_size)
  ) returning id into v_audit_id;

  return query select
    v_company.id,
    v_company.name,
    v_company.package_size,
    v_company.credits_balance,
    v_company.credits_balance + 1,
    v_audit_id;
end;
$$;

revoke execute on function public.restore_company_credit_admin_action(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.restore_company_credit_admin_action(uuid, text, text, text, text) to service_role;
