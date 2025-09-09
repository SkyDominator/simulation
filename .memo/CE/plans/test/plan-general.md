# LOLClub Simulation Testing Implementation Plan

## Overview

Implement comprehensive testing infrastructure for the LOLClub Simulation app to achieve the SSD requirements of ≥75% backend coverage and ≥60% frontend coverage across 5 test layers. Currently, the application has zero automated testing, representing a critical gap that needs immediate attention for the complex financial simulation logic, OTP workflows, and JWT authentication.

## Current State Analysis

Based on the research findings, the codebase has **complete absence of automated testing**:

### Backend Status: ❌ **COMPLETELY MISSING**
- **No Testing Framework**: Missing pytest, pytest-asyncio, pytest-coverage dependencies
- **No Test Files**: Zero test files across the entire backend codebase
- **Critical Components Untested**: Financial simulation engine, OTP service, JWT auth, Supabase integration

### Frontend Status: ❌ **COMPLETELY MISSING**
- **No Testing Framework**: Missing Vitest, Testing Library, jsdom dependencies  
- **No Test Files**: Zero test files across React components, hooks, and services
- **Critical Components Untested**: Authentication flow, simulation management, admin features

### Key Discoveries:
- Financial simulation engine (`simulation_service.py`) has complex tax and investment calculations completely untested
- OTP security logic with rate limiting and hashing has no validation
- React authentication flow with multi-step onboarding lacks component testing
- API integration with 20+ endpoints has no contract validation

## What We're NOT Doing

- Building E2E testing for mobile devices (focusing on desktop Chrome first)
- Implementing performance testing or load testing (current scale doesn't require it)
- Creating visual regression testing (UI is stable and simple)
- Supporting multiple database environments for testing (using single test DB)
- Implementing mutation testing or advanced coverage metrics

## Implementation Approach

Follow SSD Section 16.1 Test Layers strategy: start with critical backend unit tests for financial logic and security, add frontend component testing for authentication flows, then build integration tests for complete user journeys. Prioritize highest-risk components first based on business impact.

## Phase 1: Backend Testing Foundation - Critical Security & Business Logic

### Overview
Establish pytest infrastructure and test the highest-risk components: financial simulation calculations, OTP security validation, and JWT authentication middleware.

### Changes Required:

#### 1. Install Backend Testing Dependencies
**File**: `src/backend/requirements.txt`
**Changes**: Add testing framework dependencies

```txt
# Add after existing dependencies
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0
httpx>=0.24.0
pytest-mock>=3.10.0
faker>=20.1.0
freezegun>=1.2.2
```

**Important!**: The backend testing must be run in venv, so activate the virtual environment first:

```bash
cd src/backend
.\venv\Scripts\activate
```

Then install the new dependencies:

```bash
pip install -r requirements.txt
```

#### 2. Create Pytest Configuration
**File**: `src/backend/pytest.ini`
**Changes**: New file with test configuration

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_functions = test_*
addopts = 
    --cov=.
    --cov-report=html:htmlcov
    --cov-report=term-missing
    --cov-fail-under=75
    --strict-markers
    --disable-warnings
asyncio_mode = auto
markers =
    unit: Unit tests
    integration: Integration tests
    security: Security-focused tests
```

#### 3. Create Test Directory Structure
**Command**: Create test organization
```bash
mkdir -p src/backend/tests/{unit,integration,fixtures}
mkdir -p src/backend/tests/unit/{services,auth,api}
mkdir -p src/backend/tests/integration/{flows,database}
```

#### 4. Test Financial Simulation Engine
**File**: `src/backend/tests/unit/test_simulation_service.py`
**Changes**: New file testing core business logic

```python
import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
from src.simulation_service import SimulationService

class TestSimulationService:
    """Test critical financial calculation logic"""
    
    @pytest.fixture
    def simulation_service(self):
        return SimulationService()
    
    def test_tax_calculation_accuracy(self, simulation_service):
        """Test 3.3% tax calculation on total revenue"""
        revenue = Decimal('1000000')  # 1M revenue
        expected_tax = Decimal('33000')  # 3.3%
        
        result = simulation_service.calculate_tax(revenue)
        assert result == expected_tax
    
    def test_plan_a_investment_schedule(self, simulation_service):
        """Test Plan A investment calculations across rounds"""
        params = {
            'plan_id': 'A',
            'starting_round': 1,
            'scheduled_payment': 100000,
            'sales_achievement_rates': [0.8, 0.9, 1.0, 1.1]
        }
        
        result = simulation_service.calculate_plan_investments(params)
        
        # Verify investment progression
        assert len(result['investments']) == 4
        assert result['total_investment'] > 0
        assert result['cumulative_profit'] is not None
    
    @pytest.mark.parametrize("plan_id,expected_multiplier", [
        ('A', 1.0), ('B', 1.2), ('C', 1.5), ('D', 2.0)
    ])
    def test_plan_specific_multipliers(self, simulation_service, plan_id, expected_multiplier):
        """Test plan-specific calculation parameters"""
        result = simulation_service.get_plan_multiplier(plan_id)
        assert result == expected_multiplier
```

### Success Criteria:

#### Automated Verification:
- [ ] Pytest installation: `cd src/backend && python -m pytest --version`
- [ ] Test discovery: `python -m pytest --collect-only`
- [ ] Coverage report generation: `python -m pytest --cov`

#### Manual Verification:
- [ ] Financial calculations produce expected results
- [ ] Tax calculations are accurate to required precision
- [ ] Plan-specific parameters work correctly
- [ ] Edge cases (zero investment, negative rates) handled

---

## Phase 2: Backend Security Testing - OTP & Authentication

### Overview
Test security-critical components: OTP rate limiting, hashing, JWT validation, and admin privilege checking.

### Changes Required:

#### 1. Test OTP Service Security
**File**: `src/backend/tests/unit/services/test_otp_service.py`
**Changes**: New file testing OTP security logic

```python
import pytest
from unittest.mock import Mock, patch
from freezegun import freeze_time
from datetime import datetime, timedelta
from src.services.otp.otp_service import OTPService

class TestOTPServiceSecurity:
    """Test OTP security controls and rate limiting"""
    
    @pytest.fixture
    def otp_service(self):
        return OTPService()
    
    @pytest.fixture
    def mock_supabase(self):
        return Mock()
    
    def test_rate_limiting_send_attempts(self, otp_service, mock_supabase):
        """Test 3 sends per 15 minutes rate limit"""
        phone = "+821012345678"
        
        # Mock existing attempts
        mock_supabase.table().select().eq().gte().count.return_value.data = [{'count': 3}]
        
        with pytest.raises(Exception, match="Rate limit exceeded"):
            otp_service.send_otp(phone, "Test User")
    
    def test_otp_code_hashing_security(self, otp_service):
        """Test OTP codes are properly hashed before storage"""
        code = "123456"
        
        hashed = otp_service.hash_otp_code(code)
        
        assert hashed != code  # Never store plaintext
        assert len(hashed) > 20  # Reasonable hash length
        assert otp_service.verify_otp_code(code, hashed) is True
    
    def test_verify_attempts_limit(self, otp_service, mock_supabase):
        """Test 6 verification attempts limit"""
        phone = "+821012345678"
        
        # Mock OTP record with 6 attempts
        mock_record = {
            'id': 'test-id',
            'attempts': 6,
            'code_hash': 'test-hash',
            'used': False,
            'expires_at': (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        }
        mock_supabase.table().select().eq().is_().order().limit.return_value.data = [mock_record]
        
        result = otp_service.verify_otp(phone, "123456")
        assert result['success'] is False
        assert "too many attempts" in result['message'].lower()
    
    @freeze_time("2025-09-09 12:00:00")
    def test_otp_expiration_handling(self, otp_service, mock_supabase):
        """Test expired OTP rejection"""
        phone = "+821012345678"
        
        # Mock expired OTP record
        expired_record = {
            'id': 'test-id',
            'attempts': 1,
            'code_hash': 'test-hash',
            'used': False,
            'expires_at': "2025-09-09T11:55:00"  # 5 minutes ago
        }
        mock_supabase.table().select().eq().is_().order().limit.return_value.data = [expired_record]
        
        result = otp_service.verify_otp(phone, "123456")
        assert result['success'] is False
        assert "expired" in result['message'].lower()
```

#### 2. Test JWT Authentication
**File**: `src/backend/tests/unit/auth/test_jwt.py`
**Changes**: New file testing JWT validation

```python
import pytest
from unittest.mock import Mock, patch
from src.auth.jwt import JWTAuth
from fastapi import HTTPException

class TestJWTAuth:
    """Test JWT validation and admin checking"""
    
    @pytest.fixture
    def jwt_auth(self):
        return JWTAuth()
    
    @patch('src.auth.jwt.get_jwks')
    def test_valid_jwt_verification(self, mock_jwks, jwt_auth):
        """Test valid JWT token verification"""
        # Mock JWKS response
        mock_jwks.return_value = {'keys': [{'kid': 'test-key'}]}
        
        # Mock valid token
        token = "valid.jwt.token"
        
        with patch('jwt.decode') as mock_decode:
            mock_decode.return_value = {
                'sub': 'user-123',
                'aud': 'authenticated',
                'exp': 9999999999
            }
            
            result = jwt_auth.verify_token(token)
            assert result['user_id'] == 'user-123'
    
    def test_invalid_audience_rejection(self, jwt_auth):
        """Test token with wrong audience is rejected"""
        with patch('jwt.decode') as mock_decode:
            mock_decode.return_value = {
                'sub': 'user-123',
                'aud': 'wrong-audience',
                'exp': 9999999999
            }
            
            with pytest.raises(HTTPException, match="Invalid audience"):
                jwt_auth.verify_token("invalid.audience.token")
    
    @patch('src.auth.jwt.supabase')
    def test_admin_privilege_check(self, mock_supabase, jwt_auth):
        """Test admin privilege database lookup"""
        user_id = "user-123"
        
        # Mock admin record exists
        mock_supabase.table().select().eq.return_value.data = [{'user_id': user_id}]
        
        result = jwt_auth.is_admin(user_id)
        assert result is True
        
        # Mock no admin record
        mock_supabase.table().select().eq.return_value.data = []
        
        result = jwt_auth.is_admin(user_id)
        assert result is False
```

### Success Criteria:

#### Automated Verification:
- [ ] Security tests pass: `python -m pytest tests/unit/services/test_otp_service.py -v`
- [ ] JWT tests pass: `python -m pytest tests/unit/auth/test_jwt.py -v`
- [ ] Coverage includes security modules: `python -m pytest --cov=src.services.otp --cov=src.auth`

#### Manual Verification:
- [ ] Rate limiting logic correctly enforced
- [ ] OTP hashing prevents plaintext storage
- [ ] JWT validation rejects invalid tokens
- [ ] Admin privilege checks work correctly

---

## Phase 3: Frontend Testing Foundation - Component & Hook Testing

### Overview
Establish Vitest infrastructure and test critical React components: authentication flow, simulation management, and admin features.

### Changes Required:

#### 1. Install Frontend Testing Dependencies
**File**: `src/frontend/package.json`
**Changes**: Add testing framework to devDependencies

```json
{
  "devDependencies": {
    // ... existing dependencies
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^23.0.0",
    "@vitest/ui": "^1.0.0"
  },
  "scripts": {
    // ... existing scripts
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 2. Create Vitest Configuration
**File**: `src/frontend/vitest.config.ts`
**Changes**: New file with test configuration

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        functions: 60,
        branches: 60,
        lines: 60,
        statements: 60
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### 3. Create Test Setup and Utilities
**File**: `src/frontend/src/test/setup.ts`
**Changes**: New file with test environment setup

```typescript
import '@testing-library/jest-dom'
import { beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } }))
  }
}

vi.mock('../supabaseClient', () => ({
  default: mockSupabase
}))

beforeAll(() => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

#### 4. Test Authentication Context
**File**: `src/frontend/src/context/__tests__/AuthContext.test.tsx`
**Changes**: New file testing authentication state management

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Test component to access auth context
function TestComponent() {
  const { user, loading, signIn, signOut } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.id : 'no-user'}</div>
      <button onClick={() => signIn('google')}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('should initialize with loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
  })
  
  it('should handle successful authentication', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: mockUser } }
    })
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user-123')
    })
  })
  
  it('should handle sign in with OAuth provider', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const signInButton = screen.getByText('Sign In')
    signInButton.click()
    
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) }
    })
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Vitest installation: `cd src/frontend && npm test -- --version`
- [ ] Test discovery: `npm test -- --run --reporter=verbose`
- [ ] Coverage report: `npm run test:coverage`

#### Manual Verification:
- [ ] Authentication context tests pass
- [ ] Mock Supabase client works correctly
- [ ] Test environment setup loads without errors
- [ ] Component rendering tests work

---

## Phase 4: API Integration Testing - Critical User Flows

### Overview
Test complete API integration flows: onboarding journey (whitelist → OTP → consent → login), simulation lifecycle, and admin operations.

### Changes Required:

#### 1. Create Integration Test Environment
**File**: `src/backend/tests/integration/conftest.py`
**Changes**: New file with test fixtures and database setup

```python
import pytest
import asyncio
from httpx import AsyncClient
from src.main import app
from src.config.settings import get_settings

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client():
    """HTTP client for API testing"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def test_user_data():
    """Standard test user data"""
    return {
        "name": "김테스트",
        "phone_number": "+821012345678",
        "user_hash": "test-hash-123"
    }

@pytest.fixture
def admin_user_token():
    """Mock admin JWT token"""
    # In real implementation, create valid test JWT
    return "Bearer test-admin-token"

@pytest.fixture
async def authenticated_headers(admin_user_token):
    """Headers with authentication"""
    return {"Authorization": admin_user_token}
```

#### 2. Test Complete Onboarding Flow
**File**: `src/backend/tests/integration/test_onboarding_flow.py`
**Changes**: New file testing end-to-end user onboarding

```python
import pytest
from httpx import AsyncClient

class TestOnboardingFlow:
    """Test complete user onboarding journey"""
    
    async def test_complete_onboarding_success(self, client: AsyncClient, test_user_data):
        """Test successful whitelist → OTP → consent → login flow"""
        
        # Step 1: Verify user (whitelist check)
        verify_response = await client.post("/api/verify-user", json={
            "name": test_user_data["name"],
            "phone_number": test_user_data["phone_number"]
        })
        assert verify_response.status_code == 200
        assert verify_response.json()["whitelisted"] is True
        
        # Step 2: Send OTP
        otp_send_response = await client.post("/api/otp/send", json={
            "name": test_user_data["name"],
            "phone_number": test_user_data["phone_number"]
        })
        assert otp_send_response.status_code == 200
        
        # Step 3: Verify OTP (using test code)
        otp_verify_response = await client.post("/api/otp/verify", json={
            "phone_number": test_user_data["phone_number"],
            "otp_code": "123456"  # Test code
        })
        assert otp_verify_response.status_code == 200
        assert otp_verify_response.json()["verified"] is True
        
        # Step 4: Record consent
        consent_response = await client.post("/api/consents", json={
            "user_hash": test_user_data["user_hash"],
            "consent_type": "privacy_policy",
            "consent_version": "1.0"
        })
        assert consent_response.status_code == 200
        
        # Step 5: Link onboarding (post-auth)
        link_response = await client.post("/api/onboarding/link", 
            json={
                "whitelist_passed": True,
                "otp_verified": True,
                "consent_version": "1.0"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        assert link_response.status_code == 200
    
    async def test_onboarding_rate_limiting(self, client: AsyncClient, test_user_data):
        """Test OTP rate limiting enforcement"""
        
        # Send OTP multiple times rapidly
        for i in range(4):  # Exceed 3 attempts limit
            response = await client.post("/api/otp/send", json={
                "name": test_user_data["name"],
                "phone_number": test_user_data["phone_number"]
            })
            
            if i < 3:
                assert response.status_code == 200
            else:
                assert response.status_code == 429  # Rate limited
                assert "rate limit" in response.json()["detail"].lower()
```

#### 3. Test Simulation Lifecycle
**File**: `src/backend/tests/integration/test_simulation_crud.py`
**Changes**: New file testing simulation CRUD operations

```python
import pytest
from httpx import AsyncClient

class TestSimulationCRUD:
    """Test simulation creation, execution, and management"""
    
    async def test_simulation_complete_lifecycle(self, client: AsyncClient, authenticated_headers):
        """Test create → run → update → delete simulation flow"""
        
        # Step 1: Create simulation
        create_payload = {
            "plan_id": "A",
            "starting_company_round": 1,
            "scheduled_payment": 100000,
            "sales_achievement_rates": [0.8, 0.9, 1.0, 1.1]
        }
        
        create_response = await client.post("/api/simulation/create", 
            json=create_payload,
            headers=authenticated_headers
        )
        assert create_response.status_code == 200
        simulation_id = create_response.json()["simulation_id"]
        
        # Step 2: Run simulation
        run_response = await client.post("/api/simulation/run",
            json={"simulation_id": simulation_id},
            headers=authenticated_headers
        )
        assert run_response.status_code == 200
        results = run_response.json()
        assert "total_profit" in results
        assert "investment_schedule" in results
        
        # Step 3: Get simulation details
        detail_response = await client.get(f"/api/simulations/{simulation_id}",
            headers=authenticated_headers
        )
        assert detail_response.status_code == 200
        simulation = detail_response.json()
        assert simulation["id"] == simulation_id
        assert simulation["results"] is not None
        
        # Step 4: Update memo
        memo_response = await client.patch(f"/api/simulations/{simulation_id}/memo",
            json={"memo": "Test simulation notes"},
            headers=authenticated_headers
        )
        assert memo_response.status_code == 200
        
        # Step 5: Delete simulation
        delete_response = await client.delete(f"/api/simulations/{simulation_id}",
            headers=authenticated_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_deleted = await client.get(f"/api/simulations/{simulation_id}",
            headers=authenticated_headers
        )
        assert get_deleted.status_code == 404
```

### Success Criteria:

#### Automated Verification:
- [ ] Integration tests pass: `python -m pytest tests/integration/ -v`
- [ ] API contract validation: All endpoints return expected schemas
- [ ] Database operations work: CRUD operations complete successfully

#### Manual Verification:
- [ ] Complete onboarding flow works end-to-end
- [ ] Rate limiting properly enforced
- [ ] Simulation calculations produce correct results
- [ ] User isolation maintained (RLS policies work)

---

## Phase 5: Frontend Integration & E2E Testing

### Overview
Test React component integration with API services and create basic E2E smoke tests for core user journeys.

### Changes Required:

#### 1. Test API Service Integration
**File**: `src/frontend/src/services/__tests__/api.test.ts`
**Changes**: New file testing API client methods

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiService } from '../api'

// Mock fetch globally
global.fetch = vi.fn()

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should handle successful OTP sending', async () => {
    const mockResponse = {
      success: true,
      message: 'OTP sent successfully'
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)
    
    const result = await apiService.sendOTP('김테스트', '+821012345678')
    
    expect(fetch).toHaveBeenCalledWith('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '김테스트',
        phone_number: '+821012345678'
      })
    })
    
    expect(result).toEqual(mockResponse)
  })
  
  it('should handle API errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'Rate limit exceeded' })
    } as Response)
    
    await expect(
      apiService.sendOTP('김테스트', '+821012345678')
    ).rejects.toThrow('Rate limit exceeded')
  })
  
  it('should include authorization header when token provided', async () => {
    const mockUser = { id: 'user-123' }
    const mockToken = 'test-jwt-token'
    
    // Mock auth context
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: mockToken,
      loading: false
    })
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ simulations: [] })
    } as Response)
    
    await apiService.getSimulations()
    
    expect(fetch).toHaveBeenCalledWith('/api/simulations', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    })
  })
})
```

#### 2. Test Page Component Integration
**File**: `src/frontend/src/pages/__tests__/MainPage.test.tsx`
**Changes**: New file testing main application page

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import MainPage from '../MainPage'
import { AuthProvider } from '../../context/AuthContext'

// Mock components
vi.mock('../../components/Shell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>
}))

function renderMainPage() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <MainPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('MainPage', () => {
  it('should render simulation table when user authenticated', async () => {
    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      token: 'test-token'
    })
    
    // Mock API response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ simulations: [] })
    })
    
    renderMainPage()
    
    await waitFor(() => {
      expect(screen.getByTestId('simulation-table')).toBeInTheDocument()
    })
  })
  
  it('should handle simulation creation flow', async () => {
    renderMainPage()
    
    // Click create simulation button
    const createButton = screen.getByText('새 시뮬레이션')
    fireEvent.click(createButton)
    
    // Should open plan editor
    await waitFor(() => {
      expect(screen.getByTestId('plan-editor')).toBeInTheDocument()
    })
    
    // Fill out simulation parameters
    const planSelect = screen.getByLabelText('투자 플랜')
    fireEvent.change(planSelect, { target: { value: 'A' } })
    
    const paymentInput = screen.getByLabelText('월 투자금')
    fireEvent.change(paymentInput, { target: { value: '100000' } })
    
    // Submit form
    const submitButton = screen.getByText('시뮬레이션 생성')
    fireEvent.click(submitButton)
    
    // Should call API
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/simulation/create', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('plan_id":"A')
      }))
    })
  })
})
```

#### 3. Create Basic E2E Smoke Tests
**File**: `e2e/smoke/user-onboarding.spec.ts`
**Changes**: New file with Playwright E2E tests

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Onboarding Flow', () => {
  test('should complete whitelist check and OTP flow', async ({ page }) => {
    await page.goto('/')
    
    // Should start at whitelist check page
    await expect(page.locator('h1')).toContainText('신청자 확인')
    
    // Fill whitelist form
    await page.fill('[data-testid="name-input"]', '김테스트')
    await page.fill('[data-testid="phone-input"]', '01012345678')
    await page.click('[data-testid="verify-button"]')
    
    // Should proceed to OTP page
    await expect(page.locator('h1')).toContainText('인증번호 확인')
    
    // Request OTP
    await page.click('[data-testid="send-otp-button"]')
    await expect(page.locator('[data-testid="otp-sent-message"]')).toBeVisible()
    
    // Enter OTP code
    await page.fill('[data-testid="otp-input"]', '123456')
    await page.click('[data-testid="verify-otp-button"]')
    
    // Should proceed to consent page
    await expect(page.locator('h1')).toContainText('개인정보 처리방침')
  })
  
  test('should handle authentication and main app access', async ({ page }) => {
    // Start from login page (after onboarding)
    await page.goto('/login')
    
    // Click Google login
    await page.click('[data-testid="google-login-button"]')
    
    // Mock OAuth success by navigating directly
    // In real tests, handle OAuth flow or use test user
    await page.goto('/app?session=test-session')
    
    // Should reach main application
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible()
    await expect(page.locator('h1')).toContainText('시뮬레이션 관리')
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Frontend integration tests pass: `npm test -- tests/integration`
- [ ] API service tests cover error cases: `npm run test:coverage`
- [ ] E2E smoke tests pass: `npx playwright test`

#### Manual Verification:
- [ ] Complete user flow works in browser
- [ ] Error handling displays user-friendly messages
- [ ] Authentication redirects work correctly
- [ ] Simulation creation and management functions

---

## Phase 6: CI/CD Integration & Test Automation

### Overview
Integrate testing into development workflow with GitHub Actions, automated coverage reporting, and test gates for deployments.

### Changes Required:

#### 1. Create GitHub Actions Workflow
**File**: `.github/workflows/test.yml`
**Changes**: New file with CI/CD test pipeline

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd src/backend
          pip install -r requirements.txt
      
      - name: Run backend tests
        run: |
          cd src/backend
          python -m pytest --cov --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: src/backend/coverage.xml
          flags: backend

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: src/frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd src/frontend
          npm ci
      
      - name: Run frontend tests
        run: |
          cd src/frontend
          npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: src/frontend/coverage/coverage-final.json
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install Playwright
        run: |
          npm install -g @playwright/test
          npx playwright install chromium
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:5173
```

#### 2. Create Test Data Management
**File**: `src/backend/tests/fixtures/test_data.py`
**Changes**: New file with test data factory

```python
import uuid
from datetime import datetime, timedelta
from faker import Faker

fake = Faker('ko_KR')

class TestDataFactory:
    """Factory for creating test data"""
    
    @staticmethod
    def create_test_user():
        """Create test user data"""
        return {
            'name': fake.name(),
            'phone_number': fake.phone_number(),
            'user_id': str(uuid.uuid4()),
            'user_hash': fake.sha256()
        }
    
    @staticmethod
    def create_simulation_data():
        """Create test simulation parameters"""
        return {
            'plan_id': fake.random_element(['A', 'B', 'C', 'D']),
            'starting_company_round': fake.random_int(1, 10),
            'scheduled_payment': fake.random_int(50000, 500000),
            'sales_achievement_rates': [
                fake.random.uniform(0.7, 1.3) for _ in range(4)
            ]
        }
    
    @staticmethod
    def create_otp_record(phone: str, expired: bool = False):
        """Create OTP test record"""
        expires_at = datetime.utcnow()
        if expired:
            expires_at -= timedelta(minutes=10)
        else:
            expires_at += timedelta(minutes=5)
            
        return {
            'id': str(uuid.uuid4()),
            'phone': phone,
            'code_hash': fake.sha256(),
            'attempts': 0,
            'used': False,
            'expires_at': expires_at.isoformat(),
            'created_at': datetime.utcnow().isoformat()
        }
```

#### 3. Create Test Environment Configuration
**File**: `src/backend/tests/test_settings.py`
**Changes**: New file with test-specific configuration

```python
import os
from src.config.settings import Settings

class TestSettings(Settings):
    """Test-specific configuration"""
    
    # Use test database
    SUPABASE_URL: str = os.getenv('TEST_SUPABASE_URL', 'http://localhost:54321')
    SUPABASE_SECRET_KEY: str = os.getenv('TEST_SUPABASE_SECRET_KEY', 'test-secret')
    
    # Disable external services in tests
    ENABLE_SMS_SENDING: bool = False
    ENABLE_EMAIL_SENDING: bool = False
    
    # Fast password hashing for tests
    BCRYPT_ROUNDS: int = 4
    
    # Short JWT expiration for testing
    JWT_EXPIRY_MINUTES: int = 5

def get_test_settings():
    return TestSettings()
```

### Success Criteria:

#### Automated Verification:
- [ ] CI pipeline runs successfully: GitHub Actions build passes
- [ ] Coverage reports generated: Codecov integration works
- [ ] Test gates enforced: PRs require passing tests
- [ ] Performance benchmarks: Tests complete within reasonable time

#### Manual Verification:
- [ ] Failed tests block deployments
- [ ] Coverage trends tracked over time
- [ ] Test results visible in PR status
- [ ] Development workflow integrates smoothly

---

## Testing Strategy Summary

### Coverage Targets by Phase:

| Phase | Backend Coverage | Frontend Coverage | Integration Coverage |
|-------|------------------|-------------------|---------------------|
| Phase 1-2 | 40-50% | 0% | 0% |
| Phase 3-4 | 60-70% | 50-60% | 40-50% |
| Phase 5-6 | ≥75% | ≥70% | ≥60% |

### Revised Coverage Rationale:

**Frontend 70% Target is Achievable Because:**
- Small, focused codebase (~15 components, 4 hooks)
- Business-critical financial calculations in utils
- Clear separation of concerns (API layer, auth context)
- Limited third-party UI dependencies

**Integration 60% Target Makes Sense Because:**
- Only 8 critical user flows to test
- Well-defined API contracts (20 endpoints)
- High business risk (financial data, security)
- Manageable test data setup

### Test Layer Implementation:

| Test Layer | Framework | Coverage Focus | Implementation Phase |
|------------|-----------|----------------|----------------------|
| **Backend Unit** | pytest | Business logic, security | Phase 1-2 |
| **Frontend Unit** | Vitest + RTL | Components, hooks | Phase 3 |
| **Integration** | pytest + httpx | API flows, database | Phase 4 |
| **Contract** | OpenAPI validation | API stability | Phase 4 |
| **E2E** | Playwright | User journeys | Phase 5 |

### Performance Targets:

- **Unit tests**: <30 seconds total runtime
- **Integration tests**: <2 minutes total runtime  
- **E2E tests**: <5 minutes for core flows
- **CI pipeline**: <10 minutes end-to-end

### Risk Mitigation:

- **Financial calculations**: Comprehensive unit tests with decimal precision
- **Security flows**: Mock external services, test rate limiting
- **Authentication**: Test token validation, admin privileges
- **User isolation**: Verify RLS policies with test users
- **Error handling**: Test all failure modes and edge cases

This implementation plan addresses the critical testing gap identified in the research, prioritizing highest-risk components while building toward comprehensive coverage across all SSD-specified test layers.
