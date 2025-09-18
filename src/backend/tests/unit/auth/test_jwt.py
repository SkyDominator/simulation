"""Tests for JWT authentication utilities and JWKS handling."""
import pytest
import json
import base64
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from auth.jwt import JWKSClient, authenticate_jwt_token


class TestJWKSClient:
    """Test JWKS client functionality."""
    
    def test_jwks_keys_loading_from_fixture(self, jwks_keys):
        """Test loading JWKS keys from fixture file."""
        # Verify fixture structure
        assert "keys" in jwks_keys
        assert isinstance(jwks_keys["keys"], list)
        assert len(jwks_keys["keys"]) > 0
        
        # Verify each key has required fields
        for key in jwks_keys["keys"]:
            assert "kty" in key
            assert "kid" in key
            assert "use" in key
            assert "alg" in key
            assert "n" in key
            assert "e" in key
    
    def test_jwks_keys_rotation_order(self, jwks_keys_rotated, jwks_keys):
        """Test that key rotation fixture provides different order for robust selection testing."""
        original_kids = [k["kid"] for k in jwks_keys["keys"]]
        rotated_kids = [k["kid"] for k in jwks_keys_rotated["keys"]]
        
        # Should have same keys but potentially different order
        assert set(original_kids) == set(rotated_kids)
        
        if len(original_kids) > 1:
            # If multiple keys, order should be different
            assert original_kids != rotated_kids
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_get_keys_success(self, mock_get):
        """Test successful JWKS key retrieval."""
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"keys": [{"kid": "test", "kty": "RSA"}]}
        mock_get.return_value = mock_response
        
        client = JWKSClient("https://test.supabase.co")
        keys = client.get_keys()
        
        assert "keys" in keys
        assert len(keys["keys"]) == 1
        assert keys["keys"][0]["kid"] == "test"
        
        mock_get.assert_called_once_with("https://test.supabase.co/auth/v1/.well-known/jwks.json", timeout=5)
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_get_keys_failure(self, mock_get):
        """Test JWKS key retrieval failure handling."""
        mock_get.side_effect = Exception("Network error")
        
        client = JWKSClient("https://test.supabase.co")
        
        with pytest.raises(HTTPException) as exc_info:
            client.get_keys()
        
        assert exc_info.value.status_code == 503
        assert "JWKS fetch failed" in str(exc_info.value.detail)
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_caching(self, mock_get):
        """Test that JWKS keys are cached and not fetched multiple times."""
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"keys": [{"kid": "test", "kty": "RSA"}]}
        mock_get.return_value = mock_response
        
        client = JWKSClient("https://test.supabase.co")
        
        # Call twice
        keys1 = client.get_keys()
        keys2 = client.get_keys()
        
        # Should be same object due to caching
        assert keys1 is keys2
        
        # Should only call requests.get once
        assert mock_get.call_count == 1


class TestJWTAuthentication:
    """Test JWT authentication wrapper functions."""
    
    def _create_test_token_header(self, payload=None, header=None, kid="test-key-id-1"):
        """Helper to create test JWT token parts.""" 
        if header is None:
            header = {"typ": "JWT", "alg": "RS256", "kid": kid}
        if payload is None:
            payload = {"sub": "test-user-id", "aud": "authenticated", "exp": 9999999999}
        
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        signature_b64 = "fake-signature"
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"
    
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode')
    def test_jwt_authentication_success(self, mock_decode, mock_get_keys, jwks_keys):
        """Test successful JWT authentication."""
        mock_get_keys.return_value = jwks_keys
        mock_decode.return_value = {"sub": "test-user-123", "aud": "authenticated"}
        
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        user_id = authenticate_jwt_token(credentials)
        
        assert user_id == "test-user-123"
        mock_decode.assert_called_once()
    
    @patch('auth.jwt._jwks_client.get_keys')
    def test_jwt_missing_kid_in_header(self, mock_get_keys, jwks_keys):
        """Test JWT with missing 'kid' in header raises InvalidTokenException."""
        mock_get_keys.return_value = jwks_keys
        
        # Create token without 'kid'
        header = {"typ": "JWT", "alg": "RS256"}  # Missing 'kid'
        token = self._create_test_token_header(header=header)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in str(exc_info.value.detail)
    
    @patch('auth.jwt._jwks_client.get_keys')
    def test_jwt_missing_alg_in_header(self, mock_get_keys, jwks_keys):
        """Test JWT with missing 'alg' in header raises exception."""
        mock_get_keys.return_value = jwks_keys
        
        # Create token without 'alg'
        header = {"typ": "JWT", "kid": "test-key-id-1"}  # Missing 'alg'
        token = self._create_test_token_header(header=header)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth.jwt._jwks_client.get_keys')
    def test_jwt_kid_not_found_in_jwks(self, mock_get_keys, jwks_keys):
        """Test JWT with 'kid' not found in JWKS raises exception."""
        mock_get_keys.return_value = jwks_keys
        
        # Use non-existent kid
        token = self._create_test_token_header(kid="non-existent-kid")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    def test_jwt_malformed_token_segments(self):
        """Test malformed JWT token (wrong number of segments) raises exception."""
        # Invalid token with only 2 segments instead of 3
        malformed_token = "header.payload"  # Missing signature
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=malformed_token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    def test_jwt_invalid_base64_encoding(self):
        """Test JWT with invalid base64 encoding raises exception."""
        # Invalid base64 characters
        invalid_token = "invalid!!!.base64!!.encoding!!!"
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=invalid_token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth.jwt._jwks_client.get_keys') 
    @patch('auth.jwt.jwt.decode')
    def test_jwt_expired_token(self, mock_decode, mock_get_keys, jwks_keys):
        """Test expired JWT token raises TokenExpiredException."""
        from jose import ExpiredSignatureError
        
        mock_get_keys.return_value = jwks_keys
        mock_decode.side_effect = ExpiredSignatureError("Token has expired")
        
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode') 
    def test_jwt_audience_mismatch(self, mock_decode, mock_get_keys, jwks_keys):
        """Test JWT with wrong audience raises AudienceMismatchException."""
        from jose import JWTClaimsError
        
        mock_get_keys.return_value = jwks_keys
        mock_decode.side_effect = JWTClaimsError("Invalid audience")
        
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode')
    def test_jwt_missing_sub_claim(self, mock_decode, mock_get_keys, jwks_keys):
        """Test JWT missing 'sub' claim raises exception."""
        mock_get_keys.return_value = jwks_keys
        mock_decode.return_value = {"aud": "authenticated"}  # Missing 'sub'
        
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401
    
    @patch('auth.jwt._jwks_client.get_keys')
    def test_jwt_unsupported_algorithm(self, mock_get_keys, jwks_keys):
        """Test JWT with unsupported algorithm raises exception."""
        mock_get_keys.return_value = jwks_keys
        
        # Create token with unsupported algorithm
        header = {"typ": "JWT", "alg": "HS256", "kid": "test-key-id-1"}  # Unsupported alg
        token = self._create_test_token_header(header=header)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # This will likely fail during jwt.decode, resulting in 401
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(credentials)
        
        assert exc_info.value.status_code == 401


class TestJWKSCachingBehavior:
    """Test JWKS caching and TTL behavior."""
    
    @patch('auth.jwt.requests.get')
    def test_jwks_cache_invalidation_on_key_not_found(self, mock_get):
        """Test that JWKS cache is cleared when key is not found."""
        # First call returns keys, second call after cache clear returns different keys
        mock_response1 = Mock()
        mock_response1.raise_for_status.return_value = None
        mock_response1.json.return_value = {"keys": [{"kid": "old-key", "kty": "RSA"}]}
        
        mock_response2 = Mock()
        mock_response2.raise_for_status.return_value = None
        mock_response2.json.return_value = {"keys": [{"kid": "new-key", "kty": "RSA"}]}
        
        mock_get.side_effect = [mock_response1, mock_response2]
        
        # Create token with kid that won't be found in first JWKS
        token = self._create_test_token_header(kid="new-key")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # This will fetch JWKS, not find the key, clear cache, and fail
        with pytest.raises(HTTPException):
            authenticate_jwt_token(credentials)
        
        # Verify cache was cleared and JWKS was fetched twice
        assert mock_get.call_count == 2
    
    def _create_test_token_header(self, payload=None, header=None, kid="test-key-id-1"):
        """Helper to create test JWT token parts."""
        if header is None:
            header = {"typ": "JWT", "alg": "RS256", "kid": kid}
        if payload is None:
            payload = {"sub": "test-user-id", "aud": "authenticated", "exp": 9999999999}
        
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        signature_b64 = "fake-signature"
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"


class TestJWKSFixtureValidation:
    """Test JWKS fixture file validation."""
    
    def test_jwks_fixture_file_exists(self):
        """Test that JWKS fixture file exists and is valid JSON."""
        fixture_path = Path(__file__).parent.parent.parent / "fixtures" / "jwks.json"
        assert fixture_path.exists(), f"JWKS fixture file not found at {fixture_path}"
        
        with open(fixture_path) as f:
            jwks_data = json.load(f)
        
        assert "keys" in jwks_data
        assert isinstance(jwks_data["keys"], list)
        assert len(jwks_data["keys"]) >= 1
    
    def test_jwks_fixture_key_structure(self, jwks_keys):
        """Test that JWKS fixture keys have correct structure."""
        for key in jwks_keys["keys"]:
            # Required RSA key fields
            assert key["kty"] == "RSA"
            assert "kid" in key
            assert "use" in key
            assert "alg" in key
            assert "n" in key
            assert "e" in key
            
            # Verify types
            assert isinstance(key["kid"], str)
            assert isinstance(key["n"], str)
            assert isinstance(key["e"], str)
    
    def test_jwks_fixture_multiple_keys_unique_ids(self, jwks_keys):
        """Test that JWKS fixture has multiple keys with unique IDs."""
        kids = [key["kid"] for key in jwks_keys["keys"]]
        
        # Should have multiple keys for rotation testing
        assert len(kids) >= 2
        
        # All kids should be unique
        assert len(kids) == len(set(kids))
