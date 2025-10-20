# Multitenant SaaS Simulator

Run a local, dockerized multitenant SaaS demo with Kind/K3d, FastAPI, Next.js, and Helm. Each tenant gets a namespace with a simple NGINX app behind ingress-nginx.

## Prerequisites
- Docker Desktop (or Docker Engine) and `docker compose`
- One: `kind` or `k3d`
- `kubectl` and `helm`

## Quick Start
1) Bootstrap cluster (k3d + Traefik, ports 80/443 on host)
```
make cluster-up        # creates k3d with -p "80:80@loadbalancer" -p "443:443@loadbalancer"
make cluster-validate  # deploys a test ingress and curls it until HTTP 200 OK
```

2) Start the stack (compose auto-loads .cluster.env)
```
cp .env.example .env
make up                # builds and starts db, api, frontend
```

Production profile (strict TLS)
```
# Provide a real kubeconfig at ./kubeconfig.prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# or set env STRICT_TLS=true then run: make cluster-up (keeps TLS strict in generated kubeconfig)
```

3) Use the app
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Register, then open the Dashboard and click “Create Deployment” (choose Nginx, Apache, or Tomcat).
- Hosts use your machine’s IP via sslip.io: `*.<dashed-ip>.sslip.io`.

## Behavior & Notes
- The API deploys via Helm:
  - Nginx/Apache: `helm/tenant-nginx/`
  - Tomcat: `helm/tenant-tomcat/`
- “Ready” only after the Deployment has `ready=updated=available=replicas` AND the Service has Endpoints. Deletes wait for the namespace to be fully gone before scrubbing the DB.
- Dev-only: the kubeconfig mounted into the API container disables TLS verification to allow connecting to `host.docker.internal`.
  - To use strict TLS, set `INSECURE_KUBE=false` (compose prod overlay) and mount a kubeconfig with valid certs.

## Common Commands
```
make down             # stop containers, remove volumes
make cluster-down     # delete the cluster
make dev              # cluster-up + up
make k3d-reset        # delete + recreate k3d with 80/443 exposed
make k3d-resize AGENTS=3 [AGENT_CPU=2] [AGENT_MEM=2g]
make traefik-dashboard # dev-only: expose Traefik dashboard
```

## Troubleshooting
- If the dashboard hangs on “Waiting…”, run `make cluster-validate` to ensure ingress is healthy.
- On first run, images and Helm downloads can take a few minutes.
