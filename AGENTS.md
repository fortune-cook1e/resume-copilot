# Repository working rules

## Context

- Start with `docs/handoff.md`; verify it against Git status and relevant code. If empty, do not infer progress. Surface conflicts and preserve unrelated work.
- Read the nearest `AGENTS.md` for the workspace being changed. Use `README.md` for project layout and commands.
- Read the product definition and relevant core designs when changing behavior; do not load every design or the personal workflow by default.

## Workspace conventions

- Use pnpm with one root lockfile. Shared ESLint / TypeScript tools belong at root; application and package dependencies belong in their owning workspace.
- Applications and packages extend root `eslint.config.mjs` and `tsconfig.json`; keep framework-specific options local, without separate configuration packages.
- Share Zod schemas and inferred types through `packages/contracts`. Do not import another application's internals; keep database entities and UI-specific types local.
- Never track credentials, local environment files, `node_modules`, `.next`, or `dist` in Git.

## Delivery

- Clarify uncertain or high-risk requirements, using `grill-me` when available. Small, clear tasks need no interview; stop once scope, boundaries, and acceptance are understood.
- For large requirements, confirm a design with Delivery Slices before implementation. Each slice states its outcome, scope, dependencies, acceptance checks, and status.
- Confirm the current slice and test boundaries once, then execute within them. Ask again only when scope, constraints, or material risks change; do not automatically start another slice.
- Use `improve-codebase-architecture` for scoped reviews; implement approved refactors separately, without mixing broad architecture changes into feature work.
- Skills support these principles, not replace them. Report unavailable skills or tools rather than claiming they ran.

## Testing strategy

- Organize tests around business behavior and risk, not production files or coverage targets. Before adding a test, state the concrete invariant or regression it protects and why existing coverage is insufficient; this does not require separate approval for every test.
- Extend an existing relevant test file by default. Create a new one only for a distinct set of business behaviors or a necessary test-environment boundary, not merely because a production file was added.
- Simple mappings, filters, pass-through wrappers, standard framework wiring, and behavior-preserving structural changes do not automatically need dedicated unit tests. Test them when they carry meaningful business, security, or reliability risk, regardless of code size.
- Use TDD for important business rules, state transitions, transaction behavior, security constraints, and bug regressions, one failing test and minimal implementation at a time; do not force TDD on every change.
- Choose the lowest-cost public boundary that provides sufficient confidence. Avoid testing the same behavior repeatedly at unit, integration, and HTTP levels without a distinct risk to cover.

## Verification and handoff

- Run checks relevant to the change. Use `pnpm lint` to include workspace-specific rules; root `eslint .` alone does not load nested flat configs.
- Review the final diff and report actual verification, existing failures, new regressions, and unverified areas. Never weaken rules or assertions to obtain a pass.
- Update affected documentation when behavior or commands change. Core design changes require updating the corresponding design and affected Delivery Slices.
- At delivery boundaries, blockers, or next-step changes, update the handoff with stage / slice, completed work and verification, blockers / open decisions, next action, and links. Keep it a current summary, not a session log or duplicate plan.
- Do not install dependencies, run migrations, commit, push, publish, or deploy without explicit authorization.
