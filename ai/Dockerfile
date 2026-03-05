# ==================================
# Python AI Service Dockerfile
# ==================================
FROM python:3.13-slim

WORKDIR /app

# Install uv package manager for faster dependency installation
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (much faster than pip)
RUN uv sync --frozen --no-dev

# Copy only necessary application files
COPY server.py main.py ./
COPY preprocessing/ ./preprocessing/
COPY matching/ ./matching/
COPY models/ ./models/
COPY llm/ ./llm/
COPY datasets/technical_skills.csv ./datasets/technical_skills.csv

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the FastAPI server
CMD ["uv", "run", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
