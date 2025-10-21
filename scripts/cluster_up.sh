#!/usr/bin/env bash
set -euo pipefail

PROVIDER="${1:-auto}"

detect_provider() {
  if command -v k3d  >/dev/null 2>&1; then echo "k3d"; return; fi
  if command -v kind >/dev/null 2>&1; then echo "kind"; return; fi
  echo "none"
}

provider="${PROVIDER}"
if [[ "${provider}" == "auto" ]]; then
  provider="$(detect_provider)"
fi

if [[ "${provider}" == "none" ]]; then
  echo "No kind or k3d found. Please install one of them."; exit 1
fi

echo "Using provider: ${provider}"

if [[ "${provider}" == "kind" ]]; then
  kind create cluster --name saas-sim || true
elif [[ "${provider}" == "k3d" ]]; then
  # Expose host ports 80 and 443 via the server loadbalancer and use 2 agents
  k3d cluster create saas-sim -p "80:80@loadbalancer" -p "443:443@loadbalancer" --agents 2 || true
fi

if [[ "${provider}" == "k3d" ]]; then
  echo "k3d detected: using built-in Traefik (no ingress-nginx install)."
  echo "Waiting for Traefik to be ready..."
  # traefik is deployed in kube-system by k3s; wait for deployment to appear
  attempts=90
  name=""
  while [ $attempts -gt 0 ]; do
    name=$(kubectl -n kube-system get deploy -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "$name" ]; then
      break
    fi
    attempts=$((attempts-1))
    sleep 2
  done
  if [ -z "$name" ]; then
    # Fallback: try the canonical name
    if kubectl -n kube-system get deploy traefik >/dev/null 2>&1; then
      name=traefik
    else
      echo "Traefik deployment not found in kube-system (k3d)." >&2
      kubectl -n kube-system get deploy -l app.kubernetes.io/name=traefik || true
      exit 1
    fi
  fi
  kubectl -n kube-system rollout status deploy/"$name" --timeout=180s
  echo "Cluster is up and Traefik is ready."
else
  echo "Installing ingress-nginx via Helm..."
  kubectl create ns ingress-nginx --dry-run=client -o yaml | kubectl apply -f - || true
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
  helm repo update >/dev/null 2>&1 || true
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --set controller.publishService.enabled=true
  echo "Waiting for ingress controller to be ready..."
  kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s
  echo "Cluster is up and ingress-nginx is ready."
fi
kubectl get nodes -o wide

# Prepare kubeconfig usable from Docker containers
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$repo_root/.kube-in-docker"
outfile="$repo_root/.kube-in-docker/kubeconfig"
if [[ "${provider}" == "kind" ]]; then
  kind get kubeconfig --name saas-sim | sed -e 's/127.0.0.1/host.docker.internal/g' -e 's/localhost/host.docker.internal/g' > "$outfile"
elif [[ "${provider}" == "k3d" ]]; then
  k3d kubeconfig get saas-sim | sed -e 's/127.0.0.1/host.docker.internal/g' -e 's/0.0.0.0/host.docker.internal/g' -e 's/localhost/host.docker.internal/g' > "$outfile"
fi
# For container access, skip TLS verify (kind certs don't include host.docker.internal)
tmpfile="${outfile}.tmp"
awk 'BEGIN{skip=0} /certificate-authority-data:/ {print "    insecure-skip-tls-verify: true"; skip=1; next} {if(!skip) print $0; else if($0 !~ /certificate-authority-data:/) print $0}' "$outfile" > "$tmpfile" && mv "$tmpfile" "$outfile"
if [[ "${STRICT_TLS:-false}" != "true" ]]; then
  sed -i.bak -E 's/^\s*certificate-authority-data:.*$/    insecure-skip-tls-verify: true/' "$outfile" || true
  rm -f "$outfile.bak"
  echo "Wrote container-friendly kubeconfig to .kube-in-docker/kubeconfig (TLS verify disabled)"
else
  echo "Wrote kubeconfig to .kube-in-docker/kubeconfig (TLS verify kept strict)"
fi

# Detect host IP (macOS: en0/en1; Linux: ip route) and publish sslip.io domain
detect_ip() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  else
    ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") {print $(i+1); exit}}'
  fi
}

HOST_IP="${HOST_IP_OVERRIDE:-}"
if [[ -z "${HOST_IP}" ]]; then HOST_IP="$(detect_ip)"; fi
if [[ -n "${HOST_IP}" ]]; then
  DASHED_IP="$(echo "$HOST_IP" | tr '.' '-')"
  CLUSTER_DOMAIN="${DASHED_IP}.sslip.io"
  echo "Detected host IP: ${HOST_IP} -> domain: ${CLUSTER_DOMAIN}"
  echo "CLUSTER_DOMAIN=${CLUSTER_DOMAIN}" > "$repo_root/.cluster.env"
  echo "Wrote $repo_root/.cluster.env for docker compose environment"
else
  echo "Warning: could not detect host IP; using default domain if provided."
fi
