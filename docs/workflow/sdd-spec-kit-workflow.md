# SDD Development Workflow (Spec Kit)

## 1. Purpose

This repository follows Specification-Driven Development (SDD): specifications are the source of truth, and implementation serves the spec.

Reference:
- Spec Kit: https://github.com/github/spec-kit
- SDD guide: https://github.com/github/spec-kit/blob/main/spec-driven.md

## 2. Core Principles (Aligned with Spec Kit)

- Specification first: define WHAT and WHY before HOW.
- Executable specs: spec and plan must be precise enough to drive implementation.
- Continuous refinement: clarify ambiguity early and repeatedly.
- Constitution-aware planning: enforce architectural constraints through planning gates.
- Bidirectional feedback: production/dev feedback updates specs for next iterations.
- Traceability: requirements -> plan decisions -> tasks -> commits -> verification.

## 3. Standard Artifacts Per Requirement

Each requirement should produce and maintain:

- `spec.md`: user value, requirements, acceptance criteria
- `plan.md`: technical translation and architecture decisions
- `tasks.md`: executable implementation units
- Supporting docs when needed: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

Default location:

- `specs/<feature-branch>/spec.md`
- `specs/<feature-branch>/plan.md`
- `specs/<feature-branch>/tasks.md`

## 4. Command-Driven Workflow

### Step 0: Intake and framing

Capture:

- Business outcome
- In-scope and out-of-scope
- Measurable success criteria
- Constraints (performance, security, compatibility)

### Step 1: `/speckit.specify` (WHAT)

Use `/speckit.specify` to create a structured feature spec.

Expected output:

- Auto branch creation (feature-numbered)
- `specs/<feature>/spec.md`

Quality rules:

- Avoid implementation details in spec
- Mark ambiguity explicitly with clarification prompts

Optional follow-up commands:

- `/speckit.clarify`
- `/speckit.checklist`

### Step 2: `/speckit.plan` (HOW)

Use `/speckit.plan` to translate requirements into architecture and implementation strategy.

Expected output:

- `plan.md`
- Optional: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

Plan must explain:

- Changed modules (`app`, `components`, `services`, `db`, `ai`)
- Data flow and integration boundaries
- Backward compatibility and migration strategy
- Validation and testing strategy

### Step 3: `/speckit.tasks` (EXECUTION)

Use `/speckit.tasks` to generate an actionable task list from plan and design artifacts.

Expected output:

- `tasks.md`

Task quality rules:

- One task = one testable outcome
- Preserve dependency order
- Include testing and documentation tasks

### Step 4: `/speckit.analyze` (CONSISTENCY GATE)

Run `/speckit.analyze` before implementation to validate consistency across spec/plan/tasks.

Gate objective:

- Remove contradictions
- Close missing acceptance criteria coverage
- Catch hidden complexity before coding

### Step 5: `/speckit.implement` (BUILD)

Execute tasks in small, reviewable batches.

Implementation rules:

- Keep commits semantic and scoped
- Keep docs in sync with behavior changes
- Prefer test-first and contract-first for integration-heavy features

### Step 6: Verify

Run relevant checks, for example:

- `pnpm lint`
- `pnpm build`
- module-specific tests
- database migration verification (if schema changed)

### Step 7: Review and merge

Before merge, confirm:

- acceptance criteria are met
- no untracked scope creep
- docs and runbooks are updated
- rollback/risk notes exist for high-impact changes

## 5. Constitution and Quality Gates

Follow constitution-style checks inspired by Spec Kit's planning discipline:

- Simplicity gate: avoid over-engineering and unnecessary project splits
- Anti-abstraction gate: prefer framework-native capabilities first
- Integration-first gate: define contracts and realistic validation scenarios early

If a gate fails, document rationale in planning artifacts instead of silently proceeding.

## 6. Scenario Playbooks

### Scenario A: New resume analysis feature

Example: "Add keyword coverage score in resume analysis"

1. `/speckit.specify`: define formula boundaries, acceptance criteria, UI expectation
2. `/speckit.plan`: choose compute boundary (AI service vs API layer)
3. `/speckit.tasks`: split into parser/scorer/API/UI/tests/docs
4. `/speckit.analyze`: validate traceability and completeness
5. Implement in semantic commits and verify end-to-end behavior

### Scenario B: Database schema evolution

Example: "Track resume language and last analyzed timestamp"

1. `/speckit.specify`: define semantics and compatibility behavior
2. `/speckit.plan`: map schema, API, and migration impact
3. `/speckit.tasks`: include schema, migration, mapping, regression tests, docs
4. Apply DB workflow: `docs/workflow/drizzle-database-workflow.md`
5. Validate migration in local DB and update docs

## 7. Definition of Done (DoD)

A requirement is done only when all are true:

- `spec.md`, `plan.md`, `tasks.md` are complete and consistent
- code and tests satisfy acceptance criteria
- commits are semantic and traceable to tasks
- documentation is updated for behavior/contract/schema changes
- deployment risk and rollback considerations are recorded if needed

## 8. Team Conventions

- One requirement per feature branch whenever possible
- Run `/speckit.analyze` before major coding starts
- Keep requirement -> task -> commit mapping clear in PR
- Avoid speculative features not grounded in the accepted spec
- For shared DB changes, use migration-based workflow (not direct push)

## 9. Quick Commands

In Copilot chat:

- `/speckit.specify`
- `/speckit.clarify`
- `/speckit.checklist`
- `/speckit.plan`
- `/speckit.tasks`
- `/speckit.analyze`
- `/speckit.implement`

Local helper scripts in this repo:

- `.specify/scripts/bash/create-new-feature.sh`
- `.specify/scripts/bash/setup-plan.sh`
- `.specify/scripts/bash/check-prerequisites.sh`
