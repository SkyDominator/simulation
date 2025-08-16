FROM python:3.11.6

# install git and small utilities
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Set working directory to match the volume mount
WORKDIR /app/src/backend

# Copy requirements first for better caching
COPY requirements.txt .

# Create a virtualenv inside the project and install deps into it
RUN python -m venv backend-venv \
 && backend-venv/bin/python -m pip install --upgrade pip setuptools wheel \
 && backend-venv/bin/pip install --no-cache-dir -r requirements.txt

# Ensure the venv's bin is first on PATH
ENV PATH="/app/src/backend/backend-venv/bin:${PATH}"

# Copy application code (this will be overridden by volume mount in development)
COPY . .

# Expose port
EXPOSE 8000

# Default command (uses venv python / uvicorn installed in venv)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]