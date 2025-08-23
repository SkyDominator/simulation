"""Application configuration and environment loading.

Loads environment variables and exposes settings via a dataclass-like object.
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "https://kihlqhomsychihwzwzuo.supabase.co")
    # New key names (Supabase 2024+): Publishable (client) and Secret (server)
    supabase_publishable_key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")  # server-only
    cors_origins: List[str] = None  # type: ignore
    admin_emails_raw: str = os.getenv("ADMIN_EMAILS", "")  # comma separated list
    admin_emails: List[str] = None  # type: ignore

    def __post_init__(self):  # type: ignore[override]
        # object is frozen; use object.__setattr__
        if self.cors_origins is None:
            object.__setattr__(self, "cors_origins", [
                # Public domain from Cloudflare Tunnel
                "https://partnersclub.example.com",  # Replace with your actual Cloudflare Tunnel domain
                # Local development & preview
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://10.10.113.129:5173",
                "http://172.30.1.39:5173",
                # Vite preview defaults to 4173; include to allow preflight during preview
                "http://localhost:4173",
                "http://127.0.0.1:4173",
                "http://10.10.113.129:4173",
                "http://172.30.1.39:4173",
            ])
        if self.admin_emails is None:
            parsed = [e.strip().lower() for e in self.admin_emails_raw.split(',') if e.strip()]
            object.__setattr__(self, 'admin_emails', parsed)

settings = Settings()
