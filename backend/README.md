# Backend (FastAPI)

Run standalone (optional):
```
python -m pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://postgres:example@localhost:5432/postgres
alembic upgrade head
uvicorn src.main:app --reload
```

With Docker Compose (recommended):
```
cp ../.env.example ../.env
make up   # from repo root
```

Endpoints:
- POST /auth/register, /auth/login
- POST /deployments (body: displayName, serverType, indexHtml?)
- GET /deployments, /deployments/{id}, /deployments/{id}/status

Notes:
- Helm charts: nginx/apache -> helm/tenant-nginx, tomcat -> helm/tenant-tomcat
- Alembic runs automatically in container entrypoint.
