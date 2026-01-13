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
- Admin:
  - POST /admin/login, /admin/refresh (default creds via env: ADMIN_USER=admin, ADMIN_PASSWORD=admin)
  - GET /admin/stats (platform-wide counts and cluster overview)
  - GET /admin/tenants?live=true|false (list all users and their deployments; live enriches with K8s readiness)

Notes:
- Helm charts: nginx/apache -> helm/tenant-nginx, tomcat -> helm/tenant-tomcat
- Alembic runs automatically in container entrypoint.
- Admin JWTs include role=admin and are separate from user tokens.
