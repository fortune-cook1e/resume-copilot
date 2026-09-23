# Shared HTTP Response Contract for Web and API

Status: The shared response foundation is implemented and relevant checks were run; the Web request wrapper was later authorized separately to adopt it. Legacy Web business routes and callers have not been migrated, so legacy functionality may be unavailable.

## 1. Scope and ownership

- New NestJS **business JSON** endpoints use a shared format by default. Web parses them with public Zod schemas and inferred types in `@resume-copilot/contracts`; API uses the same package for its output contract. Do not put Nest, Next, or database entities in the shared package.
- Legacy Web APIs still return `{ code, msg, data }`. The separately updated Axios wrapper now handles only the new format, returning `data` on success and using HTTP status and `error.code` on failure. Legacy resume/AI callers are not migrated and may fail. Do not duplicate response state across Zustand, pages, and request layers.
- Liveness/readiness probes (including failures), Better Auth endpoints (OAuth redirects/callbacks and sessions), downloads, streams, and no-body responses retain their native protocols. Do not infer business endpoints from the `/api/*` prefix; declare exceptions explicitly at the adapter boundary. Unmatched routes use the shared error format for 404s.
- Keep `X-Request-ID` in response headers and server logs for troubleshooting, outside the JSON envelope. Do not expose internal stacks, raw exceptions, credentials, or sensitive resume content in public messages.

## 2. Confirmed wire format

Success (preserving HTTP 200 or, for example, 201 on creation):

```json
{ "data": { "id": "123" }, "error": null }
```

Business failure (for example HTTP 404):

```json
{ "data": null, "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

- The top level contains only `data` and `error`, without `success`, `statusCode`, `msg`, `requestId`, or default `meta`. On success, `data` may be an object, list, scalar, or `null`, and `error` is `null`. On failure, `data` is `null`; `error` has stable machine code `code` and safe human-readable `message`.
- HTTP status determines success or failure; do not duplicate status as `code: 0/1`. Use `error.code` only when branching is needed. Begin with general codes such as `BAD_REQUEST`, `NOT_FOUND`, and `INTERNAL_SERVER_ERROR`; add domain codes only for real needs. Web must not branch on message text.
- Successful business operations with no result return HTTP 200 and `{ "data": null, "error": null }`. Do not use 204 for a business endpoint that emits this JSON body; genuine bodyless HTTP responses remain explicit non-business-JSON exceptions.
- Keep real 4xx/5xx statuses. Show only approved messages for expected business failures and a fixed safe message for unknown 500s; do not disclose internal errors, passwords, or sessions. Public error responses must not be cached. Existing logging allowlists and request-ID policy stay in place.

## 3. Shared pagination structure

Pagination is inside the `data` of paged lists, not a global top-level field. Ordinary detail responses have no `pager`:

```json
{
  "data": {
    "items": [{ "id": "123" }],
    "pager": { "page": 1, "pageSize": 20, "total": 41 }
  },
  "error": null
}
```

- `page` starts at **1**. `pageSize` is the positive requested per-page capacity; the actual count is `items.length`, not a separate `count` field.
- `total` is the **exact number matching current filters**, not the count on this page or the number of pages. If a real endpoint cannot efficiently produce it, decide explicitly for that endpoint rather than silently returning an estimate.
- Pages beyond the end and empty filtered results still return 200 with `items: []`, the valid requested `page` and `pageSize`, and accurate `total`; do not rewrite the page number or return 404.
- `packages/contracts` defines composable pagination schemas and types. Pagination calculations, request validation, and queries belong to real list endpoints. This slice added no production list endpoint, DB query, or pagination service. Page-size limits and snapshot/concurrency consistency are decided for each actual list feature, not assumed globally.

## 4. Implementation and consumption boundaries

- `packages/contracts` exports success/error envelopes, composition with business-data schemas, `pager` schemas, and inferred types. API and the **new Web request layer** consume the public entry point, not each other's internals. A transport contract or TypeScript type alone does not validate incoming requests at runtime.
- New NestJS business controllers return business data directly rather than constructing envelopes. The HTTP success path wraps responses; the existing global Exception Filter handles failures, including unmatched 404s and body-parser errors that have no controller. A success interceptor alone cannot handle errors.
- Declare native-response exceptions centrally at route/adapter boundaries (health and future authentication, downloads, and streams). Before Better Auth integration, verify how its handler is mounted and whether it passes through Nest interceptors/filters; do not wrap OAuth redirects or Set-Cookie responses in JSON.
- Preserve native HTTP status, headers, Cookie, and `Content-Type`. Do not wrap raw `@Res()`, streaming, or already-started responses again. Only test-only routes currently cover `StreamableFile` and explicit raw JSON. When real `@Res()` or other special protocols are added, declare their native-response boundary and add appropriate HTTP coverage.
- API Foundation originally exposed `{ statusCode, code, message, requestId }` on errors. This slice replaced the shared schema, Filter, tests, and README's **business JSON** error format; health probes (including readiness 503) keep their original shape and must not be parsed by the business request layer.
- The later-authorized `apps/web/lib/request.ts` parses only the new business envelope. It rejects malformed JSON instead of passing it through silently; HTTP errors carry stable code, actual status, and optional response-header request ID. It no longer redirects 401s to the old login page. Legacy resume routes still have the old format and callers remain unmigrated. `blob`/`arraybuffer` downloads pass through; the official Better Auth client does not use this wrapper.

## 5. Delivery Slice: shared response foundation (completed)

| Item | Details |
| --- | --- |
| Observable outcome | New business JSON uses a consistent envelope; Web can import shared contracts to recognize success/failure; pagination can be reused by future lists; health and native protocols are unaffected |
| Scope | Shared success/error/pagination Zod contracts, Nest success wrapping and exception handling, explicit health/native exceptions, documentation and tests |
| Dependencies | API Foundation only; no Auth, production business modules, database, legacy Web migration, or new infrastructure |
| Acceptance | Test-only Nest business controller exercises HTTP 200/201, empty 200, general 400/404/500, unmatched routes, accurate pagination and out-of-range pages, unchanged health and failed readiness; preserve status and `X-Request-ID`, hide internal errors; report actual shared-package/API build, typecheck, test, and lint results |
| Status | Authorized and implemented; this slice did not add a production business endpoint, Web request adapter, Auth, or database |

Tests extend `apps/api/test/app.test.mts` with test-only business controllers for 200/201, empty results, empty pagination pages, 400/404/500, unmatched routes, parser errors, unchanged health and ready 503, and log/request-ID correlation. Separate test-only routes check that raw JSON, `StreamableFile`, and 204 are not wrapped. Do not claim these tests cover real Better Auth/OAuth integration or production downloads. `packages/contracts` exposes `httpSuccessSchema`, `httpErrorSchema`, `httpResponseSchema`, `pagerSchema`, `paginatedDataSchema`, and inferred types. The global success interceptor wraps business responses, the Filter handles errors, and `@RawResponse()` marks health probes as raw.

The new Web request wrapper now consumes shared contracts, but no production business route emits the new format yet. Real Google auth, legacy route migration, database, and production pagination are still unimplemented. Actual verification and remaining blockers are summarized in [handoff](../handoff.md).

Related: [API Foundation](api-foundation.md), [Auth design](auth.md), [repository README](../../README.md), [handoff](../handoff.md).
