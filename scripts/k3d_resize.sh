#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-saas-sim}"
DESIRED="${AGENTS:-}"
CPU_LIMIT="${AGENT_CPU:-}"
MEM_LIMIT="${AGENT_MEM:-}"
ASSUME_YES=${ASSUME_YES:-0}

print_usage() {
  cat >&2 <<EOF
Usage:
  AGENTS=<count> [AGENT_CPU=<cpus>] [AGENT_MEM=<bytes|e.g., 2g>] [CLUSTER_NAME=<name>] make k3d-resize [ARGS="-y"]
  OR: bash scripts/k3d_resize.sh [-y|--yes]

Examples:
  AGENTS=3 make k3d-resize
  AGENTS=4 AGENT_CPU=2 AGENT_MEM=4g make k3d-resize
  CLUSTER_NAME=saas-sim AGENTS=2 make k3d-resize
  make k3d-resize ARGS=-y        # accept defaults interactively
  ASSUME_YES=1 make k3d-resize   # same as -y
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 not found; please install $1" >&2
    exit 1
  fi
}

is_tty() {
  [[ -t 0 ]] && [[ -t 1 ]]
}

prompt() {
  # $1 message, $2 default
  local msg="$1"
  local def="${2:-}"
  if [[ -n "$def" ]]; then
    printf "%s [%s]: " "$msg" "$def" >&2
  else
    printf "%s: " "$msg" >&2
  fi
  # shellcheck disable=SC2162
  read -r ans || true
  if [[ -z "${ans:-}" ]]; then
    printf "%s" "$def"
  else
    printf "%s" "$ans"
  fi
}

confirm() {
  local msg="$1"; shift || true
  printf "%s [Y/n]: " "$msg" >&2
  # shellcheck disable=SC2162
  read -r ans || true
  case "${ans:-}" in
    y|Y|yes|YES|Yes|"" ) return 0 ;;
    * ) return 1 ;;
  esac
}

require_cmd k3d
require_cmd kubectl

# Helpers to list and parse agent nodes reliably across k3d versions
list_agent_nodes() {
  # Outputs names of agent nodes that belong to the given cluster
  k3d node list | awk -v c="${CLUSTER_NAME}" 'NR>1 && $2=="agent" && $3==c {print $1}' || true
}

agent_index() {
  # Extract the first numeric index following 'agent-' from a node name
  # e.g., k3d-saas-sim-agent-2 -> 2 ; k3d-saas-sim-agent-2-0 -> 2
  echo "$1" | sed -E 's/^.*agent-([0-9]+).*/\1/'
}

## Parse CLI flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      ASSUME_YES=1; shift ;;
    -h|--help)
      print_usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage; exit 2 ;;
  esac
done

echo "Inspecting current agent count for cluster '${CLUSTER_NAME}'..."
CURRENT=$(list_agent_nodes | wc -l | tr -d ' ')

if [[ -z "${DESIRED}" ]]; then
  if [[ "${ASSUME_YES}" == "1" ]]; then
    echo "--yes provided with no AGENTS; using defaults based on current cluster."
    DEFAULT_DESIRED="$CURRENT"
    DEFAULT_CPU="$CPU_LIMIT"
    DEFAULT_MEM="$MEM_LIMIT"
    DESIRED="${DEFAULT_DESIRED:-0}"
    CPU_LIMIT="${DEFAULT_CPU}"
    MEM_LIMIT="${DEFAULT_MEM}"
  elif is_tty; then
    echo "No AGENTS provided via environment; switching to interactive mode."
    DEFAULT_DESIRED="$CURRENT"
    DEFAULT_CPU="$CPU_LIMIT"
    DEFAULT_MEM="$MEM_LIMIT"
    echo "Defaults:" 
    echo "  desired agents = ${DEFAULT_DESIRED:-0} (current=${CURRENT:-0})"
    echo "  cpu limit      = ${DEFAULT_CPU:-<no change>}"
    echo "  memory limit   = ${DEFAULT_MEM:-<no change>}"
    if confirm "Proceed with these defaults?"; then
      DESIRED="${DEFAULT_DESIRED:-0}"
      CPU_LIMIT="${DEFAULT_CPU}"
      MEM_LIMIT="${DEFAULT_MEM}"
    else
      echo "Okay, let's customize. Hints: use integers for agents, cpus like '2' and memory like '2g' or '512m'."
      # Desired agents
      while :; do
        ans=$(prompt "Enter desired agent count" "${DEFAULT_DESIRED:-$CURRENT}")
        if [[ "$ans" =~ ^[0-9]+$ ]]; then
          DESIRED="$ans"; break
        else
          echo "Please enter a non-negative integer for agent count." >&2
        fi
      done
      # CPU limit
      ans=$(prompt "Optional CPU limit (e.g., 2). Leave blank for no change" "${DEFAULT_CPU}")
      CPU_LIMIT="$ans"
      # Memory limit
      ans=$(prompt "Optional memory limit (e.g., 2g or 512m). Leave blank for no change" "${DEFAULT_MEM}")
      MEM_LIMIT="$ans"
      echo "Planned changes:" 
      echo "  desired agents = ${DESIRED} (current=${CURRENT:-0})"
      echo "  cpu limit      = ${CPU_LIMIT:-<no change>}"
      echo "  memory limit   = ${MEM_LIMIT:-<no change>}"
      confirm "Proceed?" || { echo "Canceled by user."; exit 130; }
    fi
  else
    echo "No AGENTS provided and not running in a TTY."
    print_usage
    exit 2
  fi
fi

# Validate DESIRED numeric
if ! [[ "$DESIRED" =~ ^[0-9]+$ ]]; then
  echo "AGENTS must be a non-negative integer (got: '$DESIRED')." >&2
  print_usage
  exit 2
fi

echo "Current agents: ${CURRENT}; desired: ${DESIRED}"

if (( DESIRED > CURRENT )); then
  INC=$((DESIRED - CURRENT))
  echo "Adding ${INC} agent node(s)..."
  count=$INC

  # Determine next index and name prefix for agents
  existing_names="$(list_agent_nodes)"
  if [[ -n "${existing_names}" ]]; then
    # Create-name prefix should NOT include the runtime 'k3d-' prefix; k3d will add it.
    # Derive prefix from an existing node name by removing leading 'k3d-' (possibly repeated)
    # and the numeric/replica suffix.
    create_prefix="$(echo "$existing_names" | head -n1 | sed -E 's/^(k3d-)+//; s/^(.+agent-)[0-9]+.*$/\1/')"
    maxindex="$(echo "$existing_names" | sed -E 's/^.*agent-([0-9]+).*/\1/' | sort -n | tail -n1)"
    next=$((maxindex + 1))
  else
    create_prefix="${CLUSTER_NAME}-agent-"
    next=0
  fi

  while [ $count -gt 0 ]; do
    create_name="${create_prefix}${next}"
    echo "Creating node ${create_name}..."
    k3d node create "${create_name}" --role agent --cluster "${CLUSTER_NAME}"
    next=$((next+1))
    count=$((count-1))
  done
elif (( DESIRED < CURRENT )); then
  DEC=$((CURRENT - DESIRED))
  echo "Removing ${DEC} agent node(s)..."
  # Sort nodes by their agent index descending, so we remove the highest indices first
  NODES=$(list_agent_nodes | while read -r n; do idx=$(agent_index "$n"); echo "$idx $n"; done | sort -nr | awk '{print $2}')
  # Prepare helpers to drain and fully remove nodes
  drain_node() {
    local node_name="$1"
    echo "Draining node ${node_name} (ignore-daemonsets, delete-emptydir-data)..."
    kubectl drain "${node_name}" \
      --ignore-daemonsets \
      --delete-emptydir-data \
      --force \
      --grace-period=30 \
      --timeout=120s || true
  }
  remove_node() {
    local node_name="$1"
    echo "Deleting node ${node_name} from k3d..."
    k3d node delete "${node_name}" || true
    echo "Deleting Kubernetes Node resource ${node_name}..."
    kubectl delete node "${node_name}" --ignore-not-found=true >/dev/null 2>&1 || true
    # Wait up to ~60s for the node to disappear from the API to avoid ghost NotReady entries
    attempts=30
    while kubectl get node "${node_name}" >/dev/null 2>&1 && [ $attempts -gt 0 ]; do
      sleep 2
      attempts=$((attempts - 1))
    done
  }

  for n in $NODES; do
    if (( DEC <= 0 )); then break; fi
    drain_node "${n}"
    remove_node "${n}"
    DEC=$((DEC - 1))
  done
else
  echo "Agent count already at desired size." 
fi

# Optional: update Docker resource limits for agent containers
if [[ -n "${CPU_LIMIT}" || -n "${MEM_LIMIT}" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Warning: docker not found; skipping resource limit updates." >&2
  else
    echo "Updating agent Docker resource limits..." 
    for c in $(list_agent_nodes); do
      args=()
      [[ -n "${CPU_LIMIT}" ]] && args+=(--cpus "${CPU_LIMIT}")
      [[ -n "${MEM_LIMIT}" ]] && args+=(--memory "${MEM_LIMIT}")
      if (( ${#args[@]} )); then
        echo "docker update ${args[*]} ${c}"
        docker update "${args[@]}" "${c}" >/dev/null
      fi
    done
  fi
fi

# Cleanup: remove any stale Kubernetes Node objects that no longer have a corresponding k3d node
runtime_agents=$(list_agent_nodes | sort)
k8s_agents=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | grep -F -- "-${CLUSTER_NAME}-agent-" | sort || true)
if [[ -n "${k8s_agents}" ]]; then
  # Orphans = in k8s_agents but not in runtime_agents
  orphans=$(comm -23 <(echo "$k8s_agents") <(echo "$runtime_agents") || true)
  if [[ -n "${orphans}" ]]; then
    echo "Cleaning up stale Kubernetes Node objects (no matching k3d node):"
    while IFS= read -r on; do
      [[ -z "$on" ]] && continue
      echo "  - $on"
    done <<< "$orphans"
    while read -r on; do
      [[ -z "$on" ]] && continue
      kubectl delete node "$on" --ignore-not-found=true >/dev/null 2>&1 || true
    done <<< "$orphans"
  fi
fi

echo "Done. Current nodes (k3d):"
k3d node list
echo "Kubernetes nodes:"
kubectl get nodes -o wide
