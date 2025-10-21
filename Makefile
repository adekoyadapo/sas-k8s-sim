# Placeholder Makefile (targets will be implemented by your coding assistant)
.PHONY: cluster-up cluster-validate cluster-down up down dev test-backend shellcheck k3d-reset traefik-dashboard

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
	bash ./scripts/k3d_resize.sh
