-- Run only against an isolated test database after applying the two admin-action
-- migrations. Every fixture and assertion is rolled back at the end.
begin;

create temporary table restore_credit_test_state (
  company_id uuid primary key,
  original_balance integer not null
) on commit drop;

with inserted as (
  insert into public.companies (
    id, name, billing_email, package_size, credits_balance
  )
  values (
    gen_random_uuid(),
    'Restore Credit Integration Test',
    'restore-credit-integration@example.invalid',
    5,
    2
  )
  returning id, credits_balance
)
insert into restore_credit_test_state (company_id, original_balance)
select id, credits_balance from inserted;

-- Successful restore: balance, ledger, and audit must agree.
do $$
declare
  v_company_id uuid := (select company_id from restore_credit_test_state);
  v_result record;
begin
  select * into v_result
  from public.restore_company_credit_admin_action(
    v_company_id, 'integration-admin', 'admin',
    'Approved integration success case',
    '10000000-0000-4000-8000-000000000001'
  );
  if v_result.old_balance <> 2 or v_result.new_balance <> 3 or v_result.package_size <> 5 then
    raise exception 'successful_restore_result_failed';
  end if;
  if (select credits_balance from public.companies where id = v_company_id) <> 3 then
    raise exception 'successful_restore_balance_failed';
  end if;
  if (select count(*) from public.credit_transactions where company_id = v_company_id and amount = 1) <> 1 then
    raise exception 'successful_restore_ledger_failed';
  end if;
  if not exists (
    select 1 from public.admin_action_audit
    where id = v_result.audit_id and old_balance = 2 and new_balance = 3
      and administrator_id = 'integration-admin' and outcome = 'succeeded'
  ) then
    raise exception 'successful_restore_audit_failed';
  end if;
end $$;

-- Idempotent retry: the same operation ID returns the original result and
-- must not create another balance change, ledger row, or success audit.
do $$
declare
  v_company_id uuid := (select company_id from restore_credit_test_state);
  v_result record;
begin
  select * into v_result
  from public.restore_company_credit_admin_action(
    v_company_id, 'integration-admin', 'admin',
    'Approved integration success case',
    '10000000-0000-4000-8000-000000000001'
  );
  if v_result.old_balance <> 2 or v_result.new_balance <> 3 then
    raise exception 'idempotent_result_failed';
  end if;
  if (select credits_balance from public.companies where id = v_company_id) <> 3 then
    raise exception 'idempotent_balance_failed';
  end if;
  if (select count(*) from public.credit_transactions where company_id = v_company_id and amount = 1) <> 1 then
    raise exception 'idempotent_ledger_failed';
  end if;
  if (select count(*) from public.admin_action_audit where request_id = '10000000-0000-4000-8000-000000000001' and action_id = 'credits.restore' and outcome = 'succeeded') <> 1 then
    raise exception 'idempotent_audit_failed';
  end if;
end $$;

-- Missing company and missing actor must fail without side effects.
do $$
begin
  begin
    perform * from public.restore_company_credit_admin_action(
      gen_random_uuid(), 'integration-admin', 'admin', 'Missing company',
      '10000000-0000-4000-8000-000000000002'
    );
    raise exception 'missing_company_was_accepted';
  exception when no_data_found then null;
  end;
  begin
    perform * from public.restore_company_credit_admin_action(
      (select company_id from restore_credit_test_state), '', 'admin', 'Missing actor',
      '10000000-0000-4000-8000-000000000003'
    );
    raise exception 'missing_actor_was_accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Package maximum must be rejected.
update public.companies
set credits_balance = package_size
where id = (select company_id from restore_credit_test_state);

do $$
begin
  begin
    perform * from public.restore_company_credit_admin_action(
      (select company_id from restore_credit_test_state),
      'integration-admin', 'admin', 'Maximum case',
      '10000000-0000-4000-8000-000000000004'
    );
    raise exception 'package_maximum_was_accepted';
  exception when raise_exception then
    if sqlerrm <> 'credits_already_at_maximum' then raise; end if;
  end;
end $$;

update public.companies
set credits_balance = 2
where id = (select company_id from restore_credit_test_state);

-- Audit failure must roll back both the balance and ledger. The generic audit
-- constraint rejects a request ID longer than 200 characters.
do $$
declare
  v_company_id uuid := (select company_id from restore_credit_test_state);
  v_ledger_before bigint := (select count(*) from public.credit_transactions where company_id = v_company_id);
begin
  begin
    perform * from public.restore_company_credit_admin_action(
      v_company_id, 'integration-admin', 'admin', 'Audit rollback case', repeat('x', 201)
    );
    raise exception 'audit_failure_was_accepted';
  exception when check_violation then null;
  end;
  if (select credits_balance from public.companies where id = v_company_id) <> 2 then
    raise exception 'audit_failure_balance_not_rolled_back';
  end if;
  if (select count(*) from public.credit_transactions where company_id = v_company_id) <> v_ledger_before then
    raise exception 'audit_failure_ledger_not_rolled_back';
  end if;
end $$;

-- Ledger failure must roll back the balance and prevent a success audit.
create function pg_temp.reject_restore_credit_ledger()
returns trigger language plpgsql as $$
begin
  if new.description like 'Admin action credits.restore%' then
    raise exception 'forced_restore_credit_ledger_failure';
  end if;
  return new;
end;
$$;

create trigger restore_credit_integration_ledger_failure
before insert on public.credit_transactions
for each row execute function pg_temp.reject_restore_credit_ledger();

do $$
declare
  v_company_id uuid := (select company_id from restore_credit_test_state);
begin
  begin
    perform * from public.restore_company_credit_admin_action(
      v_company_id, 'integration-admin', 'admin', 'Ledger rollback case',
      '10000000-0000-4000-8000-000000000005'
    );
    raise exception 'ledger_failure_was_accepted';
  exception when raise_exception then
    if sqlerrm <> 'forced_restore_credit_ledger_failure' then raise; end if;
  end;
  if (select credits_balance from public.companies where id = v_company_id) <> 2 then
    raise exception 'ledger_failure_balance_not_rolled_back';
  end if;
  if exists (
    select 1 from public.admin_action_audit
    where request_id = '10000000-0000-4000-8000-000000000005'
      and action_id = 'credits.restore' and outcome = 'succeeded'
  ) then
    raise exception 'ledger_failure_audit_not_rolled_back';
  end if;
end $$;

drop trigger restore_credit_integration_ledger_failure on public.credit_transactions;

rollback;
