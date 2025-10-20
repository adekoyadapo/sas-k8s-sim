import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..deps import get_current_user
from ..core.security import decode_token
from ..db.session import get_db
from ..models.deployment import Deployment
from ..models.user import User
from ..schemas.deployments import DeploymentCreate, DeploymentOut, DeploymentStatus, ScaleRequest
from ..core.security import slugify, short_id
from ..core.config import settings
from ..services.k8s import (
    ensure_namespace,
    apply_nginx,
    NginxSpec,
    check_ready_strict,
    delete_namespace,
    wait_namespace_gone,
    get_deployment_report,
)
from kubernetes import client as k8s_client
from kubernetes.client import ApiException as K8sApiException
from ..services.helm import helm_upgrade_install, helm_uninstall
from kubernetes import client as k8s


router = APIRouter()


@router.post("/deployments", response_model=DeploymentOut)
def create_deployment(payload: DeploymentCreate, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    unique = short_id(5)
    user_slug = user.user_slug
    dep_slug = slugify(payload.displayName)
    namespace = f"tenant-{user_slug}-{unique}"
    host = f"{user_slug}-{unique}.{settings.cluster_domain}"
    name = dep_slug or f"{user_slug}-{unique}"

    # choose image and port based on server type
    st = (payload.serverType or "nginx").lower()
    image = "nginx:alpine"
    port = 80
    doc_root = "/usr/share/nginx/html"
    readiness_path = "/"
    readiness_delay = 5
    replicas = payload.replicas or 1
    if st in ("apache", "httpd"):
        image = "httpd:alpine"
        port = 80
        doc_root = "/usr/local/apache2/htdocs"
    elif st == "tomcat":
        image = "tomcat:9.0"
        port = 8080
        readiness_delay = 20

    d = Deployment(
        user_id=user.id,
        display_name=payload.displayName,
        slug=name,
        namespace=namespace,
        unique_id=unique,
        ingress_host=host,
        status="CREATING",
    )
    d.server_type = st
    db.add(d)
    db.commit()
    db.refresh(d)

    try:
        if settings.helm_enabled:
            values = {
                "nameOverride": name,
                "namespace": namespace,
                "host": host,
                "image": image,
                "containerPort": port,
                "servicePort": 80 if st=="tomcat" else port,
                "replicaCount": replicas,
                "readiness": {"path": readiness_path, "initialDelaySeconds": readiness_delay},
                "docRootPath": doc_root,
            }
            if payload.indexHtml and st != "tomcat":
                values["indexHtml"] = payload.indexHtml
            if st == "tomcat":
                values["command"] = ["catalina.sh","run"]
                values["lifecycle"] = {
                    "postStart": {
                        "enabled": True,
                        "command": [
                            "bash","-c",
                            "if [ ! -d /usr/local/tomcat/webapps/ROOT ]; then cp -r /usr/local/tomcat/webapps.dist/* /usr/local/tomcat/webapps/; fi"
                        ]
                    }
                }
            chart_dir = settings.helm_chart_path_tomcat if st == "tomcat" else settings.helm_chart_path
            try:
                helm_upgrade_install(namespace=namespace, release=name, chart_dir=chart_dir, values=values)
            except Exception as e:
                # Fallback to raw K8s apply if Helm fails
                ensure_namespace(namespace)
                apply_nginx(NginxSpec(namespace=namespace, name=name, host=host, image=image, port=port, index_html=payload.indexHtml if (payload.indexHtml and st!="tomcat") else None, doc_root_path=doc_root, readiness_path=readiness_path, readiness_delay=readiness_delay, command=["catalina.sh","run"] if st=="tomcat" else None, lifecycle_post_start=["bash","-c","if [ ! -d /usr/local/tomcat/webapps/ROOT ]; then cp -r /usr/local/tomcat/webapps.dist/* /usr/local/tomcat/webapps/; fi"] if st=="tomcat" else None, replicas=replicas))
                d.last_error = f"Helm fallback: {e}"
        else:
            ensure_namespace(namespace)
            apply_nginx(NginxSpec(namespace=namespace, name=name, host=host, image=image, port=port, index_html=payload.indexHtml if (payload.indexHtml and st!="tomcat") else None, doc_root_path=doc_root, readiness_path=readiness_path, readiness_delay=readiness_delay, command=["catalina.sh","run"] if st=="tomcat" else None, lifecycle_post_start=["bash","-c","if [ ! -d /usr/local/tomcat/webapps/ROOT ]; then cp -r /usr/local/tomcat/webapps.dist/* /usr/local/tomcat/webapps/; fi"] if st=="tomcat" else None, replicas=replicas))
        # Do not block HTTP: finalize in background to set READY strictly when done
        from ..tasks import finalize_deployment
        background.add_task(finalize_deployment, str(d.id))
        d.status = "CREATING"
        d.last_error = None
    except Exception as e:
        d.status = "ERROR"
        d.last_error = str(e)
    finally:
        db.add(d)
        db.commit()

    return DeploymentOut(
        id=d.id,
        display_name=d.display_name,
        slug=d.slug,
        namespace=d.namespace,
        unique_id=d.unique_id,
        ingress_host=d.ingress_host,
        status=d.status,
        last_error=d.last_error,
        server_type=d.server_type,
    )


@router.get("/deployments", response_model=list[DeploymentOut])
def list_deployments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ds = (
        db.query(Deployment)
        .filter(Deployment.user_id == user.id)
        .order_by(Deployment.created_at.desc())
        .all()
    )
    items: list[DeploymentOut] = []
    for d in ds:
        reps = None
        try:
            rep = get_deployment_report(d.namespace, d.slug)
            reps = rep
        except Exception:
            reps = None
        items.append(
            DeploymentOut(
                id=d.id,
                display_name=d.display_name,
                slug=d.slug,
                namespace=d.namespace,
                unique_id=d.unique_id,
                ingress_host=d.ingress_host,
                status=d.status,
                last_error=d.last_error,
                server_type=d.server_type,
                replicas=reps.get("replicas") if reps else None,
                ready_replicas=reps.get("ready_replicas") if reps else None,
                available_replicas=reps.get("available_replicas") if reps else None,
                updated_replicas=reps.get("updated_replicas") if reps else None,
                endpoints=reps.get("endpoints") if reps else None,
            )
        )
    return items


@router.get("/deployments/{id}", response_model=DeploymentOut)
def get_deployment(id: _uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    # include live counts in the single get response
    reps = None
    try:
        reps = get_deployment_report(d.namespace, d.slug)
    except Exception:
        reps = None
    return DeploymentOut(
        id=d.id,
        display_name=d.display_name,
        slug=d.slug,
        namespace=d.namespace,
        unique_id=d.unique_id,
        ingress_host=d.ingress_host,
        status=d.status,
        server_type=d.server_type,
        last_error=d.last_error,
        replicas=reps.get("replicas") if reps else None,
        ready_replicas=reps.get("ready_replicas") if reps else None,
        available_replicas=reps.get("available_replicas") if reps else None,
        updated_replicas=reps.get("updated_replicas") if reps else None,
        endpoints=reps.get("endpoints") if reps else None,
    )


@router.get("/deployments/{id}/status", response_model=DeploymentStatus)
def get_deployment_status(id: _uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    # best-effort live check
    status = d.status
    report = None
    try:
        status = check_ready_strict(d.namespace, d.slug)
        report = get_deployment_report(d.namespace, d.slug)
    except Exception:
        pass
    return DeploymentStatus(
        id=d.id,
        status=status,
        last_error=d.last_error,
        replicas=report.get("replicas") if report else None,
        ready_replicas=report.get("ready_replicas") if report else None,
        available_replicas=report.get("available_replicas") if report else None,
        updated_replicas=report.get("updated_replicas") if report else None,
        endpoints=report.get("endpoints") if report else None,
        pods=report.get("pods") if report else None,
    )


@router.patch("/deployments/{id}/scale", response_model=DeploymentOut)
def scale_deployment(id: _uuid.UUID, payload: ScaleRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    n = max(1, int(payload.replicas))
    st = (d.server_type or "nginx").lower()

    image = "nginx:alpine"; port = 80
    doc_root = "/usr/share/nginx/html"; readiness_path = "/"; readiness_delay = 5
    if st in ("apache", "httpd"):
        image = "httpd:alpine"; port = 80; doc_root = "/usr/local/apache2/htdocs"
    elif st == "tomcat":
        image = "tomcat:9.0"; port = 8080; readiness_delay = 20
    chart_dir = settings.helm_chart_path_tomcat if st == "tomcat" else settings.helm_chart_path

    if settings.helm_enabled:
        try:
            values = {
                "nameOverride": d.slug,
                "namespace": d.namespace,
                "host": d.ingress_host,
                "image": image,
                "containerPort": port,
                "servicePort": 80 if st=="tomcat" else port,
                "replicaCount": n,
                "readiness": {"path": readiness_path, "initialDelaySeconds": readiness_delay},
                "docRootPath": doc_root,
            }
            helm_upgrade_install(namespace=d.namespace, release=d.slug, chart_dir=chart_dir, values=values)
        except Exception as e:
            try:
                k8s.AppsV1Api().patch_namespaced_deployment(name=d.slug, namespace=d.namespace, body={"spec": {"replicas": n}})
                d.last_error = f"Scale fallback: {e}"
            except Exception as ee:
                raise HTTPException(status_code=500, detail=str(ee))
    else:
        try:
            k8s.AppsV1Api().patch_namespaced_deployment(name=d.slug, namespace=d.namespace, body={"spec": {"replicas": n}})
        except Exception as ee:
            raise HTTPException(status_code=500, detail=str(ee))

    rep = None
    try:
        rep = get_deployment_report(d.namespace, d.slug)
    except Exception:
        rep = None
    return DeploymentOut(
        id=d.id,
        display_name=d.display_name,
        slug=d.slug,
        namespace=d.namespace,
        unique_id=d.unique_id,
        ingress_host=d.ingress_host,
        status=d.status,
        last_error=d.last_error,
        server_type=d.server_type,
        replicas=rep.get("replicas") if rep else None,
        ready_replicas=rep.get("ready_replicas") if rep else None,
        available_replicas=rep.get("available_replicas") if rep else None,
        updated_replicas=rep.get("updated_replicas") if rep else None,
        endpoints=rep.get("endpoints") if rep else None,
    )


@router.get("/deployments/{id}/events")
def stream_deployment_events(id: _uuid.UUID, request: Request, db: Session = Depends(get_db)):
    # authenticate via Authorization header or token query parameter
    auth = request.headers.get("authorization") or ""
    token = request.query_params.get("token")
    sub = None
    if auth.lower().startswith("bearer "):
        try:
            sub = decode_token(auth.split()[1]).get("sub")
        except Exception:
            sub = None
    if not sub and token:
        try:
            sub = decode_token(token).get("sub")
        except Exception:
            sub = None
    if not sub:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(User).filter(User.email == sub).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")

    def iter_events():
        import json
        import time
        deadline = time.time() + 180
        while time.time() < deadline:
            try:
                status = check_ready_strict(d.namespace, d.slug)
                report = get_deployment_report(d.namespace, d.slug)
                # Tail last N lines of pod logs for deeper insight
                logs: dict = {}
                try:
                    core = k8s_client.CoreV1Api()
                    pods = core.list_namespaced_pod(d.namespace, label_selector=f"app={d.slug}").items
                    for p in pods:
                        pod_logs = {}
                        spec = p.spec or None
                        containers = getattr(spec, 'containers', []) or []
                        for c in containers:
                            try:
                                text = core.read_namespaced_pod_log(p.metadata.name, d.namespace, container=c.name, tail_lines=40, timestamps=True)
                                pod_logs[c.name] = text
                            except K8sApiException:
                                pod_logs[c.name] = ''
                        logs[p.metadata.name] = pod_logs
                except Exception:
                    logs = {}
            except Exception:
                status = d.status
                report = None
                logs = {}
            payload = {
                "id": str(d.id),
                "status": status,
                "report": report or {},
                "logs": logs,
                "ts": int(time.time()),
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if status in {"READY", "ERROR"}:
                break
            time.sleep(2)
        yield "event: end\n\n"

    return StreamingResponse(iter_events(), media_type="text/event-stream")


@router.get("/deployments/{id}/details")
def get_deployment_details(id: _uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    from ..services.k8s import get_deployment_report, get_pod_details, get_namespace_events
    try:
        report = get_deployment_report(d.namespace, d.slug)
        pods = get_pod_details(d.namespace, d.slug)
        events = get_namespace_events(d.namespace, field_selector=f"involvedObject.kind=Pod,involvedObject.namespace={d.namespace}")
    except Exception:
        report, pods, events = {}, [], []
    return {"report": report, "pods": pods, "events": events}


@router.delete("/deployments/{id}")
def delete_deployment(id: _uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.query(Deployment).filter(Deployment.id == id, Deployment.user_id == user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    d.status = "DELETING"
    db.commit()
    try:
        if settings.helm_enabled:
            helm_uninstall(namespace=d.namespace, release=d.slug)
        delete_namespace(d.namespace)
        wait_namespace_gone(d.namespace)
        # scrub from DB after confirmed deletion
        db.delete(d)
        db.commit()
        return {"ok": True}
    except Exception as e:
        d.status = "ERROR"
        d.last_error = str(e)
        db.add(d)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
