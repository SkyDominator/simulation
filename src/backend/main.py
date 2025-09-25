"""Application entrypoint using app factory pattern."""
from __future__ import annotations
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import router as api_router
from error_handlers import register_exception_handlers


def create_app() -> FastAPI:
    app = FastAPI()
    
    # Register exception handlers
    register_exception_handlers(app)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(api_router)
    return app


logging.basicConfig(level=logging.INFO)
app = create_app()

if __name__ == "__main__":  # pragma: no cover
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)