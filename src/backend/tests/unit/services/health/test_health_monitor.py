"""Tests for the health monitor service."""
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from services.health.health_monitor import HealthMonitor, HealthStatus, HealthCheckResult

class TestHealthMonitor:
    
    def test_health_check_result_creation(self):
        """Test HealthCheckResult creation and representation."""
        result = HealthCheckResult(HealthStatus.OK, latency_ms=100.5)
        
        assert result.status == HealthStatus.OK
        assert result.latency_ms == 100.5
        assert result.error is None
        assert isinstance(result.timestamp, datetime)
        assert "OK" in repr(result)

    def test_health_monitor_initialization(self):
        """Test HealthMonitor initialization."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        assert monitor.health_url == "http://localhost:8000/api/health"
        assert monitor.timeout == 10.0
        assert monitor.slow_threshold_ms == 3000.0
        assert monitor.last_status is None
        assert monitor.last_check_time is None

    @pytest.mark.asyncio
    async def test_health_check_success_fast(self):
        """Test successful health check with fast response."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            result = await monitor.check_health()
            
        assert result.status == HealthStatus.OK
        assert result.latency_ms is not None
        assert result.latency_ms < 1000  # Should be very fast in test
        assert result.error is None

    @pytest.mark.asyncio
    async def test_health_check_success_slow(self):
        """Test successful health check with slow response."""
        monitor = HealthMonitor("http://localhost:8000/api/health", slow_threshold_ms=10.0)
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        # Mock sleep to simulate slow response
        async def slow_get(*args, **kwargs):
            import asyncio
            await asyncio.sleep(0.02)  # 20ms, above our 10ms threshold
            return mock_response
            
        with patch("httpx.AsyncClient.get", slow_get):
            result = await monitor.check_health()
            
        assert result.status == HealthStatus.DEGRADED
        assert result.latency_ms > 10.0
        assert "Slow response" in result.error

    @pytest.mark.asyncio
    async def test_health_check_http_error(self):
        """Test health check with HTTP error response."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        mock_response = AsyncMock()
        mock_response.status_code = 500
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            result = await monitor.check_health()
            
        assert result.status == HealthStatus.DEGRADED
        assert "HTTP 500" in result.error
        assert result.latency_ms is not None

    @pytest.mark.asyncio 
    async def test_health_check_timeout(self):
        """Test health check with request timeout."""
        monitor = HealthMonitor("http://localhost:8000/api/health", timeout=0.001)
        
        with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Request timeout")):
            result = await monitor.check_health()
            
        assert result.status == HealthStatus.DEGRADED
        assert "Request timeout" in result.error
        assert result.latency_ms is not None

    @pytest.mark.asyncio
    async def test_health_check_connection_error(self):
        """Test health check with connection error."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Connection failed")):
            result = await monitor.check_health()
            
        assert result.status == HealthStatus.UNAVAILABLE
        assert "Connection failed" in result.error
        assert result.latency_ms is None

    def test_has_status_changed_first_check(self):
        """Test status change detection on first check."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        result = HealthCheckResult(HealthStatus.OK)
        
        assert monitor.has_status_changed(result) is True

    def test_has_status_changed_same_status(self):
        """Test status change detection with same status."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        monitor.last_status = HealthStatus.OK
        
        result = HealthCheckResult(HealthStatus.OK)
        assert monitor.has_status_changed(result) is False

    def test_has_status_changed_different_status(self):
        """Test status change detection with different status."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        monitor.last_status = HealthStatus.OK
        
        result = HealthCheckResult(HealthStatus.DEGRADED)
        assert monitor.has_status_changed(result) is True

    def test_update_status(self):
        """Test status update functionality."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        result = HealthCheckResult(HealthStatus.DEGRADED, latency_ms=500.0)
        
        monitor.update_status(result)
        
        assert monitor.last_status == HealthStatus.DEGRADED
        assert monitor.last_check_time == result.timestamp

    @pytest.mark.asyncio
    async def test_monitor_once_with_status_change(self):
        """Test monitor_once with status change."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            result = await monitor.monitor_once()
            
        assert result is not None  # Status changed (first check)
        assert result.status == HealthStatus.OK
        assert monitor.last_status == HealthStatus.OK

    @pytest.mark.asyncio
    async def test_monitor_once_no_status_change(self):
        """Test monitor_once without status change."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        monitor.last_status = HealthStatus.OK  # Set initial status
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            result = await monitor.monitor_once()
            
        assert result is None  # No status change
        assert monitor.last_status == HealthStatus.OK

    @pytest.mark.asyncio
    async def test_monitor_once_with_exception(self):
        """Test monitor_once handling exceptions."""
        monitor = HealthMonitor("http://localhost:8000/api/health")
        
        with patch("httpx.AsyncClient.get", side_effect=Exception("Test error")):
            result = await monitor.monitor_once()
            
        assert result is not None  # Status changed to error
        assert result.status == HealthStatus.UNAVAILABLE
        assert "Test error" in result.error