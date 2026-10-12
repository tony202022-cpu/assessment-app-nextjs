begin;

create or replace function public.adjust_company_credits_admin_action(
  p_company_id uuid,
  p_adjustment_type text,
  p_amount integer,
  p_administrator_id text,
  p_administrator_role text,
  p_reason text,
  p_internal_note text,
  p_request_id uuid
)
returns table (
  company_id uuid,
  company_name text,
  action_id text,
  amount integer,
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
  v_existing_audit public.admin_action_audit%rowtype;
  v_action_id text;
  v_reason text := pg_catalog.btrim(pg_catalog.coalesce(p_reason, ''));
  v_internal_note text := pg_catalog.btrim(pg_catalog.coalesce(p_internal_note, ''));
  v_request_id text;
  v_new_package_size integer;
  v_new_balance integer;
  v_audit_id uuid;
begin
  if p_adjustment_type is null or p_adjustment_type not in ('add', 'remove') then
    raise exception using errcode = '22023', message = 'invalid_adjustment_type';
  end if;
  v_action_id := 'credits.' || p_adjustment_type;

  if p_company_id is null then
    raise exception using errcode = '22023', message = 'company_not_found';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'invalid_credit_amount';
  end if;
  if pg_catalog.btrim(pg_catalog.coalesce(p_administrator_id, '')) = ''
     or pg_catalog.btrim(pg_catalog.coalesce(p_administrator_role, '')) = '' then
    raise exception using errcode = '42501', message = 'administrator_required';
  end if;
  if v_reason = '' or pg_catalog.length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  if pg_catalog.length(v_internal_note) > 1000 then
    raise exception using errcode = '22023', message = 'internal_note_too_long';
  end if;
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;
  v_request_id := p_request_id::text;

  -- Serialize retries even when a conflicting request targets another company.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_request_id, 0));

  select * into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'company_not_found';
  end if;

  select * into v_existing_audit
  from public.admin_action_audit a
  where a.request_id = v_request_id
    and a.outcome = 'succeeded'
  order by a.created_at asc
  limit 1;

  if found then
    if v_existing_audit.action_id is distinct from v_action_id
       or v_existing_audit.company_id is distinct from v_company.id
       or v_existing_audit.administrator_id is distinct from p_administrator_id
       or v_existing_audit.administrator_role is distinct from p_administrator_role
       or pg_catalog.btrim(pg_catalog.coalesce(v_existing_audit.reason, '')) is distinct from v_reason
       or pg_catalog.coalesce((v_existing_audit.metadata ->> 'amount')::integer, -1) is distinct from p_amount
       or pg_catalog.coalesce(v_existing_audit.metadata ->> 'internalNote', '') is distinct from v_internal_note
       or v_existing_audit.old_balance is null
       or v_existing_audit.new_balance is null
       or (v_existing_audit.metadata ->> 'oldAllocation') is null
       or (v_existing_audit.metadata ->> 'newAllocation') is null then
      raise exception using errcode = '23505', message = 'request_id_conflict';
    end if;

    return query select
      v_existing_audit.company_id,
      pg_catalog.coalesce(v_existing_audit.metadata ->> 'companyName', v_company.name),
      v_existing_audit.action_id,
      (v_existing_audit.metadata ->> 'amount')::integer,
      (v_existing_audit.metadata ->> 'oldAllocation')::integer,
      (v_existing_audit.metadata ->> 'newAllocation')::integer,
      v_existing_audit.old_balance,
      v_existing_audit.new_balance,
      v_existing_audit.id;
    return;
  end if;

  if v_company.package_size is null or v_company.package_size < 0
     or v_company.credits_balance is null or v_company.credits_balance < 0
     or v_company.credits_balance > v_company.package_size then
    raise exception using errcode = '22023', message = 'invalid_credit_balance';
  end if;

  if p_adjustment_type = 'add' then
    if v_company.package_size > 2147483647 - p_amount
       or v_company.credits_balance > 2147483647 - p_amount then
      raise exception using errcode = '22003', message = 'credit_amount_overflow';
    end if;
    v_new_package_size := v_company.package_size + p_amount;
    v_new_balance := v_company.credits_balance + p_amount;
  else
    if p_amount > v_company.credits_balance then
      raise exception using errcode = '22003', message = 'insufficient_remaining_credits';
    end if;
    v_new_package_size := v_company.package_size - p_amount;
    v_new_balance := v_company.credits_balance - p_amount;
    if v_new_package_size < 0 or v_new_balance < 0 or v_new_package_size < v_new_balance then
      raise exception using errcode = '22003', message = 'credit_amount_underflow';
    end if;
  end if;

  update public.companies
  set package_size = v_new_package_size,
      credits_balance = v_new_balance
  where id = v_company.id;

  insert into public.credit_transactions (company_id, amount, description)
  values (
    v_company.id,
    case when p_adjustment_type = 'add' then p_amount else -p_amount end,
    'Admin action ' || v_action_id || ' by ' || p_administrator_id ||
    '; operation ' || v_request_id ||
    '; amount ' || p_amount ||
    '; old allocation ' || v_company.package_size ||
    '; new allocation ' || v_new_package_size ||
    '; old balance ' || v_company.credits_balance ||
    '; new balance ' || v_new_balance ||
    '; reason: ' || v_reason
  );

  insert into public.admin_action_audit (
    request_id, action_id, administrator_id, administrator_role,
    resource_type, resource_id, company_id, outcome, reason,
    old_balance, new_balance, metadata
  ) values (
    v_request_id, v_action_id, p_administrator_id, p_administrator_role,
    'company', v_company.id::text, v_company.id, 'succeeded', v_reason,
    v_company.credits_balance, v_new_balance,
    pg_catalog.jsonb_build_object(
      'companyName', v_company.name,
      'adjustmentType', p_adjustment_type,
      'amount', p_amount,
      'internalNote', v_internal_note,
      'oldAllocation', v_company.package_size,
      'newAllocation', v_new_package_size,
      'oldBalance', v_company.credits_balance,
      'newBalance', v_new_balance
    )
  ) returning id into v_audit_id;

  return query select
    v_company.id,
    v_company.name,
    v_action_id,
    p_amount,
    v_company.package_size,
    v_new_package_size,
    v_company.credits_balance,
    v_new_balance,
    v_audit_id;
end;
$$;

revoke execute on function public.adjust_company_credits_admin_action(uuid, text, integer, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.adjust_company_credits_admin_action(uuid, text, integer, text, text, text, text, uuid)
  to service_role;

commit;
