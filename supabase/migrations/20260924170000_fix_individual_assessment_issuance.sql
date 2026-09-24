begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_individual_assessment_access_admin_action(text,text,text,text,text,text,text,text,text,timestamptz,text,text,text)'::regprocedure;
  v_definition text;
  v_insert_from constant text := 'insert into public.assessment_issuance_policies(';
  v_insert_to constant text := 'insert into public.assessment_issuance_policies as aip(';
  v_returning_from constant text := 'returning id,issued_at into v_policy,v_issued;';
  v_returning_to constant text := 'returning aip.id,aip.issued_at into v_policy,v_issued;';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_insert_to) > 0
     or pg_catalog.strpos(v_definition, v_returning_to) > 0 then
    raise exception 'individual_issuance_rpc_outputs_already_qualified';
  end if;

  if pg_catalog.strpos(v_definition, v_insert_from) = 0
     or pg_catalog.strpos(v_definition, v_returning_from) = 0
     or pg_catalog.strpos(
       pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_insert_from) + pg_catalog.length(v_insert_from)),
       v_insert_from
     ) > 0
     or pg_catalog.strpos(
       pg_catalog.substr(v_definition, pg_catalog.strpos(v_definition, v_returning_from) + pg_catalog.length(v_returning_from)),
       v_returning_from
     ) > 0 then
    raise exception 'unexpected_individual_issuance_function_definition';
  end if;

  v_definition := pg_catalog.replace(v_definition, v_insert_from, v_insert_to);
  v_definition := pg_catalog.replace(v_definition, v_returning_from, v_returning_to);

  execute v_definition;
end;
$hotfix$;

commit;
