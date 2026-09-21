# Repository working rules

- Read `README.md` for the current project layout and runnable commands. Read `docs/product.md` or its English counterpart before changing product behavior.
- Read the nearest application-level `AGENTS.md` before working in that application.
- Check Git status before editing; preserve unrelated and untracked work.
- Use pnpm from the repository root. Keep shared ESLint and TypeScript tooling in root devDependencies; add application-specific dependencies to the owning workspace. Maintain one root lockfile.
- Extend root `eslint.config.mjs` and `tsconfig.json` directly from each application. Keep framework-specific rules, compiler options, and paths in the application; do not create separate configuration packages.
- Run `pnpm lint` to check the root configuration and each application's own ESLint config. Running `eslint .` at the root alone does not load nested flat configs.
- Never track `.next`, `dist`, or other generated build output in Git.
- Keep business changes separate from infrastructure-only work. Do not silently migrate legacy behavior while moving files.
- Run the relevant type checks, lint, builds, and tests after code or configuration changes. Report existing failures separately from new regressions; never weaken rules to obtain a green result.
- When behavior or commands change, update the relevant documentation. Keep technical designs and progress in their own documents, not in this file.
- Never commit secrets, run database migrations, deploy, commit, or push without explicit authorization.
