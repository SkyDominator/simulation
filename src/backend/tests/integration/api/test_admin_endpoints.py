"""Tests for admin endpoints (CAT-ADMIN)."""
import pytest
import uuid


class TestAdminEndpoints:
    """Test administrative endpoints requiring admin authorization."""
    
    # Admin info endpoint
    def test_ADM_001_admin_me_without_auth_returns_401(self, client, no_auth_headers):
        """GET /api/admin/me without auth returns 401."""
        response = client.get("/api/admin/me", headers=no_auth_headers)
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_ADM_002_admin_me_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """GET /api/admin/me with non-admin auth returns 403."""
        response = client.get("/api/admin/me", headers=valid_auth_headers)
        
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "admin" in data["detail"].lower()
    
    def test_ADM_003_admin_me_with_admin_auth_returns_admin_info(self, client, mock_auth_admin_user, valid_auth_headers):
        """GET /api/admin/me with admin auth returns admin info."""
        response = client.get("/api/admin/me", headers=valid_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "is_admin" in data
        assert data["is_admin"] is True
        assert "success" in data
    
    # Notice management endpoints
    def test_ADM_004_create_notice_without_auth_returns_401(self, client, no_auth_headers):
        """POST /api/admin/notices without auth returns 401."""
        data = {
            "title": "Test Notice",
            "content": "Test content",
            "pinned": False,
            "published": True
        }
        
        response = client.post("/api/admin/notices", json=data, headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_005_create_notice_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """POST /api/admin/notices with non-admin auth returns 403."""
        data = {
            "title": "Test Notice",
            "content": "Test content", 
            "pinned": False,
            "published": True
        }
        
        response = client.post("/api/admin/notices", json=data, headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_006_create_notice_admin_auth_creates_notice(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """POST /api/admin/notices with admin auth creates notice."""
        data = {
            "title": "Test Notice",
            "content": "Test content",
            "pinned": False,
            "published": True
        }
        
        response = client.post("/api/admin/notices", json=data, headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        assert "message" in result
        assert "success" in result
        assert result["success"] is True
    
    def test_ADM_007_delete_notice_without_auth_returns_401(self, client, no_auth_headers):
        """DELETE /api/admin/notices/{id} without auth returns 401."""
        notice_id = "notice-123"
        
        response = client.delete(f"/api/admin/notices/{notice_id}", headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_008_delete_notice_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """DELETE /api/admin/notices/{id} with non-admin auth returns 403."""
        notice_id = "notice-123"
        
        response = client.delete(f"/api/admin/notices/{notice_id}", headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_009_delete_notice_admin_auth_deletes_notice(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """DELETE /api/admin/notices/{id} with admin auth deletes notice."""
        notice_id = "notice-123"
        
        response = client.delete(f"/api/admin/notices/{notice_id}", headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        assert "message" in result
        assert "success" in result
    
    # Privacy policy management endpoints
    def test_ADM_010_create_privacy_policy_without_auth_returns_401(self, client, no_auth_headers):
        """POST /api/admin/privacy-policies without auth returns 401."""
        data = {
            "version": "2.0",
            "content": "Updated privacy policy content",
            "locale": "ko-KR",
            "effective_date": "2025-01-01"
        }
        
        response = client.post("/api/admin/privacy-policies", json=data, headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_011_create_privacy_policy_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """POST /api/admin/privacy-policies with non-admin auth returns 403."""
        data = {
            "version": "2.0",
            "content": "Updated privacy policy content",
            "locale": "ko-KR",
            "effective_date": "2025-01-01"
        }
        
        response = client.post("/api/admin/privacy-policies", json=data, headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_012_create_privacy_policy_admin_auth_creates_policy(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """POST /api/admin/privacy-policies with admin auth creates policy."""
        data = {
            "version": "2.0",
            "content": "Updated privacy policy content",
            "locale": "ko-KR",
            "effective_date": "2025-01-01"
        }
        
        response = client.post("/api/admin/privacy-policies", json=data, headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        assert "message" in result
        assert "success" in result
    
    def test_ADM_013_delete_privacy_policy_without_auth_returns_401(self, client, no_auth_headers):
        """DELETE /api/admin/privacy-policies/{id} without auth returns 401."""
        policy_id = "policy-123"
        
        response = client.delete(f"/api/admin/privacy-policies/{policy_id}", headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_014_delete_privacy_policy_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """DELETE /api/admin/privacy-policies/{id} with non-admin auth returns 403."""
        policy_id = "policy-123"
        
        response = client.delete(f"/api/admin/privacy-policies/{policy_id}", headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_015_delete_privacy_policy_admin_auth_deletes_policy(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """DELETE /api/admin/privacy-policies/{id} with admin auth deletes policy."""
        policy_id = "policy-123"
        
        response = client.delete(f"/api/admin/privacy-policies/{policy_id}", headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        assert "message" in result
        assert "success" in result
    
    def test_ADM_016_publish_privacy_policy_without_auth_returns_401(self, client, no_auth_headers):
        """POST /api/admin/privacy-policies/{id}/publish without auth returns 401."""
        policy_id = "policy-123"
        
        response = client.post(f"/api/admin/privacy-policies/{policy_id}/publish", headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_017_publish_privacy_policy_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """POST /api/admin/privacy-policies/{id}/publish with non-admin auth returns 403."""
        policy_id = "policy-123"
        
        response = client.post(f"/api/admin/privacy-policies/{policy_id}/publish", headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_018_publish_privacy_policy_admin_auth_publishes_policy(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """POST /api/admin/privacy-policies/{id}/publish with admin auth publishes policy."""
        policy_id = "policy-123"
        
        response = client.post(f"/api/admin/privacy-policies/{policy_id}/publish", headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        assert "message" in result
        assert "success" in result
    
    def test_ADM_019_list_privacy_policies_without_auth_returns_401(self, client, no_auth_headers):
        """GET /api/admin/privacy-policies without auth returns 401."""
        response = client.get("/api/admin/privacy-policies", headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_020_list_privacy_policies_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """GET /api/admin/privacy-policies with non-admin auth returns 403."""
        response = client.get("/api/admin/privacy-policies", headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_021_list_privacy_policies_admin_auth_returns_policies_list(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """GET /api/admin/privacy-policies with admin auth returns policies list."""
        response = client.get("/api/admin/privacy-policies", headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "policies" in result
        assert "success" in result
        assert isinstance(result["policies"], list)
    
    def test_ADM_022_get_privacy_policy_detail_without_auth_returns_401(self, client, no_auth_headers):
        """GET /api/admin/privacy-policies/{id} without auth returns 401."""
        policy_id = "policy-123"
        
        response = client.get(f"/api/admin/privacy-policies/{policy_id}", headers=no_auth_headers)
        
        assert response.status_code == 401
        result = response.json()
        assert "detail" in result
    
    def test_ADM_023_get_privacy_policy_detail_non_admin_auth_returns_403(self, client, mock_auth_regular_user, valid_auth_headers):
        """GET /api/admin/privacy-policies/{id} with non-admin auth returns 403."""
        policy_id = "policy-123"
        
        response = client.get(f"/api/admin/privacy-policies/{policy_id}", headers=valid_auth_headers)
        
        assert response.status_code == 403
        result = response.json()
        assert "detail" in result
        assert "admin" in result["detail"].lower()
    
    def test_ADM_024_get_privacy_policy_detail_admin_auth_returns_policy_details(self, client, mock_auth_admin_user, mock_supabase_client, valid_auth_headers):
        """GET /api/admin/privacy-policies/{id} with admin auth returns policy details."""
        # Use a policy ID that exists in our mock data
        policy_id = "policy-1"
        
        response = client.get(f"/api/admin/privacy-policies/{policy_id}", headers=valid_auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "policy" in result
        assert "success" in result
        assert isinstance(result["policy"], dict)