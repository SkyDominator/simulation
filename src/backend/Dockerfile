FROM python:3.11.6

# Install git and utilities (kept minimal for faster build)
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Dedicated location for virtual environment so source bind-mounts do NOT overwrite it
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV" \
 && "$VIRTUAL_ENV/bin/pip" install --upgrade pip setuptools wheel
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app/src/backend

# Copy only requirements first for layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (bind mount will override in dev; still useful for image-based tasks)
COPY . .

EXPOSE 8000

# Default command (overridden by docker-compose for long‑running idle container in dev)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]