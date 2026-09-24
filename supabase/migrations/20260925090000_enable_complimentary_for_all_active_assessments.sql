begin;

do $eligibility$
declare
  v_signature regprocedure := 'public.issue_individual_assessment_access_admin_action(text,text,text,text,text,text,text,text,text,timestamptz,text,text,text)'::regprocedure;
  v_definition text;
  v_old_check constant text := 'if not v_assessment.allows_individual_access then raise exception ''individual_access_not_supported''; end if;';
  v_new_check constant text := 'if p_funding_type=''paid'' and not v_assessment.allows_individual_access then raise exception ''individual_access_not_supported''; end if;';
begin
  select pg_catalog.pg_get_functiondef(v_signature::oid)
    into v_definition;

  if pg_catalog.strpos(v_definition, v_new_check) = 0 then
    if pg_catalog.strpos(v_definition, v_old_check) = 0 then
      raise exception 'unexpected_individual_issuance_function_definition';
    end if;
    execute pg_catalog.replace(v_definition, v_old_check, v_new_check);
  end if;
end;
$eligibility$;

update public.assessments
set allows_complimentary_access = true
where status = 'active'
  and id in (
    'outdoor_sales_mri',
    'sales_manager_mri',
    'sme_business_health_mri',
    'lawyer_client_conversion_mri',
    'outdoor_sales_scan'
  )
  and allows_complimentary_access is distinct from true;

commit;
