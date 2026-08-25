# Career Labs AI — Implementation and Changelog Guide

## Purpose

Every future implementation must conclude with a consistent, evidence-based handoff. This guide is the official reporting template for developers, AI assistants, pull requests, and release notes.

Follow [PLATFORM_RULES.md](./PLATFORM_RULES.md) and do not claim tests, deployment, migration, or manual verification that did not occur.

## Required implementation report

### 1. Summary

State the user-visible or operational outcome first.

Include:

- What problem was addressed
- What outcome now exists
- Whether scope changed from the original request

### 2. Files changed

List every created, modified, moved, or removed file with a one-sentence purpose.

Separate:

- Application code
- Tests
- Database migrations
- Configuration/infrastructure
- Documentation

### 3. Behavior changes

Describe exact before/after behavior.

Explicitly identify effects on:

- Participants
- Managers/companies
- Administrators/developers
- Assessments and scoring
- Reports and exports
- Tokens, credits, entitlements, or payments
- English/Arabic behavior

If there is no user-visible change, say so.

### 4. Security and data impact

Report:

- Authentication/authorization changes
- New or changed data access
- PII exposure or retention effects
- Token/secret handling
- Audit/logging changes
- Migration or backfill impact

Use “none” only after explicit review.

### 5. Regression risk

Rate risk as low, medium, high, or critical and explain why.

List affected shared consumers and assessment flows. For shared scoring/report/access changes, enumerate every assessment and access mode verified.

### 6. Testing performed

Report exact commands and outcomes:

- TypeScript
- Build
- Lint
- Unit/integration/regression tests
- Manual checks
- Security negative cases
- Localization/accessibility checks

Distinguish passed, failed, skipped, and not available. Include relevant warnings separately from failures.

### 7. Manual testing checklist

Provide reproducible steps:

```text
Environment:
Identity/access type:
Preconditions:

1. Action
   Expected result
2. Action
   Expected result

Cleanup:
```

### 8. Rollback

Explain:

- Exact rollback mechanism
- Data compatibility
- Whether migration rollback is safe
- Whether generated external state must be reconciled
- Feature flag or prior version to restore

“Revert the commit” is insufficient when data or external providers are involved.

### 9. Deployment status

Use one explicit state:

- Not committed
- Committed, not pushed
- Pushed, not deployed
- Preview deployed
- Production deployed

Also report migration and external-provider status independently.

### 10. Known limitations

List intentionally deferred behavior, unsupported paths, environment limitations, missing test coverage, and follow-up work.

### 11. Not touched

List relevant issues discovered but deliberately left outside scope. Do not use this section to hide required incomplete work.

## Official template

```markdown
# Implementation Report — <title>

## Summary
<Outcome and scope>

## Files changed
- `<path>` — <purpose>

## Behavior changes
### Before
<previous behavior>

### After
<new behavior>

## Security and data impact
<authorization, PII, tokens, audit, schema>

## Regression risk
**Level:** Low | Medium | High | Critical

<Reason and affected flows>

## Testing performed
- TypeScript: Passed/Failed/Skipped — `<command>`
- Build: Passed/Failed/Skipped — `<command>`
- Automated tests: <details>
- Manual verification: <details>

## Manual testing checklist
1. <step and expected result>

## Rollback
<procedure and data considerations>

## Deployment status
- Commit: <status>
- Deployment: <status>
- Migrations: <status>
- External integrations: <status>

## Known limitations
- <limitation>

## Not touched
- <out-of-scope observation>
```

## Changelog entry conventions

For concise release history use these categories:

- Added
- Changed
- Fixed
- Security
- Deprecated
- Removed
- Database
- Operations
- Documentation

Each entry should state outcome, affected scope, and compatibility implications. Avoid internal implementation detail unless operators need it.

## Accuracy rules

- Never say “safe” without stating the verification basis.
- Never say “all tests pass” when only a subset ran.
- Never describe code review as security validation by itself.
- Never omit an applied migration, deployment, or external mutation.
- Never conceal compatibility concerns or an incomplete rollback.

