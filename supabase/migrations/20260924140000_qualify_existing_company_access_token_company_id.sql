begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text)'::regprocedure;
  v_definition text;
  v_defective_fragment constant text := 'from public.access_tokens where company_id=v_company.id and assessment_type=v_assessment.id and revoked_at is null order by created_at limit 1;';
  v_corrected_fragment constant text := 'from public.access_tokens at where at.company_id=v_company.id and assessment_type=v_assessment.id and revoked_at is null order by created_at limit 1;';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_corrected_fragment) > 0 then
    raise exception 'existing_company_access_token_company_id_already_qualified';
  end if;

  if pg_catalog.strpos(v_definition, v_defective_fragment) = 0
     or pg_catalog.strpos(
       pg_catalog.substr(
         v_definition,
         pg_catalog.strpos(v_definition, v_defective_fragment)
           + pg_catalog.length(v_defective_fragment)
       ),
       v_defective_fragment
     ) > 0 then
    raise exception 'unexpected_existing_company_issuance_function_definition';
  end if;

  execute pg_catalog.replace(
    v_definition,
    v_defective_fragment,
    v_corrected_fragment
  );
end;
$hotfix$;

commit;
