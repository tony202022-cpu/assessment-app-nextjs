begin;

update public.assessments
set allows_individual_access = true
where id = 'sme_business_health_mri'
  and status = 'active'
  and allows_individual_access is distinct from true;

commit;
