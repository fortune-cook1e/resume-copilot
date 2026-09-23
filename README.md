# Resume Copilot

Resume Copilot aims to help job seekers keep a reusable record of their experience and create tailored resumes. The planned workspace will support manual editing, preview, and PDF export, with optional collaboration through Codex. An in-product agent is planned for a later phase.

> **Early development:** The new authentication, experience library, resume editor, and Codex integration are not yet available. The current Web app is a preserved legacy version.

## Run locally

Requires Node.js 22 (>=22.12) and pnpm 9.15.9. From the repository root:

```bash
nvm use                       # If using nvm
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the Web app at <http://localhost:3000>. The NestJS API runs on port 3001 and provides a health check at <http://localhost:3001/api/health>.

To start only one application, use `pnpm dev:web` or `pnpm dev:api`.
