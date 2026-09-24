# Development Handoff

## Current Stage

Auth A's NestJS backend and local development database are ready. The user reports successful real browser acceptance of Auth B (login, dashboard refresh, identity, owned resume flow). Auth C sign-out/session-lifecycle changes await real multi-tab/browser acceptance. The approved Python-retirement slice is complete; resume/database migration to NestJS was explicitly deferred. Codex/MCP has not started.

## Completed

- NestJS owns Google-only Better Auth, database-backed sessions, `/api/me`, and auth migrations. The confirmed local `resume_copilot` database was cleared/recreated and migrated; the separate `resume_copilot_test` database remains isolated. A first live Google callback reached Better Auth but failed user creation because the standard nullable `image` column was missing. A test-first regression reproduced it using a profile picture; migration 0001 added `user.image` to both local databases without clearing data. API secrets and database URL are in ignored `apps/api/.env`; no production database was touched.
- Web now routes only `/api/auth/*` and `/api/me` to NestJS. Its old auth handler, password pages, and second Better Auth server are retired; `/login` starts Google sign-in, `/register` redirects to login, and the official client reads sessions through the common origin.
- Web server-side resume/AI/PDF routes verify the current user against NestJS, fail closed on auth outages, and retain existing ownership checks. Previously unscoped resume GET/PATCH are now owner-scoped; the Web proxy checks Origin on all unsafe Web business API methods by default, excluding Nest-owned `/api/auth/*`. Legacy Web business JSON responses used by the resume entry now follow `{ data, error }`. Old Web migration commands were retired; API owns schema migrations.
- The dashboard server layout and resume editor server page use NestJS `/api/me` before rendering (401 redirects to login; outages show retry guidance); `/resume/print` stays public. A client Better Auth session boundary hides content and redirects if `useSession()` later reports no session. The proxy no longer queries sessions or forwards renewal Cookies; native browser session requests through the same-origin rewrite own that path.
- Root and API expose `db:generate`, `db:migrate`, `db:push`, and `db:studio`; root commands forward to API. Database-changing commands require an explicit `DATABASE_URL`, and Web's old migration commands remain retired. These scripts were added without applying schema changes.
- Auth C: NestJS revokes only the signed-out session. Web confirms success before clearing Query cache and resume drafts, blocks duplicate sign-outs, and keeps the user in place with a retryable error on failure. A credential-free storage notice triggers server revalidation in other tabs; protected UI hides while checking and old-user state is cleared on expiry/account change. A draft generation prevents late save completion from altering the new user's draft.
- Retired the Python-only legacy PDF import and job-match analysis: removed their Web routes, Python client, service calls, matching UI and unused parse helpers. Manual resume creation, independent Ollama text polish, and PDF export remain. The editor is now two panels; its layout storage ID changed to avoid reading a stale three-panel layout. No Web database code was removed because resume CRUD and PDF export still use it.

## Verification

- With `AUTH_TEST_DATABASE_URL` targeting only the migrated `resume_copilot_test`, sequential `pnpm test` passed: API 43; Web 24 (including the retained manual blank-resume creation path). `pnpm typecheck`, Web production build, and changed-file Web lint passed. The production route list contains only `/api/ai/polish`, not Python-dependent AI routes. Root/API `db:*` script forwarding and installed Drizzle Kit 0.31.9 were checked without executing any schema command.
- A local production-built Web + NestJS HTTP smoke (both stopped afterward) checked same-origin OAuth initiation, public callback URI, state Cookie, unauthenticated page/API behavior, and rejection of cross-origin writes. It did **not** complete Google OAuth.
- An unauthenticated local Web HTTP smoke after the page-boundary change returned 307 for `/dashboard/resumes` and `/resume`, 200 for public `/resume/print`, and 403 for a cross-origin business write. Root `pnpm lint` still fails on legacy Web issues: 4 errors and 8 warnings; API lint passed. No browser E2E test was run; none exists for this journey yet. `git diff --check` passed.

## Blockers / Risks

- The user confirms Auth B works in their browser after page checks moved to `/api/me`; that flow was not independently observed here. Auth C still needs manual verification of successful and failed sign-out, replay rejection, two tabs in the same browser, a distinct device remaining signed in, and native Cookie renewal. Do not share credentials, Cookies, OAuth codes or tokens.
- The current `docker-compose.prod.yml` runs Web/PostgreSQL but **not NestJS**; production deployment requires a separate, authorized API service and `API_INTERNAL_URL`. Do not deploy this configuration as-is.
- Legacy Web `POST/PATCH` routes and protected server pages use `/api/me`; Server Components and these routes do not forward renewal Set-Cookie from that path. NestJS renewal is verified against the isolated test database, but browser native `/api/auth/get-session` renewal across the same-origin rewrite and long-lived/API-only renewal remain unverified. If browser storage is unavailable, cross-tab notice delivery falls back to Better Auth's focus recheck; actual multi-tab behavior has not been verified.
- Historical Web Drizzle migration files remain for reference and must not be applied to the new database. Old user data was intentionally cleared. Independent Ollama polishing and PDF export remain but have not received full business regression coverage. Manual creation was tested at the route boundary; the two-panel editor and PDF export have not been manually checked after retiring Python functionality.

## Next Action

Manually check the retained manual create/edit/PDF-export journey after the Python retirement, and complete Auth C browser acceptance (two tabs, failure/retry, independent device, renewal). Resume CRUD and remaining database operations move to NestJS only in later, separately agreed slices; do not delete Web database code until their replacements exist. Do not deploy or start unrelated work.

## References

- [Auth design](designs/auth.md)
- [Product direction](product.en.md)
- [README](../README.md)
