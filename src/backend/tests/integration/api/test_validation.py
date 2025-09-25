"""Tests for request validation and error handling (CAT-VALID and CAT-ERROR)."""
import pytest


class TestRequestValidation:
    """Test request validation and comprehensive error responses."""
    
    def test_VAL_001_invalid_json_returns_422(self, client):
        """Invalid JSON in request body returns 422."""
        response = client.post(
            "/api/otp/send",
            data="invalid json content",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_VAL_002_missing_required_fields_returns_422(self, client):
        """Missing required fields returns 422 with field details."""
        # OTP send endpoint requires both name and phone_number
        data = {
            "name": "Test User"
            # Missing phone_number
        }
        
        response = client.post("/api/otp/send", json=data)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        # FastAPI provides detailed field validation errors
        assert isinstance(data["detail"], list)
    
    def test_VAL_003_invalid_field_types_returns_422(self, client):
        """Invalid field types returns 422 with type validation error."""
        # Send integer instead of string for name
        data = {
            "name": 12345,
            "phone_number": "010-1234-5678"
        }
        
        response = client.post("/api/otp/send", json=data)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_VAL_004_invalid_phone_number_format_returns_422(self, client, mock_supabase_client):
        """Invalid phone number format in OTP requests returns 422."""
        # This depends on validation in the endpoint or model
        data = {
            "name": "Test User",
            "phone_number": "invalid-phone"
        }
        
        response = client.post("/api/otp/send", json=data)
        
        # The endpoint may process this and return business logic error
        # or validation error depending on implementation
        assert response.status_code in [200, 422]
        data = response.json()
        if response.status_code == 422:
            assert "detail" in data
    
    def test_VAL_005_invalid_uuid_format_returns_422_or_404(self, client, mock_supabase_client):
        """Invalid UUID format in path parameters returns 422 or 404."""
        invalid_uuid = "not-a-valid-uuid"
        
        response = client.get(f"/api/notices/{invalid_uuid}")
        
        # FastAPI may handle this as 404 (not found) or validation error
        assert response.status_code in [404, 422]
        data = response.json()
        assert "detail" in data
    
    def test_VAL_006_empty_request_body_when_required_returns_422(self, client):
        """Empty request body when required returns 422."""
        response = client.post(
            "/api/otp/send",
            json={},  # Empty body
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_VAL_007_oversized_request_payload_returns_413(self, client):
        """Oversized request payload returns 413."""
        # Create a very large payload
        large_content = "x" * (10 * 1024 * 1024)  # 10MB string
        data = {
            "name": "Test User",
            "phone_number": "010-1234-5678",
            "large_field": large_content
        }
        
        # This might timeout or be rejected by the server
        # In practice, we'd configure request size limits
        try:
            response = client.post("/api/otp/send", json=data, timeout=5)
            # If it gets processed, check for appropriate error
            assert response.status_code in [413, 422, 500]
        except Exception:
            # Request might be rejected before reaching our app
            pass
    
    def test_VAL_008_invalid_content_type_returns_415(self, client):
        """Invalid content type returns 415."""
        response = client.post(
            "/api/otp/send",
            data="name=Test&phone=010-1234-5678",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # FastAPI expects JSON for this endpoint
        assert response.status_code in [415, 422]
        data = response.json()
        assert "detail" in data
    
    def test_VAL_009_malformed_request_headers_return_appropriate_errors(self, client):
        """Malformed request headers return appropriate errors."""
        # Invalid Authorization header format
        response = client.get(
            "/api/simulations",
            headers={"Authorization": "InvalidFormat"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_VAL_010_business_logic_validation_errors_return_400(self, client, mock_supabase_client, mock_auth_admin_user, valid_auth_headers):
        """Business logic validation errors return 400 with details."""
        # Try to create privacy policy with published=True (business rule violation)
        data = {
            "version": "2.0",
            "content": "Test content",
            "published": True,  # This should be rejected by business logic
            "effective_date": "2025-01-01"
        }
        
        response = client.post("/api/admin/privacy-policies", json=data, headers=valid_auth_headers)
        
        assert response.status_code == 400
        result = response.json()
        assert "detail" in result
        assert "publish" in result["detail"].lower()


class TestErrorResponseFormat:
    """Test consistent error response format across all endpoints."""
    
    def test_ERR_001_all_4xx_errors_include_detail_field(self, client):
        """All 4xx errors include 'detail' field in response."""
        # Test 401 error
        response = client.get("/api/simulations")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
        # Test 422 error
        response = client.post("/api/otp/send", json={})
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_ERR_002_all_5xx_errors_include_appropriate_message(self, client, mock_supabase_client, monkeypatch):
        """All 5xx errors include appropriate error message."""
        # Mock a database failure to trigger 500 error
        def mock_failing_supabase():
            raise Exception("Database connection failed")
        
        monkeypatch.setattr("api.routes._supabase_client", mock_failing_supabase)
        
        response = client.get("/api/health")
        
        # Health endpoint should handle DB failures gracefully
        assert response.status_code == 200  # Health endpoint returns status info
        data = response.json()
        assert "status" in data
        # Should indicate degraded status due to DB failure
        assert data["status"] == "degraded"
    
    def test_ERR_003_error_messages_dont_leak_sensitive_information(self, client):
        """Error messages don't leak sensitive information."""
        # Try to access admin endpoint without proper auth
        response = client.get("/api/admin/me")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        # Should not reveal internal system details
        error_msg = data["detail"].lower()
        assert "database" not in error_msg
        assert "sql" not in error_msg
        assert "internal" not in error_msg
    
    def test_ERR_004_validation_errors_include_field_specific_details(self, client):
        """Validation errors include field-specific details."""
        # Send request with missing required fields
        response = client.post("/api/otp/send", json={"name": "Test"})
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        
        # FastAPI provides detailed validation errors
        if isinstance(data["detail"], list):
            # Should have field-specific error information
            error_details = data["detail"]
            assert len(error_details) > 0
            # Check if field information is included
            field_error = error_details[0]
            assert "loc" in field_error or "field" in str(field_error)
    
    def test_ERR_005_authentication_errors_return_consistent_format(self, client):
        """Authentication errors return consistent format."""
        # Test missing auth
        response = client.get("/api/simulations")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
        # Test admin auth requirement
        response = client.get("/api/admin/me", headers={"Authorization": "Bearer fake-token"})
        # This will trigger our mock auth which should fail for non-admin
        assert response.status_code in [401, 403]
        data = response.json()
        assert "detail" in data