# Authentication and Session Workflow Design

Status: Scope and Delivery Slices A → B → C are approved; none have started or been authorized for implementation. The [API Foundation](api-foundation.md) is complete. Auth will reuse its configuration, logging, exception handling, and lifecycle instead of recreating them.

This document separates agreed requirements, design guidance, and implementation prerequisites. Recording a design does not authorize dependency installation, data deletion, migrations, or deployment.

## 1. Agreed scope

- Google OAuth is the only sign-in method. The first successful sign-in creates a user; subsequent sign-ins reuse that user.
- No email/password registration, sign-in, verification email, or password reset. Disable server endpoints as well as UI, rather than merely hiding controls.
- Accept only Google-verified email addresses. Identify accounts by Google's provider account ID, not email matching alone.
- Allow any Google account with a verified email; no organization restrictions or business allowlist. Google's development test-user restrictions are configured separately.
- Design new authentication tables without legacy database compatibility; do not migrate or auto-link old accounts or preserve old sessions. Deleting/recreating the old database requires separate explicit authorization. Test databases must be isolated.
- Replace and remove the old login, registration, and dedicated auth implementation rather than only hiding it. Keep core resume functionality unchanged for this slice; do not clean up other legacy business behavior or disable all old endpoints. This is future implementation scope, not work authorized by recording this design.
- Necessary auth bridging is permitted: existing Web server-side callers will verify sessions with NestJS, not retain a second auth service. Do not alter resume business logic, data operations, or resource ownership rules; leave no dangling references or auth bypasses.
- A new database retains the existing table structure needed by resumes and links it to the new auth user table; do not migrate old data or redesign resume tables. Actual database creation, deletion, and migrations need separate authorization.
- NestJS owns Better Auth; Web keeps only the auth client and necessary server-side calls, without importing API internals.
- Browser requests use a common origin; explicitly route auth endpoints and new protected APIs to NestJS.
- Request only `openid`, `email`, and `profile`, not Gmail or other permissions.
- The targeted flow is `/login` → Google sign-in → existing `/dashboard/resumes` → Web reads the session → existing sidebar displays the user and offers sign-out.
- Do not add `/account` or dynamic return URLs yet; keep existing resume paths. Verify the NestJS protected endpoint through automated tests rather than adding a test-only page.
- Legacy resume and AI business behavior is not migrated here. Auth integration must not bypass ownership checks or break existing resume entry points; it is not a general repair of old business routes or a new feature.
- Sessions last 7 days; activity renews them at most once every 24 hours.
- Protected requests consult the database instead of relying on the old five-minute Cookie session cache.
- Normal sign-out revokes only the current session; other devices remain signed in. Clear current browser user state and notify other tabs using that session.
- Surface sign-out failures rather than pretending they succeeded.

## 2. Repository inspection baseline

This is the static baseline observed when designing Auth, not verification of a real database or runtime. Subsequent API Foundation progress is in [API Foundation](api-foundation.md); Auth itself remains unimplemented.

| Item | Observed path/state at design time |
| --- | --- |
| Better Auth | Owned by Web, lockfile version 1.4.18; `apps/web/lib/auth.ts` |
| Auth handler | `apps/web/app/api/auth/[...all]/route.ts` |
| Client | `apps/web/lib/auth-client.ts` |
| Database | Drizzle / postgres-js; `apps/web/db/index.ts` |
| Auth tables | `user`, `account`, `session`, `verification`; `apps/web/db/schema/auth.schema.ts` |
| Legacy credential | Password field in `account`, not `user` |
| Session settings | Seven-day expiry, 24-hour update interval, five-minute Cookie cache |
| Pages | Email/password login and registration; prefilled fixed credentials and hard-coded old resume redirect |
| Web checks | `apps/web/proxy.ts` and legacy business API directly call Web `auth.api.getSession` |
| Sign-out | `DashboardSidebar.tsx` did not handle errors or clear user caches/stores |
| NestJS at inspection | Only `/api/health`; no database, auth module, or Guard |
| Tests at inspection | API bootstrap, Query Provider, and homepage only; no auth workflow tests |

### Reusable parts

- Official Better Auth client, OAuth/session capabilities, and Drizzle adapter approach.
- Auth tables and migration history as structural references, not authorization to copy data or replay migrations immediately.
- Existing UI primitives and Query Provider.
- Server-established trusted identity, followed by business resource-ownership checks.

### Do not copy

- `disableOriginCheck: true`: inspection of the installed version found that it also bypasses relevant CSRF checks. Reinstate origin checks and restrict trusted origins.
- Cookie session cache: a revoked session could remain accepted within its cache window. Disable or bypass it at protected boundaries.
- The old proxy's database dependency, prefix allowlist, and preemptive session lookup on every request.
- Fixed login redirects, prefilled credentials, and sign-out that ignores errors.

`resume.user_id` references the old `user.id` with cascading deletion. Deleting old users may delete resumes; switching Auth is not permission to delete data.

## 3. Architecture and data flow

Ownership is agreed, but implementation must confirm the selected Better Auth version's official integration API and runtime compatibility.

### 3.1 Ownership

- NestJS `auth` module: Better Auth instance, Google configuration, session verification, trusted user context.
- NestJS `database`: connection and shutdown lifecycle plus auth schema. Do not create database connections per request.
- Web: login entry, session display/sign-out in the existing sidebar, client state cleanup. Server-side auth calls move to NestJS; business implementation remains in its current owner.
- `packages/contracts`: minimal public response schemas for custom protected business APIs; exclude database entities, framework objects, and secrets. Follow the [shared HTTP response contract](http-response.md). Better Auth's own endpoints retain their native protocol.
- Use the official Better Auth client for its protocol instead of creating a parallel login/session API or wrapping it in the old Axios response format.
- The Better Auth client owns frontend session state; do not duplicate it in Zustand or a Query cache.

### 3.2 Sign-in

1. The browser initiates Google sign-in from a same-origin login page.
2. The NestJS-mounted Better Auth handler initiates authorization and handles OAuth state and callback validation through the official implementation; do not hand-roll the protocol.
3. Google calls back to NestJS; the server verifies provider identity and the verified email.
4. Find or create the local user by provider and provider account ID; never auto-link old accounts using email alone.
5. Better Auth creates a database session and sets an HttpOnly Cookie. Use Secure in production; configure SameSite, Path, and public URL explicitly.
6. Return to `/dashboard/resumes`. Web obtains the session using the Better Auth client and shows the user in the existing sidebar. Legacy Web server code checks the session with NestJS before protected business access.

Unverified emails, denied authorization, invalid callbacks, and replayed callbacks must not yield usable sessions. Failure pages give safe guidance, not tokens, secrets, or internal errors.

### 3.3 Session validation

- A NestJS Guard uses Better Auth's server capability to verify the Cookie and database session. Checking that a Cookie exists, or looking up a raw token directly, is not equivalent to complete validation.
- Missing, forged, expired, or revoked sessions return 401. Dependency outages fail closed but report a service error, not a false "not signed in" result.
- After validation, construct a minimal trusted user context. Never use a client-supplied `userId` as proof of identity.
- `GET /api/me` returns minimal trusted user fields for Web server-side bridging and automated HTTP verification of the NestJS Guard. This custom business JSON endpoint follows the shared `data` response contract; it needs no dedicated page and must not return session tokens, OAuth tokens, or full database rows.
- Web server calls a fixed internal NestJS URL, forwards the current request's auth Cookie, sets a timeout, and disallows caching. Treat 401 as signed out; fail closed on network/service errors without misreporting them as signed out. Forward renewal Set-Cookie through a writable browser response boundary rather than silently discarding it.
- Legacy business operations keep their existing resource ownership checks using the verified user ID. Do not trust a browser identity header or import API-internal types across applications.
- Do not publicly cache session responses. Preserve Cookie and any renewal Set-Cookie correctly across proxy and server-side calls.
- Web page redirects are UX, not API authorization. Sensitive server reads in Web also need trusted authentication; NestJS protects its APIs.
- A Guard is not a substitute for future business resource-ownership checks. Cookie-authenticated write endpoints still need explicit CSRF protection; sign-in alone does not solve it.

### 3.4 Sign-out and identity changes

1. Prevent duplicate sign-out submissions and pause protected operations.
2. Revoke the current server session and clear its Cookie. New requests using that credential must fail validation after successful sign-out.
3. Cancel user-specific browser requests, clear query caches and drafts/stores, handle pending tasks, and return to the login page.
4. Notify other tabs in the same browser to clear this identity state. Recheck the session on focus to recover if a tab missed the notice.
5. Prevent late responses from repopulating the previous user's data. Do not put Cookies or tokens in cross-tab messages.
6. On network/server failure, show a retryable error and reread the session rather than claiming server sign-out succeeded.

Revocation does not roll back business requests already authorized before sign-out. This slice does not rework all legacy editor concurrent saves, but the new entry point must not keep mounting old-user data/tasks.

## 4. Migration and runtime boundaries

- A common origin is agreed, but path ownership must be explicit: do not forward all `/api/*` to NestJS.
- After `/api/auth/*` switches owners, only one handler is authoritative; do not keep Web and NestJS both writing sessions.
- Retire legacy login/registration pages, Web Better Auth handler/server instance, old session checks, and dedicated configuration. Adapt the client and Cookie configuration where needed, rather than mechanically deleting everything.
- Preserve legacy resume/editor/AI business source; do not delete their pages, APIs, stores, or database business schemas. Inspect shared dependencies and migration files before deletion.
- Legacy business code still calls old `auth`; update those calls to Web-server-to-NestJS session verification during the switch. Do not retain a second auth service, disable all legacy business endpoints, or migrate their business logic as a side effect.
- The new database retains the existing resume table and its FK to the new user table; legacy Web business code targets that same database. Only adjust schema references needed for the auth switch, not resume fields or data operations. Initialize auth tables and FKs in dependency order; prevent Web and API migrations from both creating auth tables. Verify and authorize actual commands first.
- Disable the old email/password server endpoints, not only the register button.
- Keep Google Client Secret, Better Auth Secret, and database credentials server-side, out of `NEXT_PUBLIC_*`, logs, documents, and Git.
- Distinguish public origin, internal API URL, and Google callback URL. Trusted proxy configuration must not allow arbitrary forwarded headers to alter origin checks.
- Verify current NestJS CommonJS compatibility with Better Auth modules, handler mounting order/body parsing, Cookie forwarding, and connection release before selecting minimal dependency changes.
- NestJS alone owns new auth tables and migrations, initialized on an empty database; do not apply a new initialization to an unconfirmed old database or treat this as a legacy upgrade.
- The old database may be abandoned, but its target, any deletion/recreation command, and permissions need separate confirmation. Integration tests always use isolated databases.
- For rollback, stop the new route switch first; do not restore weak legacy origin checks or password endpoints. Deleting an old database cannot be undone by code rollback, so data operations require separate authorization and warning about irreversible effects.

## 5. Delivery Slices (approved order and scope; none started)

Implement one authorized slice at a time; do not automatically begin the next.

| Slice | Observable outcome | Scope and dependencies | Acceptance boundary | Status |
| --- | --- | --- | --- | --- |
| A: Auth service and protected boundary | NestJS handles Google auth/database sessions and serves `/api/me` for a trusted identity | Configuration, database lifecycle, Better Auth handler, Google provider, Guard, minimal public contract; new database retains structure needed by resumes; depends on isolated test DB and version compatibility | First and returning sign-in map to the same identity with a controlled provider; unverified email rejected; valid session succeeds, missing/forged/expired sessions fail; NestJS password endpoints unavailable | Approved, not started |
| B: Web sign-in and auth switch | Google sign-in enters `/dashboard/resumes`; refresh preserves identity and sidebar shows the user | Login button, session state, explicit same-origin routes, full replacement of old auth; legacy Web server checks sessions with NestJS, not resume business changes; depends on A | Full browser callback; cancellation/failure retryable; one auth service and password entry disabled; existing resume entry and ownership checks show no auth regression; build passes | Approved, not started |
| C: Sign-out and session lifecycle | Signed-out current session cannot be reused; other devices remain signed in; tabs have no stale user state | Sidebar sign-out error handling, identity cleanup, cross-tab sync, renewal/expiry verification; depends on A/B | Replayed revoked credential fails; another session remains valid; failures are not falsely reported as success; expiry/renewal match requirements; late responses cannot restore old state | Approved, not started |

Slice A does not include client integration (that belongs to B); its tests must not claim a complete browser flow. Even after all slices, use a real Google test account for manual acceptance before claiming Google sign-in integration is verified.

## 6. Verification strategy

Existing tests did not cover Auth risks. Add the smallest set of risk-focused behavioral tests, not a test per source file.

- API HTTP/database integration: use an isolated database for session authenticity, expiry, revocation, identity binding, and disabled password endpoints. Do not just mock the Guard and assert 200.
- OAuth: use controlled provider responses for success and essential failures without CI dependence on Google; also perform a real Google manual smoke test.
- Web behavior: test sign-out failure, identity cleanup, and late responses at an inexpensive boundary.
- Browser: cover one core sign-in → refresh → protected request → sign-out journey, plus cross-tab behavior only if it protects a distinct risk.
- Write failing tests first for important auth rules, security constraints, and regressions. Do not require a test per file for standard module wiring.
- After implementation run relevant tests, typechecks, workspace lint, and build. Recheck actual Web lint failures rather than assuming README's historical backlog has not changed.
- Do not use development/production data in auth integration tests or log Cookie, OAuth code, or token in test output.

## 7. Preconditions for implementation

The design decisions are settled. Auth bridging, the retained database structure, and page selection need not be reopened without material change. These are preparation steps, not a request to redesign scope:

1. **Google access:** Google OAuth is not configured yet. Follow Section 8 to prepare project, client, and test account; do not claim real Google integration until tested.
2. **Database operation:** An empty database must hold new auth tables and the existing structure needed by resumes. Confirm the target, whether to delete an old database, and initialization commands separately; test DB must be isolated.
3. **Version compatibility:** Verify Better Auth/NestJS module format, handler integration, and renewal Cookie forwarding. Discuss only material architectural obstacles.
4. **Implementation authorization:** A → B → C delivery was agreed, but writing the design alone did not authorize code edits, dependency installation, or data operations.

## 8. Google OAuth setup (not performed)

These are instructions, not a claim that cloud resources exist. Console menus may change. The plan uses Better Auth's default `/api/auth` path; the installed version's callback generation was checked for `/callback/google`. Update the console if implementation changes the path.

### 8.1 Create a project and consent screen

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a dedicated development project.
2. In Google Auth Platform (or APIs & Services → OAuth consent screen), set the application name, support email, and developer contact.
3. Set Audience to **External** and keep **Testing** during development. If test users are required, add the Google account used for manual acceptance. Do not use Internal as public-product configuration.
4. In Data Access, request only `openid`, `email`, and `profile`; do not enable Gmail/Drive scopes or the Gmail API for sign-in alone.
5. Before opening to all users, provide the homepage, privacy policy, terms, and domain verification required by the console and change publication status. Follow Google's actual verification prompts; Testing is not a public launch.

### 8.2 Create a Web OAuth client

1. Create an OAuth Client ID under Clients (or Credentials) of type **Web application**.
2. Prefer separate development and production clients so callbacks and credentials are not mixed.
3. Local browser origin remains `http://localhost:3000`:
   - Authorized JavaScript origins: `http://localhost:3000` (origin only, no path, if this field is used).
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`.
4. Production uses the real HTTPS common origin, e.g. `https://app.example.com/api/auth/callback/google`. The example domain is not a deployable value.
5. The callback is routed through the common origin to NestJS, not the internal `http://localhost:3001` nor the post-login `/dashboard/resumes` URL. Scheme, host, port, path, and trailing slash must exactly match the real request.
6. Store Client ID and Secret securely; do not paste them into chat or commit them. Rotate immediately if exposed.

### 8.3 Proposed NestJS environment contract

These variables are planned, not yet read by the API. The API foundation now loads its own development env and validates current variables; Auth implementation must add validation and a credential-free example for these new variables.

| Setting | Purpose and requirements |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Development Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Corresponding secret, server-side only |
| `BETTER_AUTH_SECRET` | Independent random secret with at least 32 bytes of random material; do not reuse Google Secret. Rotating it may invalidate existing sessions |
| `BETTER_AUTH_URL` | Browser-visible public origin, locally `http://localhost:3000`, with explicit `/api/auth` basePath |
| `DATABASE_URL` | New database connection; use a separate isolated test database, never production data |

The browser uses same-origin `/api/auth` without Google Secret or database credentials. Web's server may have a separate internal NestJS URL, which cannot replace the public OAuth callback origin. Use the public URL for strict trusted-origin checks; do not turn off Origin/CSRF checks to make integration pass.

### 8.4 Manual acceptance and troubleshooting

Once configured and Slice B runs, use a real Google test account to check: first login creates a user, returning login reuses it, `/dashboard/resumes` and refresh preserve the sidebar identity, and the legacy resume entry uses the new auth bridge. Automated HTTP tests verify NestJS protected endpoints. After Slice C, verify sidebar sign-out and rejection of old sessions.

- `redirect_uri_mismatch`: compare the console URI with the actual authorization request's redirect URI character by character, especially 3000/3001, HTTP/HTTPS, path, and trailing slash. Do not copy OAuth code or tokens into logs.
- Access denied: check Audience, test users, account organization policy, and publication state; do not disable auth checks to work around it.
- No session after callback: check same-origin routing, public URL, Cookie Secure/SameSite/Path, and Set-Cookie forwarding. On local HTTP, do not set a Cookie that is only sent over HTTPS.
- User cancels authorization: show a retryable state; do not create a session or expose internal errors.

References: [Google Web Server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Better Auth Google provider](https://www.better-auth.com/docs/authentication/google). Console UI and latest docs were not verified online in the original design session; recheck against actual versions before implementation.

## 9. Original design-session checks

- Read repository instructions, README, product definition, legacy auth/database/login/sign-out code, NestJS starter code, and existing tests.
- Inspected the installed Better Auth source for origin-check and Cookie-cache behavior.
- Did not connect to a database or verify production configuration, Google project, or existing data.
- Only documented the design; did not run auth, install dependencies, migrate/delete data, or deploy.

Related: [product definition](../product.en.md), [README](../../README.md), [current handoff](../handoff.md).
