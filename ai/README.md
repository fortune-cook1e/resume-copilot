# Resume Copilot — AI Service

FastAPI service that provides JD parsing and resume-job matching endpoints used by the Next.js backend.

---

## Prerequisites

Install [uv](https://docs.astral.sh/uv/) if you haven't already:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# or via Homebrew
brew install uv
```

Verify the install:

```bash
uv --version
```

---

## 1. Enter the `ai/` directory

All commands below must be run from inside the `ai/` folder:

```bash
cd ai
```

---

## 2. Create the virtual environment & install dependencies

`uv` reads `pyproject.toml` and `uv.lock` to reproduce the exact environment:

```bash
uv sync
```

This will:

- Create `.venv/` automatically (Python 3.13 as specified in `.python-version`)
- Install all dependencies locked in `uv.lock`

If you add a new package later:

```bash
uv add <package-name>        # adds to pyproject.toml + updates uv.lock
uv sync                      # re-sync the environment
```

---

## 3. Start the development server

```bash
uv run uvicorn server:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.  
Interactive docs: **http://localhost:8000/docs**

---

## 4. Start the production server

```bash
uv run uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## 5. Environment variables

| Variable             | Default                 | Description                           |
| -------------------- | ----------------------- | ------------------------------------- |
| `PORT`               | `8000`                  | Port the service listens on           |
| `PYTHON_SERVICE_URL` | `http://localhost:8000` | Used by Next.js to reach this service |

Create a `.env` file in `ai/` if needed (uvicorn doesn't auto-load it — use `python-dotenv` or pass vars inline):

```bash
PORT=8000 uv run uvicorn server:app --reload --port 8000
```

---

## Datasets

- [Resume datasets](https://huggingface.co/datasets/datasetmaster/resumes)
- [Job description datasets](https://huggingface.co/datasets/gpriday/job-titles)
