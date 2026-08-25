# Generic Admin Audit Infrastructure — Deployment Checklist

**Scope:** `20260825090000_admin_action_audit_infrastructure.sql` only  
**Risk:** Medium — additive database infrastructure with no production-flow cutover

## Before the deployment window

- [ ] Name the deployment operator, reviewer, rollback owner, and deployment window.
- [ ] Confirm the target is the intended production Supabase project.
- [ ] Confirm `public.companies.id` is `uuid` and `public.admin_action_audit` does not already exist with an incompatible shape.
- [ ] Confirm `gen_random_uuid()` is available.
- [ ] Confirm the SQL contains no references to `access_tokens`, assessments, complimentary access, or `start_assessment_with_credit`.
- [ ] Run TypeScript, focused audit tests, the full regression suite, and the production build against the release revision.
- [ ] Apply and verify the migration in a production-equivalent non-production database.
- [ ] Record a schema-only backup or recovery point appropriate to the production change process.

## Manual SQL Editor application

- [ ] Open the Supabase SQL Editor for the verified production project.
- [ ] Paste only `20260825090000_admin_action_audit_infrastructure.sql`.
- [ ] Execute the complete transaction once.
- [ ] Save the execution timestamp, operator, source revision, and SQL Editor result in the release record.
- [ ] Do not apply the Restore Credit or any complimentary-access migration in this deployment step.

## Verification

- [ ] Confirm `public.admin_action_audit` exists with RLS enabled.
- [ ] Confirm `anon` and `authenticated` have no table privileges.
- [ ] Confirm `service_role` has only `SELECT` and `INSERT` table privileges.
- [ ] Confirm the request/action/outcome uniqueness constraint exists.
- [ ] Confirm company, resource, and action timeline indexes exist.
- [ ] From the trusted server adapter, insert one non-production verification event using a unique request ID.
- [ ] Confirm the event is readable through `service_role` and inaccessible through browser roles.
- [ ] Record and retain the verification event as an audit-infrastructure deployment event; do not delete it.
- [ ] Smoke-test an existing Outdoor MRI company token and confirm its credits and start behavior are unchanged.

## Rollback and stop conditions

Stop immediately if the transaction fails, an existing audit table has a different shape, or any unexpected privilege is present.

Before any real audit records exist, rollback may drop the new table after confirming no application action depends on it. After records exist, do not drop the table: disable callers, preserve the audit evidence, and use a separately reviewed compensating migration.

## Required release record

```text
Migration: 20260825090000_admin_action_audit_infrastructure.sql
Revision:
Environment:
Operator:
Reviewer:
Applied at:
SQL Editor result:
RLS/grant verification:
Server adapter verification request ID:
Outdoor MRI smoke test:
Rollback owner:
Final status: GO / NO-GO / ROLLED BACK
```
