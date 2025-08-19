"""Application entrypoint using app factory pattern."""
from __future__ import annotations
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import router as api_router
from fastapi import APIRouter


def create_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Health router (lightweight, no deps)
    health_router = APIRouter()

    @health_router.get("/health", tags=["health"], include_in_schema=False)
    def health() -> dict[str, str]:  # simple liveness
        return {"status": "ok"}

    app.include_router(health_router)
    app.include_router(api_router)
    return app


logging.basicConfig(level=logging.INFO)
app = create_app()

if __name__ == "__main__":  # pragma: no cover
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)