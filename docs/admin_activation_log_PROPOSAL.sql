-- PROPOSAL ONLY: intentionally not part of supabase/migrations and not applied.
-- Add this only after choosing an admin identity model. Full manager/employee
-- tokens must never be written here.
create table public.admin_activation_log (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type = 'offline_company_activation'),
  company_id uuid not null references public.companies(id),
  company_name text not null,
  billing_email text not null,
  package_size integer not null check (package_size > 0),
  assessment_type text not null,
  admin_identifier text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_activation_log enable row level security;
revoke all on table public.admin_activation_log from public, anon, authenticated;

