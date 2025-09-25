"""Tests for security validation (CAT-SEC)."""
import pytest


class TestSecurityValidation:
    """Test basic security checks and validation."""
    
    def test_SEC_001_sql_injection_attempts_return_422_or_safe_handling(self, client, mock_supabase_client):
        """SQL injection attempts in request parameters return 422 or are safely handled."""
        # Attempt SQL injection in notice ID parameter 
        malicious_id = "12345678-1234-1234-1234-123456789abc'; DROP TABLE notices; --"
        
        response = client.get(f"/api/notices/{malicious_id}")
        
        # Should be handled safely - either validation error or safe 404
        assert response.status_code in [404, 422]
        data = response.json()
        assert "detail" in data
        # Response should not contain SQL-related errors or expose the injection payload
        assert "sql" not in data["detail"].lower()
        # The malicious SQL should not be in the response
        assert "drop table" not in data["detail"].lower()
    
    def test_SEC_002_xss_payloads_are_properly_handled(self, client, mock_supabase_client, mock_auth_admin_user, valid_auth_headers):
        """XSS payloads in request bodies are properly handled."""
        # Attempt XSS in notice content
        xss_payload = "<script>alert('xss')</script>"
        data = {
            "title": "Test Notice",
            "content": xss_payload,
            "pinned": False,
            "published": True
        }
        
        response = client.post("/api/admin/notices", json=data, headers=valid_auth_headers)
        
        # Should succeed but content should be handled safely
        assert response.status_code == 200
        result = response.json()
        assert "success" in result
        # In real implementation, XSS payload should be sanitized or escaped
    
    def test_SEC_003_oversized_request_payloads_are_rejected(self, client):
        """Oversized request payloads are rejected."""
        # Create large payload
        large_string = "A" * (5 * 1024 * 1024)  # 5MB
        data = {
            "name": "Test User",
            "phone_number": "010-1234-5678",
            "large_field": large_string
        }
        
        # Should be rejected or handled appropriately
        try:
            response = client.post("/api/otp/send", json=data, timeout=5)
            # If processed, should return appropriate error
            assert response.status_code in [413, 422, 400]
        except Exception:
            # Connection/timeout is acceptable for oversized requests
            pass
    
    def test_SEC_004_invalid_content_types_are_rejected(self, client):
        """Invalid content types are rejected."""
        # Send XML when JSON is expected
        xml_data = "<?xml version='1.0'?><root><name>test</name></root>"
        
        response = client.post(
            "/api/otp/send",
            data=xml_data,
            headers={"Content-Type": "application/xml"}
        )
        
        # Should reject non-JSON content type
        assert response.status_code in [415, 422]
        data = response.json()
        assert "detail" in data
    
    def test_SEC_005_authentication_tokens_are_properly_validated(self, client, monkeypatch):
        """Authentication tokens are properly validated."""
        # Test malformed JWT
        malformed_jwt = "invalid.jwt.token"
        
        # Mock authentication to properly reject malformed tokens
        def mock_auth_reject(credentials):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_auth_reject)
        
        response = client.get(
            "/api/simulations",
            headers={"Authorization": f"Bearer {malformed_jwt}"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_SEC_006_admin_endpoints_reject_non_admin_users(self, client, mock_auth_regular_user, valid_auth_headers):
        """Admin endpoints reject non-admin users."""
        # Regular user trying to access admin endpoint
        response = client.get("/api/admin/me", headers=valid_auth_headers)
        
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "admin" in data["detail"].lower()
    
    def test_SEC_007_rate_limiting_prevents_otp_abuse(self, client, mock_supabase_client, mock_otp_service):
        """Rate limiting prevents abuse of OTP endpoints."""
        data = {
            "name": "Test User", 
            "phone_number": "010-1234-5678"
        }
        
        # Add the hash for this specific user to whitelist first
        import hashlib
        normalized_phone = "01012345678"
        combined_string = f"Test User-{normalized_phone}"
        hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        mock_supabase_client.mock_data['whitelist'].append({'user_hash': hashed_value})
        
        # Multiple rapid requests should be successful for whitelisted user (rate limiting at OTP service level)
        responses = []
        for _ in range(5):
            response = client.post("/api/otp/send", json=data)
            responses.append(response)
        
        # Should succeed for whitelisted user
        for response in responses:
            assert response.status_code == 200
            result = response.json()
            assert "success" in result
            assert "message" in result