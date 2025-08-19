FROM python:3.11.6

# Install git and minimal utilities
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl bash ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Dedicated virtual environment lives outside cloned source (which will be in /app)
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV" \
 && "$VIRTUAL_ENV/bin/pip" install --upgrade pip setuptools wheel
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Working directory will point to backend source AFTER clone performed by entrypoint
WORKDIR /app/src/backend

EXPOSE 8000

# Default command (compose overrides with explicit entrypoint script execution)
CMD ["/bin/bash", "/entrypoints/backend-entrypoint.sh"]