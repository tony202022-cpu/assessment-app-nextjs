# Career Labs AI — Service Architecture

## Purpose

Career Labs AI should use service-oriented boundaries inside the existing modular monolith. This document records current reusable capabilities and specifies future services. It does not claim that proposed services are implemented.

All service design must follow [PLATFORM_RULES.md](./PLATFORM_RULES.md).

## Current reusable capabilities

### Assessment and submission actions

**Location:** `src/lib/actions.ts`

Current responsibilities:

- Assessment lookup
- Attempt existence and state checks
- Paid/developer submission authorization
- Question and option validation
- Server-side scoring
- Competency aggregation and persistence

This is a server-action module, not yet a clean Assessment/Attempt/Scoring service boundary.

### Paid access helpers

**Location:** `src/lib/paid-mri-access.ts`

- Maps paid slugs to assessment IDs
- Classifies paid assessments
- Recognizes company, token, and developer-test backing
- Checks assessment match

### Developer test access helpers

**Location:** `src/lib/admin-assessment-access.ts`

- Validates supported assessments/languages
- Generates test identities and launch tokens
- Hashes launch tokens
- Creates and verifies signed developer-access cookies
- Validates application base URL

### Offline company capability

**Locations:** `src/lib/offline-company.ts`, `src/lib/offline-attempt-access.ts`, `src/lib/offline-company-rate-limit.ts`

- Administrator secret session
- Offline activation validation
- Supabase admin-client creation
- Offline attempt classification
- Same-company manager authorization
- Process-local rate limiting

### Report content capabilities

**Locations:** `src/lib/pdf-recommendations.ts`, `src/lib/reportSections.ts`, `src/lib/sales-manager-90day.ts`, `src/lib/sme-business-revival-90day.ts`

- Competency normalization
- Tier classification
- Recommendations
- Report sections
- Assessment-specific long-term development plans

Report calculation remains distributed across multiple pages and files.

## Target service model

```text
UI / Route Handlers / Server Actions
                 │
        Application Services
                 │
   ┌─────────────┼──────────────┐
   │             │              │
Domain       Authorization   Integration
Services       Policies       Adapters
   │             │              │
Repositories ────┴──────── External Providers
   │
Postgres / Supabase Auth
```

## Proposed services

### AssessmentService

**Owns:** Assessment catalog, versions, competencies, questions, localization, publication.

**Depends on:** Assessment repository, diagnostics, audit.

**Must not own:** Participant identity, credits, rendering, payment-provider behavior.

### AttemptService

**Owns:** Start/resume, ownership, status, submission orchestration, completion, idempotency.

**Depends on:** AssessmentService, EntitlementService, ScoringService, attempt repository, audit.

**Boundary:** It coordinates scoring but does not define scoring mathematics.

### ScoringService

**Owns:** Validating submitted answer identifiers against the attached assessment version and calculating deterministic results.

**Depends on:** Published assessment definition.

**Boundary:** Pure calculation should remain independent of UI, database clients, reports, and payments.

### ParticipantService

**Owns:** Participant profile, consent, preferences, history, export/deletion orchestration.

**Depends on:** Identity provider, profile and attempt repositories, audit.

### CompanyService

**Owns:** Organizations, members, teams, cohorts, settings, manager visibility.

**Depends on:** Organization repository, identity, authorization, audit.

### EntitlementService

**Owns:** Whether an actor may start a particular assessment and under which grant.

**Depends on:** TokenService, CreditService, CommerceService records, company contracts.

**Boundary:** Paid access checks resolve here; assessment pages do not inspect provider-specific payment state.

### TokenService

**Owns:** Credential issuance, hashing, validation, exchange, expiration, revocation, rotation, and consumption.

**Depends on:** Secure randomness, token repository, audit.

### CreditService

**Owns:** Credit allocation, consumption, ledger, reconciliation, corrections, concurrency, idempotency.

**Depends on:** Credit repository/database transaction boundary, audit.

### ReportService

**Owns:** Report authorization and canonical report-view-model generation.

**Depends on:** AttemptService, AssessmentService, recommendation/plan providers, access policy.

**Boundary:** Renderers consume its model and never recalculate business facts.

### NotificationService

**Owns:** Authorized email/notification delivery, templates, destination validation, retries, provider status.

**Depends on:** ReportService, provider adapter, rate limiting, audit.

### AuditService

**Owns:** Immutable security and administration events.

**Boundary:** General logs do not substitute for audit records.

### DiagnosticsService

**Owns:** Assessment publication validation, translation coverage, score-array integrity, report-metadata coverage, and operational anomalies.

### SettingsService

**Owns:** Typed platform/organization settings and safe resolution rules.

**Boundary:** Secrets remain in approved secret management, not ordinary settings tables.

### CommerceService

**Owns:** Orders, payment-provider events, refunds, reconciliation, and entitlement issuance.

**Depends on:** Stripe/New Zenler/offline adapters when implemented, EntitlementService, AuditService.

### AuthorizationService or policy layer

**Owns:** Central policy evaluation for attempts, reports, companies, administration, exports, and diagnostics.

**Depends on:** Actor identity, resource context, organization membership, entitlement, purpose.

## Dependency rules

- UI may call application services, never repositories directly in the target architecture.
- Domain services must not import React, Next.js navigation, or presentation types.
- Repositories must not contain business policy.
- Services must not return Supabase row shapes as public contracts.
- External providers are accessed through adapters.
- Authorization runs before privileged data access or disclosure.
- Cross-service workflows use explicit application orchestration and transactions where required.

## Migration strategy

Do not rewrite the system into services at once. Use this order:

1. Add characterization tests around current behavior.
2. Define a typed contract.
3. Move one source of truth behind the contract.
4. Adapt existing callers without changing behavior.
5. Remove old implementations only after all callers and regressions are verified.

