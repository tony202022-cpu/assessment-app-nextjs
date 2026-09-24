begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text)'::regprocedure;
  v_definition text;
  v_defective_fragment constant text := 'issuance_type,language_mode,internal_note)';
  v_corrected_fragment constant text := 'issuance_type,language_mode,expires_at,internal_note)';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_corrected_fragment) > 0 then
    raise exception 'existing_company_issuance_expiry_column_already_corrected';
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
