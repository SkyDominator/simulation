"""Error handlers for FastAPI application."""
from __future__ import annotations
from typing import Any, Dict
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

from exceptions import BaseAPIException

logger = logging.getLogger(__name__)


def create_error_response(
    status_code: int,
    detail: str,
    error_code: str = None,
    error_context: Dict[str, Any] = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "detail": detail,
        "success": False
    }
    
    if error_code:
        content["error_code"] = error_code
    
    if error_context:
        content["context"] = error_context
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def base_api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """Handle custom BaseAPIException instances."""
    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=exc.error_code,
        error_context=exc.error_context
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTPException instances."""
    # Convert 403 to 401 for authentication failures
    status_code = exc.status_code
    detail = exc.detail
    
    if (exc.status_code == 403 
        and exc.detail == "Not authenticated" 
        and request.url.path.startswith("/api/")):
        status_code = 401
        logger.warning(f"HTTP 401: {detail} (converted from 403)")
    else:
        logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
    
    return create_error_response(
        status_code=status_code,
        detail=detail
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle Starlette HTTPException instances."""
    logger.warning(f"Starlette HTTP {exc.status_code}: {exc.detail}")
    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail
    )


def sanitize_validation_errors(errors):
    """Sanitize validation errors to make them JSON serializable."""
    sanitized = []
    for error in errors:
        sanitized_error = dict(error)
        # Convert bytes to string if present
        if isinstance(sanitized_error.get("input"), bytes):
            sanitized_error["input"] = sanitized_error["input"].decode("utf-8", errors="replace")
        sanitized.append(sanitized_error)
    return sanitized


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors (422)."""
    logger.warning(f"Validation error: {exc.errors()}")
    
    # Extract first validation error for main detail
    first_error = exc.errors()[0] if exc.errors() else {}
    detail = "Request validation failed"
    
    if first_error:
        field = ".".join(str(loc) for loc in first_error.get("loc", []))
        msg = first_error.get("msg", "Invalid value")
        if field:
            detail = f"Invalid field '{field}': {msg}"
        else:
            detail = msg
    
    return create_error_response(
        status_code=422,
        detail=detail,
        error_code="VALIDATION_ERROR",
        error_context={
            "validation_errors": sanitize_validation_errors(exc.errors())
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exceptions (500)."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return create_error_response(
        status_code=500,
        detail="Internal server error",
        error_code="INTERNAL_SERVER_ERROR"
    )


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(BaseAPIException, base_api_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)