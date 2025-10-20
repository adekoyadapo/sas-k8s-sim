#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-saas-sim}"
DESIRED="${AGENTS:-}"
CPU_LIMIT="${AGENT_CPU:-}"
MEM_LIMIT="${AGENT_MEM:-}"

if [[ -z "${DESIRED}" ]]; then
  echo "Usage: AGENTS=<count> [AGENT_CPU=<cpus>] [AGENT_MEM=<bytes|e.g., 2g>] make k3d-resize" >&2
  exit 2
fi

if ! command -v k3d >/dev/null 2>&1; then
  echo "k3d not found; please install k3d" >&2; exit 1
fi

echo "Inspecting current agent count..."
CURRENT=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | grep -c "k3d-${CLUSTER_NAME}-agent-")
echo "Current agents: ${CURRENT}; desired: ${DESIRED}"

if (( DESIRED > CURRENT )); then
  INC=$((DESIRED - CURRENT))
  echo "Adding ${INC} agent node(s)..."
  count=$INC
  while [ $count -gt 0 ]; do
    k3d node create --role agent --cluster "${CLUSTER_NAME}"
    count=$((count-1))
  done
elif (( DESIRED < CURRENT )); then
  DEC=$((CURRENT - DESIRED))
  echo "Removing ${DEC} agent node(s)..."
  NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | grep "k3d-${CLUSTER_NAME}-agent-" | sort -Vr)
  for n in ${NODES}; do
    if (( DEC <= 0 )); then break; fi
    echo "Deleting node ${n}..."
    k3d node delete "${n}"
    DEC=$((DEC - 1))
  done
else
  echo "Agent count already at desired size." 
fi

# Optional: update Docker resource limits for agent containers
if [[ -n "${CPU_LIMIT}" || -n "${MEM_LIMIT}" ]]; then
  echo "Updating agent Docker resource limits..." 
  for c in $(docker ps --format '{{.Names}}' | grep "k3d-${CLUSTER_NAME}-agent-"); do
    args=()
    [[ -n "${CPU_LIMIT}" ]] && args+=(--cpus "${CPU_LIMIT}")
    [[ -n "${MEM_LIMIT}" ]] && args+=(--memory "${MEM_LIMIT}")
    if (( ${#args[@]} )); then
      echo "docker update ${args[*]} ${c}"
      docker update "${args[@]}" "${c}" >/dev/null
    fi
  done
fi

echo "Done. Current nodes:"
kubectl get nodes -o wide
