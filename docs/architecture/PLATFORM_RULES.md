# Career Labs AI Platform Rules

## Engineering Constitution

**Status:** Authoritative engineering standard  
**Scope:** All Career Labs AI applications, services, assessments, reports, integrations, data stores, administration tools, and deployment workflows

This document defines the non-negotiable engineering rules for Career Labs AI. It applies to new development, maintenance, incident fixes, refactoring, integrations, and platform expansion. Where an implementation conflicts with these rules, the implementation must be corrected through an approved, tested migration plan; the rules must not be weakened to legitimize avoidable technical debt.

---

## 1. Architecture Principles

### 1.1 One source of truth

- Every business fact must have one authoritative owner.
- Assessment definitions, scoring rules, competency metadata, authorization decisions, entitlements, credit balances, and report calculations must not have competing implementations.
- Derived data may be stored for performance or historical reproducibility only when its source, derivation, version, and synchronization policy are explicit.
- Published assessment versions and completed-attempt snapshots must remain reproducible.

### 1.2 Service-oriented architecture

- Business capabilities must be organized behind clearly defined services.
- A service owns its rules, validation, authorization requirements, and data-access boundaries.
- Services must expose typed contracts and must not depend on presentation details.
- Service-oriented does not require microservices. Prefer a well-structured modular monolith until operational evidence justifies distribution.

### 1.3 Separation of concerns

- Presentation, application orchestration, domain rules, authorization, persistence, and external integrations must remain distinct.
- Route handlers and server actions translate requests into service calls; they do not become alternate business-logic implementations.
- Database access belongs in repositories or service infrastructure, not in presentation components.
- Report rendering must be separate from report calculation.

### 1.4 Configuration over duplication

- New assessments should be introduced through versioned configuration and registered providers, not copied pages or branching throughout shared code.
- Shared lifecycle behavior must remain assessment-agnostic wherever the business rules are genuinely shared.
- Assessment-specific behavior must be declared in one assessment definition or provider and selected through a registry.
- Configuration must be typed, validated, versioned, and publishable through controlled processes.

### 1.5 Explicit boundaries

- Every module must have a clear responsibility and public contract.
- Cross-module access must occur through supported interfaces, not direct access to another module's internal tables or implementation details.
- Circular dependencies and hidden global state are prohibited.
- External providers must be isolated behind adapters so provider changes do not alter assessment logic.

### 1.6 Evolution without historical drift

- Completed attempts must retain the assessment, scoring, competency, and report versions used at completion.
- Updating current content must not silently change historical results.
- Compatibility aliases must be deliberate, documented, tested, and removable only through an approved data migration.

---

## 2. Business Rules

### 2.1 Non-duplication rules

- Never duplicate assessment lifecycle logic.
- Never duplicate scoring calculations.
- Never duplicate tier thresholds or competency percentage calculations.
- Never duplicate report calculations across web, print, PDF, email, or manager views.
- Never duplicate competency normalization or canonical ID mappings.
- Never maintain separate authorization rules for equivalent access paths.
- Never copy an existing assessment implementation to create a new assessment.

### 2.2 Assessment rules

- Every assessment must have a canonical ID, public slug, version, status, supported languages, competency definition, question policy, scoring policy, report provider, and access policy.
- Published assessment versions are immutable. Corrections require a new version unless an approved emergency data-repair procedure applies.
- Question content, option order, option scores, competency assignments, and translations must pass validation before publication.
- Assessment-specific rules must not be hardcoded throughout shared lifecycle pages.
- Temporary exceptions must have an owner, reason, expiry condition, feature flag where practical, and removal plan.

### 2.3 Scoring rules

- The server is always authoritative for scoring.
- Clients may submit answer identifiers, never authoritative scores or competency assignments.
- Scoring must use the exact published assessment version attached to the attempt.
- Malformed answers, duplicate questions, unexpected questions, and invalid options must fail safely.
- Unanswered-answer behavior must be explicit and covered by regression tests.
- Changes to scoring models or thresholds require business approval, versioning, golden-result tests, and historical-impact analysis.

### 2.4 Report rules

- All report surfaces must consume one canonical report model for a completed attempt.
- Report labels, tiers, overall results, competency results, recommendations, and implementation plans must not be recalculated independently by renderers.
- Web, PDF, print, email, participant, and manager outputs must agree on all business facts.
- Report content may vary by language, audience, and assessment only through registered report providers.
- A report renderer must not fetch or infer additional business data outside the report service contract.

### 2.5 Authorization rules

- Never bypass authorization for convenience, testing, previews, support, reporting, or administration.
- An object's existence or possession of its identifier is not authorization.
- A paid or token-backed attempt is not automatically authorized for every requester.
- Every sensitive operation must evaluate the actor, action, resource, scope, and purpose.
- Developer and complimentary access must use explicit entitlement types, never hidden production bypasses.

---

## 3. Security Standards

### 3.1 Server-side authorization

- Authorization decisions must occur on trusted server infrastructure.
- Client-side guards may improve user experience but never replace server enforcement.
- Every server action, route handler, server-rendered page, report, export, and administrative operation must enforce authorization independently.
- Service-role database credentials must never be used without an explicit authorization decision before sensitive data is returned.

### 3.2 Centralized access policies

- Participant, attempt, report, organization, administration, and developer access must use centralized policy services.
- Report authorization must be identical across web, PDF, print, email, download, sample, and manager surfaces.
- Authorization policies must be deny-by-default and covered by an actor/resource permission matrix.

### 3.3 Token security

- Token creation, validation, scope, expiration, rotation, revocation, and consumption belong in `TokenService` or `EntitlementService`.
- Tokens must be generated using cryptographically secure randomness.
- Long-lived bearer tokens must be hashed at rest wherever practical.
- Tokens must be purpose-specific and minimally scoped.
- Sensitive tokens must not be logged.
- Query-string tokens should be exchanged for short-lived, HTTP-only sessions as early as possible.
- Token comparisons must resist timing attacks where secrets are compared in application code.

### 3.4 Administrative security

- Administrative actions require named identities, strong authentication, and role-based authorization.
- High-impact actions should require MFA or step-up authentication.
- Shared administrator secrets are temporary bootstrap mechanisms, not a permanent identity model.
- Every administrative mutation must be auditable.
- Audit events must identify actor, action, target, time, outcome, and relevant request context without storing full secrets.

### 3.5 Least privilege

- Use the least-privileged database role and API credential that can complete the operation.
- Browser clients use public credentials and RLS-protected access only.
- Service-role access is limited to trusted server modules with explicit authorization and narrow queries.
- External integration keys must be scoped, rotated, and stored only in approved secret management.

### 3.6 Data protection

- Personally identifiable information must be collected, returned, logged, and retained only when required.
- API responses and database queries must select only necessary fields.
- Sensitive exports require authorization, audit logging, and an explicit retention policy.
- Production data must not be copied into tests or developer fixtures.
- User-facing errors must not expose secrets, SQL details, provider internals, or security controls.

---

## 4. Service Responsibilities

Business logic belongs in services. UI components, route handlers, and database functions may enforce or support rules, but must not become competing sources of truth.

### AssessmentService

- Assessment catalog and version lifecycle
- Competencies, questions, languages, timing, and publication validation
- Draft, publish, retire, and rollback coordination
- Resolution of the exact version used by an attempt

### ParticipantService

- Participant identity and profile orchestration
- Consent, preferences, attempt history, data export, and deletion workflows
- Clear separation between current profile data and immutable attempt-time identity

### CompanyService

- Organizations, memberships, teams, cohorts, and manager permissions
- Corporate settings and participant visibility boundaries
- Company-level reporting access

### AttemptService

- Attempt creation, resume, ownership, state transitions, submission, and completion
- Idempotency and duplicate-attempt policy
- Immutable links to assessment and scoring versions

### ScoringService

- Server-side answer validation and scoring
- Competency aggregation and overall results
- Tier calculation and scoring-version compatibility
- Deterministic, side-effect-free calculation wherever possible

### ReportService

- Report authorization
- Canonical report-model construction
- Competency labels, interpretation, recommendations, and plans
- Stable inputs for web, print, PDF, email, participant, and manager renderers

### TokenService

- Token issuance, hashing, validation, exchange, expiration, rotation, and revocation
- Token type, scope, owner, entitlement, and consumption policy

### CreditService

- Credit balance and immutable ledger
- Atomic allocation and consumption
- Reconciliation, corrections, and idempotency
- No balance mutation without a corresponding ledger event

### EntitlementService

- Individual, team, corporate, complimentary, developer, and purchased access grants
- Provider-independent access decisions
- Expiration, remaining uses, and revocation

### AuditService

- Immutable security and administrative event recording
- Actor, action, resource, outcome, correlation, and time
- Audit querying and retention controls

### DiagnosticsService

- Assessment configuration validation
- Translation and competency coverage checks
- Question/option/score integrity checks
- Attempt, entitlement, credit, and report anomaly detection

### NotificationService

- Email and future notification delivery
- Approved templates and validated destinations
- Rate limits, delivery history, retries, and provider adapters
- Notification authorization and audit context

### SettingsService

- Typed platform, organization, assessment, branding, and integration settings
- Environment-aware resolution and safe defaults
- Secret values remain outside ordinary settings records

### CommerceService

- Orders, payments, refunds, webhooks, reconciliation, and provider adapters
- Converts Stripe, New Zenler, and offline payments into provider-neutral entitlements
- Payment providers never directly control assessment logic

---

## 5. UI Rules

- UI components must not contain domain or business rules.
- UI components consume typed view models, commands, and service results.
- No SQL, direct database policy, credit mutation, scoring, entitlement decision, or report calculation belongs in UI code.
- Client-side validation improves usability but must be repeated authoritatively on the server.
- Route-specific UI must not duplicate shared assessment flow behavior.
- Assessment-specific presentation should be selected from registered components or configuration, not long chains of slug checks.
- Components must be accessible, responsive, and support both English and Arabic where applicable.
- Directionality, labels, dates, and number formatting must use centralized localization utilities.
- Loading, empty, failure, unauthorized, and retry states must be intentionally designed.
- Sensitive data must not be placed in browser state, HTML, logs, or URLs unless explicitly required and secured.

---

## 6. Database Rules

### 6.1 Schema ownership

- Every table and column must have a documented purpose and owning service.
- Foreign keys, uniqueness constraints, checks, RLS policies, and important indexes must be defined in reviewed migrations.
- Production schema changes must never exist only in a dashboard or SQL editor history.
- Generated database types must be refreshed when schema changes are applied.

### 6.2 Data duplication

- Avoid duplicated authoritative data.
- Historical snapshots are allowed when explicitly identified as immutable snapshots.
- Cached or derived fields must document their source and invalidation/reconciliation policy.
- Multiple columns representing the same state are prohibited unless a migration compatibility period is documented.

### 6.3 Integrity and transactions

- Use database constraints for invariants the database can enforce.
- Multi-record financial, credit, entitlement, token-consumption, and attempt-creation operations must be transactional.
- Concurrency-sensitive operations must use row locks, unique constraints, advisory locks, or another documented serialization strategy.
- Idempotency is required for webhook processing, credit consumption, attempt creation, and retryable mutations.

### 6.4 Indexes and queries

- Every non-trivial index must document the query or constraint it supports.
- Index changes require query-plan evidence for significant tables.
- Avoid `select *` in production application paths unless the entire record is genuinely required and reviewed.
- Large lists require pagination and deterministic ordering.
- Query performance must be measured before introducing caches or denormalization.

### 6.5 Migrations

- Migrations are immutable after production application.
- Every migration requires forward verification and a rollback or compensating strategy.
- Destructive migrations require backups, impact analysis, staged rollout, and explicit approval.
- Application deployments must remain compatible throughout multi-step migrations.

---

## 7. API and Server Action Rules

### 7.1 Contracts

- APIs and server actions must have typed request and response contracts.
- Runtime validation is required at every untrusted boundary.
- Validation schemas and error codes should be shared where appropriate.
- Internal database rows must not be returned as public API contracts.

### 7.2 Response format

Unless a protocol or file response requires otherwise, APIs should use a consistent envelope:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

Failure responses should use:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "fields": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

### 7.3 Endpoint behavior

- Authentication, authorization, validation, and rate limiting occur before sensitive work.
- Mutation endpoints must validate origin/CSRF protections appropriate to their authentication mechanism.
- Retryable mutations require idempotency keys or transactional natural idempotency.
- Provider webhooks require signature verification, replay protection, and event deduplication.
- APIs must not expose raw database or provider error messages.
- Deprecation and versioning must be explicit for externally consumed APIs.

---

## 8. Error Handling and Observability

### 8.1 Error model

- Use a consistent hierarchy of domain, validation, authentication, authorization, conflict, not-found, dependency, and internal errors.
- Stable machine-readable error codes must be separate from localized user messages.
- Expected business failures must not be reported as generic internal failures.
- No silent failure is allowed when correctness, security, credits, payments, attempts, reports, or notifications may be affected.

### 8.2 User experience

- Users receive concise, actionable, localized messages.
- Sensitive implementation details remain server-side.
- Retry guidance must distinguish safe retries from operations that require support.

### 8.3 Developer logging

- Server failures must include a request or correlation ID.
- Logs must include enough context to diagnose the operation without exposing passwords, tokens, session cookies, full payment data, or unnecessary PII.
- Security-relevant and administrative events go to the audit system, not only general logs.
- Structured logging is preferred over unsearchable free-form messages.
- Critical background operations require success, retry, exhaustion, and reconciliation visibility.

---

## 9. Testing Standards

Every feature, defect fix, refactor, migration, or integration must include verification proportional to its risk.

### 9.1 Required verification

- Successful production build
- TypeScript verification with no errors
- Relevant automated unit, integration, contract, and regression tests
- Manual testing checklist
- Regression checklist covering affected assessments and access paths
- Rollback or compensating strategy

### 9.2 Business-critical tests

- Scoring uses golden fixtures for every published scoring model.
- Every assessment has lifecycle tests from start through report.
- Authorization uses actor/resource permission matrices and negative tests.
- Report outputs verify consistent facts across web, print, PDF, email, and manager views.
- Credit and entitlement tests cover concurrency, retries, and duplicate requests.
- Payment webhooks cover signature failure, replay, reordering, duplicates, and refunds.
- Localization tests verify completeness, directionality, and fallback behavior.

### 9.3 Regression discipline

- A defect fix must include a test that fails before the fix and passes afterward whenever practical.
- Shared-service changes must be verified against every consumer.
- Assessment-specific changes must prove that unrelated assessments are unchanged.
- Snapshot tests may protect presentation and content but must not replace behavioral assertions.
- Tests that inspect source text are supplementary; critical behavior requires executable tests.

### 9.4 Manual checklist requirements

The checklist must identify:

- Environment and test identity
- Preconditions and data setup
- Exact user path
- Expected result
- Authorization and negative cases
- English and Arabic behavior where applicable
- Mobile and desktop behavior where applicable
- Cleanup requirements

---

## 10. Deployment and Release Rules

Never deploy without:

- A successful clean build
- No TypeScript errors
- Passing relevant automated tests
- Completed manual verification
- Reviewed database compatibility
- Confirmed environment configuration
- Defined monitoring and rollback strategy
- Explicit approval appropriate to the release risk

Additional rules:

- Production deployments must be reproducible from version-controlled source.
- Never deploy uncommitted or unidentified local changes.
- Feature flags should isolate high-risk capabilities and staged rollouts.
- Database migrations and application releases must be ordered for backward compatibility.
- Rollback must be rehearsed for high-risk security, scoring, payment, entitlement, and reporting changes.
- Post-deployment verification must cover health, authentication, assessment start, submission, report access, and affected integrations.
- Incidents must produce a written review and tracked corrective actions without blame.

---

## 11. Code Review and Change Management

- Changes must be narrowly scoped and explain their business impact.
- Unrelated refactoring must not be hidden inside a feature or defect fix.
- Security, scoring, reporting, authorization, payment, credit, and migration changes require specialist review.
- Reviewers must evaluate behavior, failure modes, access control, data impact, compatibility, tests, observability, and rollback—not formatting alone.
- Existing behavior must be characterized before high-risk refactoring.
- Temporary code must include an owner and removal condition.
- Dead paths, backups, and legacy implementations must be inventoried and removed through reviewed changes, not left indefinitely.

---

## 12. Future Scalability

- The platform must support an open-ended number of assessments without duplicating lifecycle, authorization, scoring, or report infrastructure.
- Adding an assessment should primarily involve a versioned definition, validated content, and registered assessment-specific providers.
- Published attempts must remain reproducible after assessment evolution.
- Organization, entitlement, commerce, and report systems must be assessment-independent.
- Lists and analytics must support pagination, filtering, and stable identifiers from the beginning.
- Background jobs, caching, distributed rate limiting, and external search should be introduced only when measured scale or reliability requirements justify them.
- Prefer clear modular boundaries over premature microservices.
- Platform observability, auditability, privacy, and operational tooling must grow with feature volume.

Target assessments—including Sales, Sales Management, SME Health, Legal, Leadership, Customer Service, Negotiation, Recruitment, and Emotional Intelligence—must coexist through shared contracts rather than shared files filled with assessment-specific branches.

---

## 13. Exceptions to These Rules

- Exceptions require a written decision record.
- The record must state the rule, business reason, owner, scope, security and data impact, tests, expiry or review date, and removal plan.
- Emergency exceptions must be reviewed after the incident and either removed or formally approved.
- “Faster,” “temporary,” or “already working” is not sufficient justification by itself.

---

## Engineering Philosophy

Career Labs AI should evolve through disciplined consolidation, not repeated reinvention. Over the next five years, the platform must preserve the trustworthiness of every score, the privacy of every participant, the reproducibility of every completed report, and the accountability of every administrative action.

The platform should remain simple in deployment but rigorous in boundaries: one source of truth, explicit services, server-enforced authorization, versioned assessments, provider-neutral entitlements, canonical reports, and observable operations. New assessments and commercial models should extend stable contracts instead of multiplying special cases.

Engineering success is not measured only by how quickly a feature appears. It is measured by whether the feature remains secure, understandable, testable, reversible, and reusable as Career Labs AI grows.
