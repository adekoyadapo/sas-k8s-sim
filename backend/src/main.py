from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, deployments, health


def create_app() -> FastAPI:
    app = FastAPI(title="Multitenant SaaS Simulator API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # dev: public; tighten in prod
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(deployments.router, prefix="", tags=["deployments"])
    app.include_router(health.router, prefix="/health", tags=["health"])
    return app


app = create_app()
