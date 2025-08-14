"""Application configuration and environment loading.

Loads environment variables and exposes settings via a dataclass-like object.
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import List

from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "https://kihlqhomsychihwzwzuo.supabase.co")
    supabase_anon_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")  # prefer service key over hard-coded secret
    cors_origins: List[str] = None  # type: ignore

    def __post_init__(self):  # type: ignore[override]
        # object is frozen; use object.__setattr__
        if self.cors_origins is None:
            object.__setattr__(self, "cors_origins", [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ])

settings = Settings()
