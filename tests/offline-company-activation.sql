-- Run in a non-production Supabase SQL Editor after applying the activation
-- migration. Everything is rolled back. No generated token is printed.
begin;

do $test$
declare
  v_result record;
  v_company_count integer;
  v_token_count integer;
  v_other_company_id uuid;
  v_other_is_offline boolean;
begin
  select * into v_result
  from public.activate_offline_company(
    'Codex Offline Activation Test 25',
    'offline-test-25@example.invalid',
    25,
    'outdoor_sales_mri',
    now() + interval '30 days'
  );

  if v_result.package_size <> 25 or v_result.credits_balance <> 25 then
    raise exception '25-credit activation assertion failed';
  end if;
  if length(v_result.manager_token) <> 64 or length(v_result.employee_token) <> 64 then
    raise exception 'secure token length assertion failed';
  end if;

  select count(*) into v_company_count
  from public.companies
  where id = v_result.company_id
    and package_size = 25
    and credits_balance = 25
    and is_offline_activated = true;

  select count(*) into v_token_count
  from public.access_tokens
  where company_id = v_result.company_id
    and assessment_type = 'outdoor_sales_mri'
    and is_used = false
    and used_by_email is null;

  if v_company_count <> 1 or v_token_count <> 1 then
    raise exception 'atomic company/token relationship assertion failed';
  end if;

  insert into public.companies (
    name, billing_email, credits_balance, package_size
  )
  values (
    'Codex Non-Offline Default Test',
    'non-offline-default@example.invalid',
    1,
    1
  )
  returning id, is_offline_activated
  into v_other_company_id, v_other_is_offline;

  if v_other_company_id is null or v_other_is_offline is distinct from false then
    raise exception 'non-offline company default FALSE assertion failed';
  end if;

  perform public.activate_offline_company(
    'Codex Offline Activation Test 10',
    'offline-test-10@example.invalid',
    10,
    'outdoor_sales_mri',
    null
  );
  perform public.activate_offline_company(
    'Codex Offline Activation Test 50',
    'offline-test-50@example.invalid',
    50,
    'outdoor_sales_mri',
    null
  );
  perform public.activate_offline_company(
    'Codex Offline Activation Test Custom',
    'offline-test-custom@example.invalid',
    37,
    'outdoor_sales_mri',
    null
  );

  begin
    perform public.activate_offline_company(
      '  CODEX   OFFLINE ACTIVATION TEST 25 ',
      'OFFLINE-TEST-25@EXAMPLE.INVALID',
      25,
      'outdoor_sales_mri',
      null
    );
    raise exception 'duplicate assertion failed';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.activate_offline_company(
      'Invalid Email Test', 'not-an-email', 10, 'outdoor_sales_mri', null
    );
    raise exception 'invalid email assertion failed';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.activate_offline_company(
      'Invalid Credits Test', 'credits@example.invalid', 0, 'outdoor_sales_mri', null
    );
    raise exception 'invalid credits assertion failed';
  exception when invalid_parameter_value then
    null;
  end;
end
$test$;

rollback;
