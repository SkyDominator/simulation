"""Tests for public endpoints (CAT-PUBLIC)."""
import pytest


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication."""
    
    def test_PUB_001_root_endpoint_returns_200_with_message(self, client):
        """GET / returns 200 with expected message."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "running" in data["message"].lower()
    
    def test_PUB_002_health_endpoint_returns_200_with_status(self, client, mock_supabase_client):
        """GET /api/health returns 200 with status info."""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["ok", "degraded"]
        assert "services" in data
        assert "supabase" in data["services"]
        assert "timestamp" in data