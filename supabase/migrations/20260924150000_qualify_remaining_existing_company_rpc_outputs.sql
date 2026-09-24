begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text)'::regprocedure;
  v_definition text;
  v_update_from constant text := 'update public.companies
         set package_size=coalesce(package_size,0)+p_credits';
  v_update_to constant text := 'update public.companies as c
         set package_size=coalesce(package_size,0)+p_credits';
  v_manager_from constant text := 'nullif(btrim(manager_name),'''')';
  v_manager_to constant text := 'nullif(btrim(c.manager_name),'''')';
  v_policy_from constant text := 'insert into public.assessment_issuance_policies(';
  v_policy_to constant text := 'insert into public.assessment_issuance_policies as aip(';
  v_returning_from constant text := 'returning id,issued_at into v_policy,v_issued;';
  v_returning_to constant text := 'returning aip.id,aip.issued_at into v_policy,v_issued;';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_update_to) > 0
     or pg_catalog.strpos(v_definition, v_manager_to) > 0
     or pg_catalog.strpos(v_definition, v_policy_to) > 0
     or pg_catalog.strpos(v_definition, v_returning_to) > 0 then
    raise exception 'existing_company_rpc_outputs_already_qualified';
  end if;

  if pg_catalog.strpos(v_definition, v_update_from) = 0
     or pg_catalog.strpos(v_definition, v_manager_from) = 0
     or pg_catalog.strpos(v_definition, v_policy_from) = 0
     or pg_catalog.strpos(v_definition, v_returning_from) = 0
     or pg_catalog.strpos(pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_update_from) + pg_catalog.length(v_update_from)), v_update_from) > 0
     or pg_catalog.strpos(pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_manager_from) + pg_catalog.length(v_manager_from)), v_manager_from) > 0
     or pg_catalog.strpos(pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_policy_from) + pg_catalog.length(v_policy_from)), v_policy_from) > 0
     or pg_catalog.strpos(pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_returning_from) + pg_catalog.length(v_returning_from)), v_returning_from) > 0 then
    raise exception 'unexpected_existing_company_issuance_function_definition';
  end if;

  v_definition := pg_catalog.replace(v_definition, v_update_from, v_update_to);
  v_definition := pg_catalog.replace(v_definition, v_manager_from, v_manager_to);
  v_definition := pg_catalog.replace(v_definition, v_policy_from, v_policy_to);
  v_definition := pg_catalog.replace(v_definition, v_returning_from, v_returning_to);

  execute v_definition;
end;
$hotfix$;

commit;
