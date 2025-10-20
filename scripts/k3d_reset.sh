#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${1:-saas-sim}"

echo "Deleting k3d cluster '${CLUSTER_NAME}' (if exists)..."
if command -v k3d >/dev/null 2>&1; then
  k3d cluster delete "${CLUSTER_NAME}" || true
else
  echo "k3d not found; please install k3d"; exit 1
fi

echo "Recreating k3d cluster '${CLUSTER_NAME}' with 80/443 exposed..."
STRICT_TLS="${STRICT_TLS:-false}" PROVIDER="k3d" bash "$(dirname "$0")/cluster_up.sh"
echo "Cluster '${CLUSTER_NAME}' recreated."

