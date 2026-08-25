# Career Labs AI — Production Release Checklist

## Instructions

Use this checklist for every production release. Mark each item as complete, not applicable with reason, or blocked. High-risk releases require named approval and a tested rollback strategy.

The release must comply with [PLATFORM_RULES.md](./PLATFORM_RULES.md), [SECURITY.md](./SECURITY.md), and [CHANGELOG_GUIDE.md](./CHANGELOG_GUIDE.md).

## 1. Release definition

- [ ] Release owner identified
- [ ] Scope and acceptance criteria documented
- [ ] Risk level assigned: low / medium / high / critical
- [ ] User, assessment, company, report, and integration impact identified
- [ ] Unrelated changes excluded
- [ ] Implementation report prepared

## 2. Source control

- [ ] Working tree reviewed for unrelated/uncommitted files
- [ ] Release changes reviewed through the approved process
- [ ] Commit/build source is identifiable and reproducible
- [ ] No secrets, production data, generated reports, or private tokens are committed
- [ ] Documentation updated where architecture or operations changed

## 3. Dependencies and configuration

- [ ] Lockfile matches dependency declarations
- [ ] New dependencies reviewed for necessity, maintenance, license, and security
- [ ] Environment variables documented and validated in each target environment
- [ ] Secrets stored in approved secret management
- [ ] Feature flags and defaults reviewed
- [ ] Production URLs, callback URLs, and provider endpoints verified

## 4. TypeScript and static verification

- [ ] TypeScript check passes with no errors
- [ ] Production build passes cleanly
- [ ] Lint passes, or every pre-existing/non-blocking warning is documented
- [ ] Formatting/diff checks pass
- [ ] No accidental debug code, placeholder identity, or test bypass remains

## 5. Automated testing

- [ ] Relevant unit tests pass
- [ ] Integration tests pass
- [ ] Regression tests pass
- [ ] Golden scoring fixtures pass for affected assessments
- [ ] Authorization negative tests pass
- [ ] Token/credit/payment idempotency tests pass where affected
- [ ] Report consistency tests pass across affected renderers
- [ ] CI passes on the release revision

## 6. Manual functional testing

- [ ] Primary participant journey tested
- [ ] Registration/login and session behavior tested
- [ ] Assessment start and instructions tested
- [ ] Question and answer randomization tested where affected
- [ ] Submission and unanswered behavior tested
- [ ] Results and detailed report tested
- [ ] Error, retry, duplicate, and expired-access cases tested
- [ ] Participant dashboard/history tested where affected
- [ ] Manager/company journey tested where affected
- [ ] Administrator/developer journey tested where affected

## 7. Assessment regression

Verify every assessment affected by shared code:

- [ ] Outdoor Sales Scan
- [ ] Outdoor Sales MRI
- [ ] Sales Manager MRI
- [ ] SME Business Health MRI
- [ ] Lawyer Client Conversion MRI
- [ ] Any newly published assessment

Verify applicable access modes:

- [ ] Free/individual
- [ ] Paid/token-backed
- [ ] Online corporate
- [ ] Offline corporate
- [ ] Manager/HR
- [ ] Developer Test Mode
- [ ] Complimentary entitlement, if implemented

## 8. Localization and accessibility

- [ ] English content and LTR layout verified
- [ ] Arabic content, typography, and RTL reading order verified
- [ ] No missing/internal competency IDs visible
- [ ] Keyboard operation and focus states verified
- [ ] Screen-reader labels reviewed for changed controls
- [ ] Contrast and non-color status communication verified
- [ ] Mobile, desktop, print, and PDF layouts checked where affected

## 9. Security

- [ ] Authentication enforced at every affected boundary
- [ ] Server-side authorization verifies actor and resource
- [ ] Service-role reads occur only after explicit authorization
- [ ] Negative access cases tested
- [ ] PII fields minimized in queries/responses/logs
- [ ] Token and secret handling reviewed
- [ ] CSRF/origin and rate-limit controls reviewed for mutations
- [ ] File/report/export authorization verified
- [ ] Errors do not expose internals
- [ ] Administrative actions are audited
- [ ] Security specialist approval obtained for high-risk changes

## 10. Database

- [ ] No schema change is hidden outside migrations
- [ ] Migration order and application compatibility reviewed
- [ ] Forward migration tested in a non-production environment
- [ ] Constraints, RLS, grants, indexes, and generated types reviewed
- [ ] Query plans reviewed for significant query/index changes
- [ ] Backfill is bounded, observable, restartable, and idempotent
- [ ] Backup/recovery requirements confirmed
- [ ] Rollback or compensating migration documented
- [ ] Data reconciliation queries prepared

## 11. Performance and reliability

- [ ] No unnecessary `select *` or repeated privileged queries introduced
- [ ] Large collections are paginated
- [ ] Client bundle impact reviewed
- [ ] Server execution time and provider limits reviewed
- [ ] Cache behavior and invalidation documented
- [ ] Concurrency, replay, and retry behavior verified
- [ ] Background-job failure/retry behavior verified where applicable
- [ ] Load or query testing completed for material scale changes

## 12. Reports and notifications

- [ ] Canonical scores, tiers, and labels agree across outputs
- [ ] Web report authorization verified
- [ ] Print/PDF/DOCX authorization verified where applicable
- [ ] Manager and executive audience filtering verified
- [ ] Arabic font/layout verified in generated artifacts
- [ ] Email destination and report link are authorized
- [ ] Delivery failure, retry, and rate limits verified
- [ ] No arbitrary link or HTML injection path introduced

## 13. Commerce, credits, and entitlements

- [ ] Entitlement source and scope verified
- [ ] Credit mutation is transactional and ledger-backed
- [ ] Duplicate/replayed request cannot double-charge or double-grant
- [ ] Token expiry, scope, rotation, and revocation verified
- [ ] Provider webhook signatures and replay protection verified
- [ ] Refund/correction and reconciliation behavior tested
- [ ] Manual/offline payment path remains consistent where affected

## 14. Deployment readiness

- [ ] Deployment window and stakeholders confirmed
- [ ] Monitoring dashboards/log queries ready
- [ ] Feature-flag rollout sequence documented
- [ ] Database/application deployment order documented
- [ ] Rollback decision owner identified
- [ ] Rollback commands or previous artifact verified
- [ ] Customer/support communication prepared if needed
- [ ] No migration or external mutation will occur without explicit authorization

## 15. Deployment

- [ ] Deploy approved revision only
- [ ] Record deployment ID, commit, time, and operator
- [ ] Apply authorized migrations in documented order
- [ ] Verify migration completion and reconciliation
- [ ] Enable feature flags according to rollout plan
- [ ] Monitor errors, latency, database health, and provider status

## 16. Production smoke testing

- [ ] Health endpoint responds
- [ ] Public assessment entry loads
- [ ] Participant authentication works
- [ ] One safe assessment start path works
- [ ] Question loading works
- [ ] Submission works in an approved test attempt
- [ ] Results/report access follows intended authorization
- [ ] Company/manager path works where affected
- [ ] Admin/Developer Test Mode works where affected
- [ ] Email/PDF/integration path works where affected
- [ ] English and Arabic critical paths render correctly

## 17. Rollback verification

- [ ] Rollback trigger thresholds are still appropriate
- [ ] Previous application artifact is available
- [ ] Database remains backward compatible, or compensating plan is ready
- [ ] External provider events generated during release are accounted for
- [ ] Credits, entitlements, attempts, and reports will remain consistent
- [ ] Rollback execution and post-rollback smoke tests have named owners

## 18. Post-deployment verification

- [ ] Error rate and latency reviewed after initial traffic
- [ ] Assessment starts/submissions/completions reviewed
- [ ] Authorization failures and security alerts reviewed
- [ ] Credit/token/entitlement reconciliation reviewed
- [ ] Report and notification failures reviewed
- [ ] No unexpected database growth or slow queries detected
- [ ] Support feedback reviewed
- [ ] Release status communicated
- [ ] Known limitations and follow-up actions recorded
- [ ] Incident review opened if release caused material failure

## Release decision

```text
Release:
Revision:
Environment:
Risk level:
Owner:
Approvers:
Deployment time:
Migration status:
Rollback reference:
Final status: GO / NO-GO / ROLLED BACK
Notes:
```

