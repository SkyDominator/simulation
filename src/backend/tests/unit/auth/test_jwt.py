import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
import sys
import os

# Add the src directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from auth.jwt import authenticate_jwt_token, JWKSClient, _jwks_client
from fastapi.security import HTTPAuthorizationCredentials


class TestJWTAuth:
    """Test JWT validation and admin checking"""
    
    @pytest.fixture
    def mock_jwks_response(self):
        """Mock JWKS response with test keys"""
        return {
            'keys': [
                {
                    'kid': 'test-key-1',
                    'kty': 'RSA',
                    'use': 'sig',
                    'alg': 'RS256',
                    'n': 'test-modulus',
                    'e': 'AQAB'
                },
                {
                    'kid': 'test-key-2',
                    'kty': 'RSA',
                    'use': 'sig',
                    'alg': 'RS256',
                    'n': 'test-modulus-2',
                    'e': 'AQAB'
                }
            ]
        }
    
    @pytest.fixture
    def mock_http_credentials(self):
        """Mock HTTP authorization credentials"""
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJzdWIiOiJ1c2VyLTEyMyIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE2MzAwMDAwMDAsImV4cCI6MTYzMDAwMzYwMH0.test-signature"
        return mock_creds
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_successful_fetch(self, mock_get, mock_jwks_response):
        """Test successful JWKS key fetching"""
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.json.return_value = mock_jwks_response
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Clear any cached keys
        import auth.jwt as jwt_module
        jwt_module._jwks_cache.clear()
        
        client = JWKSClient("https://test.supabase.co")
        keys = client.get_keys()
        
        assert keys == mock_jwks_response
        assert len(keys['keys']) == 2
        assert keys['keys'][0]['kid'] == 'test-key-1'
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_http_error_handling(self, mock_get):
        """Test JWKS client handles HTTP errors properly"""
        # Mock HTTP error
        mock_get.side_effect = Exception("Connection timeout")
        
        # Clear cache
        import auth.jwt as jwt_module
        jwt_module._jwks_cache.clear()
        
        client = JWKSClient("https://test.supabase.co")
        
        with pytest.raises(HTTPException) as exc_info:
            client.get_keys()
        
        assert exc_info.value.status_code == 503
        assert "JWKS fetch failed" in exc_info.value.detail
    
    @patch('auth.jwt.jwt.get_unverified_header')
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode')
    def test_valid_jwt_verification(self, mock_decode, mock_get_keys, mock_header, mock_jwks_response, mock_http_credentials):
        """Test valid JWT token verification"""
        # Mock JWT header
        mock_header.return_value = {
            'kid': 'test-key-1',
            'alg': 'RS256'
        }
        
        # Mock JWKS response
        mock_get_keys.return_value = mock_jwks_response
        
        # Mock successful JWT decode
        mock_decode.return_value = {
            'sub': 'user-123',
            'aud': 'authenticated',
            'iat': 1630000000,
            'exp': 1630003600
        }
        
        result = authenticate_jwt_token(mock_http_credentials)
        
        assert result == 'user-123'
        mock_decode.assert_called_once()
    
    @patch('auth.jwt.jwt.get_unverified_header')
    def test_missing_kid_in_header_raises_error(self, mock_header, mock_http_credentials):
        """Test JWT without kid in header raises authentication error"""
        # Mock JWT header without kid
        mock_header.return_value = {
            'alg': 'RS256'
            # Missing 'kid'
        }
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(mock_http_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
    
    @patch('auth.jwt.jwt.get_unverified_header')
    @patch('auth.jwt._jwks_client.get_keys')
    def test_kid_not_found_in_jwks_raises_error(self, mock_get_keys, mock_header, mock_jwks_response, mock_http_credentials):
        """Test JWT with unknown kid raises authentication error"""
        # Mock JWT header with unknown kid
        mock_header.return_value = {
            'kid': 'unknown-key',
            'alg': 'RS256'
        }
        
        # Mock JWKS response (doesn't contain 'unknown-key')
        mock_get_keys.return_value = mock_jwks_response
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(mock_http_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
    
    @patch('auth.jwt.jwt.get_unverified_header')
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode')
    def test_invalid_audience_rejection(self, mock_decode, mock_get_keys, mock_header, mock_jwks_response, mock_http_credentials):
        """Test token with wrong audience is rejected"""
        # Mock JWT header
        mock_header.return_value = {
            'kid': 'test-key-1',
            'alg': 'RS256'
        }
        
        # Mock JWKS response
        mock_get_keys.return_value = mock_jwks_response
        
        # Mock JWT decode to raise error for wrong audience
        from jose import JWTError
        mock_decode.side_effect = JWTError("Invalid audience")
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(mock_http_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
    
    @patch('auth.jwt.jwt.get_unverified_header')
    @patch('auth.jwt._jwks_client.get_keys')
    @patch('auth.jwt.jwt.decode')
    def test_missing_sub_in_payload_raises_error(self, mock_decode, mock_get_keys, mock_header, mock_jwks_response, mock_http_credentials):
        """Test JWT without sub claim raises authentication error"""
        # Mock JWT header
        mock_header.return_value = {
            'kid': 'test-key-1',
            'alg': 'RS256'
        }
        
        # Mock JWKS response
        mock_get_keys.return_value = mock_jwks_response
        
        # Mock JWT decode with missing sub
        mock_decode.return_value = {
            'aud': 'authenticated',
            'iat': 1630000000,
            'exp': 1630003600
            # Missing 'sub'
        }
        
        with pytest.raises(HTTPException) as exc_info:
            authenticate_jwt_token(mock_http_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
    
    def test_jwt_cache_invalidation_on_key_not_found(self, mock_jwks_response, mock_http_credentials):
        """Test that JWKS cache is cleared when key is not found"""
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header, \
             patch('auth.jwt._jwks_client.get_keys') as mock_get_keys:
            
            # Mock JWT header with unknown kid
            mock_header.return_value = {
                'kid': 'unknown-key',
                'alg': 'RS256'
            }
            
            # Mock JWKS response (doesn't contain 'unknown-key')
            mock_get_keys.return_value = mock_jwks_response
            
            # Verify cache is cleared
            import auth.jwt as jwt_module
            jwt_module._jwks_cache['test'] = 'cached_data'  # Add some cache data
            
            with pytest.raises(HTTPException):
                authenticate_jwt_token(mock_http_credentials)
            
            # Cache should be cleared after failed key lookup
            assert jwt_module._jwks_cache == {}


class TestJWKSClient:
    """Test JWKS client functionality"""
    
    def test_jwks_client_initialization(self):
        """Test JWKS client initialization"""
        client = JWKSClient("https://test.supabase.co/")
        assert client.base_url == "https://test.supabase.co"  # Should strip trailing slash
        
        client2 = JWKSClient("https://test.supabase.co")
        assert client2.base_url == "https://test.supabase.co"
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_caching(self, mock_get):
        """Test that JWKS client caches responses"""
        mock_response = Mock()
        mock_response.json.return_value = {'keys': [{'kid': 'test'}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Clear cache
        import auth.jwt as jwt_module
        jwt_module._jwks_cache.clear()
        
        client = JWKSClient("https://test.supabase.co")
        
        # First call should fetch from API
        keys1 = client.get_keys()
        assert mock_get.call_count == 1
        
        # Second call should use cache
        keys2 = client.get_keys()
        assert mock_get.call_count == 1  # No additional API call
        assert keys1 == keys2
    
    @patch('auth.jwt.requests.get')
    def test_jwks_client_timeout_handling(self, mock_get):
        """Test JWKS client handles timeouts properly"""
        import requests
        mock_get.side_effect = requests.Timeout("Request timeout")
        
        # Clear cache
        import auth.jwt as jwt_module
        jwt_module._jwks_cache.clear()
        
        client = JWKSClient("https://test.supabase.co")
        
        with pytest.raises(HTTPException) as exc_info:
            client.get_keys()
        
        assert exc_info.value.status_code == 503
        assert "JWKS fetch failed" in exc_info.value.detail


class TestJWTIntegration:
    """Integration tests for JWT authentication flow"""
    
    def test_full_authentication_flow_success(self):
        """Test complete successful authentication flow"""
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "valid.jwt.token"
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header, \
             patch('auth.jwt._jwks_client.get_keys') as mock_get_keys, \
             patch('auth.jwt.jwt.decode') as mock_decode:
            
            # Mock valid header
            mock_header.return_value = {
                'kid': 'test-key',
                'alg': 'RS256'
            }
            
            # Mock JWKS with matching key
            mock_get_keys.return_value = {
                'keys': [{'kid': 'test-key', 'kty': 'RSA'}]
            }
            
            # Mock successful decode
            mock_decode.return_value = {
                'sub': 'user-456',
                'aud': 'authenticated'
            }
            
            result = authenticate_jwt_token(mock_creds)
            
            assert result == 'user-456'
            mock_decode.assert_called_once_with(
                'valid.jwt.token',
                {'kid': 'test-key', 'kty': 'RSA'},
                algorithms=['RS256'],
                audience='authenticated'
            )
    
    def test_full_authentication_flow_failure(self):
        """Test complete failed authentication flow"""
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "invalid.jwt.token"
        
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            # Mock invalid header that raises exception
            from jose import JWTError
            mock_header.side_effect = JWTError("Invalid token format")
            
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(mock_creds)
            
            assert exc_info.value.status_code == 401
            assert "Could not validate credentials" in exc_info.value.detail
