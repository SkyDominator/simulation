# src/backend/services/otp/utils.py
import secrets
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Tuple

from config.settings import settings

logger = logging.getLogger(__name__)

def generate_otp(digits: int = 6) -> str:
    """Generate a secure random OTP with specified number of digits."""
    # Use cryptographically secure RNG
    if digits <= 0:
        raise ValueError("Number of digits must be positive")
    
    # Generate a random integer with the required number of digits
    min_val = 10 ** (digits - 1)  # Minimum value with 'digits' digits
    max_val = (10 ** digits) - 1  # Maximum value with 'digits' digits
    
    return str(secrets.randbelow(max_val - min_val + 1) + min_val)

def hash_otp(phone: str, otp_code: str) -> str:
    """
    Create an HMAC-SHA256 hash of the phone number and OTP code.
    This avoids storing plaintext OTPs in the database.
    """
    secret = settings.otp_secret_key.encode('utf-8')
    msg = f"{phone}|{otp_code}".encode('utf-8')
    
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()

def verify_otp_hash(phone: str, submitted_code: str, stored_hash: str) -> bool:
    """
    Verify an OTP using constant-time comparison to prevent timing attacks.
    """
    expected_hash = hash_otp(phone, submitted_code)
    
    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_hash, stored_hash)

def normalize_phone(phone_number: str) -> str:
    """
    Normalize phone number to E.164 format.
    For Korean numbers, ensure they start with +82.
    
    Supports multiple Korean prefixes: 010, 011, 016, 017, 018, 019
    """
    # Remove any non-digit characters
    digits_only = ''.join(c for c in phone_number if c.isdigit())
    
    # Handle Korean numbers with multiple prefixes
    if digits_only.startswith('0'):
        # Check for valid Korean mobile prefixes
        valid_prefixes = ['010', '011', '016', '017', '018', '019']
        prefix = digits_only[:3]
        
        if prefix in valid_prefixes:
            # Remove leading 0 and add +82 for Korea
            return f"+82{digits_only[1:]}"
        else:
            # Invalid prefix
            raise ValueError(f"Invalid Korean phone prefix: {prefix}")
    # If already in international format
    elif digits_only.startswith('82'):
        # Check for valid Korean mobile prefixes
        valid_prefixes = ['10', '11', '16', '17', '18', '19']
        prefix = digits_only[2:4]

        if prefix in valid_prefixes:
            # Add + sign for E.164 format
            return f"+82{digits_only[2:]}"
        else:
            raise ValueError(f"Invalid Korean phone prefix: {prefix}")
    else:
        raise ValueError(f"Invalid Korean phone number: {digits_only}")

def calculate_expiry() -> datetime:
    """Calculate expiry time for OTP."""
    return datetime.now() + timedelta(minutes=settings.otp_validity_minutes)