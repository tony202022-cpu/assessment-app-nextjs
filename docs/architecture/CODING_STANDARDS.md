# Career Labs AI — Coding Standards

## Authority

These standards supplement [PLATFORM_RULES.md](./PLATFORM_RULES.md). If they conflict, the platform rules prevail.

## Naming conventions

- Use descriptive English names.
- React components and exported types: `PascalCase`.
- Functions, variables, hooks, and properties: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only for genuine constants.
- Database tables/columns and stable competency IDs: `snake_case`.
- Route folders and public slugs: lowercase kebab-case.
- Boolean names begin with `is`, `has`, `can`, `should`, or another clear predicate.
- Avoid abbreviations unless universally understood in the domain.
- Compatibility aliases must state canonical direction.

## Folder conventions

- `app/` contains routing, boundary orchestration, and presentation.
- `src/components/ui/` contains generic UI primitives.
- Domain components belong with their module or in clearly named shared component folders.
- `src/lib/` is not a dumping ground; future domain capabilities belong under `src/modules/<domain>/`.
- Tests should live beside modules or in `tests/` with clear behavioral names.
- Documentation belongs under `docs/` and must be updated with architectural changes.

Target module structure:

```text
src/modules/<domain>/
  domain/
  application/
  infrastructure/
  ui/
  index.ts
```

## TypeScript standards

- Use strict, explicit domain types.
- Avoid `any`; use `unknown` at untrusted boundaries and narrow with runtime validation.
- Do not cast merely to suppress an error.
- Public functions and service contracts require typed inputs and outputs.
- Model success/failure states explicitly where useful.
- Use discriminated unions for lifecycle and result states.
- Keep database row types separate from domain and API types.
- Exhaustively handle enums/unions that represent business rules.
- Never encode security decisions only in TypeScript types; validate at runtime.

## React standards

- Prefer server components unless browser interaction is required.
- Keep client components small and presentation-focused.
- Business logic, SQL, scoring, authorization, and report calculation do not belong in React components.
- Effects must have deliberate dependencies and cleanup.
- Avoid duplicating server state in multiple client stores.
- Render loading, empty, error, unauthorized, and success states intentionally.
- Use stable keys based on domain identity, not array positions where order can change.
- Preserve question and answer randomization semantics when touching quiz UI.

## Server Action standards

- Server Actions are trusted boundaries, not trusted payloads.
- Validate and normalize every argument.
- Authenticate and authorize before privileged reads or writes.
- Delegate business logic to services.
- Return typed, safe results; never expose raw database errors.
- Mutations must be idempotent or explicitly reject replay.
- Use transactions for multi-record invariants.
- Log abnormal security/integrity events without secrets or unnecessary PII.

## Supabase standards

- Browser access uses anon credentials and reviewed RLS only.
- Service-role credentials remain server-only.
- Service-role use requires an explicit authorization decision.
- Centralize server-client construction.
- Select only required columns.
- Check and handle every Supabase error.
- Do not mix database rows directly into public contracts.
- Schema changes require reviewed migrations and regenerated types.
- Database functions with `security definer` must set a safe `search_path`, validate inputs, and restrict execution grants.
- Never log access tokens, manager tokens, session tokens, service keys, or passwords.

## Validation

- Validate request bodies, query parameters, environment settings, external events, and stored JSON at runtime.
- Prefer a shared schema library when introduced.
- Validate both shape and business context.
- Browser validation is for usability; server validation is authoritative.

## Error handling

- Use stable internal error codes and safe localized messages.
- Expected validation, conflict, authorization, and not-found conditions are not generic server errors.
- Do not swallow errors that affect data integrity or access control.
- A fallback must be deliberate, safe, observable, and tested.
- Never reveal SQL, credentials, provider payloads, or internal stack traces to users.

## Logging and audit

- Prefer structured logs with request/correlation IDs.
- Include operation and safe resource identifiers.
- Redact secrets and minimize PII.
- Use audit records for administrative/security actions.
- Avoid noisy logs in normal user flows.
- Warnings must be actionable and have an owner or diagnostic path.

## Testing

- Unit-test pure scoring, normalization, policy, and plan logic.
- Integration-test database RPCs, authorization, and lifecycle orchestration.
- Use golden fixtures for published assessment scoring and reports.
- Include negative authorization and malformed-payload tests.
- Verify English/Arabic and RTL where affected.
- Source-text regression tests supplement but do not replace executable behavior tests.
- Every defect fix should add a reproducing test when practical.

## Code review

Reviewers must evaluate:

- Business behavior and scope
- Authorization and data exposure
- Failure, retry, replay, and concurrency behavior
- Compatibility with existing assessments and completed attempts
- Test quality
- Performance and query scope
- Accessibility and localization
- Observability and rollback

Do not combine unrelated refactoring with production fixes.

## Performance

- Measure before optimizing.
- Avoid broad `select *` and repeated queries.
- Paginate large collections.
- Keep deterministic ordering.
- Cache only with clear ownership and invalidation.
- Avoid large client bundles by keeping report/business construction server-side.
- Use query plans before adding indexes or denormalization.

## Accessibility

- Use semantic HTML and keyboard-accessible controls.
- Provide visible focus states and descriptive labels.
- Maintain sufficient contrast and scalable text.
- Do not rely on color alone for result meaning.
- Support screen readers, LTR/RTL, mobile, print, and reduced-motion needs where applicable.
- Test both English and Arabic layouts for clipping and reading order.

## Documentation expectations

- Update architecture documents when contracts, lifecycle, schema, authorization, or operational procedures change.
- Public services and non-obvious invariants require concise documentation.
- Document why a compatibility rule exists, not only what it does.
- Temporary exceptions require owner, reason, expiry/review condition, and removal plan.
- Implementation handoffs must follow [CHANGELOG_GUIDE.md](./CHANGELOG_GUIDE.md).
- Releases must follow [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

