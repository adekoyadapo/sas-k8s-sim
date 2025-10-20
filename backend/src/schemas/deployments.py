import uuid as _uuid
from pydantic import BaseModel


class DeploymentCreate(BaseModel):
    displayName: str
    serverType: str | None = None  # 'nginx' | 'apache' | 'tomcat'
    indexHtml: str | None = None
    replicas: int | None = None


class DeploymentOut(BaseModel):
    id: _uuid.UUID
    display_name: str
    slug: str
    namespace: str
    unique_id: str
    ingress_host: str
    status: str
    last_error: str | None = None
    server_type: str | None = None
    # live counts (optional, populated in list/get)
    replicas: int | None = None
    ready_replicas: int | None = None
    available_replicas: int | None = None
    updated_replicas: int | None = None
    endpoints: int | None = None


class DeploymentStatus(BaseModel):
    id: _uuid.UUID
    status: str
    last_error: str | None = None
    replicas: int | None = None
    ready_replicas: int | None = None
    available_replicas: int | None = None
    updated_replicas: int | None = None
    endpoints: int | None = None
    pods: list[dict] | None = None


class ScaleRequest(BaseModel):
    replicas: int
