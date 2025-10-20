import pathlib
import sys

# Ensure backend/src is importable as package 'src'
root = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

from fastapi.testclient import TestClient
from src.main import app


def test_health_cluster():
    client = TestClient(app)
    r = client.get("/health/cluster")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)
# ruff: noqa: E402
