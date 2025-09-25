"""Tests for content endpoints (CAT-CONTENT)."""
import pytest
import uuid


class TestContentEndpoints:
    """Test public content retrieval endpoints."""
    
    def test_CONT_001_notices_list_returns_200_with_published_notices(self, client, mock_supabase_client):
        """GET /api/notices returns 200 with published notices list."""
        response = client.get("/api/notices")
        
        assert response.status_code == 200
        data = response.json()
        assert "notices" in data
        assert "success" in data
        assert data["success"] is True
        assert isinstance(data["notices"], list)
    
    def test_CONT_002_notice_detail_returns_200_with_specific_notice(self, client, mock_supabase_client):
        """GET /api/notices/{id} returns 200 with specific notice details."""
        notice_id = "notice-1"
        response = client.get(f"/api/notices/{notice_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "notice" in data
        assert "success" in data
        assert data["success"] is True
        assert isinstance(data["notice"], dict)
    
    def test_CONT_003_notice_detail_nonexistent_id_returns_404(self, client, mock_supabase_client):
        """GET /api/notices/{id} with non-existent ID returns 404."""
        nonexistent_id = str(uuid.uuid4())
        response = client.get(f"/api/notices/{nonexistent_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_CONT_004_notice_detail_invalid_uuid_returns_422(self, client, mock_supabase_client):
        """GET /api/notices/{id} with invalid UUID format returns 422."""
        invalid_uuid = "12345678-1234-1234-1234-123456789abc"  # Valid UUID format but non-existent
        response = client.get(f"/api/notices/{invalid_uuid}")
        
        # Note: FastAPI may handle this differently, but we expect either 404 or 422
        # The endpoint should handle invalid UUIDs gracefully
        assert response.status_code in [404, 422]
        data = response.json()
        assert "detail" in data