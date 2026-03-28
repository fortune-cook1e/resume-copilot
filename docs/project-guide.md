# Resume Copilot Project Guide

## Project Overview

Resume Copilot is a Next.js-based resume platform for writing, optimizing, and analyzing resumes against job descriptions.

Core capabilities:

- Resume editing and management (frontend interactions + backend APIs)
- User authentication and session management (Better Auth)
- AI-powered processing (Python FastAPI for parsing, extraction, and matching)
- Resume export and data management

## Core Tech Stack

- Web framework: Next.js 16 + React 19 + TypeScript
- Database: PostgreSQL 16 (local via Docker)
- ORM: Drizzle ORM + drizzle-kit
- Auth: better-auth
- UI: Tailwind CSS 4 + Radix UI
- State management: Zustand
- AI service: Python FastAPI (uv-managed environment) + NLP/embedding libraries
- Package managers: pnpm (Node.js) + uv (Python)

## Key Directories

- `app/`: Next.js App Router pages, layouts, and API routes
- `components/`: Feature components and shared UI components
- `db/`: Database client and schema definitions (Drizzle)
- `services/`: Next.js wrappers for calling the AI service
- `lib/`: Shared utilities (auth client/server setup, requests, helpers)
- `types/`: Shared type definitions (auth/resume, etc.)
- `ai/`: Python AI service (parsing, extraction, matching, scoring)
- `docs/infra/`: Infrastructure and engineering docs
- `drizzle/`: SQL migrations and migration metadata

## Development Commands

### Local Startup

```bash
# 1) Install dependencies
pnpm install

# 2) Start database
docker compose up -d

# 3) Apply migrations
npx drizzle-kit migrate

# 4) Start Next.js app
pnpm dev
```

### AI Service (separate terminal)

```bash
cd ai
uv sync
uv run uvicorn server:app --reload --port 8000
```

### Common Engineering Commands

```bash
pnpm lint
pnpm build
pnpm start

npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit studio
```

## Detailed Documentation Index

Recommended reading order: commands first, then auth, then deployment.

- Development commands and DB operations: `docs/infra/commands.md`
- Authentication flow (Better Auth + schema): `docs/infra/auth-flow.md`
- CI/CD and production deployment: `docs/infra/cicd.md`
- AI sub-service documentation: `ai/README.md`

## Quick Navigation

- Main local development entry: root `README.md`
- Project structure and module map: this document (`docs/project-guide.md`)
- Auth model and flow details: `docs/infra/auth-flow.md`
