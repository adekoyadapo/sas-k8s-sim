# Placeholder Makefile (targets will be implemented by your coding assistant)
.DEFAULT_GOAL := help
.PHONY: help cluster-up cluster-validate cluster-down up down dev test-backend shellcheck k3d-reset traefik-dashboard k3d-resize

help:
	@echo "Make targets:" && \
	printf "  %-20s %s\n" \
	  "cluster-up" "Create local cluster (k3d/kind detected)" \
	  "cluster-validate" "Smoke test ingress connectivity" \
	  "up" "Build and start db+api+frontend via compose" \
	  "down" "Stop stack and remove volumes" \
	  "dev" "Convenience: cluster-up + up" \
	  "test-backend" "Run backend pytest suite" \
	  "shellcheck" "Lint scripts/*.sh" \
	  "k3d-reset" "Recreate k3d cluster from scratch" \
	  "k3d-resize" "Resize k3d agent nodes" \
	  "traefik-dashboard" "Expose Traefik dashboard (k3d dev only)" ; \
	 echo "" ; \
	 echo "k3d-resize usage:" ; \
	 echo "  AGENTS=<count> [AGENT_CPU=<cpus>] [AGENT_MEM=<bytes|e.g., 2g>] [CLUSTER_NAME=<name>] make k3d-resize [ARGS='-y']" ; \
	 echo "  Tip: omit AGENTS to get an interactive prompt, or pass ARGS=-y (or ASSUME_YES=1) to auto-accept defaults."

cluster-up:
	./scripts/cluster_up.sh

cluster-validate:
	./scripts/cluster_validate.sh

cluster-down:
	./scripts/cluster_down.sh

up:
	@if [ -f .cluster.env ]; then \
		echo "Using .cluster.env"; \
		docker compose --env-file .cluster.env up -d --build; \
	else \
		docker compose up -d --build; \
	fi

down:
	docker compose down -v

dev: cluster-up up

test-backend:
	cd backend && pytest -q || true

shellcheck:
	shellcheck scripts/*.sh

k3d-reset:
	STRICT_TLS=$(STRICT_TLS) bash ./scripts/k3d_reset.sh

traefik-dashboard:
	bash ./scripts/traefik_dashboard.sh

k3d-resize:
	bash ./scripts/k3d_resize.sh $(ARGS)
