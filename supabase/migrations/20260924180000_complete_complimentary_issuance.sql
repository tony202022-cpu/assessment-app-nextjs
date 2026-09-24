begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_individual_assessment_access_admin_action(text,text,text,text,text,text,text,text,text,timestamptz,text,text,text)'::regprocedure;
  v_definition text;
  v_declaration_from constant text := 'v_existing public.admin_action_audit%rowtype;';
  v_declaration_to constant text := 'v_existing public.admin_action_audit%rowtype;
  v_action_id text := case when p_funding_type=''complimentary'' then ''assessment-access.complimentary.issue'' else ''assessment-access.individual.issue'' end;';
  v_lookup_from constant text := 'action_id=''assessment-access.individual.issue'' and outcome=''succeeded''';
  v_lookup_to constant text := 'action_id=v_action_id and outcome=''succeeded''';
  v_audit_from constant text := 'values(p_request_id,''assessment-access.individual.issue'',p_administrator_id';
  v_audit_to constant text := 'values(p_request_id,v_action_id,p_administrator_id';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_declaration_to) > 0
     or pg_catalog.strpos(v_definition, v_lookup_to) > 0
     or pg_catalog.strpos(v_definition, v_audit_to) > 0 then
    raise exception 'complimentary_issuance_audit_action_already_corrected';
  end if;

  if pg_catalog.strpos(v_definition, v_declaration_from) = 0
     or pg_catalog.strpos(v_definition, v_lookup_from) = 0
     or pg_catalog.strpos(v_definition, v_audit_from) = 0 then
    raise exception 'unexpected_individual_issuance_function_definition';
  end if;

  v_definition := pg_catalog.replace(v_definition, v_declaration_from, v_declaration_to);
  v_definition := pg_catalog.replace(v_definition, v_lookup_from, v_lookup_to);
  v_definition := pg_catalog.replace(v_definition, v_audit_from, v_audit_to);

  execute v_definition;
end;
$hotfix$;

commit;
