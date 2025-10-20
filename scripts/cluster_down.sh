#!/usr/bin/env bash
set -euo pipefail

if command -v kind >/dev/null 2>&1; then
  kind delete cluster --name saas-sim || true
fi

if command -v k3d >/dev/null 2>&1; then
  k3d cluster delete saas-sim || true
fi

echo "Cluster deleted (if existed)."
