#!/usr/bin/env bash
set -euo pipefail

python - <<'PY'
import os, time
import psycopg
url = os.environ.get('DATABASE_URL')
if url and '+psycopg' in url:
    url = url.replace('+psycopg', '')
for i in range(60):
    try:
        with psycopg.connect(url, connect_timeout=3) as conn:
            print('[entrypoint] DB reachable')
            break
    except Exception as e:
        print('[entrypoint] Waiting for DB...', e)
        time.sleep(2)
else:
    raise SystemExit('DB not reachable')
PY

echo "[entrypoint] Running DB migrations..."
alembic upgrade head

echo "[entrypoint] Starting API..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000
