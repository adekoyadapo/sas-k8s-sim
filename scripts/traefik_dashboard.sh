#!/usr/bin/env bash
set -euo pipefail

DOMAIN_BASE="${1:-10-0-10-253.sslip.io}"
HOST="traefik.${DOMAIN_BASE}"

echo "Enabling Traefik dashboard at http://${HOST} (no auth, dev only)"
cat <<'EOF' | kubectl -n kube-system apply -f -
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`$HOST`) && (PathPrefix(`/dashboard`) || PathPrefix(`/api`))
      kind: Rule
      services:
        - name: api@internal
          kind: TraefikService
EOF

echo "Open: http://${HOST}/dashboard/"
