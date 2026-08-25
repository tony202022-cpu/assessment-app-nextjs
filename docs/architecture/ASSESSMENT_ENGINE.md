# Career Labs AI — Assessment Engine

## Purpose

The assessment engine transforms a published assessment definition and participant answer identifiers into deterministic competency results. Scoring accuracy and historical reproducibility are protected by [PLATFORM_RULES.md](./PLATFORM_RULES.md).

## Current assessment definition

An assessment is currently distributed across:

- An `assessments` database row
- `questions` rows
- Competency IDs and labels in configuration and TypeScript
- Paid-assessment and developer-test allowlists
- Report treatment and recommendation maps
- Assessment-specific plan generators
- Report/PDF branches

Questions and basic settings are data-driven. Interpretation and report behavior remain substantially code-driven.

## Question flow

1. Resolve an active assessment by route slug.
2. Create or resume an authorized attempt.
3. Load the assessment's questions in stable database order with a configured limit.
4. Shuffle question display order in the browser.
5. For each question, build localized options with their original database indexes.
6. Shuffle display order without changing original indexes.
7. Submit question ID plus original selected option index.
8. Treat unanswered questions as an explicit null selection.

The displayed A/B/C/D position is not a score identity.

## Server-side scoring

For each submitted answer, the server:

- Validates payload structure.
- Rejects duplicate question IDs.
- Loads the live question.
- Verifies assessment membership.
- Validates the selected index against live options and `options_scores`.
- Resolves canonical `competency_id` from the question.
- Resolves earned score from the live score array.
- Assigns zero to unanswered questions.
- Uses the maximum live option score as possible points.

It then aggregates earned and possible points by competency and overall.

```text
competency percentage = competency earned / competency possible × 100
overall percentage    = total earned / total possible × 100
```

Current tiers:

- Strength: 75–100
- Opportunity: 50–74
- Threat: 30–49
- Weakness: 0–29

Thresholds are business rules and must not change without explicit approval, versioning, and golden tests.

## Competencies

Competencies are identified by stable string IDs. Labels are bilingual and may currently be resolved from assessment configuration or hard-coded mappings. Compatibility aliases exist for historical IDs.

Rules:

- IDs are immutable once used by completed attempts.
- Renames use canonical aliases or a controlled migration.
- Labels may evolve only with report-version awareness when historical wording matters.
- Competency membership and report metadata must pass coverage validation before publication.

## Recommendations

Recommendations are generated from competency ID, tier, language, and assessment-specific profiles. Current sources include the shared recommendation library, the main report page, Sales Manager planning, SME revival planning, lawyer treatment logic, and Outdoor Sales treatment logic.

The target architecture must register one recommendation/treatment provider per assessment version and produce data for the canonical report model.

## Localization

- English and Arabic question/options are stored separately.
- Locale state controls language and document direction.
- Arabic layouts require RTL-aware presentation and appropriate typography.
- Assessment publication must validate required translations and equal option cardinality.
- Fallback behavior must be explicit; missing Arabic text must not silently expose internal IDs in production reports.

## Configuration

Current assessment configuration includes identity, status, titles, type, price, question count, timer, competencies, report/PDF settings, and JSON configuration. Slug-specific code adds further behavior.

The future typed definition should include:

```text
AssessmentDefinition
  identity and version
  availability and access policy
  supported languages
  question set and selection policy
  competency catalog
  scoring policy version
  report provider version
  recommendation/plan provider
  publication metadata
```

## Adding a new assessment today

Current work may require database content plus edits to access allowlists, labels, competency mappings, results/report detection, recommendations, implementation plans, PDFs, and tests. This is fragile and should not become the standard process.

## Target process for adding an assessment

1. Create a draft versioned definition.
2. Define competencies and translations.
3. Import questions and aligned options/scores.
4. Register report and recommendation providers.
5. Run diagnostics for IDs, translations, scoring, and report coverage.
6. Generate golden scoring fixtures and report previews.
7. Review content and business rules.
8. Publish an immutable version.
9. Roll back by restoring the prior published version, never by mutating completed attempts.

## Current limitations

- No explicit published assessment version attached to attempts.
- Assessment rules are spread across database and code.
- Labels, tier functions, and normalizers are duplicated.
- Client loads questions directly through Supabase.
- Complete question/schema constraints are not documented.
- Tests do not yet provide golden end-to-end coverage for every assessment.

## Future improvements

- Versioned assessment registry
- Publication validator and diagnostics
- Pure deterministic ScoringService
- Attempt-bound definition snapshot/version
- Central competency registry and aliases
- Golden fixtures for every assessment
- Assessment-neutral lifecycle routes
- Control Center authoring, preview, publish, and rollback

