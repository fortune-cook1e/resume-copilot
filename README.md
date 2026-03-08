# Resume Copilot

AI-powered resume builder with job matching analysis.

## Tech Stack

- **Frontend / Backend**: Next.js 15 (App Router, TypeScript)
- **Database**: PostgreSQL 16 (via Docker)
- **AI Service**: Python FastAPI + JobBERT (uv)
- **Package Manager**: pnpm

---

## Prerequisites

| Tool           | Version | Install                                                      |
| -------------- | ------- | ------------------------------------------------------------ |
| Node.js        | ≥ 20    | [nodejs.org](https://nodejs.org)                             |
| pnpm           | ≥ 9     | `npm i -g pnpm`                                              |
| Docker Desktop | latest  | [docker.com](https://www.docker.com/products/docker-desktop) |
| uv (Python)    | latest  | `brew install uv`                                            |

---

## Local Development Setup

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd resume-copilot
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The default `.env` works out-of-the-box for local development:

```env
DATABASE_URL=postgresql://resume:resume123@localhost:5432/resume_copilot

BETTER_AUTH_SECRET=resume-copilot-secret-key-change-in-production
# Equal to NEXT_PUBLIC_APP_URL
BETTER_AUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000

# The base URL of the server
# Starts with NEXT_PUBLIC_ to be exposed to the client-side code
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Python AI Service
PYTHON_SERVICE_URL=http://localhost:8000

# Ollama Cloud
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_API_KEY=xxxx


```

### 3. Start required containers (PostgreSQL)

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432`. Verify it's running:

```bash
docker compose ps
```

### 4. Run database migrations

```bash
pnpm drizzle-kit migrate
```

### 5. Start the Python AI service

In a separate terminal:

```bash
cd ai
uv sync          # first time only — creates .venv and installs dependencies
uv run uvicorn server:app --reload --port 8000
```

The AI service will be available at **http://localhost:8000**.  
API docs: **http://localhost:8000/docs**

### 6. Start the Next.js dev server

Back in the project root:

```bash
pnpm dev
```

Open **http://localhost:3000**.

---

## Stopping

```bash
# Stop Next.js: Ctrl+C in its terminal
# Stop Python:  Ctrl+C in its terminal

# Stop Docker containers
docker compose down
```

---

## Project Structure

```
resume-copilot/
├── app/                  # Next.js App Router pages & API routes
├── components/           # React components
├── ai/                   # Python FastAPI AI service
│   ├── server.py         # FastAPI entrypoint
│   ├── NER/              # Skill extraction (JobBERT embeddings)
│   ├── matching/         # Resume-job matching & scoring
│   └── preprocessing/    # JD & resume parsers
├── db/                   # Drizzle ORM schema & client
├── services/             # Next.js → AI service API clients
└── docker-compose.yml    # Local PostgreSQL
```
