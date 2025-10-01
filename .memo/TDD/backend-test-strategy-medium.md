# Backend Test Strategy - Medium Scale Apps

## Overview

**Target**: Growing production apps, 10-50 developers, 100k-1M users  
**Goal**: Scalable testing with team consistency and quality gates  
**Time Budget**: 30-40% of development time on testing

## Core Principles

1. **Shift-Left Testing**: Catch bugs early, automate in PR pipeline
2. **Test Ownership**: Each feature team owns their tests (CODEOWNERS enforced)
3. **Automated Quality Gates**: 80%+ coverage, zero errors to merge
4. **Performance Budget**: Tests <10min CI, APIs <500ms p95, DB queries <100ms
5. **Test Isolation**: Independent tests with transactions rollback
6. **Dependency Injection**: Mandate DI patterns for all external dependencies
7. **Decouple with Interfaces**: Use Protocols/ABCs for service boundaries
8. **Mock External Dependencies**: Use pytest-mock, responses, pytest-httpx for mocking
9. **CI Optimized**: Parallel test execution, fast fixtures, in-memory DB where possible

## Enhanced Test Pyramid

```text
      E2E (10%)              # Critical API flows
     /         \
   Integration (30%)         # DB + external services + async
   /              \
  Unit Tests (50%)           # Business logic + pure functions
 /                 \
Static Analysis (10%)        # Type checking + linting
```

## Test Categories & Coverage Targets

### 1. Static Analysis (Immediate feedback)

```python
# Tools & Targets:
# - mypy: Strict mode enabled, zero type errors
# - ruff: Zero errors, warnings reviewed
# - black: Enforced formatting
# - bandit: Security linting for common vulnerabilities

# Pre-commit hooks (pre-commit + ruff + black):
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
  - repo: https://github.com/psf/black
    rev: 23.11.0
    hooks:
      - id: black
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests, types-redis]
```

### 2. Unit Tests (80% coverage target)

**What to Test**:

- Pure business logic: 100% coverage
- Service classes: All branches covered
- Utility functions: Complete coverage
- Domain models: Validation logic

**Dependency Injection Pattern**:

```python
from typing import Protocol
from decimal import Decimal

class IPaymentGateway(Protocol):
    def charge(self, amount: Decimal, token: str) -> str: ...

class IEmailService(Protocol):
    def send_receipt(self, email: str, amount: Decimal) -> bool: ...

class OrderService:
    """Service with injected dependencies"""
    
    def __init__(
        self,
        payment_gateway: IPaymentGateway,
        email_service: IEmailService,
        db_session: Session
    ):
        self.payment_gateway = payment_gateway
        self.email_service = email_service
        self.db = db_session
    
    def process_order(self, order: Order) -> ProcessResult:
        # Pure business logic - easily testable
        if order.total < Decimal("0"):
            raise ValueError("Order total cannot be negative")
        
        # External dependency calls - injected
        charge_id = self.payment_gateway.charge(order.total, order.payment_token)
        self.email_service.send_receipt(order.customer_email, order.total)
        
        # Database operation - injected session
        order.status = "completed"
        order.charge_id = charge_id
        self.db.add(order)
        self.db.commit()
        
        return ProcessResult(success=True, charge_id=charge_id)

# Test with mocked dependencies
@pytest.fixture
def mock_payment_gateway():
    mock = Mock(spec=IPaymentGateway)
    mock.charge.return_value = "ch_123456"
    return mock

@pytest.fixture
def mock_email_service():
    mock = Mock(spec=IEmailService)
    mock.send_receipt.return_value = True
    return mock

def test_process_order_success(mock_payment_gateway, mock_email_service, db_session):
    """Test order processing with mocked dependencies"""
    service = OrderService(
        payment_gateway=mock_payment_gateway,
        email_service=mock_email_service,
        db_session=db_session
    )
    
    order = Order(total=Decimal("100.00"), customer_email="test@example.com")
    result = service.process_order(order)
    
    # Verify pure logic
    assert result.success is True
    
    # Verify external calls
    mock_payment_gateway.charge.assert_called_once()
    mock_email_service.send_receipt.assert_called_once()
    
    # Verify DB state
    assert order.status == "completed"
    assert order.charge_id == "ch_123456"
```

### 3. Integration Tests (Critical flows with real DB)

**Scope**:

- API endpoints with database operations
- Repository layer with real DB
- External service integrations (with mocking)
- Async operations and background tasks

**Database Testing Pattern**:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

@pytest.fixture(scope="function")
def db_session():
    """Create test database session with transaction rollback"""
    # Use SQLite in-memory for speed
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    # Rollback all changes after test
    session.rollback()
    session.close()

@pytest.fixture
def user_repository(db_session: Session):
    """Inject repository with test DB session"""
    return UserRepository(db_session)

class TestUserRepository:
    """Integration tests for user repository"""
    
    def test_create_and_find_user(self, user_repository: UserRepository):
        """Test creating user and retrieving by email"""
        # Create user
        user = user_repository.create(
            email="test@example.com",
            hashed_password="hashed_pw",
            name="Test User"
        )
        
        assert user.id is not None
        
        # Find user
        found_user = user_repository.find_by_email("test@example.com")
        
        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.email == "test@example.com"
    
    def test_duplicate_email_raises_error(self, user_repository: UserRepository):
        """Test that duplicate emails are rejected"""
        user_repository.create(
            email="duplicate@example.com",
            hashed_password="pw"
        )
        
        with pytest.raises(IntegrityError):
            user_repository.create(
                email="duplicate@example.com",
                hashed_password="pw"
            )
```

### 4. API Tests (FastAPI TestClient)

**FastAPI Testing with Dependency Overrides**:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.main import app
from app.dependencies import get_db, get_email_service

@pytest.fixture
def client(db_session: Session):
    """Create test client with overridden dependencies"""
    
    # Override database dependency
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override email service
    mock_email = Mock()
    mock_email.send_email.return_value = True
    
    def override_get_email_service():
        return mock_email
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_email_service] = override_get_email_service
    
    yield TestClient(app)
    
    # Clean up
    app.dependency_overrides.clear()

class TestUserAPI:
    """API integration tests"""
    
    def test_create_user_success(self, client: TestClient):
        """Given valid user data, When POST /users, Then 201"""
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "name": "John Doe"
        }
        
        response = client.post("/api/users", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == payload["email"]
        assert "password" not in data
        assert "id" in data
    
    def test_create_user_duplicate_email(self, client: TestClient, db_session: Session):
        """Given existing email, When POST /users, Then 409"""
        # Create existing user
        existing = User(email="existing@example.com")
        db_session.add(existing)
        db_session.commit()
        
        payload = {"email": "existing@example.com", "password": "pass123"}
        response = client.post("/api/users", json=payload)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()
    
    def test_get_user_unauthorized(self, client: TestClient):
        """Given no auth token, When GET /users/me, Then 401"""
        response = client.get("/api/users/me")
        assert response.status_code == 401
    
    def test_get_user_authorized(self, client: TestClient, auth_headers: dict):
        """Given valid token, When GET /users/me, Then 200 with user data"""
        response = client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "id" in data
```

### 5. Async Testing

**pytest-asyncio for Async Operations**:

```python
import pytest
from httpx import AsyncClient

from app.main import app
from app.services.async_service import AsyncDataService

@pytest.mark.asyncio
async def test_async_endpoint():
    """Test asynchronous endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/async-data")
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data

@pytest.mark.asyncio
async def test_async_service_with_mock(mocker):
    """Test async service with mocked dependency"""
    mock_client = mocker.AsyncMock()
    mock_client.fetch.return_value = {"data": "test"}
    
    service = AsyncDataService(http_client=mock_client)
    result = await service.get_data()
    
    assert result == {"data": "test"}
    mock_client.fetch.assert_awaited_once()
```

## Team Organization

### Test Structure by Feature

```text
src/
├── features/
│   ├── auth/
│   │   ├── services/
│   │   │   └── auth_service.py
│   │   ├── repositories/
│   │   │   └── user_repository.py
│   │   ├── models/
│   │   │   └── user.py
│   │   └── tests/
│   │       ├── unit/
│   │       │   └── test_auth_service.py
│   │       ├── integration/
│   │       │   └── test_user_repository.py
│   │       └── api/
│   │           └── test_auth_endpoints.py
│   ├── payments/
│   └── notifications/
tests/
├── conftest.py              # Shared fixtures
├── factories/               # Test data builders
└── e2e/                    # End-to-end API tests
```

### Ownership Model

```yaml
# CODEOWNERS
src/features/auth/**         @team-auth
src/features/payments/**     @team-payments
src/features/notifications/** @team-notifications
tests/**                     @qa-team
```

## Implementation Roadmap

### Phase 1: Foundation (Month 1)

1. **Testing Infrastructure**

```bash
# Setup pytest with plugins
pip install pytest pytest-cov pytest-asyncio pytest-mock pytest-xdist
pip install httpx respx faker factory-boy freezegun
pip install ruff black mypy bandit

# Configure pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --cov=src
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
    --strict-markers
    --tb=short
    -n auto  # Parallel execution
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
    asyncio: Async tests
```

2. **CI/CD Pipeline**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements-test.txt
      
      - name: Run linters
        run: |
          ruff check .
          black --check .
          mypy src/
          bandit -r src/ -ll
      
      - name: Run tests
        run: |
          pytest -v --cov=src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Phase 2: Coverage Expansion (Month 2-3)

1. **Test Data Management**

```python
# factories.py - Using factory_boy
import factory
from faker import Faker

fake = Faker()

class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    email = factory.LazyAttribute(lambda _: fake.email())
    name = factory.LazyAttribute(lambda _: fake.name())
    is_active = True
    role = "user"

# Usage
user = UserFactory()
admin = UserFactory(role="admin")
users = UserFactory.create_batch(10)
```

2. **Advanced Mocking Patterns**

```python
# Mock HTTP requests with respx
import respx
from httpx import AsyncClient

@pytest.mark.asyncio
@respx.mock
async def test_external_api_call():
    """Test external API call with mocked response"""
    route = respx.get("https://api.example.com/data").mock(
        return_value=httpx.Response(200, json={"status": "ok"})
    )
    
    async with AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert route.called

# Mock time with freezegun
from freezegun import freeze_time
from datetime import datetime

@freeze_time("2024-01-15 10:00:00")
def test_token_expiration():
    """Test token expiration logic"""
    token = create_token(expires_in_minutes=30)
    
    # Token should be valid now
    assert is_token_valid(token) is True
    
    # Move time forward 31 minutes
    with freeze_time("2024-01-15 10:31:00"):
        assert is_token_valid(token) is False
```

### Phase 3: Advanced Testing (Month 4-6)

1. **Mutation Testing**

```bash
# Install mutmut
pip install mutmut

# Run mutation tests
mutmut run

# View results
mutmut show
mutmut html

# Killed mutants: Tests caught the mutation ✅
# Survived mutants: Tests didn't catch the mutation ❌
```

2. **Property-Based Testing with Hypothesis**

```python
from hypothesis import given, strategies as st
from decimal import Decimal

@given(
    price=st.decimals(min_value=0, max_value=10000, places=2),
    discount=st.decimals(min_value=0, max_value=1, places=2)
)
def test_discount_calculation_properties(price: Decimal, discount: Decimal):
    """Test discount calculation with random inputs"""
    result = calculate_discount(price, discount)
    
    # Properties that must always hold
    assert result >= 0  # Discount can't be negative
    assert result <= price  # Discount can't exceed price
    assert result == price * discount  # Correct calculation
```

3. **Load Testing with Locust**

```python
# locustfile.py
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def get_users(self):
        """Weighted task - runs 3x more often"""
        self.client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def create_user(self):
        self.client.post("/api/users", json={
            "email": f"user{self._id}@example.com",
            "password": "password123"
        })

# Run: locust -f locustfile.py --host=http://localhost:8000
```

## Testing Patterns

### 1. Repository Pattern with DI

```python
from typing import Protocol
from sqlalchemy.orm import Session

class IUserRepository(Protocol):
    def find_by_id(self, id: int) -> User | None: ...
    def find_by_email(self, email: str) -> User | None: ...
    def create(self, user: User) -> User: ...
    def update(self, user: User) -> User: ...
    def delete(self, id: int) -> None: ...

class UserRepository:
    """Concrete implementation"""
    def __init__(self, session: Session):
        self.session = session
    
    def find_by_email(self, email: str) -> User | None:
        return self.session.query(User).filter(User.email == email).first()
    
    # ... other methods

# In tests: Mock repository
class MockUserRepository:
    def __init__(self):
        self.users = {}
    
    def find_by_email(self, email: str) -> User | None:
        return self.users.get(email)
```

### 2. Service Layer Pattern

```python
class UserService:
    """Service with injected dependencies"""
    
    def __init__(
        self,
        user_repo: IUserRepository,
        email_service: IEmailService,
        password_hasher: IPasswordHasher
    ):
        self.user_repo = user_repo
        self.email_service = email_service
        self.password_hasher = password_hasher
    
    def register_user(self, email: str, password: str) -> User:
        # Check if user exists
        existing = self.user_repo.find_by_email(email)
        if existing:
            raise UserAlreadyExistsError(f"User {email} already exists")
        
        # Hash password
        hashed_password = self.password_hasher.hash(password)
        
        # Create user
        user = User(email=email, hashed_password=hashed_password)
        user = self.user_repo.create(user)
        
        # Send welcome email
        self.email_service.send_welcome_email(user.email)
        
        return user
```

### 3. Fixture Organization

```python
# conftest.py - Shared fixtures
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def engine():
    """Create test database engine"""
    return create_engine("sqlite:///:memory:")

@pytest.fixture(scope="function")
def db_session(engine):
    """Create test database session"""
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def user_factory(db_session):
    """Factory for creating test users"""
    def _create_user(**kwargs):
        user = User(**kwargs)
        db_session.add(user)
        db_session.commit()
        return user
    return _create_user
```

## Metrics & Monitoring

### Essential Metrics

- **Test execution time**: <10min for full suite, <2min for unit tests
- **Code coverage**: 80%+ overall, 90%+ critical paths
- **Test reliability**: <2% flaky tests
- **Mutation score**: 80%+ killed mutants
- **API performance**: <500ms p95, <100ms p50

### Monitoring Dashboard

```python
# pytest-html for test reports
pip install pytest-html

pytest --html=report.html --self-contained-html

# Coverage badge in README
[![Coverage](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/org/repo)
```

## Security Testing Checklist

### API Security

- [ ] SQL injection: Parameterized queries, ORM usage
- [ ] Authentication: JWT validation, password hashing
- [ ] Authorization: Role-based access control
- [ ] Rate limiting: Per IP, per user, per endpoint
- [ ] Input validation: Pydantic models, custom validators

### Data Protection

- [ ] Secrets management: Environment variables, Vault
- [ ] Encryption: At rest and in transit
- [ ] PII handling: GDPR compliance, data anonymization
- [ ] Audit logging: Track sensitive operations

## Tools & Dependencies

```txt
# requirements-test.txt
pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1
pytest-mock==3.12.0
pytest-xdist==3.5.0              # Parallel execution
pytest-html==4.1.1               # HTML reports
httpx==0.25.1                    # Async HTTP client
respx==0.20.2                    # HTTP mocking
faker==20.0.0                    # Test data generation
factory-boy==3.3.0               # Model factories
freezegun==1.3.1                 # Time mocking
hypothesis==6.92.1               # Property-based testing
mutmut==2.4.4                    # Mutation testing
locust==2.17.0                   # Load testing
ruff==0.1.6                      # Linting
black==23.11.0                   # Formatting
mypy==1.7.1                      # Type checking
bandit==1.7.5                    # Security linting
```

## Investment vs Return

**Investment** (First 3 months):

- Time: 60-80 hours setup + ongoing test development
- Learning curve: pytest, async testing, mocking patterns
- Infrastructure: CI/CD pipeline, coverage reporting, mutation testing

**Return**:

- 80% reduction in production bugs
- 60% faster debugging with isolated test failures
- 90% confident refactoring with comprehensive test coverage
- 75% faster onboarding with tests as living documentation
- 50% reduction in manual QA time

## Next Steps

1. **Month 1**: Setup infrastructure, write critical tests, CI/CD integration
2. **Month 2**: Expand coverage, add async tests, implement factories
3. **Month 3**: Advanced testing (mutation, property-based), load testing
4. **Month 4+**: Continuous improvement, test optimization, team training

**Remember**: Focus on high-value tests, maintain fast feedback loops, and iterate!
