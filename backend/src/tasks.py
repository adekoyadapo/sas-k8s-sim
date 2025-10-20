from __future__ import annotations
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from .core.config import settings
from .models.deployment import Deployment
from .services.k8s import (
    wait_deployment_ready,
    wait_service_endpoints_ready,
    check_ready_strict,
)


def finalize_deployment(deployment_id: str) -> None:
    """Background task: wait for K8s readiness then mark DB record READY/ERROR."""
    engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    db = SessionLocal()
    try:
        d = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not d:
            return
        try:
            wait_deployment_ready(d.namespace, d.slug)
            wait_service_endpoints_ready(d.namespace, d.slug)
            d.status = check_ready_strict(d.namespace, d.slug)
            d.last_error = None
        except Exception as e:
            d.status = "ERROR"
            d.last_error = str(e)
        db.add(d)
        db.commit()
    finally:
        db.close()
