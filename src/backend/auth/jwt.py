"""JWT authentication utilities (pure functions where possible)."""
from __future__ import annotations
import logging
from typing import Dict, Any, Optional
import requests
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from jose.exceptions import JWKError

from config.settings import settings

logger = logging.getLogger(__name__)

_oauth_scheme = HTTPBearer()
_jwks_cache: Dict[str, Any] = {}

JWKS_PATH = "/auth/v1/.well-known/jwks.json"

class JWKSClient:
    """Client to fetch and cache JWKS keys."""
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def get_keys(self) -> Dict[str, Any]:
        global _jwks_cache
        if not _jwks_cache:
            url = f"{self.base_url}{JWKS_PATH}"
            try:
                resp = requests.get(url, timeout=5)
                resp.raise_for_status()
                _jwks_cache = resp.json()
            except Exception as exc:  # noqa: BLE001
                logger.error("Failed fetching JWKS: %s", exc)
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="JWKS fetch failed")
        return _jwks_cache

_jwks_client = JWKSClient(settings.supabase_url)

def authenticate_jwt_token(token_result: HTTPAuthorizationCredentials = Depends(_oauth_scheme)) -> str:
    """Validate JWT using Supabase JWKS and return the user_id (sub)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = token_result.credentials
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")
        
        # Specific validation checks with descriptive error messages
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing 'kid' in JWT header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not alg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing algorithm in JWT header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check for duplicated kid (if kid is a list/array)
        if isinstance(kid, list):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Duplicated 'kid' values in JWT header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check for unsupported algorithm
        if alg not in ["RS256", "RS512", "ES256"]:  # Common supported algorithms
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported algorithm: {alg}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        keys_obj = _jwks_client.get_keys()
        keys_list = keys_obj.get("keys", [])
        public_key: Optional[Dict[str, Any]] = None
        for k in keys_list:
            if k.get("kid") == kid:
                public_key = k
                break
        if not public_key:
            # invalidate cache and retry once in case keys have rotated
            _jwks_cache.clear()
            keys_obj = _jwks_client.get_keys()
            keys_list = keys_obj.get("keys", [])
            for k in keys_list:
                if k.get("kid") == kid:
                    public_key = k
                    break
            if not public_key:
                raise credentials_exception

        payload = jwt.decode(token, public_key, algorithms=[alg], audience="authenticated")
        sub = payload.get("sub")
        if not sub:
            raise credentials_exception
        return str(sub)
    except HTTPException:
        # Re-raise HTTPExceptions with specific error messages
        raise
    except Exception as e:
        # Handle specific error cases with descriptive messages
        error_msg = str(e).lower()
        if "audience mismatch" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Audience mismatch: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        elif "malformed jwt token" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Malformed JWT token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        elif "jwks fetch failed" in error_msg:
            # Let JWKS errors propagate as-is (503 status)
            raise
        else:
            # Generic fallback
            raise credentials_exception
