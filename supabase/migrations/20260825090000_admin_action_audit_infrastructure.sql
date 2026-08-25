begin;

create table if not exists public.admin_action_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  action_id text not null,
  administrator_id text not null,
  administrator_role text not null,
  resource_type text not null,
  resource_id text not null,
  company_id uuid null references public.companies(id),
  outcome text not null check (outcome in ('attempted', 'succeeded', 'denied', 'failed')),
  reason text null,
  error_code text null,
  old_balance integer null,
  new_balance integer null,
  metadata jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_action_audit_request_action_outcome_key
    unique (request_id, action_id, outcome),
  constraint admin_action_audit_request_id_present
    check (btrim(request_id) <> '' and length(request_id) <= 200),
  constraint admin_action_audit_action_id_present
    check (btrim(action_id) <> '' and length(action_id) <= 200),
  constraint admin_action_audit_administrator_id_present
    check (btrim(administrator_id) <> '' and length(administrator_id) <= 300),
  constraint admin_action_audit_administrator_role_present
    check (btrim(administrator_role) <> '' and length(administrator_role) <= 100),
  constraint admin_action_audit_resource_present
    check (
      btrim(resource_type) <> '' and length(resource_type) <= 100
      and btrim(resource_id) <> '' and length(resource_id) <= 300
    ),
  constraint admin_action_audit_reason_length
    check (reason is null or length(reason) <= 1000),
  constraint admin_action_audit_error_code_length
    check (error_code is null or length(error_code) <= 200),
  constraint admin_action_audit_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint admin_action_audit_context_object
    check (jsonb_typeof(context) = 'object')
);

comment on table public.admin_action_audit is
  'Append-only audit records for administrative action lifecycle events.';
comment on column public.admin_action_audit.request_id is
  'Idempotency and correlation identifier supplied by the trusted application boundary.';
comment on column public.admin_action_audit.metadata is
  'Non-secret action metadata. Raw credentials and tokens are prohibited.';
comment on column public.admin_action_audit.context is
  'Non-secret request context such as correlation identifier, IP address, and user agent.';

alter table public.admin_action_audit enable row level security;

revoke all on table public.admin_action_audit from public, anon, authenticated;
grant select, insert on table public.admin_action_audit to service_role;

create index if not exists admin_action_audit_company_created_idx
  on public.admin_action_audit (company_id, created_at desc)
  where company_id is not null;

create index if not exists admin_action_audit_resource_created_idx
  on public.admin_action_audit (resource_type, resource_id, created_at desc);

create index if not exists admin_action_audit_action_created_idx
  on public.admin_action_audit (action_id, created_at desc);

commit;
