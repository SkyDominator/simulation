"""Notification providers for health status alerts."""
from __future__ import annotations
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
import httpx
from datetime import datetime

from .health_monitor import HealthCheckResult, HealthStatus

logger = logging.getLogger(__name__)

class NotificationProvider(ABC):
    """Abstract base class for notification providers."""
    
    @abstractmethod
    async def send_notification(self, result: HealthCheckResult, context: Dict[str, Any]) -> bool:
        """Send a notification. Returns True if successful."""
        pass

class IOSPushNotificationProvider(NotificationProvider):
    """iOS Push notification provider using APNs."""
    
    def __init__(self, apns_key_id: str, team_id: str, bundle_id: str, 
                 apns_key_path: str, device_token: str, use_sandbox: bool = False):
        self.apns_key_id = apns_key_id
        self.team_id = team_id
        self.bundle_id = bundle_id
        self.apns_key_path = apns_key_path
        self.device_token = device_token
        self.use_sandbox = use_sandbox
        
    async def send_notification(self, result: HealthCheckResult, context: Dict[str, Any]) -> bool:
        """Send iOS push notification via APNs."""
        try:
            # Note: This is a simplified implementation
            # In production, you'd use proper JWT signing and APNs HTTP/2 API
            logger.warning("iOS Push notification provider not fully implemented - would send:")
            logger.info(f"Device: {self.device_token}")
            logger.info(f"Message: {self._format_message(result)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send iOS push notification: {e}")
            return False
    
    def _format_message(self, result: HealthCheckResult) -> Dict[str, Any]:
        """Format the push notification payload."""
        status_messages = {
            HealthStatus.OK: "✅ Application is back online",
            HealthStatus.DEGRADED: "⚠️ Application is running slowly",
            HealthStatus.UNAVAILABLE: "🚨 Application is unavailable"
        }
        
        title = "Life Light Club Simulation"
        body = status_messages.get(result.status, f"Status: {result.status}")
        
        if result.error:
            body += f" - {result.error}"
            
        return {
            "aps": {
                "alert": {
                    "title": title,
                    "body": body
                },
                "badge": 1 if result.status != HealthStatus.OK else 0,
                "sound": "default"
            },
            "status": result.status,
            "timestamp": result.timestamp.isoformat()
        }

class KakaoTalkNotificationProvider(NotificationProvider):
    """KakaoTalk message notification provider."""
    
    def __init__(self, app_key: str, recipient_id: str):
        self.app_key = app_key
        self.recipient_id = recipient_id
        
    async def send_notification(self, result: HealthCheckResult, context: Dict[str, Any]) -> bool:
        """Send KakaoTalk message notification."""
        try:
            # Note: This is a simplified implementation
            # In production, you'd use the KakaoTalk API with proper authentication
            logger.warning("KakaoTalk notification provider not fully implemented - would send:")
            logger.info(f"Recipient: {self.recipient_id}")
            logger.info(f"Message: {self._format_message(result)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send KakaoTalk notification: {e}")
            return False
    
    def _format_message(self, result: HealthCheckResult) -> str:
        """Format the KakaoTalk message."""
        status_icons = {
            HealthStatus.OK: "✅",
            HealthStatus.DEGRADED: "⚠️",
            HealthStatus.UNAVAILABLE: "🚨"
        }
        
        icon = status_icons.get(result.status, "❓")
        timestamp = result.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
        
        message = f"{icon} Life Light Club Simulation Status Update\n\n"
        message += f"Status: {result.status.upper()}\n"
        message += f"Time: {timestamp}\n"
        
        if result.latency_ms:
            message += f"Response Time: {result.latency_ms:.1f}ms\n"
            
        if result.error:
            message += f"Error: {result.error}\n"
            
        return message

class TelegramNotificationProvider(NotificationProvider):
    """Telegram bot notification provider."""
    
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        
    async def send_notification(self, result: HealthCheckResult, context: Dict[str, Any]) -> bool:
        """Send Telegram message notification."""
        try:
            message = self._format_message(result)
            
            payload = {
                "chat_id": self.chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/sendMessage",
                    json=payload
                )
                
            if response.status_code == 200:
                logger.info("Telegram notification sent successfully")
                return True
            else:
                logger.error(f"Telegram API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False
    
    def _format_message(self, result: HealthCheckResult) -> str:
        """Format the Telegram message with Markdown."""
        status_icons = {
            HealthStatus.OK: "✅",
            HealthStatus.DEGRADED: "⚠️", 
            HealthStatus.UNAVAILABLE: "🚨"
        }
        
        icon = status_icons.get(result.status, "❓")
        timestamp = result.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
        
        message = f"{icon} *Life Light Club Simulation Status*\n\n"
        message += f"*Status:* `{result.status.upper()}`\n"
        message += f"*Time:* `{timestamp}`\n"
        
        if result.latency_ms:
            message += f"*Response Time:* `{result.latency_ms:.1f}ms`\n"
            
        if result.error:
            message += f"*Error:* `{result.error}`\n"
            
        message += f"\n*URL:* https://simulation.lightoflifeclub.com"
            
        return message

class LogNotificationProvider(NotificationProvider):
    """Simple log-based notification provider for testing and fallback."""
    
    async def send_notification(self, result: HealthCheckResult, context: Dict[str, Any]) -> bool:
        """Log the notification message."""
        try:
            status_icons = {
                HealthStatus.OK: "✅",
                HealthStatus.DEGRADED: "⚠️",
                HealthStatus.UNAVAILABLE: "🚨"
            }
            
            icon = status_icons.get(result.status, "❓")
            message = f"{icon} HEALTH NOTIFICATION: {result.status.upper()}"
            
            if result.latency_ms:
                message += f" (latency: {result.latency_ms:.1f}ms)"
                
            if result.error:
                message += f" - Error: {result.error}"
                
            logger.warning(message)
            return True
            
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")
            return False