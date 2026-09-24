begin;

do $hotfix$
declare
  v_signature regprocedure := 'public.issue_company_assessment_access_admin_action(text,uuid,text,text,text,text,text,integer,text,text,text,text,timestamptz,text,text)'::regprocedure;
  v_definition text;
  v_from constant text := 'v_company.billing_email,p_credits,p_issuance_type,p_language_mode,p_expires_at,v_ref)';
  v_to constant text := 'v_company.billing_email,case when p_existing_company_id is not null and p_credits = 0 then 1 else p_credits end,p_issuance_type,p_language_mode,p_expires_at,v_ref)';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_to) > 0 then
    raise exception 'existing_company_zero_topup_policy_quantity_already_corrected';
  end if;

  if pg_catalog.strpos(v_definition, v_from) = 0
     or pg_catalog.strpos(
       pg_catalog.substr(
         v_definition,
         pg_catalog.strpos(v_definition, v_from) + pg_catalog.length(v_from)
       ),
       v_from
     ) > 0 then
    raise exception 'unexpected_existing_company_issuance_function_definition';
  end if;

  execute pg_catalog.replace(v_definition, v_from, v_to);
end;
$hotfix$;

commit;
