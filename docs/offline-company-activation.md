# Offline Company Activation

## Existing flow

- Browser-safe Supabase access uses the anon client in `src/integrations/supabase/client.ts`.
- Privileged server routes and the manager dashboard create non-persistent service-role clients.
- Employee assessment starts are handled by `start_assessment_with_credit`. It locks the shared token and company, validates expiry and assessment type, returns an existing attempt for the same normalized company/assessment/email without charging again, and otherwise deducts one credit and creates the attempt in one transaction.
- The manager dashboard looks up `companies.manager_token` server-side and then loads that company's Outdoor MRI attempts.
- Online company creation is not present in this repository. A read-only inspection of recent live rows confirmed UUID IDs, shared `is_used = false` tokens, and a 64-character manager token. Offline activation defaults to no expiry unless the admin deliberately enables one.

## Files

- `app/admin/offline-company/page.tsx` and `OfflineCompanyActivation.tsx`: protected admin form, duplicate warning, and copyable success links.
- `app/api/admin/offline-company/session/route.ts`: rate-limited admin-secret login and signed HTTP-only session.
- `app/api/admin/offline-company/route.ts`: server-only validation, duplicate check, and transactional RPC call.
- `src/lib/offline-company.ts`: authorization, server Supabase client, and validation.
- `src/lib/offline-company-rate-limit.ts`: basic per-instance request throttling.
- `supabase/migrations/20260725_activate_offline_company.sql`: restricted atomic activation function.
- `.env.example`: placeholder environment configuration.

## Deploy

1. In Supabase SQL Editor, inspect and run `supabase/migrations/20260725_activate_offline_company.sql`.
2. Add `ADMIN_ACTIVATION_SECRET` in Vercel Project Settings → Environment Variables. Use at least 24 random characters (32+ recommended), never a public-prefixed variable.
3. Confirm the existing `SUPABASE_SERVICE_ROLE_KEY` and Supabase URL variables are configured in Vercel.
4. Deploy the application.
5. Visit `https://app.careerlabsai.com/admin/offline-company`, enter the admin secret, complete the form, and select **Activate Company**.

The company appears in `public.companies`. Its one shared employee token appears in `public.access_tokens`, linked through `access_tokens.company_id = companies.id`.

## First activation and verification

Use a unique test company/email and 10 credits:

1. Save both generated links immediately.
2. In Supabase, verify `credits_balance = package_size = 10`, `manager_token` is populated, and the access token has `assessment_type = outdoor_sales_mri`, `is_used = false`, `used_by_email = null`, and the selected expiry.
3. Open the employee link, sign in as employee A, and start the assessment. Verify the balance becomes 9.
4. Open the same link as employee B. Verify a second attempt is created and the balance becomes 8; the shared token remains `is_used = false`.
5. Re-enter as employee A. Verify the existing attempt is returned and the balance remains 8.
6. Open the manager link and verify both employees appear. Confirm the employee token cannot open the manager dashboard and the manager token cannot start the employee assessment.
7. Re-submit the same normalized company name/email in the admin page. Verify the duplicate panel appears and no credits are added.
8. Check one pre-existing online company employee and manager link as a regression test.

Repeat activation in a non-production environment with 25, 50, and a custom quantity. Also verify invalid email, zero/negative quantity, cleared/expired admin session, and a future/no-expiry token.

## Audit proposal (not applied)

No audit/admin-actions table exists. If a persistent audit trail is required, review the separate `docs/admin_activation_log_PROPOSAL.sql`. It intentionally is not a migration and has not been applied. The application would then need a follow-up change to write the authenticated identifier; the current minimal authentication identifies the operator only as the holder of the shared admin secret.

## Rollback

1. Remove or revert the application files listed above and redeploy.
2. Run:

   ```sql
   drop function if exists public.activate_offline_company(text, text, integer, text, timestamptz);
   ```

3. Remove `ADMIN_ACTIVATION_SECRET` from Vercel.

The migration adds no tables or columns and does not alter Stripe, Make, assessment, credit, report, or dashboard logic. Existing companies and tokens are therefore unaffected. Do not delete an activated company as part of rollback unless its assessments and credit history have first been reviewed.
