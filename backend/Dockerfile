FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gcc build-essential git bash \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY src ./src
COPY entrypoint.sh ./entrypoint.sh

ENV PYTHONPATH=/app/src

EXPOSE 8000

RUN chmod +x /app/entrypoint.sh

# Install Helm v3
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
