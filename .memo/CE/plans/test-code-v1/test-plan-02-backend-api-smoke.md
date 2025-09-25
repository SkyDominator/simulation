# Test Plan – Backend API Smoke Tests (Concrete v1.0)

This covers basic API smoke tests for all endpoints with happy path and auth protection verification. Uses FastAPI TestClient for synchronous testing against route handlers.

Target: All endpoints in `src/backend/api/routes.py` with focus on critical path verification and authentication boundaries.

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Happy path testing for all API endpoints
* Authentication protection verification for protected routes
* Basic request/response validation
* Error handling for common scenarios (401, 403, 404, 422)
* Rate limiting verification for OTP endpoints

**Out of Scope:**
* Business logic validation (covered in unit tests)
* Database integration testing (mocked)
* External service integration (SMS providers, etc.)
* Performance/load testing
* Comprehensive security testing (covered separately)

**Test Philosophy:**
* Use FastAPI TestClient with mocked dependencies
* Mock JWT authentication completely for simplicity
* Mock Supabase client to avoid real database calls
* Focus on API contract compliance and basic functionality

--------------------------------------------------------------------------------
2. Test Category Matrix
--------------------------------------------------------------------------------

2.1 Public Endpoints (CAT-PUBLIC)
* Why: Verify public endpoints work without authentication
* Targets: Root endpoint, health check
* Cases:
    - PUB-001: GET / returns 200 with expected message
    - PUB-002: GET /api/health returns 200 with status info

2.2 OTP Endpoints (CAT-OTP)
* Why: Critical user onboarding flow, rate limiting validation
* Targets: `/api/otp/send`, `/api/otp/verify`
* Cases:
    - OTP-001: POST /api/otp/send with valid whitelisted user returns success
    - OTP-002: POST /api/otp/send with non-whitelisted user returns failure
    - OTP-003: POST /api/otp/send rate limiting - multiple rapid requests blocked
    - OTP-004: POST /api/otp/verify with valid code returns success
    - OTP-005: POST /api/otp/verify with invalid code returns failure
    - OTP-006: POST /api/otp/verify with exhausted attempts returns failure

2.3 Public Content Endpoints (CAT-CONTENT)
* Why: Verify public content retrieval works
* Targets: `/api/notices`, `/api/notices/{id}`
* Cases:
    - CONT-001: GET /api/notices returns published notices list
    - CONT-002: GET /api/notices/{id} returns specific notice details
    - CONT-003: GET /api/notices/{id} with non-existent ID returns 404

2.4 Protected Simulation Endpoints (CAT-SIM)
* Why: Core business functionality requires authentication
* Targets: `/api/simulations/*`, `/api/simulation/*`
* Cases:
    - SIM-001: GET /api/simulations without auth returns 401
    - SIM-002: GET /api/simulations with valid auth returns user simulations
    - SIM-003: POST /api/simulation/create without auth returns 401
    - SIM-004: POST /api/simulation/create with valid auth creates simulation
    - SIM-005: POST /api/simulation/run without auth returns 401
    - SIM-006: POST /api/simulation/run with valid auth runs simulation
    - SIM-007: DELETE /api/simulations/{id} without auth returns 401
    - SIM-008: DELETE /api/simulations/{id} with valid auth deletes simulation

2.5 Admin Endpoints (CAT-ADMIN)
* Why: Administrative functions require proper authorization
* Targets: `/api/admin/*`
* Cases:
    - ADM-001: GET /api/admin/me without auth returns 401
    - ADM-002: GET /api/admin/me with non-admin auth returns 403
    - ADM-003: GET /api/admin/me with admin auth returns admin info
    - ADM-004: POST /api/admin/notices without auth returns 401
    - ADM-005: POST /api/admin/notices with admin auth creates notice
    - ADM-006: DELETE /api/admin/notices/{id} with admin auth deletes notice
    - ADM-007: POST /api/admin/privacy-policies with admin auth creates policy
    - ADM-008: POST /api/admin/privacy-policies/{id}/publish with admin auth publishes policy

2.6 Consent Endpoints (CAT-CONSENT)
* Why: Privacy compliance requires proper consent handling
* Targets: `/api/consents`
* Cases:
    - CONS-001: POST /api/consents without auth returns 401
    - CONS-002: POST /api/consents with valid auth records consent

2.7 Request Validation (CAT-VALID)
* Why: Ensure proper request validation and error responses
* Cases:
    - VAL-001: Invalid JSON in request body returns 422
    - VAL-002: Missing required fields returns 422 with field details
    - VAL-003: Invalid field types returns 422 with type validation error
    - VAL-004: Invalid phone number format in OTP requests returns 422

--------------------------------------------------------------------------------
3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

3.1 Test Client Setup
```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)
```

3.2 Mock Authentication
```python
@pytest.fixture
def mock_auth_regular_user(monkeypatch):
    """Mock JWT authentication to return a regular user ID"""
    def mock_authenticate(credentials):
        return "test-user-123"
    
    from auth.jwt import authenticate_jwt_token
    monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_authenticate)
    return "test-user-123"

@pytest.fixture
def mock_auth_admin_user(monkeypatch):
    """Mock JWT authentication to return an admin user ID"""
    def mock_authenticate(credentials):
        return "admin-user-456"
    
    from auth.jwt import authenticate_jwt_token
    monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_authenticate)
    
    # Also mock admin check to return True
    def mock_assert_admin(user_id, client):
        return True
    
    monkeypatch.setattr("api.routes._assert_admin", mock_assert_admin)
    return "admin-user-456"

@pytest.fixture
def mock_auth_forbidden():
    """Mock JWT authentication to raise 401 Unauthorized"""
    def mock_authenticate(credentials):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from auth.jwt import authenticate_jwt_token
    monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_authenticate)
```

3.3 Mock Supabase Client
```python
@pytest.fixture
def mock_supabase_client(monkeypatch):
    """Mock Supabase client for database operations"""
    class MockResponse:
        def __init__(self, data=None, count=0):
            self.data = data or []
            self.count = count
    
    class MockTable:
        def __init__(self, name, mock_data=None):
            self.name = name
            self.mock_data = mock_data or {}
            self.filters = {}
        
        def select(self, columns="*"):
            return self
        
        def insert(self, data):
            return self
        
        def update(self, data):
            return self
        
        def delete(self):
            return self
        
        def eq(self, column, value):
            self.filters[column] = value
            return self
        
        def execute(self):
            # Return mock data based on table name and filters
            table_data = self.mock_data.get(self.name, [])
            return MockResponse(data=table_data)
    
    class MockClient:
        def __init__(self):
            self.mock_data = {
                'whitelist': [{'user_hash': 'valid-hash-123'}],
                'phone_otps': [],
                'notices': [
                    {'id': 1, 'title': 'Test Notice', 'content': 'Test content', 'published': True}
                ],
                'admins': [{'user_id': 'admin-user-456'}],
                'simulations': [],
                'privacy_policies': []
            }
        
        def table(self, name):
            return MockTable(name, self.mock_data)
    
    mock_client = MockClient()
    monkeypatch.setattr("api.routes._supabase_client", lambda: mock_client)
    return mock_client
```

3.4 Mock OTP Service
```python
@pytest.fixture
def mock_otp_service(monkeypatch):
    """Mock OTP service for rate limiting and verification tests"""
    class MockOTPService:
        def __init__(self, db_client=None):
            self.db_client = db_client
            self.sent_otps = {}
            self.rate_limit_reached = False
        
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
                "message": "OTP sent successfully"
            }
        
        def verify_otp(self, phone, code, client_ip=None):
            if phone in self.sent_otps and self.sent_otps[phone] == code:
                return {
                    "success": True,
                    "message": "OTP verified successfully"
                }
            return {
                "success": False,
                "message": "Invalid or expired OTP",
                "remaining_attempts": 5
            }
    
    monkeypatch.setattr("services.otp.otp_service.OTPService", MockOTPService)
    return MockOTPService
```

--------------------------------------------------------------------------------
4. Representative Test Snippets
--------------------------------------------------------------------------------

4.1 Public Endpoint Test
```python
def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "running" in response.json()["message"].lower()
```

4.2 Authentication Protection Test
```python
def test_simulations_requires_auth(client, mock_supabase_client):
    response = client.get("/api/simulations")
    assert response.status_code == 401
    assert "detail" in response.json()
```

4.3 OTP Rate Limiting Test
```python
def test_otp_rate_limiting(client, mock_supabase_client, mock_otp_service):
    # Mock rate limit reached
    otp_instance = mock_otp_service()
    otp_instance.rate_limit_reached = True
    
    data = {
        "name": "Test User",
        "phone_number": "010-1234-5678"
    }
    
    response = client.post("/api/otp/send", json=data)
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is False
    assert "few minutes" in result["message"]
```

4.4 Admin Authorization Test
```python
def test_admin_endpoint_requires_admin(client, mock_auth_regular_user, mock_supabase_client):
    headers = {"Authorization": "Bearer fake-jwt-token"}
    
    response = client.get("/api/admin/me", headers=headers)
    assert response.status_code == 403
    assert "admin" in response.json()["detail"].lower()
```

4.5 Request Validation Test
```python
def test_invalid_json_returns_422(client):
    response = client.post(
        "/api/otp/send",
        data="invalid json",  # Not JSON
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
```

--------------------------------------------------------------------------------
5. Test Structure & Organization
--------------------------------------------------------------------------------

File organization:
```
src/backend/tests/integration/api/
├── __init__.py
├── conftest.py              # Shared fixtures
├── test_public_endpoints.py # CAT-PUBLIC
├── test_otp_endpoints.py    # CAT-OTP  
├── test_content_endpoints.py # CAT-CONTENT
├── test_simulation_endpoints.py # CAT-SIM
├── test_admin_endpoints.py  # CAT-ADMIN
├── test_consent_endpoints.py # CAT-CONSENT
└── test_validation.py       # CAT-VALID
```

Test naming convention: `test_{CATEGORY}_{TEST_ID}_{description}`
Example: `test_SIM_001_simulations_requires_auth`

--------------------------------------------------------------------------------
6. Environment Setup
--------------------------------------------------------------------------------

**Dependencies to add:**
```
pytest-asyncio>=0.21.0
httpx>=0.24.0  # For TestClient
```

**Test Configuration:**
- Use `TEST_MODE=1` environment variable
- Override settings for test database/services
- Disable external API calls (SMS, etc.)

**Pytest markers:**
```python
# pytest.ini
[tool:pytest]
markers =
    integration: Integration tests requiring mocked external services
    api: API endpoint tests
    slow: Slower running tests
```

--------------------------------------------------------------------------------
7. Coverage Targets & Exit Criteria
--------------------------------------------------------------------------------

**Success Criteria:**
* All public endpoints return expected status codes
* All protected endpoints properly reject unauthorized requests
* All admin endpoints properly check admin privileges  
* OTP rate limiting functions correctly
* Request validation returns proper 422 errors
* No real external API calls made during tests
* Tests run in under 30 seconds total

**Coverage Goals:**
* 100% of API route handlers covered
* All major error paths tested (401, 403, 404, 422)
* Critical business flows validated

--------------------------------------------------------------------------------
8. Security Testing Integration
--------------------------------------------------------------------------------

While comprehensive security testing is separate, these smoke tests include:

**Basic Security Checks:**
* Authentication bypass attempts
* Authorization boundary validation
* Input validation for common injection patterns
* Rate limiting enforcement
* Proper error message handling (no information leakage)

**Security Test Cases:**
- SEC-001: SQL injection attempts in request parameters return 422
- SEC-002: XSS payloads in request bodies are properly escaped
- SEC-003: Oversized request payloads are rejected
- SEC-004: Invalid content types are rejected
- SEC-005: Authentication tokens are properly validated
- SEC-006: Admin endpoints reject non-admin users
- SEC-007: Rate limiting prevents abuse of OTP endpoints

--------------------------------------------------------------------------------
9. Implementation Checklist
--------------------------------------------------------------------------------

| Category | Cases Count | Priority | Dependencies |
|----------|-------------|----------|--------------|
| PUBLIC | 2 | High | TestClient setup |
| OTP | 6 | High | Mock OTP service, Supabase |
| CONTENT | 3 | High | Mock Supabase |
| SIM | 8 | High | Mock auth, Supabase |
| ADMIN | 8 | High | Mock admin auth |
| CONSENT | 2 | Medium | Mock auth |
| VALID | 4 | Medium | Request validation |
| SEC | 7 | High | Security fixtures |

**Total: 40 test cases**

--------------------------------------------------------------------------------
10. Next Steps After Plan Approval
--------------------------------------------------------------------------------

1. Set up test infrastructure and fixtures
2. Implement public and content endpoint tests (low complexity)
3. Add authentication mocking and protected endpoint tests
4. Implement OTP and rate limiting tests
5. Add admin authorization tests
6. Create security and validation tests
7. Run full test suite and measure coverage
8. Document any discovered API inconsistencies

--------------------------------------------------------------------------------
11. Risks & Mitigations
--------------------------------------------------------------------------------

| Risk | Mitigation |
|------|------------|
| Mock authentication too simplistic | Create realistic JWT-like tokens for edge cases |
| Rate limiting tests flaky | Use time mocking and deterministic counters |
| Database mocking incomplete | Start simple, expand mock as needed |
| Test environment pollution | Use isolated fixtures and cleanup |
| External service calls leaking through | Monkeypatch all external HTTP calls to raise |

End of Plan.
