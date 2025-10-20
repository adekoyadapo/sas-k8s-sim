# Next.js Frontend (Admin Dashboard)

Dev scripts:
```
npm install
npm run dev
```

With Docker Compose (recommended):
```
cp ../.env.example ../.env
make up   # from repo root
```

Env:
- `NEXT_PUBLIC_API_BASE_URL` (defaults to http://localhost:8000)

Features:
- Auth (register/login), Dashboard with create/delete deployments
- Server types: Nginx, Apache, Tomcat
- Live progress + logs (SSE), sticky cluster health bar
