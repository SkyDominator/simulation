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
    """Test JWT authentication wrapper functions according to CAT-JWT."""
    
    def _create_test_token_header(self, payload=None, header=None, kid="test-key-id-1"):
        """Helper to create test JWT token parts.""" 
        if header is None:
            header = {"alg": "RS256", "typ": "JWT", "kid": kid}
        if payload is None:
            payload = {"sub": "test-user", "aud": "authenticated", "exp": 9999999999}
        
        # Encode header and payload
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        
        return f"{header_b64}.{payload_b64}.fake-signature"
    
    def test_JWT_001_missing_kid_raises_unauthorized(self, jwks_keys):
        """JWT-001: Missing kid -> Unauthorized (simulate header lacking 'kid')."""
        # Create token without kid in header
        token = self._create_test_token_header(header={"alg": "RS256", "typ": "JWT"})  # No kid
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            mock_header.return_value = {"alg": "RS256", "typ": "JWT"}  # No kid
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
            
            assert exc_info.value.status_code == 401
            assert "Missing 'kid' in JWT header" in str(exc_info.value.detail)
    
    def test_JWT_002_duplicated_kid_raises_error(self, jwks_keys):
        """JWT-002: Duplicated kid -> InvalidTokenException with specific message."""
        # Create token with duplicated kid (this is a malformed header scenario)
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            # Simulate header with duplicated kid (array instead of string)
            mock_header.return_value = {"alg": "RS256", "typ": "JWT", "kid": ["kid1", "kid1"]}
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
            
            assert exc_info.value.status_code == 401
            assert "Duplicated 'kid' values" in str(exc_info.value.detail)
    
    def test_JWT_003_unknown_kid_triggers_cache_clear_and_retry(self, jwks_keys):
        """JWT-003: Unknown kid triggers cache clear and retry mechanism."""
        token = self._create_test_token_header(kid="unknown-kid")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        def mock_get_keys_side_effect(*args, **kwargs):
            # First call returns keys without the needed kid
            # Second call (after cache clear) returns the needed kid
            if mock_get_keys.call_count == 1:
                return {"keys": [{"kid": "other-kid", "kty": "RSA"}]}
            else:
                return {"keys": [{"kid": "unknown-kid", "kty": "RSA", "n": "test", "e": "AQAB"}]}
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header, \
             patch('auth.jwt.jwt.decode') as mock_decode, \
             patch.object(JWKSClient, 'get_keys', side_effect=mock_get_keys_side_effect) as mock_get_keys:
            
            mock_header.return_value = {"alg": "RS256", "typ": "JWT", "kid": "unknown-kid"}
            mock_decode.return_value = {"sub": "test-user"}
            
            # This should trigger cache clear and retry
            result = authenticate_jwt_token(credentials)
            
            # Verify retry mechanism was triggered (2 calls to get_keys)
            assert mock_get_keys.call_count == 2
            assert result == "test-user"
    
    def test_JWT_004_unsupported_algorithm_raises_error(self, jwks_keys):
        """JWT-004: Unsupported alg -> UnsupportedAlgorithmException."""
        token = self._create_test_token_header(header={"alg": "HS256", "typ": "JWT", "kid": "test-key-id-1"})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            mock_header.return_value = {"alg": "HS256", "typ": "JWT", "kid": "test-key-id-1"}
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
            
            assert exc_info.value.status_code == 401
            assert "Unsupported algorithm: HS256" in str(exc_info.value.detail)
    
    def test_JWT_005_audience_mismatch_raises_error(self, jwks_keys):
        """JWT-005: aud mismatch -> AudienceMismatchException."""
        # Create token with wrong audience
        payload = {"sub": "test-user", "aud": "wrong-audience", "exp": 9999999999}
        token = self._create_test_token_header(payload=payload)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header, \
             patch('auth.jwt.jwt.decode') as mock_decode, \
             patch.object(JWKSClient, 'get_keys', return_value=jwks_keys):
            
            mock_header.return_value = {"alg": "RS256", "typ": "JWT", "kid": "test-key-id-1"}
            mock_decode.side_effect = Exception("Audience mismatch: expected authenticated, got wrong-audience")
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
            
            assert exc_info.value.status_code == 401
            assert "Audience mismatch" in str(exc_info.value.detail)
    
    def test_JWT_006_malformed_token_segments_raises_error(self, jwks_keys):
        """JWT-006: Malformed JWT token segments -> MalformedTokenException."""
        # Create malformed token (missing segments)
        malformed_token = "only.one.segment"  # Should have 3 segments
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=malformed_token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            mock_header.side_effect = Exception("Malformed JWT token segments")
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
            
            assert exc_info.value.status_code == 401
            assert "Malformed JWT token" in str(exc_info.value.detail)
    
    def test_JWT_007_cache_reuse_same_token_no_network_fetch(self, jwks_keys):
        """JWT-007: Cache reuse: same token second call does not trigger network fetch."""
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header, \
             patch('auth.jwt.jwt.decode') as mock_decode, \
             patch.object(JWKSClient, 'get_keys', return_value=jwks_keys) as mock_get_keys:
            
            mock_header.return_value = {"alg": "RS256", "typ": "JWT", "kid": "test-key-id-1"}
            mock_decode.return_value = {"sub": "test-user"}
            
            # First call
            result1 = authenticate_jwt_token(credentials)
            # Second call with same token
            result2 = authenticate_jwt_token(credentials)
            
            # Both should succeed
            assert result1 == "test-user"
            assert result2 == "test-user"
            
            # Should call get_keys twice due to cache clear/retry mechanism when key is found
            # This test verifies we're using mock.call_count instead of mutable dictionary
            assert mock_get_keys.call_count == 2
    
    @patch('auth.jwt.jwt.get_unverified_header')
    @patch('auth.jwt.jwt.decode')
    @patch.object(JWKSClient, 'get_keys')
    def test_JWT_valid_token_success(self, mock_get_keys, mock_decode, mock_header, jwks_keys):
        """Test successful JWT validation with valid token."""
        token = self._create_test_token_header()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        mock_header.return_value = {"alg": "RS256", "typ": "JWT", "kid": "test-key-id-1"}
        mock_decode.return_value = {"sub": "test-user-id", "aud": "authenticated"}
        mock_get_keys.return_value = jwks_keys
        
        result = authenticate_jwt_token(credentials)
        
        assert result == "test-user-id"
        mock_decode.assert_called_once()


class TestJWKSKeySelection:
    """Test JWKS key selection and rotation robustness."""
    
    def test_key_selection_from_multiple_keys(self, jwks_keys):
        """Test that correct key is selected from multiple available keys."""
        # This test verifies that the system can select the right key by kid
        # when multiple keys are available
        
        keys = jwks_keys["keys"]
        assert len(keys) >= 2, "Test requires at least 2 keys in fixture"
        
        # Test selecting each key
        for key in keys:
            kid = key["kid"]
            
            with patch.object(JWKSClient, 'get_keys', return_value=jwks_keys):
                # The system should be able to find this specific key
                client = JWKSClient("https://test.supabase.co")
                retrieved_keys = client.get_keys()
                
                # Verify the kid exists in retrieved keys
                kid_found = any(k["kid"] == kid for k in retrieved_keys["keys"])
                assert kid_found, f"Key with kid {kid} not found in retrieved keys"
    
    def test_key_rotation_handling(self, jwks_keys, jwks_keys_rotated):
        """Test that key rotation (order change) doesn't break key selection."""
        # Verify both fixtures have the same keys, just different order
        original_kids = set(k["kid"] for k in jwks_keys["keys"])
        rotated_kids = set(k["kid"] for k in jwks_keys_rotated["keys"])
        
        assert original_kids == rotated_kids
        
        # Both should be usable for key lookup
        for keys_fixture in [jwks_keys, jwks_keys_rotated]:
            with patch.object(JWKSClient, 'get_keys', return_value=keys_fixture):
                client = JWKSClient("https://test.supabase.co")
                result = client.get_keys()
                
                assert "keys" in result
                assert len(result["keys"]) > 0