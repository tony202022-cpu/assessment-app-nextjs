alter table public.companies
  add column if not exists manager_token text;

create unique index if not exists companies_manager_token_key
  on public.companies (manager_token)
  where manager_token is not null;

alter table public.companies
  add column if not exists package_size integer;

alter table public.quiz_attempts
  add column if not exists completed_at timestamptz;

