"""Tests for notification providers."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from services.health.health_monitor import HealthCheckResult, HealthStatus
from services.health.notification_providers import (
    LogNotificationProvider,
    TelegramNotificationProvider,
    KakaoTalkNotificationProvider,
    IOSPushNotificationProvider
)

class TestLogNotificationProvider:
    
    @pytest.mark.asyncio
    async def test_send_notification_success(self):
        """Test successful log notification."""
        provider = LogNotificationProvider()
        result = HealthCheckResult(HealthStatus.OK, latency_ms=100.0)
        
        with patch("services.health.notification_providers.logger") as mock_logger:
            success = await provider.send_notification(result, {})
            
        assert success is True
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args[0][0]
        assert "✅ HEALTH NOTIFICATION: OK" in call_args
        assert "latency: 100.0ms" in call_args

    @pytest.mark.asyncio
    async def test_send_notification_with_error(self):
        """Test log notification with error."""
        provider = LogNotificationProvider()
        result = HealthCheckResult(HealthStatus.UNAVAILABLE, error="Connection failed")
        
        with patch("services.health.notification_providers.logger") as mock_logger:
            success = await provider.send_notification(result, {})
            
        assert success is True
        call_args = mock_logger.warning.call_args[0][0]
        assert "🚨 HEALTH NOTIFICATION: UNAVAILABLE" in call_args
        assert "Connection failed" in call_args

class TestTelegramNotificationProvider:
    
    def test_initialization(self):
        """Test Telegram provider initialization."""
        provider = TelegramNotificationProvider("test_token", "test_chat_id")
        
        assert provider.bot_token == "test_token"
        assert provider.chat_id == "test_chat_id"
        assert provider.base_url == "https://api.telegram.org/bottest_token"

    @pytest.mark.asyncio
    async def test_send_notification_success(self):
        """Test successful Telegram notification."""
        provider = TelegramNotificationProvider("test_token", "test_chat_id")
        result = HealthCheckResult(HealthStatus.DEGRADED, latency_ms=2500.0, error="Slow response")
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient.post", return_value=mock_response):
            success = await provider.send_notification(result, {})
            
        assert success is True

    @pytest.mark.asyncio
    async def test_send_notification_api_error(self):
        """Test Telegram notification with API error."""
        provider = TelegramNotificationProvider("test_token", "test_chat_id")
        result = HealthCheckResult(HealthStatus.OK)
        
        mock_response = AsyncMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        
        with patch("httpx.AsyncClient.post", return_value=mock_response):
            success = await provider.send_notification(result, {})
            
        assert success is False

    @pytest.mark.asyncio
    async def test_send_notification_network_error(self):
        """Test Telegram notification with network error."""
        provider = TelegramNotificationProvider("test_token", "test_chat_id")
        result = HealthCheckResult(HealthStatus.OK)
        
        with patch("httpx.AsyncClient.post", side_effect=Exception("Network error")):
            success = await provider.send_notification(result, {})
            
        assert success is False

    def test_format_message(self):
        """Test Telegram message formatting."""
        provider = TelegramNotificationProvider("test_token", "test_chat_id")
        result = HealthCheckResult(
            HealthStatus.DEGRADED, 
            latency_ms=1500.0, 
            error="High latency"
        )
        
        message = provider._format_message(result)
        
        assert "⚠️ *Life Light Club Simulation Status*" in message
        assert "*Status:* `DEGRADED`" in message
        assert "*Response Time:* `1500.0ms`" in message
        assert "*Error:* `High latency`" in message
        assert "https://simulation.lightoflifeclub.com" in message

class TestKakaoTalkNotificationProvider:
    
    def test_initialization(self):
        """Test KakaoTalk provider initialization."""
        provider = KakaoTalkNotificationProvider("test_app_key", "test_recipient")
        
        assert provider.app_key == "test_app_key"
        assert provider.recipient_id == "test_recipient"

    @pytest.mark.asyncio
    async def test_send_notification_placeholder(self):
        """Test KakaoTalk notification placeholder implementation."""
        provider = KakaoTalkNotificationProvider("test_app_key", "test_recipient")
        result = HealthCheckResult(HealthStatus.OK)
        
        with patch("services.health.notification_providers.logger") as mock_logger:
            success = await provider.send_notification(result, {})
            
        assert success is True
        mock_logger.warning.assert_called_once()

    def test_format_message(self):
        """Test KakaoTalk message formatting."""
        provider = KakaoTalkNotificationProvider("test_app_key", "test_recipient")
        result = HealthCheckResult(HealthStatus.OK, latency_ms=200.0)
        
        message = provider._format_message(result)
        
        assert "✅ Life Light Club Simulation Status Update" in message
        assert "Status: OK" in message
        assert "Response Time: 200.0ms" in message

class TestIOSPushNotificationProvider:
    
    def test_initialization(self):
        """Test iOS Push provider initialization."""
        provider = IOSPushNotificationProvider(
            apns_key_id="test_key_id",
            team_id="test_team_id",
            bundle_id="com.test.app",
            apns_key_path="/path/to/key.p8",
            device_token="test_device_token"
        )
        
        assert provider.apns_key_id == "test_key_id"
        assert provider.team_id == "test_team_id"
        assert provider.bundle_id == "com.test.app"
        assert provider.device_token == "test_device_token"

    @pytest.mark.asyncio
    async def test_send_notification_placeholder(self):
        """Test iOS Push notification placeholder implementation."""
        provider = IOSPushNotificationProvider(
            apns_key_id="test_key_id",
            team_id="test_team_id", 
            bundle_id="com.test.app",
            apns_key_path="/path/to/key.p8",
            device_token="test_device_token"
        )
        result = HealthCheckResult(HealthStatus.UNAVAILABLE, error="Server down")
        
        with patch("services.health.notification_providers.logger") as mock_logger:
            success = await provider.send_notification(result, {})
            
        assert success is True
        mock_logger.warning.assert_called_once()

    def test_format_message(self):
        """Test iOS Push notification payload formatting."""
        provider = IOSPushNotificationProvider(
            apns_key_id="test_key_id",
            team_id="test_team_id",
            bundle_id="com.test.app", 
            apns_key_path="/path/to/key.p8",
            device_token="test_device_token"
        )
        result = HealthCheckResult(HealthStatus.OK)
        
        payload = provider._format_message(result)
        
        assert "aps" in payload
        assert payload["aps"]["alert"]["title"] == "Life Light Club Simulation"
        assert "back online" in payload["aps"]["alert"]["body"]
        assert payload["aps"]["badge"] == 0  # OK status should have badge 0
        assert payload["status"] == HealthStatus.OK

    def test_format_message_error_status(self):
        """Test iOS Push notification payload for error status.""" 
        provider = IOSPushNotificationProvider(
            apns_key_id="test_key_id",
            team_id="test_team_id",
            bundle_id="com.test.app",
            apns_key_path="/path/to/key.p8", 
            device_token="test_device_token"
        )
        result = HealthCheckResult(HealthStatus.UNAVAILABLE, error="Database connection lost")
        
        payload = provider._format_message(result)
        
        assert payload["aps"]["badge"] == 1  # Error status should have badge 1
        assert "unavailable" in payload["aps"]["alert"]["body"]
        assert "Database connection lost" in payload["aps"]["alert"]["body"]