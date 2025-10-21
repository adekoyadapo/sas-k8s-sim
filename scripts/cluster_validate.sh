#!/usr/bin/env bash
set -euo pipefail

echo "Validating cluster connectivity..."
kubectl cluster-info >/dev/null

echo "Checking nodes are Ready..."
kubectl get nodes
NODES_JSON=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .status.conditions[*]}{.type}={.status}{"\n"}{end}{end}')
echo "$NODES_JSON" | grep -q 'Ready=True'

echo "Checking ingress controller..."
name=$(kubectl -n kube-system get deploy -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -n "$name" ]]; then
  echo "Traefik detected (k3d/k3s)."
  INGRESS_CLASS=""
  kubectl -n kube-system rollout status deploy/"$name" --timeout=180s
else
  echo "ingress-nginx detected (or Traefik not present)."
  INGRESS_CLASS="nginx"
  kubectl -n ingress-nginx get deploy ingress-nginx-controller
fi

echo "Creating test namespace and app..."
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
if [[ -f "$repo_root/.cluster.env" ]]; then source "$repo_root/.cluster.env"; fi
CLUSTER_DOMAIN="${CLUSTER_DOMAIN:-10-0-10-253.sslip.io}"
HOST="test.${CLUSTER_DOMAIN}"

kubectl create ns saas-sim-test --dry-run=client -o yaml | kubectl apply -f -
if [[ -n "$INGRESS_CLASS" ]]; then
cat <<EOF | kubectl -n saas-sim-test apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: index-html
data:
  index.html: |
    <h1>sslip.io test OK</h1>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 1
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports: [{containerPort: 80}]
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: index-html
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: {app: web}
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: ${INGRESS_CLASS}
  rules:
  - host: ${HOST}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
EOF
else
cat <<EOF | kubectl -n saas-sim-test apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: index-html
data:
  index.html: |
    <h1>sslip.io test OK</h1>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 1
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports: [{containerPort: 80}]
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: index-html
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: {app: web}
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  rules:
  - host: ${HOST}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
EOF
fi

echo "Waiting for deployment to be ready..."
kubectl -n saas-sim-test rollout status deploy/web --timeout=180s

echo "Waiting for ingress to respond (curl) ..."
tries=60
while [ $tries -gt 0 ]; do
  if curl -fsS "http://${HOST}/" >/dev/null 2>&1; then echo "HTTP 200 OK"; break; fi
  tries=$((tries-1))
  sleep 2
done
echo "Test resources applied. Open: http://${HOST}"
echo "Cleaning up test namespace..."
kubectl delete ns saas-sim-test --ignore-not-found=true
echo "Validation finished."
