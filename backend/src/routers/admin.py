from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import create_access_token, create_refresh_token, decode_token
from ..db.session import get_db
from ..deps import get_current_admin
from ..models.user import User
from ..models.deployment import Deployment
from ..services.k8s import get_cluster_overview, get_deployment_report

router = APIRouter()


@router.post("/login")
def admin_login(payload: dict):
    """Admin login with username/password from config (default admin/admin)."""
    username = str(payload.get("username", ""))
    password = str(payload.get("password", ""))
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing credentials")
    if username != settings.admin_user or password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token(sub=f"admin:{username}", role="admin")
    refresh = create_refresh_token(sub=f"admin:{username}", role="admin")
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


@router.post("/refresh")
def admin_refresh(payload: dict):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing refresh token")
    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if data.get("type") != "refresh" or data.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid token type")
    sub = data.get("sub") or "admin:unknown"
    return {"access_token": create_access_token(sub=sub, role="admin"), "refresh_token": create_refresh_token(sub=sub, role="admin"), "token_type": "bearer"}


@router.get("/stats")
def admin_stats(_: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    users_count = db.query(User).count()
    deployments_count = db.query(Deployment).count()
    # Status breakdown
    status_rows = db.query(Deployment.status).all()
    by_status: dict[str, int] = {}
    for (st,) in status_rows:
        by_status[st] = by_status.get(st, 0) + 1
    # Server type breakdown
    st_rows = db.query(Deployment.server_type).all()
    by_server: dict[str, int] = {}
    for (st,) in st_rows:
        k = (st or "nginx").lower()
        by_server[k] = by_server.get(k, 0) + 1

    cluster = get_cluster_overview()
    return {
        "users": users_count,
        "deployments": deployments_count,
        "by_status": by_status,
        "by_server": by_server,
        "cluster": cluster,
    }


@router.get("/tenants")
def admin_tenants(live: bool = Query(False), _: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    # Map user id to deployments
    deps = db.query(Deployment).order_by(Deployment.created_at.desc()).all()
    by_user: dict[int, list] = {}
    for d in deps:
        item = {
            "id": str(d.id),
            "display_name": d.display_name,
            "slug": d.slug,
            "namespace": d.namespace,
            "ingress_host": d.ingress_host,
            "status": d.status,
            "server_type": d.server_type,
            "created_at": str(d.created_at),
        }
        if live:
            try:
                rep = get_deployment_report(d.namespace, d.slug)
            except Exception:
                rep = None
            if rep:
                item.update({
                    "replicas": rep.get("replicas"),
                    "ready_replicas": rep.get("ready_replicas"),
                    "available_replicas": rep.get("available_replicas"),
                    "updated_replicas": rep.get("updated_replicas"),
                    "endpoints": rep.get("endpoints"),
                })
        by_user.setdefault(d.user_id, []).append(item)
    tenants = []
    for u in users:
        tenants.append({
            "id": u.id,
            "email": u.email,
            "user_slug": u.user_slug,
            "created_at": str(u.created_at),
            "deployments": by_user.get(u.id, []),
        })
    return tenants
