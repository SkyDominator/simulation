"""Core health monitoring service that checks application status and detects changes."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal
from enum import Enum
import asyncio
import httpx
from time import perf_counter

logger = logging.getLogger(__name__)

class HealthStatus(str, Enum):
    """Health status enum matching the existing health endpoint."""
    OK = "ok"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"

class HealthCheckResult:
    """Represents a health check result."""
    
    def __init__(
        self, 
        status: HealthStatus, 
        latency_ms: Optional[float] = None,
        error: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ):
        self.status = status
        self.latency_ms = latency_ms
        self.error = error
        self.timestamp = timestamp or datetime.now(timezone.utc)
        
    def __repr__(self) -> str:
        return f"HealthCheckResult(status={self.status}, latency_ms={self.latency_ms}, error={self.error})"

class HealthMonitor:
    """Monitors application health by checking the health endpoint and detecting status changes."""
    
    def __init__(
        self, 
        health_url: str,
        timeout: float = 10.0,
        slow_threshold_ms: float = 3000.0
    ):
        self.health_url = health_url
        self.timeout = timeout
        self.slow_threshold_ms = slow_threshold_ms
        self.last_status: Optional[HealthStatus] = None
        self.last_check_time: Optional[datetime] = None
        
    async def check_health(self) -> HealthCheckResult:
        """Perform a health check against the application."""
        start_time = perf_counter()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.health_url)
                
            latency_ms = (perf_counter() - start_time) * 1000
            
            # Service is responding
            if response.status_code == 200:
                # Check if response is slow
                if latency_ms > self.slow_threshold_ms:
                    return HealthCheckResult(
                        status=HealthStatus.DEGRADED,
                        latency_ms=latency_ms,
                        error=f"Slow response: {latency_ms:.1f}ms (threshold: {self.slow_threshold_ms}ms)"
                    )
                else:
                    return HealthCheckResult(
                        status=HealthStatus.OK,
                        latency_ms=latency_ms
                    )
            else:
                # Service responding but with error
                return HealthCheckResult(
                    status=HealthStatus.DEGRADED,
                    latency_ms=latency_ms,
                    error=f"HTTP {response.status_code}"
                )
                
        except httpx.TimeoutException:
            latency_ms = (perf_counter() - start_time) * 1000
            return HealthCheckResult(
                status=HealthStatus.DEGRADED,
                latency_ms=latency_ms,
                error="Request timeout"
            )
        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNAVAILABLE,
                error=str(e)
            )
    
    def has_status_changed(self, current_result: HealthCheckResult) -> bool:
        """Check if the health status has changed since the last check."""
        if self.last_status is None:
            # First check - consider it a change to establish baseline
            return True
            
        return self.last_status != current_result.status
    
    def update_status(self, result: HealthCheckResult) -> None:
        """Update the internal status tracking."""
        self.last_status = result.status
        self.last_check_time = result.timestamp
        
    async def monitor_once(self) -> Optional[HealthCheckResult]:
        """Perform a single health check and return result if status changed."""
        try:
            result = await self.check_health()
            
            if self.has_status_changed(result):
                logger.info(
                    f"Health status changed: {self.last_status} -> {result.status} "
                    f"(latency: {result.latency_ms}ms, error: {result.error})"
                )
                self.update_status(result)
                return result
            else:
                # Status hasn't changed, just update internal tracking
                self.update_status(result)
                return None
                
        except Exception as e:
            logger.error(f"Error during health check: {e}")
            # Create an error result
            error_result = HealthCheckResult(
                status=HealthStatus.UNAVAILABLE,
                error=str(e)
            )
            
            if self.has_status_changed(error_result):
                self.update_status(error_result)
                return error_result
                
        return None