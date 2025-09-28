"""Application configuration and environment loading.

Loads environment variables and exposes settings via a dataclass-like object.
"""
from __future__ import annotations
import logging
import os
from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    # New key names (Supabase 2024+): Publishable (client) and Secret (server)
    supabase_publishable_key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")  # server-only
    cors_origins: List[str] = None  # type: ignore
    
    # OTP settings
    otp_secret_key: str = os.getenv("OTP_SECRET_KEY", "your-development-secret-key-replace-in-production")
    otp_validity_minutes: int = 5
    otp_max_verification_attempts: int = 6
    otp_resend_limit_per_15min: int = 3
    otp_resend_limit_per_day: int = 10

    # SMS Provider settings
    # NHN Cloud settings (legacy)
    nhn_cloud_appkey: str = os.getenv("NHN_CLOUD_APPKEY", "")
    nhn_cloud_secret_key: str = os.getenv("NHN_CLOUD_SECRET_KEY", "")
    nhn_cloud_sender_number: str = os.getenv("NHN_CLOUD_SENDER_NUMBER", "")
    
    # Solapi settings
    solapi_api_key: str = os.getenv("SOLAPI_API_KEY", "")
    solapi_api_secret: str = os.getenv("SOLAPI_API_SECRET", "")
    solapi_sender_number: str = os.getenv("SOLAPI_SENDER_NUMBER", "")
    
    # Health notification settings
    health_monitoring_enabled: bool = os.getenv("HEALTH_MONITORING_ENABLED", "false").lower() == "true"
    health_check_interval: float = float(os.getenv("HEALTH_CHECK_INTERVAL", "60.0"))
    health_check_timeout: float = float(os.getenv("HEALTH_CHECK_TIMEOUT", "10.0"))
    health_slow_threshold_ms: float = float(os.getenv("HEALTH_SLOW_THRESHOLD_MS", "3000.0"))
    
    # Telegram notification settings
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    # KakaoTalk notification settings
    kakao_app_key: str = os.getenv("KAKAO_APP_KEY", "")
    kakao_recipient_id: str = os.getenv("KAKAO_RECIPIENT_ID", "")
    
    # iOS Push notification settings
    ios_apns_key_id: str = os.getenv("IOS_APNS_KEY_ID", "")
    ios_team_id: str = os.getenv("IOS_TEAM_ID", "")
    ios_bundle_id: str = os.getenv("IOS_BUNDLE_ID", "")
    ios_apns_key_path: str = os.getenv("IOS_APNS_KEY_PATH", "")
    ios_device_token: str = os.getenv("IOS_DEVICE_TOKEN", "")
    ios_use_sandbox: bool = os.getenv("IOS_USE_SANDBOX", "false").lower() == "true"
    
    # Add logger  
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    def __post_init__(self):  # type: ignore[override]
        # object is frozen; use object.__setattr__
        if self.cors_origins is None:
            object.__setattr__(self, "cors_origins", [
                # Public domain from Cloudflare Tunnel
                "https://simulation.lightoflifeclub.com",  
                # Local development
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://10.10.113.129:5173",
                "http://172.30.1.39:5173",
                # Vite preview defaults to 4173
                "http://localhost:4173",
                "http://127.0.0.1:4173",
                "http://10.10.113.129:4173",
                "http://172.30.1.39:4173",
            ])

settings = Settings()
