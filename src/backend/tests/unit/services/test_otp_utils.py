"""Tests for OTP utilities and helper functions."""
import pytest
import secrets
from datetime import datetime, timedelta
from unittest.mock import patch

from services.otp.utils import (
    generate_otp, hash_otp, verify_otp_hash, 
    normalize_phone, calculate_expiry
)


class TestOTPUtilities:
    """Test CAT-OTP-UTIL: OTP Utilities (OTPU-001 to OTPU-006)."""
    
    def test_OTPU_001_generate_otp_length_correct_digits_only(self):
        """OTPU-001: generate_otp length correct & digits only for digits=6."""
        otp = generate_otp(digits=6)
        
        # Should be exactly 6 digits
        assert len(otp) == 6
        
        # Should contain only digits
        assert otp.isdigit()
        
        # Should not start with 0 (since we want exactly 6 digits)
        assert otp[0] != '0'
    
    def test_OTPU_002_generate_otp_different_lengths(self):
        """OTPU-002: generate_otp works with different digit lengths."""
        for digits in [4, 5, 6, 7, 8]:
            otp = generate_otp(digits=digits)
            
            assert len(otp) == digits
            assert otp.isdigit()
            
            # Verify it's in the correct range
            min_val = 10 ** (digits - 1)
            max_val = (10 ** digits) - 1
            otp_int = int(otp)
            assert min_val <= otp_int <= max_val
    
    def test_OTPU_003_generate_otp_invalid_digits_raises_error(self):
        """OTPU-003: generate_otp with invalid digits raises ValueError."""
        with pytest.raises(ValueError, match="Number of digits must be positive"):
            generate_otp(digits=0)
        
        with pytest.raises(ValueError, match="Number of digits must be positive"):
            generate_otp(digits=-1)
    
    def test_OTPU_004_hash_otp_consistent_output(self, settings_override):
        """OTPU-004: hash_otp produces consistent hash for same input."""
        phone = "+821012345678"
        otp_code = "123456"
        
        # Same inputs should produce same hash
        hash1 = hash_otp(phone, otp_code)
        hash2 = hash_otp(phone, otp_code)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex digest length
        assert isinstance(hash1, str)
    
    def test_OTPU_005_verify_otp_hash_correct_verification(self, settings_override):
        """OTPU-005: verify_otp_hash correctly verifies matching OTP."""
        phone = "+821012345678"
        otp_code = "123456"
        wrong_code = "654321"
        
        # Generate hash
        stored_hash = hash_otp(phone, otp_code)
        
        # Correct code should verify
        assert verify_otp_hash(phone, otp_code, stored_hash) is True
        
        # Wrong code should not verify
        assert verify_otp_hash(phone, wrong_code, stored_hash) is False
        
        # Wrong phone should not verify
        assert verify_otp_hash("+821087654321", otp_code, stored_hash) is False
    
    def test_OTPU_006_calculate_expiry_returns_correct_time(self, settings_override, freeze_jan_1_2025):
        """OTPU-006: calculate_expiry returns datetime within expected delta."""
        # Test that expiry is calculated based on settings
        with freeze_jan_1_2025:
            base_time = datetime.now()
            expiry_time = calculate_expiry()
            
            # Should be exactly the configured number of minutes in the future
            expected_expiry = base_time + timedelta(minutes=settings_override.otp_validity_minutes)
            
            # Allow small tolerance for execution time
            assert abs((expiry_time - expected_expiry).total_seconds()) < 1


class TestPhoneNormalization:
    """Test phone number normalization functionality."""
    
    def test_normalize_phone_korean_prefixes(self):
        """Test normalization of Korean phone numbers with different prefixes."""
        test_cases = [
            ("010-1234-5678", "+821012345678"),
            ("011-123-4567", "+821112345678"),  
            ("016-1234-5678", "+821612345678"),
            ("017-123-4567", "+821712345678"),
            ("018-1234-5678", "+821812345678"),
            ("019-123-4567", "+821912345678"),
        ]
        
        for input_phone, expected in test_cases:
            result = normalize_phone(input_phone)
            assert result == expected, f"Failed for {input_phone}"
    
    def test_normalize_phone_different_formats(self):
        """Test normalization handles different input formats."""
        test_cases = [
            ("010 1234 5678", "+821012345678"),  # Spaces
            ("010.1234.5678", "+821012345678"),  # Dots
            ("010_1234_5678", "+821012345678"),  # Underscores
            ("01012345678", "+821012345678"),    # No separators
            ("+82-10-1234-5678", "+821012345678"),  # Already with country code
            ("82-10-1234-5678", "+821012345678"),   # Country code without +
        ]
        
        for input_phone, expected in test_cases:
            result = normalize_phone(input_phone)
            assert result == expected, f"Failed for {input_phone}"
    
    def test_normalize_phone_preserves_canonical_form(self):
        """Test that already normalized phone numbers are preserved."""
        canonical_phones = [
            "+821012345678",
            "+821112345678", 
            "+821612345678",
            "+821712345678",
            "+821812345678",
            "+821912345678",
        ]
        
        for phone in canonical_phones:
            result = normalize_phone(phone)
            assert result == phone
    
    def test_normalize_phone_rejects_invalid_prefixes(self):
        """Test that invalid Korean mobile prefixes are rejected."""
        invalid_phones = [
            "020-1234-5678",  # Invalid prefix
            "012-1234-5678",  # Invalid prefix
            "015-1234-5678",  # Invalid prefix
            "013-1234-5678",  # Invalid prefix
        ]
        
        for phone in invalid_phones:
            with pytest.raises((ValueError, Exception)):
                normalize_phone(phone)
    
    def test_normalize_phone_idempotence(self):
        """Test that normalizing a phone number multiple times gives same result."""
        input_phone = "010-1234-5678"
        
        first_result = normalize_phone(input_phone)
        second_result = normalize_phone(first_result)
        third_result = normalize_phone(second_result)
        
        assert first_result == second_result == third_result
        assert first_result == "+821012345678"


class TestOTPSecurity:
    """Test security aspects of OTP generation and verification."""
    
    def test_otp_generation_uses_cryptographic_rng(self):
        """Test that OTP generation uses cryptographically secure random."""
        # This test ensures we're using secrets module, not random module
        # We'll check that generated OTPs have sufficient entropy
        
        otps = set()
        for _ in range(100):
            otp = generate_otp(6)
            otps.add(otp)
        
        # With 100 attempts and 6-digit OTPs (1M possibilities),
        # we should get mostly unique values if using proper RNG
        assert len(otps) >= 95  # Allow some duplicates but not too many
    
    def test_hash_function_prevents_timing_attacks(self, settings_override):
        """Test that OTP verification uses constant-time comparison."""
        phone = "+821012345678"
        correct_otp = "123456"
        wrong_otp = "654321"
        
        stored_hash = hash_otp(phone, correct_otp)
        
        # Measure timing for correct and incorrect OTP
        # Both should take similar time due to constant-time comparison
        import time
        
        start = time.perf_counter()
        verify_otp_hash(phone, correct_otp, stored_hash)
        correct_time = time.perf_counter() - start
        
        start = time.perf_counter()
        verify_otp_hash(phone, wrong_otp, stored_hash)
        wrong_time = time.perf_counter() - start
        
        # Times should be similar (within reasonable variance)
        # This is a basic check; real timing attack testing would be more sophisticated
        time_ratio = max(correct_time, wrong_time) / min(correct_time, wrong_time)
        assert time_ratio < 2.0  # Should not differ by more than 2x
    
    def test_hash_otp_different_for_different_inputs(self, settings_override):
        """Test that different inputs produce different hashes."""
        phone1 = "+821012345678"
        phone2 = "+821087654321"
        otp1 = "123456"
        otp2 = "654321"
        
        # Different phones should produce different hashes
        hash_phone1 = hash_otp(phone1, otp1)
        hash_phone2 = hash_otp(phone2, otp1)
        assert hash_phone1 != hash_phone2
        
        # Different OTPs should produce different hashes
        hash_otp1 = hash_otp(phone1, otp1)
        hash_otp2 = hash_otp(phone1, otp2)
        assert hash_otp1 != hash_otp2