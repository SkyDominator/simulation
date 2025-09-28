#!/usr/bin/env python3
"""Comprehensive demonstration of health notification service functionality."""

import asyncio
import logging
from typing import List
from services.health.health_monitor import HealthMonitor, HealthStatus
from services.health.notification_providers import LogNotificationProvider, TelegramNotificationProvider
from services.health.health_notification_service import HealthNotificationService, create_health_notification_service

# Set up logging to see notifications
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MockHealthEndpoint:
    """Mock health endpoint that can simulate different states."""
    
    def __init__(self):
        self.response_status = 200
        self.response_delay = 0.1
        self.should_fail = False
        
    def set_healthy(self):
        """Simulate healthy state."""
        self.response_status = 200
        self.response_delay = 0.1
        self.should_fail = False
        
    def set_slow(self):
        """Simulate slow but working state."""
        self.response_status = 200
        self.response_delay = 2.0  # Will exceed slow threshold
        self.should_fail = False
        
    def set_error(self):
        """Simulate HTTP error state."""
        self.response_status = 500
        self.response_delay = 0.1
        self.should_fail = False
        
    def set_unavailable(self):
        """Simulate complete failure state."""
        self.should_fail = True

async def simulate_status_changes():
    """Demonstrate health notification service with simulated status changes."""
    print("🚀 Starting Health Notification Service Demonstration\n")
    
    # Create service with log notification provider for demo
    service = HealthNotificationService(
        health_url="http://httpbin.org/status/200",  # Use a real endpoint for demo
        notification_providers=[LogNotificationProvider()],
        check_interval=2.0,  # Check every 2 seconds for demo
        timeout=5.0,
        slow_threshold_ms=1000.0  # 1 second threshold for demo
    )
    
    print("📊 Service Configuration:")
    status = service.get_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    print()
    
    # Simulate different health states
    scenarios = [
        ("🟢 Testing healthy state", "http://httpbin.org/status/200"),
        ("🟡 Testing slow response", "http://httpbin.org/delay/2"),  # 2 second delay
        ("🔴 Testing error state", "http://httpbin.org/status/500"),
        ("⚫ Testing unavailable state", "http://invalid-domain-12345.com/health"),
        ("🟢 Testing recovery to healthy", "http://httpbin.org/status/200"),
    ]
    
    for description, test_url in scenarios:
        print(f"{description}")
        print(f"  URL: {test_url}")
        
        # Update the service URL for this test
        service.health_monitor.health_url = test_url
        
        # Perform health check
        result = await service.perform_health_check()
        
        if result:
            print(f"  📢 Status changed to: {result.status}")
            if result.latency_ms:
                print(f"  ⏱️  Latency: {result.latency_ms:.1f}ms")
            if result.error:
                print(f"  ❌ Error: {result.error}")
        else:
            print(f"  📝 No change (current: {service.health_monitor.last_status})")
        
        print()
        await asyncio.sleep(1)  # Pause between scenarios
    
    print("✅ Health Notification Service demonstration completed!")

async def demonstrate_notification_providers():
    """Demonstrate different notification provider formats."""
    print("📨 Demonstrating Notification Provider Formats\n")
    
    from services.health.health_monitor import HealthCheckResult
    from services.health.notification_providers import (
        TelegramNotificationProvider,
        KakaoTalkNotificationProvider,
        IOSPushNotificationProvider
    )
    
    # Create test health results
    test_scenarios = [
        HealthCheckResult(HealthStatus.OK, latency_ms=150.0),
        HealthCheckResult(HealthStatus.DEGRADED, latency_ms=2500.0, error="Slow response"),
        HealthCheckResult(HealthStatus.UNAVAILABLE, error="Connection refused")
    ]
    
    providers = [
        ("Log Provider", LogNotificationProvider()),
        ("Telegram Provider", TelegramNotificationProvider("mock_token", "mock_chat_id")),
    ]
    
    for scenario in test_scenarios:
        print(f"📋 Scenario: {scenario.status.upper()}")
        print(f"   Latency: {scenario.latency_ms}ms" if scenario.latency_ms else "   No latency data")
        print(f"   Error: {scenario.error}" if scenario.error else "   No errors")
        print()
        
        for provider_name, provider in providers:
            print(f"  {provider_name}:")
            
            try:
                if isinstance(provider, LogNotificationProvider):
                    # For log provider, just call it
                    await provider.send_notification(scenario, {})
                else:
                    # For other providers, show the formatted message
                    if hasattr(provider, '_format_message'):
                        message = provider._format_message(scenario)
                        print(f"    Message: {message.split('*Life Light Club')[0]}...")
                    else:
                        print(f"    Would send notification via {provider_name}")
            except Exception as e:
                print(f"    Error: {e}")
            
        print()

async def main():
    """Run the complete demonstration."""
    print("=" * 70)
    print("🔔 HEALTH NOTIFICATION SERVICE DEMONSTRATION")
    print("=" * 70)
    print()
    
    try:
        await demonstrate_notification_providers()
        print("\n" + "-" * 50 + "\n")
        await simulate_status_changes()
        
    except KeyboardInterrupt:
        print("\n👋 Demonstration cancelled by user")
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())