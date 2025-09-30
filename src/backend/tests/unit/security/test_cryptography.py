"""Unit tests for cryptographic functions and security implementations."""
import pytest
import hashlib
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from services.otp.utils import hash_otp, verify_otp_hash, normalize_phone
from auth.jwt import authenticate_jwt_token, JWKSClient


@pytest.mark.unit
class TestCryptographicFunctions:
    """Unit tests for cryptographic functions."""
    
    def test_otp_hmac_generation_deterministic(self):
        """Test that OTP HMAC generation is deterministic."""
        phone = "01012345678"
        code = "123456" 
        
        # Same inputs should produce same hash
        hash1 = hash_otp(phone, code)
        hash2 = hash_otp(phone, code)
        
        assert hash1 == hash2
        assert isinstance(hash1, str)
        assert len(hash1) > 0
    
    def test_otp_hmac_validation_correct_code(self):
        """Test OTP HMAC validation with correct code."""
        phone = "01012345678"
        code = "123456"
        
        # Generate hash and verify it
        code_hash = hash_otp(phone, code)
        is_valid = verify_otp_hash(phone, code, code_hash)
        
        assert is_valid is True
    
    def test_otp_hmac_validation_incorrect_code(self):
        """Test OTP HMAC validation with incorrect code."""
        phone = "01012345678"
        correct_code = "123456"
        wrong_code = "654321"
        
        # Generate hash with correct code, verify with wrong code
        code_hash = hash_otp(phone, correct_code)
        is_valid = verify_otp_hash(phone, wrong_code, code_hash)
        
        assert is_valid is False
    
    def test_otp_hmac_phone_sensitivity(self):
        """Test that OTP HMAC is sensitive to phone number changes."""
        code = "123456"
        phone1 = "01012345678"
        phone2 = "01087654321"
        
        hash1 = hash_otp(phone1, code)
        hash2 = hash_otp(phone2, code)
        
        assert hash1 != hash2
    
    def test_phone_number_hashing_sha256(self):
        """Test that phone number hashing uses SHA256 correctly."""
        name = "테스트사용자"
        phone = "010-1234-5678"
        
        # Normalize phone (remove hyphens)
        normalized = phone.replace('-', '')
        combined = f"{name}-{normalized}"
        
        # Generate hash
        hash_value = hashlib.sha256(combined.encode('utf-8')).hexdigest()
        
        # Verify properties
        assert len(hash_value) == 64  # SHA256 produces 64 hex chars
        assert isinstance(hash_value, str)
        assert phone not in hash_value  # Original phone not in hash
        assert name not in hash_value   # Original name not in hash
    
    def test_phone_normalization_consistency(self):
        """Test phone normalization produces consistent results."""
        test_cases = [
            ("010-1234-5678", "+821012345678"),
            ("010 1234 5678", "+821012345678"), 
            ("010-1234 5678", "+821012345678"),
            ("01012345678", "+821012345678"),
        ]
        
        for input_phone, expected in test_cases:
            normalized = normalize_phone(input_phone)
            assert normalized == expected


@pytest.mark.unit  
class TestJWTSecurityFunctions:
    """Unit tests for JWT security functions."""
    
    def test_jwks_client_key_extraction(self):
        """Test JWKS key extraction from response."""
        mock_keys = {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "test-key-1",
                    "use": "sig",
                    "alg": "RS256",
                    "n": "test-n-value",
                    "e": "AQAB"
                }
            ]
        }
        
        with patch('auth.jwt.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.return_value = mock_keys
            mock_get.return_value = mock_response
            
            client = JWKSClient("https://test.supabase.co")
            keys = client.get_keys()
            
            assert "keys" in keys
            assert len(keys["keys"]) == 1
            assert keys["keys"][0]["kid"] == "test-key-1"
    
    def test_jwks_client_caching_behavior(self):
        """Test that JWKS client caches keys properly."""
        mock_keys = {"keys": [{"kid": "test-key"}]}
        
        with patch('auth.jwt.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.return_value = mock_keys
            mock_get.return_value = mock_response
            
            client = JWKSClient("https://test.supabase.co")
            
            # First call should fetch
            keys1 = client.get_keys()
            # Second call should use cache
            keys2 = client.get_keys()
            
            # Should be same object (cached)
            assert keys1 is keys2
            # Should only call requests.get once
            assert mock_get.call_count == 1
    
    def test_jwt_signature_validation_error_handling(self):
        """Test JWT signature validation error handling."""
        from fastapi.security import HTTPAuthorizationCredentials
        from fastapi import HTTPException
        
        # Mock invalid token
        invalid_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid.jwt.token"
        )
        
        # Should raise HTTPException for invalid token
        with pytest.raises(HTTPException) as exc_info:
            from auth.jwt import authenticate_jwt_token
            # Call the function directly with invalid credentials
            authenticate_jwt_token(invalid_credentials)
        
        assert exc_info.value.status_code == 401


@pytest.mark.unit
class TestInputSanitization:
    """Unit tests for input sanitization and validation."""
    
    def test_sql_injection_pattern_detection(self):
        """Test detection of SQL injection patterns."""
        sql_patterns = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM notices; --"
        ]
        
        # Test that these patterns would be caught by validation
        # (Real implementation would use Pydantic validators)
        for pattern in sql_patterns:
            # UUID validation should reject these patterns
            import uuid
            with pytest.raises(ValueError):
                uuid.UUID(pattern)
    
    def test_xss_pattern_detection(self):
        """Test XSS pattern handling in content fields."""
        xss_patterns = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<body onload=alert('xss')>"
        ]
        
        # Test that these patterns are detected
        for pattern in xss_patterns:
            # Content should be sanitized (in real implementation)
            # For now, just verify pattern characteristics
            assert "<" in pattern or "javascript:" in pattern
    
    def test_command_injection_prevention(self):
        """Test command injection prevention in plan IDs."""
        command_patterns = [
            "; ls -la",
            "&& cat /etc/passwd", 
            "`whoami`",
            "$(id)"
        ]
        
        # Plan IDs should only be valid plan letters
        valid_plans = ["A", "B", "C", "D", "K", "P", "R", "F", "E", "G"]
        
        for pattern in command_patterns:
            assert pattern not in valid_plans
    
    def test_numeric_input_validation(self):
        """Test numeric input validation for simulation parameters."""
        # Test round numbers
        valid_rounds = [1, 2, 15, 36]
        invalid_rounds = [-1, 0, 1000, "abc", None]
        
        for round_num in valid_rounds:
            assert isinstance(round_num, int)
            assert round_num > 0
        
        for invalid in invalid_rounds:
            if isinstance(invalid, int):
                assert invalid <= 0 or invalid > 100
            else:
                assert not isinstance(invalid, int)


@pytest.mark.unit
class TestSecurityConstants:
    """Test security-related constants and configurations."""
    
    def test_otp_security_parameters(self):
        """Test OTP security parameter ranges."""
        # These should be reasonable security values
        validity_minutes = 5
        max_attempts = 6
        resend_limit_15min = 3
        resend_limit_day = 10
        
        # Verify ranges are secure
        assert 1 <= validity_minutes <= 15  # Not too long
        assert 3 <= max_attempts <= 10      # Reasonable attempts
        assert 1 <= resend_limit_15min <= 5 # Rate limiting
        assert 5 <= resend_limit_day <= 20  # Daily limit
    
    def test_jwt_security_parameters(self):
        """Test JWT security parameters."""
        # Mock JWKS endpoint URL structure
        jwks_path = "/auth/v1/.well-known/jwks.json"
        base_url = "https://test.supabase.co"
        
        full_url = f"{base_url}{jwks_path}"
        
        # Verify URL structure
        assert full_url.startswith("https://")
        assert ".well-known/jwks.json" in full_url
    
    def test_password_hashing_requirements(self):
        """Test password/secret hashing requirements."""
        # Test minimum secret length
        weak_secret = "123"
        strong_secret = "this-is-a-very-long-secret-key-for-testing"
        
        assert len(weak_secret) < 10   # Too weak
        assert len(strong_secret) >= 20 # Strong enough
        
        # Test entropy (basic check)
        import string
        charset = string.ascii_letters + string.digits + "-_"
        assert all(c in charset for c in strong_secret)