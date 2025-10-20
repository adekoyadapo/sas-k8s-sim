from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60
    refresh_token_ttl_minutes: int = 60 * 24 * 7
    cluster_domain: str = "10-0-10-253.sslip.io"
    kubeconfig: str | None = None
    helm_enabled: bool = True
    helm_chart_path: str = "/app/helm/tenant-nginx"
    helm_chart_path_tomcat: str = "/app/helm/tenant-tomcat"
    insecure_kube: bool = True

    model_config = {
        "env_prefix": "",
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()  # type: ignore
