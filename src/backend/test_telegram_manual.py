#!/usr/bin/env python3
"""Manual test for Telegram notification provider (if credentials are available)."""

import asyncio
import os
from services.health.health_monitor import HealthCheckResult, HealthStatus
from services.health.notification_providers import TelegramNotificationProvider

async def test_telegram_provider():
    """Test Telegram provider with environment credentials."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not bot_token or not chat_id:
        print("Telegram credentials not found in environment variables.")
        print("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to test.")
        return
    
    print(f"Testing Telegram notification with chat_id: {chat_id}")
    
    provider = TelegramNotificationProvider(bot_token, chat_id)
    
    # Create a test notification
    result = HealthCheckResult(
        status=HealthStatus.OK,
        latency_ms=250.0
    )
    
    success = await provider.send_notification(result, {
        "service": "Life Light Club Simulation", 
        "url": "https://simulation.lightoflifeclub.com"
    })
    
    print(f"Telegram notification result: {success}")
    
    if success:
        print("✅ Telegram notification sent successfully!")
    else:
        print("❌ Failed to send Telegram notification")

if __name__ == "__main__":
    asyncio.run(test_telegram_provider())