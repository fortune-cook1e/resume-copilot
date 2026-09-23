# NestJS API Foundation

Status: API Foundation is implemented and relevant checks were run; dependencies were installed with authorization. This document records the original implementation and verification baseline. The subsequent [shared HTTP response contract](http-response.md) has since replaced the business JSON error format and added success wrapping; health probes remain exceptions. Auth slices A/B/C have not started.

## 1. Goal and scope

Establish a verifiable production-runtime foundation before adding business endpoints. The original slice covered configuration, startup/shutdown, health checks, exception handling, structured logging, and HTTP security boundaries.

At the time, it excluded Auth, database connections, business endpoints, Swagger, rate-limiting infrastructure, a monitoring platform, and container/deployment pipelines. It also **originally** excluded a shared success envelope (changed by the later response slice) and avoided a generic business framework. Completing this slice does not imply a production deployment or security audit.

## 2. Pre-implementation baseline

- `apps/api/src/main.ts` set the `/api` prefix, enabled Nest shutdown hooks, and converted `PORT` directly with `Number`.
- AppController exposed only `GET /api/health`, returning `{ "status": "ok" }`.
- There was no env validation, global exception filter, request logging, request ID, or readiness state.
- The API used NestJS 11, the Express adapter, CommonJS/Node16 modules, and tests against real compiled TypeScript output.
- API test (including build and test typecheck; 2 passing), typecheck, and API lint had passed. Full-repository lint had not been run then; README documented existing Web failures.

## 3. Implemented design

### Configuration and startup

- Use `@nestjs/config` with Zod to validate configuration once and expose it through DI; avoid scattered `process.env` reads.
- Validate `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT_MS`, and request-body limits. Require valid numeric ranges and reject empty values, NaN, and negative values where inappropriate.
- Keep local port 3001 by default. Inject production configuration via environment; development may use API's own untracked `.env`. Do not load Web's env file; provide a credential-free `.env.example`.
- Configuration errors report only variable names and safe reasons, not values. Failed startup exits nonzero, closes created resources, and leaves no listener.

### Logging and request IDs

- In development, Nest framework/startup logs use the native ConsoleLogger; production and tests use Nest-integrated Pino JSON. Buffer initialization logs until selecting the environment's logger; discard raw buffered error content on initialization failure. HTTP logs are Pino JSON in all environments, with no log service or file-rotation system.
- Generate a server-side UUID for each request, return it in `X-Request-ID`, and correlate errors and logs with the same ID. Do not trust caller-supplied request IDs in this slice.
- HTTP log allowlist: request ID, method, route template (fixed label for unmatched routes), status, duration. Do not log raw URL/query, request/response bodies, Cookie, Authorization, or OAuth parameters.
- Disable default full req/res/error serialization. Log safe exception categories and context, not raw messages or stacks that might contain sensitive content.
- Disable duplicate framework request-error logs. Tests inspect actual log output for sensitive values and correlation.

### Global exception boundary

- Register a global Exception Filter through DI to handle HTTP exceptions, unknown errors, 404s, and known Express body-parser failures.
- **Original Foundation contract:** `{ statusCode, code, message, requestId }`, with its Zod schema in `packages/contracts`; configuration schema remains in the API. This business JSON shape has been superseded by the [shared HTTP response contract](http-response.md).
- Preserve trusted HTTP statuses; use stable, safe messages and codes for 400/401/403/404/413 rather than forwarding arbitrary exception responses.
- Unknown exceptions return 500 without leaking messages, stacks, database/dependency information, or credentials. Do not turn business failures into HTTP 200.
- Foundation did not create business exception class hierarchies or a success interceptor. The later response slice added a shared success format for business JSON while keeping native protocols separate.

### Health checks and lifecycle

- Preserve `GET /api/health` as a liveness probe with `{ "status": "ok" }`.
- Add `GET /api/health/ready` as a readiness probe: 200 when initialized and not shutting down, 503 otherwise. Disable caching.
- Readiness indicates only process initialization and shutdown state; it does not claim to check unconnected database or Google dependencies.
- SIGTERM/SIGINT trigger bounded graceful shutdown: mark unready and reject new work, stop accepting connections, wait for in-flight requests, then call Nest lifecycle hooks. Exceeding the deadline terminates with a nonzero status.
- Install one signal handler in CLI bootstrap; do not also enable Nest's default handler, which could destroy providers before HTTP draining. Close idle keep-alive connections once requests finish so they do not delay shutdown.
- Exit 0 on clean shutdown and 1 on failure/timeout. The deadline includes stdout flushing; synchronous event-loop blocking and SIGKILL cannot be handled in-process. Deployment still needs an external termination deadline.
- Do not add shutdown hooks for resources not yet present, such as database connections or queues. Future resources join through the Nest lifecycle.
- Readiness may be unreachable once the port closes; do not claim an external probe can always observe 503 or introduce an assumed drain delay.

### HTTP foundation boundaries

- Use Helmet for API security headers and disable the Express signature; this slice did not alter Web CSP.
- Limit JSON and urlencoded body sizes; return 413 for oversized bodies and 400 for malformed JSON. No upload parser is added.
- Do not trust proxy headers by default, enable blanket `trust proxy: true`, or open broad CORS. Configure only known proxy IPs/subnets once the real same-origin topology exists.
- Configure Node HTTP request/header/keep-alive timeouts. A request-receive timeout does not limit business-handler execution; do not add a speculative global handler-timeout interceptor.
- Keep a separate integration boundary for the future Better Auth handler; its responses must not automatically enter Nest's custom JSON error/success wrapping.

## 4. Installed dependencies

In `apps/api`:

- Runtime: `@nestjs/config`, `zod`, `nestjs-pino`, `pino`, `pino-http`, `helmet`.
- Internal: `@resume-copilot/contracts` via `workspace:*`.
- Development: `@types/express` for Express request/response boundary types.

Coordinate Zod with the repository version instead of relying on another workspace's node_modules. The root lockfile was updated, peer ranges checked, and Node 22 / Nest 11 execution verified. Do not add `class-validator`, `class-transformer`, Terminus, pino-pretty, or a logging platform without a need.

Independent API build/test/dev/typecheck build contracts first where required. Keep CommonJS output and decorator-metadata testing. Tests use Node require for compiled output to avoid DI token identity differences between Vite-transformed modules and the CommonJS cache.

## 5. Delivery Slice: API Foundation

- **Outcome:** The API rejects invalid config, reports failures safely, emits correlatable logs without sensitive information, distinguishes liveness from readiness, and shuts down within a deadline.
- **Scope:** Section 3. Extend `apps/api/test/app.test.mts` first; add configuration/log/filter/health files by responsibility, not file length.
- **Dependencies:** Section 4 dependencies were authorized and installed; no database or Google configuration was required.
- **Acceptance:** API test, typecheck, build, lint, related contracts checks, and root `pnpm lint` with existing Web failures reported separately; update README, sample configuration, and handoff.
- **Status:** Completed. Existing Web lint failures remained outside this slice.

Key test choices:

1. Invalid configuration fails startup without exposing its value; valid configuration starts.
2. Real HTTP checks health, ready, 404, controlled/unknown errors, malformed JSON, and oversized bodies. Failure routes exist only in tests, not production.
3. Request ID matches across response, error, and logs; sensitive query/header/body/error content never leaks.
4. A real child process exercises signal shutdown and its deadline, including ready → draining; mocking shutdown hooks alone is insufficient.

These runtime, security, and lifecycle contracts were not covered by the original two bootstrap tests. Important constraints received failing tests first. Standard wiring did not require a test per file or duplicate tests of the same behavior.

## 6. Actual verification and subsequent boundaries

- Before the logging UX change, `pnpm test` passed with 19 API and 2 Web tests; API test includes API/contracts builds and test typecheck. After that change, a separate API test run passed 22 tests.
- `pnpm typecheck` passed in all workspaces; separate API and contracts lint passed.
- `pnpm lint` passed for root/contracts but failed on existing Web findings (7 errors / 12 warnings involving `any`, `module` naming, and `Math.random` during render). API lint was checked separately after recursive lint stopped. Web source was not modified in this slice.
- `pnpm install --frozen-lockfile --ignore-scripts` passed, confirming manifest/lockfile consistency; installation still reported the legacy Web Tiptap v2/v3 peer mismatch.
- Web production build, browser E2E, real reverse proxy, load tests, and deployment were **not** run for this slice; do not treat them as verified.
- Commands and runtime configuration are in [README](../../README.md); the credential-free sample is `apps/api/.env.example`.

Stop at this slice boundary. Auth, database, resume business behavior, and deployment pipeline were not changed as part of this slice; later slices need separate authorization.

Related design: [Auth](auth.md). Current summary: [handoff](../handoff.md).
