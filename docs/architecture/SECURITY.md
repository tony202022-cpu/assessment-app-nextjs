# Career Labs AI — Security Architecture

## Security philosophy

Career Labs AI handles identity, assessment evidence, professional diagnoses, company data, paid entitlements, and confidential reports. Security must be server-enforced, deny-by-default, least-privileged, auditable, and consistent across every output surface.

The binding standards are in [PLATFORM_RULES.md](./PLATFORM_RULES.md).

## Authentication

### Participants

Supabase Auth currently supports:

- Email/password registration and login
- OAuth in the legacy/parallel start flow
- Auth code exchange callback

The browser maintains the Supabase session. Server endpoints that require participant identity should validate the Supabase access token or server session rather than trust client identifiers.

### Developer test identities

Developer Test Mode creates generated Supabase users and one-time magic-link launches. Attempts are explicitly marked as developer tests and bound to the generated user.

### Administrators

Current private administration uses one environment secret exchanged for an HMAC-signed, HTTP-only cookie. This is a temporary operational safeguard, not an enterprise identity system.

### Managers

Current company manager access uses a long bearer token in the dashboard URL. There is no named manager account or role model.

## Authorization models

### Participant attempts

Authorization must establish both:

- The attempt is valid for the requested assessment.
- The current actor may access that attempt.

An attempt being paid, company-backed, or developer-marked is a property of the attempt—not proof that an arbitrary requester may view it.

### Paid assessments

Current code recognizes attempts backed by:

- `access_token_id`
- `company_id`
- A valid developer-test identity

These checks protect assessment flow eligibility but must be combined with requester ownership/report permission.

### Offline companies

Offline Outdoor Sales MRI attempts redirect participants to a completion page rather than participant results. Report access requires a manager token belonging to the same company as the attempt.

### Complimentary access

There is no general complimentary-entitlement service. Developer Test Mode is explicit complimentary testing. SME Business Health MRI contains a temporary direct-access exception in the current login logic. Future complimentary access must be modeled as an entitlement with actor, scope, issuer, reason, expiry, and audit record.

## Token security

### Company assessment token

Stored in `access_tokens` and used with authenticated participant identity to start company-funded attempts. The server-side RPC validates token, assessment, company, duplicate attempt, expiry, and credits.

### Manager token

Stored on `companies` and transported in URLs. Risks include browser history, referrers, copied links, logs, and raw database exposure.

### Developer launch token

The strongest current pattern:

- Cryptographically random
- Hashed in storage
- Time-limited
- One-time consumption
- Exchanged into authenticated flow and signed HTTP-only access cookie

Future token architecture should generalize this pattern.

## Manager dashboard security

Current safeguards:

- Server-side company lookup by manager token
- Company-scoped attempt query
- Offline report verification against the same company

Required future improvements:

- Named manager identities
- MFA or SSO
- Organization membership and roles
- Token exchange into short-lived session
- Token rotation/revocation
- Configurable participant consent and manager visibility
- Audit events for report access and export

## Developer tools

Developer Test Mode includes:

- Administrator session requirement
- Supported active-assessment allowlist
- Generated identity
- One attempt per launch record
- Hashed one-time launch token
- Expiration and used timestamp
- User/assessment-bound signed cookie
- Process-local rate limiting

The in-memory limiter is not distributed across Vercel instances and must not be treated as a strong production abuse control.

## Administrative permissions

The future Control Center requires capability-based RBAC. Recommended roles include:

- Super Administrator
- Platform Administrator
- Assessment Editor
- Assessment Publisher
- Support Operator
- Finance Operator
- Developer/Diagnostics Operator
- Auditor
- Organization Administrator
- Organization Manager
- Report Viewer

Permissions should represent actions such as `assessment.publish`, `attempt.read`, `participant.pii.read`, `entitlement.grant`, `report.view`, and `audit.read`.

## Current high-priority risks

1. Several service-role report/PDF paths load attempts by ID without a consistent requester-ownership policy.
2. Premium report and PDF paths do not share one centralized report authorization check.
3. `/api/report-data` uses privileged access and accepts an attempt ID without visible authentication; it also references a possibly legacy table.
4. `/api/send-report` accepts arbitrary destination and report URL without visible report authorization or distributed rate limiting.
5. Manager and access bearer tokens appear stored raw.
6. Administrator access relies on a shared secret rather than named identities.
7. The complete RLS policy set is not present in the repository documentation.
8. Auth callback `next` handling requires strict local-path validation.

## Required controls

- Central `ReportAccessPolicy`
- Central attempt and organization policies
- Explicit actor/resource/action/purpose evaluation
- Hashed, scoped, expiring, revocable credentials
- Named administrator and manager identities
- MFA/step-up authentication for high-impact operations
- Distributed rate limiting for abuse-sensitive endpoints
- Immutable audit log
- Narrow queries and response contracts
- Secure error handling without database/provider detail leakage
- Automated negative authorization tests

## Security review checklist

For every feature ask:

1. Who is the actor?
2. What exact action is requested?
3. What resource and organization does it affect?
4. What proves authorization?
5. Is the decision server-side?
6. Does privileged database access occur only after authorization?
7. Could identifiers or URLs become bearer credentials?
8. What is logged and audited?
9. What happens on replay, concurrency, expiry, and revocation?
10. Are negative cases tested?

