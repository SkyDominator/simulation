"""Tests for consent endpoints (CAT-CONSENT)."""
import pytest


class TestConsentEndpoints:
    """Test privacy compliance consent endpoints."""
    
    def test_CONS_001_record_consent_without_auth_succeeds(self, client, mock_supabase_client):
        """POST /api/consents without auth succeeds (pre-login consent recording)."""
        data = {
            "user_hash": "valid-hash-123",
            "consent_type": "privacy_policy",
            "consent_version": "1.0",
            "ip_address": "127.0.0.1",
            "user_agent": "Test Browser"
        }
        
        response = client.post("/api/consents", json=data)
        
        assert response.status_code == 200
        result = response.json()
        assert "user_hash" in result
        assert "consent_type" in result
        assert "consent_version" in result
        assert "consent_given_at" in result
    
    def test_CONS_002_record_consent_invalid_user_hash_returns_404(self, client, mock_supabase_client):
        """POST /api/consents with invalid user_hash returns 400."""
        data = {
            "user_hash": "invalid-hash-999",
            "consent_type": "privacy_policy", 
            "consent_version": "1.0",
            "ip_address": "127.0.0.1",
            "user_agent": "Test Browser"
        }
        
        response = client.post("/api/consents", json=data)
        
        # WhitelistError returns 400 for invalid user_hash
        assert response.status_code == 400
        result = response.json()
        assert "detail" in result
        assert "허용 명단" in result["detail"]  # Korean message for whitelist error
    
    def test_CONS_003_get_user_consents_valid_hash_returns_200(self, client, mock_supabase_client):
        """GET /api/consents/{user_hash} with valid hash returns 200."""
        user_hash = "valid-hash-123"
        
        response = client.get(f"/api/consents/{user_hash}")
        
        assert response.status_code == 200
        result = response.json()
        assert "consents" in result
        assert "success" in result
        assert isinstance(result["consents"], list)
    
    def test_CONS_004_get_user_consents_invalid_hash_returns_404(self, client, mock_supabase_client):
        """GET /api/consents/{user_hash} with invalid hash returns 400."""
        invalid_hash = "invalid-hash-999"
        
        response = client.get(f"/api/consents/{invalid_hash}")
        
        # WhitelistError returns 400 for invalid user_hash
        assert response.status_code == 400
        result = response.json()
        assert "detail" in result
        assert "허용 명단" in result["detail"]  # Korean message for whitelist error
    
    def test_CONS_005_record_consent_missing_fields_returns_422(self, client):
        """POST /api/consents with missing required fields returns 422."""
        # Missing consent_type field
        data = {
            "user_hash": "valid-hash-123",
            "consent_version": "1.0"
        }
        
        response = client.post("/api/consents", json=data)
        
        assert response.status_code == 422
        result = response.json()
        assert "detail" in result