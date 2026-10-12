begin;

do $$
declare
  v_company_id uuid := gen_random_uuid();
  v_add_request uuid := gen_random_uuid();
  v_remove_request uuid := gen_random_uuid();
  v_result record;
begin
  insert into public.companies (id, name, billing_email, package_size, credits_balance)
  values (v_company_id, 'Credit adjustment integration fixture', 'credit-adjustment@example.invalid', 10, 6);

  select * into v_result from public.adjust_company_credits_admin_action(
    v_company_id, 'add', 3, 'integration-admin', 'admin', 'Approved package expansion', 'Integration test', v_add_request
  );
  if v_result.old_package_size <> 10 or v_result.new_package_size <> 13
     or v_result.old_balance <> 6 or v_result.new_balance <> 9 then
    raise exception 'add accounting invariant failed';
  end if;
  if (select package_size - credits_balance from public.companies where id = v_company_id) <> 4 then
    raise exception 'add changed used credits';
  end if;

  perform * from public.adjust_company_credits_admin_action(
    v_company_id, 'add', 3, 'integration-admin', 'admin', 'Approved package expansion', 'Integration test', v_add_request
  );
  if (select count(*) from public.admin_action_audit where request_id = v_add_request::text and action_id = 'credits.add' and outcome = 'succeeded') <> 1 then
    raise exception 'add idempotency failed';
  end if;

  select * into v_result from public.adjust_company_credits_admin_action(
    v_company_id, 'remove', 2, 'integration-admin', 'admin', 'Approved package reduction', null, v_remove_request
  );
  if v_result.old_package_size <> 13 or v_result.new_package_size <> 11
     or v_result.old_balance <> 9 or v_result.new_balance <> 7 then
    raise exception 'remove accounting invariant failed';
  end if;
  if (select package_size - credits_balance from public.companies where id = v_company_id) <> 4 then
    raise exception 'remove changed used credits';
  end if;

  begin
    perform * from public.adjust_company_credits_admin_action(
      v_company_id, 'remove', 8, 'integration-admin', 'admin', 'Must fail', null, gen_random_uuid()
    );
    raise exception 'over-removal unexpectedly succeeded';
  exception when sqlstate '22003' then null;
  end;

  begin
    perform * from public.adjust_company_credits_admin_action(
      v_company_id, 'add', 4, 'integration-admin', 'admin', 'Changed payload', 'Integration test', v_add_request
    );
    raise exception 'request conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.credit_transactions where company_id = v_company_id and amount in (3, -2)) <> 2 then
    raise exception 'ledger writes are missing or duplicated';
  end if;
end;
$$;

rollback;
