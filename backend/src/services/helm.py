import os
import subprocess
import tempfile
from typing import Mapping

from ..core.config import settings
import yaml
from .k8s import ensure_namespace


def _helm_env() -> dict:
    env = os.environ.copy()
    if settings.kubeconfig:
        env["KUBECONFIG"] = settings.kubeconfig
    return env


def helm_upgrade_install(namespace: str, release: str, chart_dir: str, values: Mapping[str, object]) -> None:
    ensure_namespace(namespace)
    os.makedirs("/tmp", exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as f:
        f.write(_values_yaml(values))
        values_file = f.name
    try:
        cmd = [
            "helm", "upgrade", "--install", release, chart_dir,
            "-n", namespace,
            "-f", values_file,
        ]
        subprocess.run(cmd, check=True, env=_helm_env(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    finally:
        try:
            os.unlink(values_file)
        except Exception:
            pass


def helm_uninstall(namespace: str, release: str) -> None:
    cmd = ["helm", "uninstall", release, "-n", namespace]
    subprocess.run(cmd, check=False, env=_helm_env(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def _values_yaml(values: Mapping[str, object]) -> str:
    return yaml.safe_dump(dict(values), sort_keys=False)
