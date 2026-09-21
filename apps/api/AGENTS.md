# API working rules

- Follow the root `AGENTS.md` and the project scope described in `../../README.md`.
- Run application commands from the root with `pnpm --filter @resume-copilot/api <command>`.
- Use NestJS modules, controllers, and dependency injection. Keep transport handling separate from substantive business rules.
- Extend root `../../tsconfig.json` and `../../eslint.config.mjs`. Keep NestJS-specific options here, including decorator metadata for dependency injection.
- `pnpm --filter @resume-copilot/api test` builds first, checks test types, and runs Vitest against compiled application code. Do not replace this with a transform that drops decorator metadata.
- Keep credentials out of logs and responses. Do not add database connections, auth, queues, or Agent services before their implementation scope is agreed.
- Validate changes with `typecheck`, `lint`, `build`, and relevant tests. Add behavioral tests where new rules or regressions justify them, not one test per file.
