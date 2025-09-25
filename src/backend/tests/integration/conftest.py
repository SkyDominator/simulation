"""Fixtures and configuration for backend API smoke tests."""
import pytest
import os
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Set test environment variables before importing app
os.environ.setdefault("TEST_MODE", "1")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test_key")

from main import app


@pytest.fixture(autouse=True)
def disable_network_mock():
    """Disable the network mock for integration tests since TestClient needs sockets."""
    # Stop the network mock that's applied globally in conftest.py
    # We need to allow TestClient to create internal sockets
    pass


@pytest.fixture
def client():
    """FastAPI TestClient for API smoke tests."""
    return TestClient(app)


@pytest.fixture
def mock_auth_regular_user():
    """Mock JWT authentication to return a regular user ID."""
    from auth.jwt import authenticate_jwt_token
    
    # Override the dependency in the app
    def mock_authenticate() -> str:
        return "test-user-123"
    
    app.dependency_overrides[authenticate_jwt_token] = mock_authenticate
    yield "test-user-123"
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture  
def mock_auth_admin_user():
    """Mock JWT authentication to return an admin user ID."""
    from auth.jwt import authenticate_jwt_token
    
    def mock_authenticate() -> str:
        return "admin-user-456"
    
    # Override the auth dependency
    app.dependency_overrides[authenticate_jwt_token] = mock_authenticate
    
    # Also need to mock the admin check since it's called directly
    original_assert_admin = None
    try:
        from api import routes
        original_assert_admin = routes._assert_admin
        def mock_assert_admin(user_id: str, client):
            if user_id == "admin-user-456":
                return True
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required")
        routes._assert_admin = mock_assert_admin
    except ImportError:
        pass
        
    yield "admin-user-456"
    
    # Clean up
    app.dependency_overrides.clear()
    if original_assert_admin:
        routes._assert_admin = original_assert_admin


@pytest.fixture
def mock_auth_forbidden():
    """Mock JWT authentication to raise 401 Unauthorized.""" 
    from auth.jwt import authenticate_jwt_token
    from fastapi import HTTPException
    
    def mock_authenticate() -> str:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    app.dependency_overrides[authenticate_jwt_token] = mock_authenticate
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_supabase_client(monkeypatch):
    """Mock Supabase client for database operations."""
    class MockResponse:
        def __init__(self, data=None, count=0):
            self.data = data or []
            self.count = count

    class MockTable:
        def __init__(self, name, mock_data=None):
            self.name = name
            self.mock_data = mock_data or {}
            self.filters = {}
            self.order_field = None
            self.order_desc = False
            self.limit_count = None
        
        def select(self, columns="*", count=None):
            # Store count parameter for later use in execute()
            if count is not None:
                self._count_mode = count
            return self
        
        def insert(self, data):
            # Simulate successful insert - return self for chaining
            self._insert_data = data
            return self
        
        def update(self, data):
            # Simulate successful update - return self for chaining
            self._update_data = data
            return self
        
        def delete(self):
            # Simulate successful delete - return self for chaining
            self._delete_flag = True
            return self
        
        def eq(self, column, value):
            self.filters[column] = value
            return self
        
        def neq(self, column, value):
            self.filters[f"neq_{column}"] = value
            return self
        
        def gt(self, column, value):
            self.filters[f"gt_{column}"] = value
            return self
        
        def gte(self, column, value):
            self.filters[f"gte_{column}"] = value
            return self
        
        def upsert(self, data):
            # Simulate successful upsert - return self for chaining
            self._upsert_data = data
            return self
        
        def order(self, field, desc=False):
            self.order_field = field
            self.order_desc = desc
            return self
        
        def limit(self, count):
            self.limit_count = count
            return self
        
        def execute(self):
            # Return mock data based on table name and filters
            table_data = self.mock_data.get(self.name, [])
            
            # If this was an insert operation
            if hasattr(self, '_insert_data'):
                inserted_data = self._insert_data.copy()
                inserted_data['id'] = f"mock-id-{len(table_data)}"
                return MockResponse(data=[inserted_data])
            
            # If this was an upsert operation  
            if hasattr(self, '_upsert_data'):
                upserted_data = self._upsert_data.copy()
                upserted_data['id'] = f"mock-id-{len(table_data)}"
                return MockResponse(data=[upserted_data])
            
            # If this was an update operation  
            if hasattr(self, '_update_data'):
                return MockResponse(data=[self._update_data])
            
            # If this was a delete operation
            if hasattr(self, '_delete_flag'):
                return MockResponse(data=[{"id": "deleted-id"}])
                
            # Apply basic filtering for common test cases
            if 'id' in self.filters:
                table_data = [item for item in table_data if item.get('id') == self.filters['id']]
            if 'user_id' in self.filters:
                table_data = [item for item in table_data if item.get('user_id') == self.filters['user_id']]
            if 'published' in self.filters:
                table_data = [item for item in table_data if item.get('published') == self.filters['published']]
            if 'user_hash' in self.filters:
                table_data = [item for item in table_data if item.get('user_hash') == self.filters['user_hash']]
            # Handle gt/gte (greater than) filters - commonly used for time-based queries
            for key, value in self.filters.items():
                if key.startswith('gt_'):
                    column = key[3:]  # Remove 'gt_' prefix
                    table_data = [item for item in table_data if item.get(column, 0) > value]
                elif key.startswith('gte_'):
                    column = key[4:]  # Remove 'gte_' prefix
                    table_data = [item for item in table_data if item.get(column, '') >= str(value)]
            
            # Handle count mode queries (used for rate limiting)
            if hasattr(self, '_count_mode'):
                return MockResponse(data=table_data, count=len(table_data))
                
            return MockResponse(data=table_data, count=len(table_data))

    class MockClient:
        def __init__(self):
            self.mock_data = {
                'whitelist': [
                    {'user_hash': 'valid-hash-123'},
                    # Add hash for test user
                    {'user_hash': 'c22cb6dc935a6f9f7cb1b4528e31cad0ed4532ea6cf143c9b3049ed351b39cf5'}  # Hash for "Test User-01012345678"
                ],
                'phone_otps': [
                    # Valid OTP for testing
                    {
                        'id': 'otp-1',
                        'phone': '01012345678',
                        'code_hash': 'mock-hash',
                        'used': False,
                        'attempts': 0,
                        'expires_at': '2025-01-01T13:00:00',  # Future timestamp
                        'created_at': '2025-01-01T12:00:00'
                    }
                ],
                'notices': [
                    {
                        'id': 'notice-1',
                        'title': 'Test Notice',
                        'content': 'Test content',
                        'published': True,
                        'pinned': False,
                        'created_at': '2025-01-01T00:00:00Z'
                    }
                ],
                'admins': [
                    {'user_id': 'admin-user-456'}
                ],
                'simulations': [
                    {
                        'id': 'sim-1',
                        'user_id': 'test-user-123',
                        'plan_id': 'A',
                        'name': 'Test Simulation',
                        'simulation_results': None
                    }
                ],
                'privacy_policies': [
                    {
                        'id': 'policy-1',
                        'version': '1.0',
                        'content': 'Test privacy policy',
                        'published': True,
                        'locale': 'ko-KR',
                        'effective_date': '2025-01-01',
                        'last_updated': '2025-01-01'
                    }
                ],
                'consent_records': []
            }
        
        def table(self, name):
            return MockTable(name, self.mock_data)

    mock_client = MockClient()
    monkeypatch.setattr("api.routes._supabase_client", lambda: mock_client)
    return mock_client


@pytest.fixture
def mock_otp_service(monkeypatch):
    """Mock OTP service for rate limiting and verification tests."""
    class MockOTPService:
        def __init__(self, db_client=None):
            self.db_client = db_client
            self.sent_otps = {}
            self.rate_limit_reached = False
            self.verification_attempts = {}
        
        def request_otp(self, phone, client_ip=None, user_agent=None):
            if self.rate_limit_reached:
                return {
                    "success": False,
                    "message": "Try again in a few minutes"
                }
            
            self.sent_otps[phone] = "123456"
            return {
                "success": True,
                "expires_in_seconds": 300,
                "message": "인증번호가 발송되었습니다."
            }
        
        def verify_otp(self, phone, code, client_ip=None):
            # Simulate attempt tracking
            attempts = self.verification_attempts.get(phone, 0)
            self.verification_attempts[phone] = attempts + 1
            
            # If too many attempts
            if attempts >= 6:
                return {
                    "success": False,
                    "message": "Maximum verification attempts exceeded",
                    "remaining_attempts": 0
                }
            
            if phone in self.sent_otps and self.sent_otps[phone] == code:
                # Reset attempts on success
                self.verification_attempts[phone] = 0
                return {
                    "success": True,
                    "message": "OTP verified successfully"
                }
            
            remaining = 6 - self.verification_attempts[phone]
            return {
                "success": False,
                "message": "Invalid or expired OTP",
                "remaining_attempts": max(0, remaining)
            }
    
    # Mock both the SMS client and OTP service at the same time
    class MockSMSClient:
        def send_otp(self, phone, otp_code):
            return {
                "success": True,
                "provider_msg_id": "mock-msg-id-123"
            }
    
    # Mock the real OTP service behavior more accurately
    from services.otp.otp_service import OTPService
    original_verify_otp = OTPService.verify_otp
    
    def mock_verify_otp(self, phone: str, otp_code: str, client_ip: str = None):
        # Normalize phone like the real service
        normalized_phone = phone.replace(" ", "").replace("-", "")
        
        # Use the real database client to get OTP records 
        now = "2025-01-01T12:00:00"  # Fixed timestamp for testing
        
        otp_records = self.db_client.table("phone_otps") \
            .select("*") \
            .eq("phone", normalized_phone) \
            .eq("used", False) \
            .gt("expires_at", now) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        # If no valid OTP records found
        if not otp_records.data:
            return {
                "success": False,
                "message": "유효하지 않거나 만료된 인증번호입니다."
            }
            
        otp_record = otp_records.data[0]
        
        # Check attempts - using settings.otp_max_verification_attempts which defaults to 6
        if otp_record.get("attempts", 0) >= 6:
            return {
                "success": False,
                "message": "인증 시도 횟수를 초과했습니다. 새 인증번호를 요청하세요."
            }
        
        # Check if OTP code matches (simple check for testing)
        if otp_code == "123456":  # Our test OTP code
            return {
                "success": True,
                "message": "인증에 성공했습니다."
            }
        else:
            # Increment attempts
            new_attempts = otp_record.get("attempts", 0) + 1
            remaining_attempts = 6 - new_attempts
            
            # Update the mock data
            for record in self.db_client.mock_data.get("phone_otps", []):
                if record.get("id") == otp_record.get("id"):
                    record["attempts"] = new_attempts
            
            return {
                "success": False,
                "message": f"인증번호가 일치하지 않습니다. {remaining_attempts}회 시도 기회가 남았습니다." if remaining_attempts > 0 else "인증 시도 횟수를 초과했습니다. 새 인증번호를 요청하세요.",
                "remaining_attempts": max(0, remaining_attempts)
            }
    
    # Mock the SMS client import 
    monkeypatch.setattr("services.otp.otp_service.SolapiSMSClient", MockSMSClient)
    # Mock the verify_otp method
    monkeypatch.setattr("services.otp.otp_service.OTPService.verify_otp", mock_verify_otp)
    
    # Mock the OTP service instance creation
    def mock_otp_service_factory(*args, **kwargs):
        return MockOTPService(*args, **kwargs)
    
    monkeypatch.setattr("services.otp.otp_service.OTPService", MockOTPService)
    return mock_otp_service_factory


@pytest.fixture
def mock_simulation_service(monkeypatch, mock_supabase_client):
    """Mock SimulationService for simulation endpoints."""
    class MockSimulationService:
        def __init__(self):
            # Use the same mock client as other fixtures
            self.client = mock_supabase_client
            
        def list_for_user(self, user_id):
            if user_id == "test-user-123":
                return {
                    "simulations": [
                        {
                            "id": "sim-1",
                            "name": "Test Simulation",
                            "plan_id": "A"
                        }
                    ],
                    "success": True
                }
            return {"simulations": [], "success": True}
        
        def create(self, request, user_id):
            return {
                "simulation_id": "new-sim-123",
                "plan_id": request.plan_id,
                "message": "Simulation created successfully",
                "success": True
            }
        
        def run(self, request, user_id):
            return {
                "simulation_id": request.simulation_id,
                "plan_id": "A",
                "starting_company_round": 1,
                "current_company_round": 1,
                "simulation_rounds": 1,
                "scheduled_payment": {"1": 100000},
                "sales_achievement_rates": {"1": 80},
                "history": [
                    {
                        "company_round": 1,
                        "investor_count": 1,
                        "total_payment": 100000.0,
                        "total_revenue_before_tax": 120000.0,
                        "total_revenue_after_tax": 110000.0,
                        "net_profit_after_tax": 10000.0,
                        "cumulative_net_profit": 10000.0,
                        "investor_details": [
                            {
                                "investor_start_round": 1,
                                "investor_internal_round": 1,
                                "payment": 100000.0,
                                "revenue": 110000.0,
                                "investor_type": "new"
                            }
                        ]
                    }
                ],
                "message": "Simulation completed",
                "success": True
            }
        
        def update(self, simulation_id, request, user_id):
            return {
                "simulation_id": simulation_id,
                "plan_id": request.plan_id,
                "message": "Simulation updated successfully",
                "success": True
            }
        
        def update_memo(self, simulation_id, request, user_id):
            return {
                "simulation_id": simulation_id,
                "message": "Memo updated successfully",
                "success": True
            }
        
        def delete(self, simulation_id, user_id):
            return {
                "simulation_id": simulation_id,
                "message": "Simulation deleted successfully",
                "success": True
            }
    
    mock_service = MockSimulationService()
    monkeypatch.setattr("api.routes._sim_service", mock_service)
    return mock_service


@pytest.fixture
def valid_auth_headers():
    """Headers with valid JWT token for authenticated requests."""
    return {"Authorization": "Bearer valid-jwt-token"}


@pytest.fixture
def invalid_auth_headers():
    """Headers with invalid JWT token."""
    return {"Authorization": "Bearer invalid-jwt-token"}


@pytest.fixture 
def no_auth_headers():
    """Empty headers (no authentication)."""
    return {}