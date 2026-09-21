# Web working rules

- Follow the root `AGENTS.md` and the project scope described in `../../README.md`.
- Run application commands from the root with `pnpm --filter @resume-copilot/web <command>`.
- For React and Next.js work, consult `.agents/skills/vercel-react-best-practices/SKILL.md` at the repository root.
- Preserve server/client boundaries; never expose server credentials through client components or `NEXT_PUBLIC_*` variables.
- Before changing an API route, inspect its UI callers, auth checks, and data dependencies. Moving it to another application requires an explicit migration task.
- Keep Vitest tests separate from `e2e/`; Playwright owns browser flows.
- Validate changes with `typecheck`, `lint`, and relevant tests. Use `build` for routing, package, or build-configuration changes.
