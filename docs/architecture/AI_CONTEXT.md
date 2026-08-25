# Career Labs AI — AI Context

> **Read this first.** This file orients AI assistants and new engineers before any repository work. The authoritative engineering constitution is [PLATFORM_RULES.md](./PLATFORM_RULES.md).

## Project overview

Career Labs AI is a bilingual assessment platform for professional, commercial, managerial, legal, and business capabilities. It delivers timed assessments, server-calculated competency results, participant reports, corporate access, manager dashboards, developer testing, and action-oriented development plans.

This is a production repository. Changes can affect live scoring, paid access, corporate credits, confidential reports, and historical assessment results.

## Business purpose

The platform converts structured participant responses into:

- Competency percentages and overall performance indicators
- Strength, opportunity, threat, and weakness classifications
- Assessment-specific diagnoses and recommendations
- Practical treatment plans and longer implementation roadmaps
- Corporate and manager visibility where access has been authorized

Accuracy, privacy, reproducibility, and clear bilingual communication are core product requirements.

## Current production status

The application is a Next.js modular monolith deployed for Vercel and backed by Supabase. It supports participant authentication, token-backed company credits, offline company activation, developer test attempts, web reports, printable/PDF surfaces, and report email delivery.

The repository may contain uncommitted production work. Always inspect `git status` and the relevant diff before acting. Never overwrite or revert changes that are not part of the current request.

## Active assessment families

The application currently contains explicit production support for:

- Outdoor Sales Scan
- Outdoor Sales MRI
- Sales Manager MRI
- SME Business Health MRI
- Lawyer Client Conversion MRI

The database is the authority for active status. Code references alone do not prove an assessment is currently published.

## Technology stack

- Next.js 14 App Router
- React 18 and TypeScript
- Supabase Auth and Postgres
- Vercel server functions
- Tailwind CSS and shadcn/Radix UI
- Nodemailer for email
- pdfmake plus browser-rendered print/PDF surfaces
- English and Arabic localization, including RTL presentation

## Existing architecture

- Dynamic assessment lifecycle under `app/(site)/[slug]/`
- Shared interactive quiz under `app/(site)/quiz/`
- Server submission and scoring in `src/lib/actions.ts`
- Assessment/report content in `src/lib/` and the main report page
- Company manager dashboard under `app/company/`
- Operational admin tools under `app/admin/`
- Server routes under `app/api/`
- Recent schema changes under `supabase/migrations/`

See [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), and [SERVICES.md](./SERVICES.md).

## Coding philosophy

1. Preserve business behavior before improving structure.
2. Keep one source of truth for scoring, authorization, reports, and assessment configuration.
3. Put business logic behind typed service boundaries.
4. Prefer configuration and registered providers over assessment-specific duplication.
5. Make security decisions on the server.
6. Version published assessment behavior so historical results remain reproducible.
7. Add tests before high-risk refactoring.

## Platform rules summary

Before implementation, read [PLATFORM_RULES.md](./PLATFORM_RULES.md). In particular:

- Never duplicate scoring or report calculations.
- Never bypass authorization.
- Never place business logic or SQL in UI components.
- Never expose service-role capabilities without an explicit access decision.
- Never change a published scoring model without versioning and golden tests.
- Never deploy without build, type, regression, manual, and rollback verification.

## Current priorities

Based on the current architecture review, the recommended order is:

1. Establish a complete production schema and RLS baseline.
2. Centralize report and attempt authorization.
3. Secure all PDF, print, report-data, and email-report paths.
4. Introduce typed domain/service boundaries without changing behavior.
5. Create a canonical, versioned assessment registry.
6. Create one canonical report model.
7. Replace shared administrator secrets and manager URL tokens with named identities and scoped sessions.
8. Build the Control Center on those foundations.

## Long-term roadmap

- Versioned assessment publishing
- Centralized scoring and report services
- Provider-neutral entitlements and commerce
- Named administrators and organization managers with RBAC/MFA
- Immutable audit logs and diagnostics
- Control Center for assessments, companies, participants, reports, credits, and operations
- Enterprise cohorts, teams, invitations, analytics, and executive intelligence
- Carefully governed AI-assisted insights that never replace deterministic scoring

## Files and areas not to modify lightly

- `src/lib/actions.ts` — attempt submission and scoring
- `src/lib/paid-mri-access.ts` — paid/developer attempt authorization
- `src/lib/offline-attempt-access.ts` — offline report privacy
- `src/lib/offline-company.ts` — administrator session and offline activation rules
- `app/(site)/quiz/page.tsx` — timer, question shuffle, answer shuffle, submission flow
- `app/(site)/[slug]/report/page.tsx` — shared and assessment-specific report behavior
- `src/lib/pdf-recommendations.ts` — competency mappings and recommendations
- `src/lib/sales-manager-90day.ts` and `src/lib/sme-business-revival-90day.ts`
- `supabase/migrations/` and credit-related RPCs
- Competency IDs, aliases, thresholds, and published question content
- Paid/token-backed, offline corporate, manager, and developer-test flows

Changes in these areas require narrow scope, explicit compatibility analysis, and focused regression coverage.

## Existing technical debt

- Main report page exceeds 5,500 lines.
- Results and PDF/report modules independently repeat labels, tiers, normalization, and calculations.
- Authorization differs between report surfaces.
- Assessment behavior is split across database configuration and hard-coded TypeScript branches.
- Service-role Supabase clients and direct queries are repeated.
- The migration directory is not a complete baseline schema.
- Legacy and parallel report/PDF paths remain.
- `attempts` and `quiz_attempts` references coexist.
- Test coverage is focused but not a full end-to-end safety net.
- Stripe and New Zenler are not implemented in this repository.

## Future direction

Career Labs AI should remain a modular monolith until measured needs justify distributed services. The next architecture should make adding an assessment primarily a versioned content/configuration operation. All renderers should consume one authorized report model, and all commercial access should resolve through one entitlement system.

## Working protocol for AI assistants

1. Read this file and [PLATFORM_RULES.md](./PLATFORM_RULES.md).
2. Inspect current repository status and local instructions.
3. Identify the exact business flows affected.
4. Make the smallest authorized change.
5. Preserve unrelated work.
6. Verify negative authorization cases as well as successful behavior.
7. Report files, behavior, risk, tests, rollback, deployment status, and limitations using [CHANGELOG_GUIDE.md](./CHANGELOG_GUIDE.md).

