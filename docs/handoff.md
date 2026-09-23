# Development Handoff

## Current Stage

The first-release direction is manual resume and experience management with optional Codex/MCP collaboration; the in-product agent is later. Auth slices A–C are designed but not started. No Codex/MCP slice has been designed or authorized.

## Completed

- API foundation: configuration validation, safe logging, health checks, and graceful shutdown.
- Shared HTTP response contracts and NestJS business JSON response handling.
- Web request layer parses the new business response format.
- Testing convention confirmed: API and Web own separate `test/` directories, organized by behavior and risk, without per-production-file tests. Web Vitest tests moved to `apps/web/test/`; the obsolete homepage Playwright smoke was removed by request. Critical cross-boundary browser journeys will live in `apps/web/test/e2e/` only when implemented.

## Verification

For the test-organization change, `pnpm test` passed (API 26; Web 6), and `pnpm typecheck` passed. `pnpm lint` still fails only on existing Web issues (7 errors, 12 warnings); API and contracts lint passed. Playwright discovery reports 0 tests and exits with “No tests found”; E2E was not verified. The Web production build and targeted ESLint on the moved tests and runner configs also passed.

## Blockers

- Legacy Next API responses do not match the new Web request format; legacy resume/AI pages may fail until migrated.
- Auth and Codex/MCP integration are not implemented; OAuth and same-origin routing have not been verified.
- There are currently no critical user journeys implemented for E2E. `pnpm test:e2e` will report no tests until one is added; do not treat that as a passing browser flow.

## Next Step

Wait for the user to select a design or authorize one slice. Do not start Auth or Codex/MCP automatically; preserve unrelated working-tree changes.

## References

- [Product direction](product.en.md)
- [HTTP response design](designs/http-response.md)
- [API foundation design](designs/api-foundation.md)
- [Auth design](designs/auth.md)
