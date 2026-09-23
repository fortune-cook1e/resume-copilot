# Web working rules

## React and Next.js

- Keep Server Components as the default; use Client Components for interaction, client state, and browser APIs.
- Keep server credentials and server-only dependencies out of client bundles and `NEXT_PUBLIC_*` variables.
- Consult `.agents/skills/vercel-react-best-practices/SKILL.md` at the repository root for React / Next.js work.
- Inspect callers, authentication, and data dependencies before changing legacy API routes; migration requires an explicit task.
- Treat client validation and route guards as UX, not authorization; enforce access checks on the server.

## Directory responsibilities

- Organize by technical responsibility, without a `features/` layer. Apply this to new work; do not reorganize legacy code without an explicit task.
- `app/`: routes, layouts, and page composition; keep complex business interactions in components or hooks.
- `components/`: UI components, with reusable primitives in `ui/` and business-specific groups as needed.
- `hooks/`: reusable React logic and Query hooks. `services/`: API requests, independent of React and UI stores.
- `stores/`: shared client state, not a duplicate of Query caches. `lib/`: general-purpose utilities and foundational integrations, not miscellaneous business code.
- Use consistent business names across directories, such as `services/resumes.ts` and `hooks/use-resumes.ts`; create files only when needed.

## State and data

- When needed, use TanStack Query for server-state caching, React Hook Form for forms, and Zustand for shared client state; do not duplicate ownership across them.
- Keep local UI state local and derive values rather than synchronizing duplicate state through effects.
- Give each editable draft one authoritative owner; define form / draft synchronization in the feature design.
- Define query keys, invalidation, and identity-change cache cleanup when introducing authenticated queries.
- Apply these conventions to scoped new work; do not silently migrate existing requests or stores.

## UI and verification

- Reuse existing UI components and styling conventions before introducing alternatives.
- Keep reusable UI primitives independent of business APIs and stores; compose business behavior in feature-specific components or hooks without forcing every component to be generic.
- Handle relevant loading, empty, and error states; preserve semantic controls, keyboard access, and responsive layouts.
- Keep Web tests under `test/`, separate from implementation; group Vitest tests by behavior without mirroring every component or utility. Reserve `test/e2e/` for the few critical cross-boundary user journeys requiring a browser, not homepage smoke or per-page E2E tests. Do not create an empty E2E directory before there is a qualifying journey.
- Use Vitest for component / state behavior and Playwright for critical browser flows. Run E2E separately from regular tests when a covered journey changes; report when there is no E2E coverage.
- Run Web commands from the repository root with `pnpm --filter @resume-copilot/web <command>`.
- Include a production build when changing routing, dependencies, server/client boundaries, or build configuration.
