# Development Handoff

## Current work

- **Builder Basics follow-up: implemented, awaiting user acceptance.** Email/Phone share a row; Website/Location each have one row. Add field supports immediate focus, icon search, optional links, move-up and removal through the existing Zustand draft and shared `icon / label / link` contract.
- **Manual CRUD and shared resume contract: implemented; latest changes await normal-app acceptance.** API owns authentication, owner-scoped persistence and Chromium PDF rendering; Web shares its preview/print document with PDF export. Shared schemas and defaults live in `packages/contracts`. Typed sections, custom sections and ordering must survive save/reload alongside existing resumes.
- No further editor slice is selected. Remaining field parity, undo/redo, account-scoped draft recovery and presentation controls are pending. The previous MCP server, provider / connection management, consent UI and local plugin package have been removed. MCP collaboration requires a new design; experience-library CRUD remains deferred.

## Verification

- After MCP removal, Web **61/61 tests** (7 suites), API **49/49 tests** (3 suites against the existing isolated `resume_copilot_test` database), root typecheck, API/Web production builds, formatting and lint passed. Regression checks verify retired protocol endpoints return 404 even with the legacy MCP environment flag and Web no longer exempts the old path from Origin checks. Production output contains no retired MCP modules or consent route. Lint retains **5 existing warnings**. No committed Playwright browser suite covers the current journeys.
- Earlier environment checks passed frozen dependency installation, Dockerfile checks and the local Alpine Docker dependency-stage build. `pnpm peers check` reports existing API esbuild/Vite and Web TipTap v2/v3 mismatches.
- Earlier controlled browser QA covered CRUD, editor autosave and Basics interactions on desktop/mobile with synthetic data. This does not establish current real Google login, cross-tab session renewal, authenticated PDF download or production readiness. No committed browser E2E suite covers these journeys.

## Blockers and risks

- Historical migrations 0002/0003, their snapshots and existing OAuth / connection tables are retained; no database migration or table drop was performed. Their runtime schemas have been removed, so review any future generated migration for unintended table drops before applying it.
- Failed autosave drafts remain only in memory. Full-page unload warns about pending changes, but native browser-history navigation is not a reliable save barrier; recovery remains unfinished.
- Production Compose has no NestJS service, and the deployment workflow still invokes the legacy Web migration command. API deployment, API-owned migrations, Chromium and API/Web reachability need a separate deployment slice. The Docker dependency-stage check does not validate the complete production image or deployment.

## Next action

1. Start or restart the local API and Web to load the rebuilt application after MCP removal.
2. In the normal builder, add plain-text and linked contact fields, choose an icon, move/remove a field, wait for Saved and reload.
3. Verify create → edit/save/reload with a typed custom section, reopen an existing resume, then cancel and confirm deletion of a disposable resume. Report any failure without overwriting useful data.
4. After acceptance, agree one next editor slice with the user before implementation.

## References

[Product](product.en.md) · [HTTP / resume contract](designs/http-response.md) · [Authentication](designs/auth.md) · [Setup and commands](../README.md)
