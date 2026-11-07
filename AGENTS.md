# Repository working rules

## Context

- Start with `docs/handoff.md`; verify it against Git status and relevant code. If empty, do not infer progress. Surface conflicts and preserve unrelated work.
- Read the nearest `AGENTS.md` for the workspace being changed. Use `README.md` for project layout and commands.
- Read the product definition and relevant core designs when changing behavior; do not load every design or the personal workflow by default.

## Workspace conventions

- Use pnpm with one root lockfile. Application and package dependencies belong in their owning workspace.
- Applications and packages use the root Oxc lint/format configuration and `tsconfig.json`; keep framework-specific options local, without separate configuration packages.
- Share Zod schemas and inferred types through `packages/contracts`. Do not import another application's internals; keep database entities and UI-specific types local.
- Never track credentials, local environment files, `node_modules`, `.next`, or `dist` in Git.

## Ownership

| Concern                                                                | Owner                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| Routes, editor state, UI, shared preview / print document              | `apps/web`; see [Web rules](apps/web/AGENTS.md). |
| Authentication, business rules, persistence, Chromium PDF rendering    | `apps/api`; see [API rules](apps/api/AGENTS.md). |
| Public request / response schemas, shared resume document and defaults | `packages/contracts`.                            |

- When shared schemas change, check API validation / persistence and affected Web services, editing and preview / PDF consumers. Preserve compatibility with stored resumes.
- When environment requirements change, check the owning application's loading / validation, `.env.example`, and applicable Docker / Compose configuration; update developer setup instructions when needed.

## Workflow

- For substantial features, use `grill-me` → `to-spec` → `to-tickets` → implementation with `tdd` where appropriate → review and acceptance. Small, clear changes can proceed directly with relevant verification; keep interviews and specs proportional to the task.
- Keep specs at `docs/plans/<feature-slug>/spec.md` and one file per ticket under its `issues/` directory. Each ticket delivers one independently verifiable behavior, with dependencies and acceptance checks; it is the unit of delivery, without a separate duplicate slice plan. See [tracker conventions](docs/agents/issue-tracker.md).
- Implement only the selected, approved ticket. Confirm its scope and test boundaries once, reuse settled decisions, and ask again only when constraints or material risks change. Review and verify the result before proceeding to another ticket.
- Use `vercel-react-best-practices` for React / Next.js work. Skills support the agreed task and repository rules; report unavailable skills or tools rather than claiming they ran.
- Keep project documents under `docs/`. Read workflow configuration in `docs/agents/` directly and use the [domain documentation](docs/agents/domain.md) to find existing product and design context; do not scaffold extra documents merely because a skill mentions them.

## Testing

- Colocate Vitest unit, component and integration tests with the source behavior they cover, using `*.test.ts`, `*.test.tsx` or `*.test.mts`. Extend relevant suites; colocation does not require one test file per production file.
- Keep Playwright browser journeys together under repository-root `tests/e2e/`. Cover implemented user journeys that need cross-boundary verification; do not create empty suites for future features. Run `pnpm test:e2e` separately from regular workspace tests when a covered journey changes.
- Use TDD for important business rules, state transitions, security / transaction behavior and bug regressions. Test observable behavior through the lowest-cost public interface that gives sufficient confidence; ordinary wiring and behavior-preserving changes do not automatically need new tests.
- Prefer affected-workspace and focused-file checks. Pass test paths relative to that workspace; include dependent workspaces when contracts, exports, dependencies or runtime / build configuration change. See the README for commands.
- Database suites require an explicitly selected, isolated test database; never use development or production data. Preserve sequential execution where fixtures share mutable state.
- When adding or moving tests, update runner discovery, setup paths and TypeScript build boundaries together. Existing suites need not be moved as incidental cleanup. A successful command with no relevant tests does not verify the changed behavior; report actual results and missing coverage.

## Verification and handoff

- Run checks relevant to the change. Use `pnpm lint` to include workspace-specific rules.
- `pnpm lint` and `pnpm format:check` inspect files; `pnpm format` rewrites the repository. For scoped formatting, use `pnpm exec oxfmt --write <changed paths>` and review the resulting diff.
- Review the final diff and report actual verification, existing failures, new regressions, and unverified areas. Never weaken rules or assertions to obtain a pass.
- Update affected documentation when behavior or commands change. Core design changes require updating the corresponding design and affected specs / tickets.
- Keep `README.md` a stable developer entry point: a brief product description, project layout/stack, prerequisites, local setup and common commands. Update it only when this developer-facing information changes; do not append ordinary feature changes, UI instructions, acceptance results or progress logs. Keep product/design details and delivery status in their existing documents and handoff.
- Update the handoff only when active development status, verification, blockers or the next development action materially change. Keep what is needed to resume development and link relevant specs / tickets; omit skill administration, instruction edits and documentation-maintenance logs.
- Do not install dependencies, run migrations, commit, push, publish, or deploy without explicit authorization.
