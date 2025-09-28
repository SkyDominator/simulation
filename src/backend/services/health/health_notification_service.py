"""Main health notification service that orchestrates monitoring and notifications."""
from __future__ import annotations
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .health_monitor import HealthMonitor, HealthCheckResult, HealthStatus
from .notification_providers import (
    NotificationProvider,
    IOSPushNotificationProvider,
    KakaoTalkNotificationProvider,
    TelegramNotificationProvider,
    LogNotificationProvider
)

logger = logging.getLogger(__name__)

class HealthNotificationService:
    """Main service that monitors health and sends notifications on status changes."""
    
    def __init__(
        self,
        health_url: str,
        notification_providers: List[NotificationProvider],
        check_interval: float = 60.0,  # Check every minute
        timeout: float = 10.0,
        slow_threshold_ms: float = 3000.0
    ):
        self.health_monitor = HealthMonitor(
            health_url=health_url,
            timeout=timeout,
            slow_threshold_ms=slow_threshold_ms
        )
        self.notification_providers = notification_providers or []
        self.check_interval = check_interval
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        
    def add_notification_provider(self, provider: NotificationProvider) -> None:
        """Add a notification provider to the service."""
        self.notification_providers.append(provider)
        
    async def send_notifications(self, result: HealthCheckResult) -> Dict[str, bool]:
        """Send notifications via all configured providers."""
        results = {}
        context = {
            "service": "Life Light Club Simulation",
            "url": self.health_monitor.health_url,
            "timestamp": result.timestamp.isoformat()
        }
        
        for i, provider in enumerate(self.notification_providers):
            provider_name = type(provider).__name__
            try:
                success = await provider.send_notification(result, context)
                results[provider_name] = success
                
                if success:
                    logger.info(f"Notification sent successfully via {provider_name}")
                else:
                    logger.warning(f"Failed to send notification via {provider_name}")
                    
            except Exception as e:
                logger.error(f"Error sending notification via {provider_name}: {e}")
                results[provider_name] = False
                
        return results
    
    async def perform_health_check(self) -> Optional[HealthCheckResult]:
        """Perform a health check and send notifications if status changed."""
        try:
            # Check for status changes
            result = await self.health_monitor.monitor_once()
            
            if result is not None:
                # Status has changed - send notifications
                logger.info(f"Health status changed to {result.status}, sending notifications...")
                
                notification_results = await self.send_notifications(result)
                
                # Log summary of notification results
                successful_notifications = sum(1 for success in notification_results.values() if success)
                total_notifications = len(notification_results)
                
                logger.info(
                    f"Sent {successful_notifications}/{total_notifications} notifications successfully. "
                    f"Results: {notification_results}"
                )
                
                return result
            else:
                # No status change, no notifications needed
                logger.debug("Health status unchanged, no notifications sent")
                return None
                
        except Exception as e:
            logger.error(f"Error during health check: {e}")
            return None
    
    async def start_monitoring(self) -> None:
        """Start continuous health monitoring."""
        if self.is_running:
            logger.warning("Health monitoring is already running")
            return
            
        self.is_running = True
        logger.info(f"Starting health monitoring (interval: {self.check_interval}s)")
        
        try:
            while self.is_running:
                await self.perform_health_check()
                await asyncio.sleep(self.check_interval)
                
        except asyncio.CancelledError:
            logger.info("Health monitoring cancelled")
        except Exception as e:
            logger.error(f"Error in health monitoring loop: {e}")
        finally:
            self.is_running = False
    
    def start_background_monitoring(self) -> asyncio.Task:
        """Start health monitoring as a background task."""
        if self.task and not self.task.done():
            logger.warning("Background monitoring task already running")
            return self.task
            
        self.task = asyncio.create_task(self.start_monitoring())
        return self.task
    
    async def stop_monitoring(self) -> None:
        """Stop health monitoring."""
        logger.info("Stopping health monitoring...")
        self.is_running = False
        
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
                
        logger.info("Health monitoring stopped")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of the health monitoring service."""
        return {
            "is_running": self.is_running,
            "check_interval": self.check_interval,
            "health_url": self.health_monitor.health_url,
            "last_status": self.health_monitor.last_status,
            "last_check_time": self.health_monitor.last_check_time.isoformat() if self.health_monitor.last_check_time else None,
            "notification_providers": [type(p).__name__ for p in self.notification_providers],
            "provider_count": len(self.notification_providers)
        }

def create_health_notification_service(
    health_url: str,
    telegram_bot_token: Optional[str] = None,
    telegram_chat_id: Optional[str] = None,
    kakao_app_key: Optional[str] = None,
    kakao_recipient_id: Optional[str] = None,
    ios_apns_key_id: Optional[str] = None,
    ios_team_id: Optional[str] = None,
    ios_bundle_id: Optional[str] = None,
    ios_apns_key_path: Optional[str] = None,
    ios_device_token: Optional[str] = None,
    ios_use_sandbox: bool = False,
    check_interval: float = 60.0,
    enable_log_fallback: bool = True
) -> HealthNotificationService:
    """Factory function to create a health notification service with configured providers."""
    
    providers: List[NotificationProvider] = []
    
    # Add iOS Push notification provider (highest priority)
    if all([ios_apns_key_id, ios_team_id, ios_bundle_id, ios_apns_key_path, ios_device_token]):
        providers.append(IOSPushNotificationProvider(
            apns_key_id=ios_apns_key_id,
            team_id=ios_team_id,
            bundle_id=ios_bundle_id,
            apns_key_path=ios_apns_key_path,
            device_token=ios_device_token,
            use_sandbox=ios_use_sandbox
        ))
        logger.info("Added iOS Push notification provider")
    
    # Add KakaoTalk provider (second priority)
    if kakao_app_key and kakao_recipient_id:
        providers.append(KakaoTalkNotificationProvider(
            app_key=kakao_app_key,
            recipient_id=kakao_recipient_id
        ))
        logger.info("Added KakaoTalk notification provider")
    
    # Add Telegram provider (third priority)
    if telegram_bot_token and telegram_chat_id:
        providers.append(TelegramNotificationProvider(
            bot_token=telegram_bot_token,
            chat_id=telegram_chat_id
        ))
        logger.info("Added Telegram notification provider")
    
    # Add log fallback if enabled or no other providers configured
    if enable_log_fallback or not providers:
        providers.append(LogNotificationProvider())
        if not providers[:-1]:  # Only log provider added
            logger.warning("No notification providers configured, using log fallback only")
        else:
            logger.info("Added log notification provider as fallback")
    
    return HealthNotificationService(
        health_url=health_url,
        notification_providers=providers,
        check_interval=check_interval
    )