# Career Labs AI Control Center — Product and Architecture Specification

## Status

Future specification only. The Control Center described here is not implemented. Development must not begin until the security and service foundations in [PLATFORM_RULES.md](./PLATFORM_RULES.md), [SECURITY.md](./SECURITY.md), and [SERVICES.md](./SERVICES.md) are established.

## Product objective

The Career Labs AI Control Center will be the governed operating interface for assessments, participants, organizations, entitlements, credits, reports, diagnostics, administrators, integrations, and future intelligence.

It must replace private operational utilities gradually without embedding business logic in administration UI.

## Design principles

- Named identities and least-privilege permissions
- Server-side authorization for every read and mutation
- Immutable audit history
- Read-only visibility before mutation capability
- Typed service contracts, no direct UI database access
- Search constrained by requester permissions
- High-risk actions require confirmation and step-up authentication
- All lists support pagination, stable filters, and export controls
- English/Arabic and accessibility are first-class

## Navigation

```text
Control Center
  ├─ Overview
  ├─ Assessments
  ├─ Participants
  ├─ Organizations
  ├─ Reports
  ├─ Access & Entitlements
  ├─ Credits & Commerce
  ├─ Diagnostics
  ├─ Developer Tools
  ├─ Security & Audit
  ├─ Integrations
  └─ Settings
```

## Overview dashboard

The overview should answer:

- Is the platform healthy?
- Are assessment starts, submissions, reports, and notifications succeeding?
- Which assessments are active and which have configuration warnings?
- Are credit, token, or entitlement anomalies present?
- Are security events or failed administrative actions increasing?

Recommended widgets:

- Attempts started/completed by assessment and time range
- Completion and submission failure rates
- Report-generation and email-delivery health
- Active organizations and credit consumption
- Expiring contracts/tokens
- Configuration diagnostics
- Security alerts and recent audit events

## Assessments module

- Catalog and status
- Draft and published versions
- Competencies and stable IDs
- Question editor/import
- Option and score validation
- Localization coverage
- Access and timing configuration
- Recommendation/report provider coverage
- Preview and golden test execution
- Publish, retire, and rollback workflow

Assessment publishing requires separate edit and publish permissions.

## Companies and organizations

- Organization profile and status
- Contracts/packages and entitlements
- Credits and ledger
- Members, managers, teams, and cohorts
- Participant invitations
- Assessment allocation
- Manager visibility and consent rules
- Aggregate reports and exports
- Token/session rotation and revocation
- Full organization audit timeline

The current offline-company screen should eventually become one controlled activation workflow inside this module.

## Participants

- Permission-aware search by identity or attempt reference
- Current profile and verified contact information
- Attempt history and statuses
- Entitlements and invitations
- Consent and report-sharing state
- Support actions with reason and audit
- Data export, retention, and deletion workflows

PII visibility must be a separate permission from general attempt visibility.

## Reports

- Authorized report preview
- Output/version provenance
- Web/PDF/DOCX/email generation status
- Delivery history and failures
- Assessment report metadata coverage
- Controlled regeneration
- Manager and executive report access
- Report-access audit trail

The module consumes `ReportService`; it does not reproduce calculations.

## Tokens and entitlements

- Token type, scope, owner, fingerprint, status, expiry, and remaining uses
- Entitlement source: purchase, company contract, complimentary, developer, manual grant
- Issue, rotate, revoke, and expire actions
- Usage and attempt linkage
- Suspicious usage diagnostics

Full token values should be shown only once at creation where required and never stored in audit logs.

## Credits and commerce

- Organization balances
- Immutable credit ledger
- Allocations and consumption
- Orders and invoices
- Stripe/New Zenler/offline payment events when implemented
- Refunds and corrections
- Reconciliation and unmatched events
- Idempotency/replay diagnostics

Finance actions require distinct permissions and audit detail.

## Diagnostics

- Assessment definition validation
- Missing/duplicate competency metadata
- Question/option/score alignment
- Translation completeness
- Broken report provider coverage
- Attempt anomalies and stuck states
- Credit ledger reconciliation
- Token/entitlement inconsistencies
- Provider health and delivery failures

Diagnostics should distinguish detection from repair. Automated repair must be separately authorized and reversible.

## Developer tools

- Developer Test Mode
- Assessment lifecycle simulator
- Report preview fixtures
- Feature-flag inspection
- Environment-safe configuration diagnostics
- Request/correlation lookup
- Background job inspection when jobs exist

Developer tools must never create invisible production bypasses.

## Settings

- Platform identity and branding
- Localization defaults
- Notification templates and approved sender settings
- Retention/privacy configuration
- Feature flags
- Organization defaults
- Integration status and non-secret metadata

Secrets remain in approved secret management and are never returned to the browser.

## Permissions

Recommended capabilities include:

- `control_center.access`
- `assessment.read`, `assessment.edit`, `assessment.publish`
- `participant.read`, `participant.pii.read`, `participant.support`
- `organization.read`, `organization.manage`
- `attempt.read`, `attempt.support`
- `report.view`, `report.generate`, `report.export`
- `entitlement.read`, `entitlement.grant`, `entitlement.revoke`
- `credit.read`, `credit.adjust`
- `commerce.read`, `commerce.refund`
- `developer_test.create`
- `diagnostics.read`, `diagnostics.repair`
- `audit.read`
- `settings.manage`
- `administrator.manage`

## Future CRM

A future CRM capability may manage prospects, customers, contracts, contacts, renewals, and partner relationships. It should remain separate from participant assessment evidence. CRM users must not automatically gain report or PII access.

## Future AI

- Natural-language operational search with permission-aware retrieval
- Diagnostic explanations and suggested remediation
- Assessment content-quality assistance
- Translation review assistance
- Support-response drafting

AI actions remain reviewable, scoped, auditable, and unable to bypass deterministic services.

## Future Executive Intelligence

- Cohort and organizational capability trends
- Cross-assessment executive summaries
- Strength/risk concentration and development progress
- Benchmarking with privacy thresholds
- Contract and utilization intelligence
- Evidence-linked AI narrative

Executive intelligence must show assessment version, population, completion rate, and data limitations.

## Delivery sequence

1. Security/schema baseline
2. Central services and access policies
3. Named administrator identity, RBAC, MFA, audit
4. Read-only Control Center
5. Controlled organization/entitlement mutations
6. Assessment drafting and versioned publishing
7. Commerce adapters
8. Enterprise and intelligence capabilities

