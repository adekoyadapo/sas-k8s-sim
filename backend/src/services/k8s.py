from __future__ import annotations
import os
from dataclasses import dataclass
 

from kubernetes import client, config
from kubernetes.client import ApiException
from tenacity import retry, stop_after_attempt, wait_fixed
import time

from ..core.config import settings


def _load_kube() -> None:
    if settings.kubeconfig and os.path.exists(settings.kubeconfig):
        config.load_kube_config(config_file=settings.kubeconfig)
    else:
        # Try in-cluster (if running with proper ServiceAccount)
        try:
            config.load_incluster_config()
        except Exception:
            # Fallback to default kubeconfig location
            try:
                config.load_kube_config()
            except Exception as e:
                raise RuntimeError(f"Failed to load kube config: {e}")
    if settings.insecure_kube:
        try:
            cfg = client.Configuration.get_default_copy()
            cfg.verify_ssl = False
            client.Configuration.set_default(cfg)
        except Exception:
            pass


@dataclass
class NginxSpec:
    namespace: str
    name: str
    host: str
    image: str = "nginx:alpine"
    port: int = 80
    index_html: str | None = None
    doc_root_path: str = "/usr/share/nginx/html"
    readiness_path: str = "/"
    readiness_delay: int = 5
    command: list[str] | None = None
    lifecycle_post_start: list[str] | None = None
    replicas: int = 1


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def ensure_namespace(name: str) -> None:
    _load_kube()
    core = client.CoreV1Api()
    try:
        core.read_namespace(name)
        return
    except ApiException as e:
        if e.status != 404:
            raise
    body = client.V1Namespace(metadata=client.V1ObjectMeta(name=name))
    core.create_namespace(body)


def apply_nginx(spec: NginxSpec) -> None:
    _load_kube()
    apps = client.AppsV1Api()
    core = client.CoreV1Api()
    net = client.NetworkingV1Api()

    labels = {"app": spec.name}

    dep = client.V1Deployment(
        metadata=client.V1ObjectMeta(name=spec.name, labels=labels),
        spec=client.V1DeploymentSpec(
            replicas=spec.replicas,
            selector=client.V1LabelSelector(match_labels=labels),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels=labels),
                spec=client.V1PodSpec(
                    containers=[
                        client.V1Container(
                            name="web",
                            image=spec.image,
                            ports=[client.V1ContainerPort(container_port=spec.port)],
                            readiness_probe=client.V1Probe(
                                http_get=client.V1HTTPGetAction(path=spec.readiness_path, port=spec.port),
                                initial_delay_seconds=spec.readiness_delay,
                                period_seconds=5,
                                failure_threshold=6,
                            ),
                            resources=client.V1ResourceRequirements(
                                requests={"cpu": "50m", "memory": "64Mi"},
                                limits={"cpu": "250m", "memory": "256Mi"},
                            ),
                        )
                    ]
                ),
            ),
        ),
    )
    # add command/lifecycle if specified
    if spec.command:
        dep.spec.template.spec.containers[0].command = spec.command
    if spec.lifecycle_post_start:
        dep.spec.template.spec.containers[0].lifecycle = client.V1Lifecycle(
            post_start=client.V1Handler(exec=client.V1ExecAction(command=spec.lifecycle_post_start))
        )

    svc = client.V1Service(
        metadata=client.V1ObjectMeta(name=spec.name, labels=labels),
        spec=client.V1ServiceSpec(
            selector=labels,
            ports=[client.V1ServicePort(port=spec.port, target_port=spec.port)],
        ),
    )

    ing = client.V1Ingress(
        metadata=client.V1ObjectMeta(
            name=spec.name,
        ),
        spec=client.V1IngressSpec(
            rules=[
                client.V1IngressRule(
                    host=spec.host,
                    http=client.V1HTTPIngressRuleValue(
                        paths=[
                            client.V1HTTPIngressPath(
                                path="/",
                                path_type="Prefix",
                                backend=client.V1IngressBackend(
                                    service=client.V1IngressServiceBackend(
                                        name=spec.name,
                                        port=client.V1ServiceBackendPort(number=spec.port),
                                    )
                                ),
                            )
                        ]
                    ),
                )
            ]
        ),
    )

    # Create or patch
    try:
        apps.create_namespaced_deployment(namespace=spec.namespace, body=dep)
    except ApiException as e:
        if e.status == 409:
            apps.patch_namespaced_deployment(name=spec.name, namespace=spec.namespace, body=dep)
        else:
            raise

    # Optional index.html via ConfigMap
    if spec.index_html:
        cm = client.V1ConfigMap(
            metadata=client.V1ObjectMeta(name=f"{spec.name}-index"),
            data={"index.html": spec.index_html},
        )
        try:
            client.CoreV1Api().create_namespaced_config_map(namespace=spec.namespace, body=cm)
        except ApiException as e:
            if e.status == 409:
                client.CoreV1Api().patch_namespaced_config_map(name=f"{spec.name}-index", namespace=spec.namespace, body=cm)
            else:
                raise
        # patch deployment to mount
        dep.spec.template.spec.volumes = (dep.spec.template.spec.volumes or []) + [
            client.V1Volume(name="html", config_map=client.V1ConfigMapVolumeSource(name=f"{spec.name}-index"))
        ]
        for c in dep.spec.template.spec.containers:
            c.volume_mounts = (c.volume_mounts or []) + [client.V1VolumeMount(name="html", mount_path=spec.doc_root_path)]
        try:
            apps.patch_namespaced_deployment(name=spec.name, namespace=spec.namespace, body=dep)
        except ApiException:
            pass

    try:
        core.create_namespaced_service(namespace=spec.namespace, body=svc)
    except ApiException as e:
        if e.status == 409:
            core.patch_namespaced_service(name=spec.name, namespace=spec.namespace, body=svc)
        else:
            raise

    try:
        net.create_namespaced_ingress(namespace=spec.namespace, body=ing)
    except ApiException as e:
        if e.status == 409:
            net.patch_namespaced_ingress(name=spec.name, namespace=spec.namespace, body=ing)
        else:
            raise


def wait_deployment_ready(namespace: str, name: str, timeout_s: int = 180) -> None:
    _load_kube()
    apps = client.AppsV1Api()
    start = time.time()
    last = None
    while time.time() - start < timeout_s:
        try:
            d = apps.read_namespaced_deployment(name=name, namespace=namespace)
            desired = d.spec.replicas or 1
            available = d.status.available_replicas or 0
            ready = d.status.ready_replicas or 0
            updated = d.status.updated_replicas or 0
            if available >= desired and ready >= desired and updated >= desired:
                return
            last = f"available={available}/{desired}, ready={ready}, updated={updated}"
        except ApiException as e:
            if e.status != 404:
                last = f"apps error {e}"
        time.sleep(2)
    raise TimeoutError(f"deployment not ready: {name} {last}")


def wait_namespace_gone(name: str, timeout_s: int = 120) -> None:
    _load_kube()
    core = client.CoreV1Api()
    start = time.time()
    while time.time() - start < timeout_s:
        try:
            core.read_namespace(name)
        except ApiException as e:
            if e.status == 404:
                return
        time.sleep(2)
    raise TimeoutError(f"namespace still exists: {name}")


def wait_service_endpoints_ready(namespace: str, service: str, timeout_s: int = 120) -> None:
    _load_kube()
    core = client.CoreV1Api()
    start = time.time()
    last = None
    while time.time() - start < timeout_s:
        try:
            ep = core.read_namespaced_endpoints(service, namespace)
            subsets = ep.subsets or []
            addrs = 0
            for s in subsets:
                addrs += len(s.addresses or [])
            if addrs > 0:
                return
            last = f"endpoints={addrs}"
        except ApiException as e:
            if e.status != 404:
                last = f"ep error {e}"
        time.sleep(2)
    raise TimeoutError(f"service endpoints not ready: {service} {last}")


def check_ready_strict(namespace: str, name: str) -> str:
    _load_kube()
    apps = client.AppsV1Api()
    try:
        d = apps.read_namespaced_deployment(name=name, namespace=namespace)
    except ApiException as e:
        if e.status == 404:
            return "PENDING"
        raise
    desired = d.spec.replicas or 1
    available = d.status.available_replicas or 0
    ready = d.status.ready_replicas or 0
    updated = d.status.updated_replicas or 0
    if available >= desired and ready >= desired and updated >= desired:
        return "READY"
    return "CREATING"


def get_deployment_report(namespace: str, name: str) -> dict:
    _load_kube()
    apps = client.AppsV1Api()
    core = client.CoreV1Api()
    report: dict = {"replicas": None, "ready_replicas": None, "available_replicas": None, "updated_replicas": None, "endpoints": 0, "pods": []}
    try:
        d = apps.read_namespaced_deployment(name=name, namespace=namespace)
        report.update(
            replicas=d.spec.replicas or 0,
            ready_replicas=d.status.ready_replicas or 0,
            available_replicas=d.status.available_replicas or 0,
            updated_replicas=d.status.updated_replicas or 0,
        )
    except ApiException:
        pass

    try:
        ep = core.read_namespaced_endpoints(name, namespace)
        subsets = ep.subsets or []
        addrs = 0
        for s in subsets:
            addrs += len(s.addresses or [])
        report["endpoints"] = addrs
    except ApiException:
        pass

    try:
        pods = core.list_namespaced_pod(namespace, label_selector=f"app={name}").items
        for p in pods:
            statuses = p.status.container_statuses or []
            ready = sum(1 for s in statuses if getattr(s, "ready", False))
            total = len(statuses)
            restarts = sum(int(getattr(s, "restart_count", 0)) for s in statuses)
            report["pods"].append({
                "name": p.metadata.name,
                "phase": p.status.phase,
                "ready": ready,
                "total": total,
                "restarts": restarts,
            })
    except ApiException:
        pass

    return report


def get_pod_details(namespace: str, app_name: str) -> list[dict]:
    _load_kube()
    core = client.CoreV1Api()
    pods = core.list_namespaced_pod(namespace, label_selector=f"app={app_name}").items
    out = []
    for p in pods:
        statuses = p.status.container_statuses or []
        containers = [
            {
                "name": s.name,
                "ready": bool(getattr(s, "ready", False)),
                "restarts": int(getattr(s, "restart_count", 0)),
            }
            for s in statuses
        ]
        conditions = [
            {
                "type": c.type,
                "status": c.status,
                "reason": getattr(c, "reason", None),
                "message": getattr(c, "message", None),
            }
            for c in (p.status.conditions or [])
        ]
        out.append(
            {
                "name": p.metadata.name,
                "phase": p.status.phase,
                "node": getattr(p.spec, "node_name", None),
                "containers": containers,
                "conditions": conditions,
            }
        )
    return out


def get_namespace_events(namespace: str, field_selector: str | None = None) -> list[dict]:
    _load_kube()
    core = client.CoreV1Api()
    events = core.list_namespaced_event(namespace, field_selector=field_selector).items
    out = []
    for e in events[-40:]:  # last 40
        out.append(
            {
                "type": e.type,
                "reason": e.reason,
                "message": e.message,
                "firstTimestamp": getattr(e, "first_timestamp", None),
                "lastTimestamp": getattr(e, "last_timestamp", None),
                "count": getattr(e, "count", None),
            }
        )
    return out


def check_ready(namespace: str, name: str) -> str:
    _load_kube()
    apps = client.AppsV1Api()
    try:
        d = apps.read_namespaced_deployment(name=name, namespace=namespace)
    except ApiException as e:
        if e.status == 404:
            return "PENDING"
        raise
    desired = d.spec.replicas or 1
    available = (d.status.available_replicas or 0)
    if available >= desired:
        return "READY"
    return "APPLYING"


def delete_namespace(name: str) -> None:
    _load_kube()
    core = client.CoreV1Api()
    try:
        core.delete_namespace(name)
    except ApiException as e:
        if e.status != 404:
            raise
