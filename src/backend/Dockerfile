FROM python:3.11.6

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl bash ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV" \
 && "$VIRTUAL_ENV/bin/pip" install --upgrade pip setuptools wheel
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app

# Bake entrypoint scripts into image for self-contained runtime
COPY entrypoints /entrypoints
RUN chmod +x /entrypoints/*.sh

# The application source will be cloned at container start (see common-init.sh)

EXPOSE 8000

CMD ["/entrypoints/backend-entrypoint.sh"]