CREATE OR REPLACE FUNCTION public.start_assessment_with_credit(p_token text, p_assessment_slug text, p_lang text, p_full_name text, p_participant_company text, p_user_email text, p_user_id uuid)
 RETURNS TABLE(attempt_id uuid, credits_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_token access_tokens%rowtype;
  v_company companies%rowtype;
  v_assessment assessments%rowtype;
  v_attempt_id uuid;
  v_existing_attempt_id uuid;
  v_remaining int;
  v_email text;
begin
  v_email := lower(trim(coalesce(p_user_email, '')));

  if v_email = '' then
    raise exception 'Participant email is required';
  end if;

  -- 1. Find and lock token
  select *
  into v_token
  from access_tokens
  where token_string = trim(p_token)
  for update;

  if not found then
    raise exception 'Invalid access token';
  end if;

  if v_token.expires_at is not null and v_token.expires_at < now() then
    raise exception 'Access token has expired';
  end if;

  -- 2. Find assessment by slug
  select *
  into v_assessment
  from assessments
  where slug = trim(lower(p_assessment_slug))
    and status = 'active'
  limit 1;

  if not found then
    raise exception 'Assessment not found or inactive';
  end if;

  -- 3. Token must match this assessment if assessment_type is filled
  if v_token.assessment_type is not null
     and trim(v_token.assessment_type) <> ''
     and v_token.assessment_type <> v_assessment.id then
    raise exception 'This token is not valid for this assessment';
  end if;

  -- 4. Find and lock company
  select *
  into v_company
  from companies
  where id = v_token.company_id
  for update;

  if not found then
    raise exception 'Company not found for this token';
  end if;

  -- 5. Duplicate protection:
  -- same company + same assessment + same participant email = return existing attempt, do not deduct again
  select qa.id
  into v_existing_attempt_id
  from quiz_attempts qa
  where qa.company_id = v_company.id
    and qa.assessment_id = v_assessment.id
    and lower(trim(coalesce(qa.user_email, ''))) = v_email
  order by qa.created_at desc
  limit 1;

  if v_existing_attempt_id is not null then
    return query
    select v_existing_attempt_id, coalesce(v_company.credits_balance, 0);
    return;
  end if;

  -- 6. Check credits
  if coalesce(v_company.credits_balance, 0) <= 0 then
    raise exception 'No credits remaining';
  end if;

  -- 7. Deduct one credit
  update companies
  set credits_balance = credits_balance - 1
  where id = v_company.id
  returning credits_balance into v_remaining;

  -- 8. Record credit usage
  insert into credit_transactions (
    company_id,
    amount,
    description
  )
  values (
    v_company.id,
    -1,
    'Used 1 credit for ' || p_assessment_slug || ' by ' || coalesce(v_email, 'unknown participant')
  );

  -- 9. Create quiz attempt
  insert into quiz_attempts (
    assessment_id,
    language,
    full_name,
    company,
    user_email,
    user_id,
    total_questions,
    score,
    total_percentage,
    answers,
    competency_results,
    company_id,
    access_token_id
  )
  values (
    v_assessment.id,
    p_lang,
    nullif(trim(p_full_name), ''),
    nullif(trim(p_participant_company), ''),
    v_email,
    p_user_id,
    coalesce(v_assessment.num_questions, 75),
    0,
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    v_company.id,
    v_token.id
  )
  returning id into v_attempt_id;

  return query
  select v_attempt_id, v_remaining;
end;
$function$
