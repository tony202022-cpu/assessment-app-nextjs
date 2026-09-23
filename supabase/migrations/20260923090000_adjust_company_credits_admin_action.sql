create or replace function public.adjust_company_credits_admin_action(
  p_company_id uuid,
  p_adjustment_type text,
  p_amount integer,
  p_administrator_id text,
  p_administrator_role text,
  p_reason text,
  p_request_id text
)
returns table (
  company_id uuid,
  company_name text,
  old_package_size integer,
  new_package_size integer,
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
  v_action_id text;
  v_delta integer;
  v_new_package_size integer;
  v_new_balance integer;
  v_audit_id uuid;
  v_existing_audit public.admin_action_audit%rowtype;
  v_reason text := regexp_replace(btrim(coalesce(p_reason, '')), '\s+', ' ', 'g');
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'company_not_found';
  end if;
  if p_adjustment_type not in ('add', 'remove') then
    raise exception using errcode = '22023', message = 'invalid_adjustment_type';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception using errcode = '22023', message = 'invalid_credit_amount';
  end if;
  if btrim(coalesce(p_administrator_id, '')) = '' or btrim(coalesce(p_administrator_role, '')) = '' then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;
  if v_reason = '' or length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  if btrim(coalesce(p_request_id, '')) = '' or length(p_request_id) > 200 then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;

  v_action_id := case p_adjustment_type when 'add' then 'credits.add' else 'credits.remove' end;
  v_delta := case p_adjustment_type when 'add' then p_amount else -p_amount end;

  select * into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'company_not_found';
  end if;

  select * into v_existing_audit
  from public.admin_action_audit as audit
  where audit.request_id = p_request_id
    and audit.action_id = v_action_id
    and audit.outcome = 'succeeded'
  limit 1;

  if found then
    if v_existing_audit.company_id is distinct from v_company.id
       or v_existing_audit.administrator_id is distinct from p_administrator_id
       or btrim(coalesce(v_existing_audit.reason, '')) is distinct from v_reason
       or (v_existing_audit.metadata ->> 'amount')::integer is distinct from p_amount
       or v_existing_audit.old_balance is null
       or v_existing_audit.new_balance is null then
      raise exception using errcode = '23505', message = 'request_id_conflict';
    end if;

    return query select
      v_company.id,
      coalesce(v_existing_audit.metadata ->> 'companyName', v_company.name),
      (v_existing_audit.metadata ->> 'oldPackageSize')::integer,
      (v_existing_audit.metadata ->> 'newPackageSize')::integer,
      v_existing_audit.old_balance,
      v_existing_audit.new_balance,
      v_existing_audit.id;
    return;
  end if;

  if v_company.package_size is null or v_company.package_size < 1
     or v_company.credits_balance is null or v_company.credits_balance < 0
     or v_company.credits_balance > v_company.package_size then
    raise exception using errcode = '22023', message = 'invalid_credit_balance';
  end if;

  v_new_package_size := v_company.package_size + v_delta;
  v_new_balance := v_company.credits_balance + v_delta;

  if p_adjustment_type = 'add' and v_new_package_size > 100000 then
    raise exception using errcode = '22023', message = 'credit_limit_exceeded';
  end if;
  if p_adjustment_type = 'remove' and (p_amount > v_company.credits_balance or v_new_package_size < 1) then
    raise exception using errcode = '22023', message = 'insufficient_unused_credits';
  end if;

  update public.companies
  set package_size = v_new_package_size,
      credits_balance = v_new_balance
  where id = v_company.id;

  insert into public.credit_transactions (company_id, amount, description)
  values (
    v_company.id,
    v_delta,
    'Admin action ' || v_action_id || ' by ' || p_administrator_id ||
    '; operation ' || p_request_id ||
    '; old balance ' || v_company.credits_balance ||
    '; new balance ' || v_new_balance ||
    '; reason: ' || v_reason
  );

  insert into public.admin_action_audit (
    request_id, action_id, administrator_id, administrator_role,
    resource_type, resource_id, company_id, outcome, reason,
    old_balance, new_balance, metadata
  ) values (
    p_request_id, v_action_id, p_administrator_id, p_administrator_role,
    'company', v_company.id::text, v_company.id, 'succeeded', v_reason,
    v_company.credits_balance, v_new_balance,
    pg_catalog.jsonb_build_object(
      'companyName', v_company.name,
      'amount', p_amount,
      'oldPackageSize', v_company.package_size,
      'newPackageSize', v_new_package_size
    )
  ) returning id into v_audit_id;

  return query select
    v_company.id,
    v_company.name,
    v_company.package_size,
    v_new_package_size,
    v_company.credits_balance,
    v_new_balance,
    v_audit_id;
end;
$$;

revoke execute on function public.adjust_company_credits_admin_action(uuid, text, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.adjust_company_credits_admin_action(uuid, text, integer, text, text, text, text) to service_role;
