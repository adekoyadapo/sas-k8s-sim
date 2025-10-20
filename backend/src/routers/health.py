from fastapi import APIRouter

from kubernetes import client, config

router = APIRouter()


@router.get("/cluster")
def cluster_health():
    info = {"k8s": False, "ingress": False}
    try:
        try:
            config.load_incluster_config()
        except Exception:
            config.load_kube_config()
        info["k8s"] = True
        apps = client.AppsV1Api()
        # Prefer Traefik (k3d/k3s), fall back to ingress-nginx
        try:
            dep = apps.read_namespaced_deployment("traefik", "kube-system")
        except Exception:
            dep = apps.read_namespaced_deployment("ingress-nginx-controller", "ingress-nginx")
        ready = (dep.status.available_replicas or 0) >= (dep.spec.replicas or 1)
        info["ingress"] = bool(ready)
    except Exception as e:
        info["error"] = str(e)
    return info
