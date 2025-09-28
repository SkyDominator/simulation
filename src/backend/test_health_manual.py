#!/usr/bin/env python3
"""Manual test for health notification service functionality."""

import asyncio
import logging
from services.health.health_monitor import HealthMonitor, HealthStatus
from services.health.notification_providers import LogNotificationProvider
from services.health.health_notification_service import HealthNotificationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_health_monitor():
    """Test basic health monitor functionality."""
    print("Testing HealthMonitor...")
    
    # Test with a mock URL (will fail but that's expected)
    monitor = HealthMonitor("http://localhost:9999/api/health", timeout=1.0)
    
    # First check
    result1 = await monitor.monitor_once()
    print(f"First check result: {result1}")
    assert result1 is not None  # First check should return a result
    assert result1.status == HealthStatus.UNAVAILABLE
    
    # Second check (same status)
    result2 = await monitor.monitor_once()
    print(f"Second check result: {result2}")
    assert result2 is None  # No status change
    
    print("✅ HealthMonitor test passed")

async def test_notification_provider():
    """Test log notification provider."""
    print("Testing LogNotificationProvider...")
    
    from services.health.health_monitor import HealthCheckResult
    
    provider = LogNotificationProvider()
    result = HealthCheckResult(HealthStatus.OK, latency_ms=150.0)
    
    success = await provider.send_notification(result, {})
    print(f"Notification result: {success}")
    assert success is True
    
    print("✅ LogNotificationProvider test passed")

async def test_health_service():
    """Test complete health notification service."""
    print("Testing HealthNotificationService...")
    
    service = HealthNotificationService(
        health_url="http://localhost:9999/api/health",
        notification_providers=[LogNotificationProvider()],
        check_interval=1.0  # Fast for testing
    )
    
    # Perform one check
    result = await service.perform_health_check()
    print(f"Service check result: {result}")
    assert result is not None  # Should detect status change
    
    # Check service status
    status = service.get_status()
    print(f"Service status: {status}")
    assert status["last_status"] == HealthStatus.UNAVAILABLE
    
    print("✅ HealthNotificationService test passed")

async def main():
    """Run all manual tests."""
    print("Starting manual health notification service tests...\n")
    
    try:
        await test_health_monitor()
        print()
        
        await test_notification_provider()
        print()
        
        await test_health_service()
        print()
        
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())