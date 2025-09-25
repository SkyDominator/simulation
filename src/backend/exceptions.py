"""Custom exception classes for structured error handling."""
from __future__ import annotations
from typing import Any, Dict, Optional, NoReturn
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


class BaseAPIException(HTTPException):
    """Base exception class for all API errors with structured logging."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        error_context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.error_context = error_context or {}
        
        # Log the error with context
        logger.error(
            f"API Error {status_code}: {detail}",
            extra={
                "error_code": error_code,
                "context": error_context,
                "status_code": status_code
            }
        )


# Authentication & Authorization Errors (401, 403)
class AuthenticationError(BaseAPIException):
    """Authentication required - 401 status."""
    
    def __init__(self, detail: str = "Authentication required", **kwargs):
        super().__init__(status_code=401, detail=detail, **kwargs)


class AuthorizationError(BaseAPIException):
    """Insufficient permissions - 403 status."""
    
    def __init__(self, detail: str = "Insufficient permissions", **kwargs):
        super().__init__(status_code=403, detail=detail, **kwargs)


class AdminPrivilegesRequiredError(AuthorizationError):
    """Admin privileges required - 403 status."""
    
    def __init__(self, detail: str = "Admin privileges required", **kwargs):
        super().__init__(detail=detail, error_code="ADMIN_REQUIRED", **kwargs)


# Resource Errors (404)
class ResourceNotFoundError(BaseAPIException):
    """Resource not found - 404 status."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, **kwargs):
        detail = f"{resource_type} not found"
        if resource_id:
            detail += f" (ID: {resource_id})"
        
        error_context = kwargs.get("error_context", {})
        error_context.update({
            "resource_type": resource_type,
            "resource_id": resource_id
        })
        
        super().__init__(
            status_code=404,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            error_context=error_context,
            **{k: v for k, v in kwargs.items() if k != "error_context"}
        )


class SimulationNotFoundError(ResourceNotFoundError):
    """Simulation not found - 404 status."""
    
    def __init__(self, simulation_id: str, **kwargs):
        super().__init__(
            resource_type="Simulation",
            resource_id=simulation_id,
            **kwargs
        )


class NoticeNotFoundError(ResourceNotFoundError):
    """Notice not found - 404 status."""
    
    def __init__(self, notice_id: str, **kwargs):
        super().__init__(
            resource_type="Notice",
            resource_id=notice_id,
            **kwargs
        )


class PrivacyPolicyNotFoundError(ResourceNotFoundError):
    """Privacy policy not found - 404 status."""
    
    def __init__(self, policy_id: str, **kwargs):
        super().__init__(
            resource_type="Privacy Policy",
            resource_id=policy_id,
            **kwargs
        )


# Business Logic Validation Errors (400)
class BusinessLogicError(BaseAPIException):
    """Business logic validation error - 400 status."""
    
    def __init__(self, detail: str, error_code: Optional[str] = None, **kwargs):
        super().__init__(
            status_code=400,
            detail=detail,
            error_code=error_code or "BUSINESS_LOGIC_ERROR",
            **kwargs
        )


class InvalidDataError(BusinessLogicError):
    """Invalid data provided - 400 status."""
    
    def __init__(self, detail: str, field: Optional[str] = None, **kwargs):
        error_context = kwargs.get("error_context", {})
        if field:
            error_context["field"] = field
            
        super().__init__(
            detail=detail,
            error_code="INVALID_DATA",
            error_context=error_context,
            **{k: v for k, v in kwargs.items() if k != "error_context"}
        )


class NoFieldsToUpdateError(BusinessLogicError):
    """No fields provided for update - 400 status."""
    
    def __init__(self, **kwargs):
        super().__init__(
            detail="No fields to update",
            error_code="NO_FIELDS_TO_UPDATE",
            **kwargs
        )


class PublishingConstraintError(BusinessLogicError):
    """Publishing constraint violated - 400 status."""
    
    def __init__(self, detail: str = "Publishing must be done via the publish endpoint", **kwargs):
        super().__init__(
            detail=detail,
            error_code="PUBLISHING_CONSTRAINT_VIOLATION",
            **kwargs
        )


class WhitelistError(BusinessLogicError):
    """User not in whitelist - 400 status."""
    
    def __init__(self, **kwargs):
        super().__init__(
            detail="가입 허용 명단에 없는 사용자입니다.",
            error_code="USER_NOT_WHITELISTED",
            **kwargs
        )


class OTPError(BusinessLogicError):
    """OTP-related error - 400 status."""
    
    def __init__(self, detail: str, error_code: str = "OTP_ERROR", **kwargs):
        super().__init__(
            detail=detail,
            error_code=error_code,
            **kwargs
        )


class OTPRateLimitError(OTPError):
    """OTP rate limit exceeded - 400 status."""
    
    def __init__(self, detail: str = "Rate limit exceeded", **kwargs):
        super().__init__(
            detail=detail,
            error_code="OTP_RATE_LIMIT_EXCEEDED",
            **kwargs
        )


class OTPVerificationError(OTPError):
    """OTP verification failed - 400 status."""
    
    def __init__(self, detail: str = "Invalid OTP code", remaining_attempts: Optional[int] = None, **kwargs):
        error_context = kwargs.get("error_context", {})
        if remaining_attempts is not None:
            error_context["remaining_attempts"] = remaining_attempts
            
        super().__init__(
            detail=detail,
            error_code="OTP_VERIFICATION_FAILED",
            error_context=error_context,
            **{k: v for k, v in kwargs.items() if k != "error_context"}
        )


# Server Errors (500)
class InternalServerError(BaseAPIException):
    """Internal server error - 500 status."""
    
    def __init__(self, detail: str = "Internal server error", error_code: Optional[str] = None, **kwargs):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code=error_code or "INTERNAL_SERVER_ERROR",
            **kwargs
        )


class DatabaseError(InternalServerError):
    """Database operation failed - 500 status."""
    
    def __init__(self, operation: str, table: Optional[str] = None, **kwargs):
        detail = f"Database {operation} failed"
        if table:
            detail += f" on table '{table}'"
            
        error_context = kwargs.get("error_context", {})
        error_context.update({
            "operation": operation,
            "table": table
        })
        
        super().__init__(
            detail=detail,
            error_code="DATABASE_ERROR",
            error_context=error_context,
            **{k: v for k, v in kwargs.items() if k != "error_context"}
        )


class SimulationServiceError(InternalServerError):
    """Simulation service error - 500 status."""
    
    def __init__(self, detail: str, operation: Optional[str] = None, **kwargs):
        error_context = kwargs.get("error_context", {})
        if operation:
            error_context["operation"] = operation
            
        super().__init__(
            detail=detail,
            error_code="SIMULATION_SERVICE_ERROR",
            error_context=error_context,
            **{k: v for k, v in kwargs.items() if k != "error_context"}
        )


# Utility functions for exception handling
def handle_database_exception(e: Exception, operation: str, table: Optional[str] = None) -> NoReturn:
    """Convert database exceptions to structured API exceptions."""
    logger.error(f"Database error during {operation}: {str(e)}", exc_info=True)
    raise DatabaseError(operation=operation, table=table, error_context={"original_error": str(e)})


def handle_service_exception(e: Exception, service: str, operation: str) -> NoReturn:
    """Convert service exceptions to structured API exceptions."""
    logger.error(f"{service} service error during {operation}: {str(e)}", exc_info=True)
    
    if service.lower() == "simulation":
        raise SimulationServiceError(
            detail=f"Failed to {operation}",
            operation=operation,
            error_context={"original_error": str(e)}
        )
    else:
        raise InternalServerError(
            detail=f"{service} service error: {operation} failed",
            error_code=f"{service.upper()}_SERVICE_ERROR",
            error_context={"service": service, "operation": operation, "original_error": str(e)}
        )