# Backend Test Strategy - Small Scale Apps

## Overview

**Target**: MVP to small production apps, 1-10 developers, <100k users  
**Goal**: Maximum confidence with minimum maintenance overhead  
**Time Budget**: 20-30% of development time on testing  
**Stack**: FastAPI + Python 3.11+ + pytest

## Core Principles

1. **Test Business Logic**: Focus on domain logic, calculations, validations, transformations
2. **Test Isolation**: Each test independent with own DB state/mocks/fixtures
3. **Fast Feedback**: Tests run <2min locally, fail fast on errors
4. **Pragmatic Coverage**: 70-80% overall, 90%+ critical paths, skip trivial code

## Test Pyramid for Small Apps

```text
         E2E (5%)        # Critical API journeys only
        /        \
    Integration (25%)    # DB + external services
   /                \
  Unit Tests (70%)       # Business logic + utilities
```

**Rationale**: More unit tests = faster execution, easier debugging, better regression safety

## Priority Matrix

### P0 - MUST HAVE (Week 1)

Focus on what breaks the business if it fails.

#### 1. Critical Business Logic (Unit Tests)

**What to Test**:

- Authentication logic: password hashing (bcrypt/argon2), JWT generation/validation, token refresh
- Authorization: role-based access control (RBAC), permission checks, resource ownership
- Business calculations: pricing, discounts, tax, inventory, financial formulas
- Data validation: input sanitization (SQL injection, XSS), format validation, business rules
- Domain services: state machines, workflow logic, data transformations

**Technical Requirements**:

- Tools: pytest + pytest-cov + pytest-mock
- Coverage: 90%+ for critical functions, 100% for security-sensitive code
- Test structure: Arrange-Act-Assert (AAA) pattern
- Mocking: Mock external dependencies (DB, external APIs, file system)
- Fixtures: Use pytest fixtures for reusable test data

**Example Pattern**:

```python
import pytest
from decimal import Decimal
from app.services.pricing import calculate_total_price
from app.models.schemas import OrderItem

class TestPricingService:
    """Test pricing calculations with various scenarios."""
    
    def test_calculate_total_with_tax(self):
        # Arrange
        items = [
            OrderItem(product_id=1, quantity=2, unit_price=Decimal("10.00")),
            OrderItem(product_id=2, quantity=1, unit_price=Decimal("15.00")),
        ]
        tax_rate = Decimal("0.08")
        
        # Act
        total = calculate_total_price(items, tax_rate)
        
        # Assert
        expected = Decimal("37.80")  # (20 + 15) * 1.08
        assert total == expected
    
    @pytest.mark.parametrize("quantity,unit_price,expected", [
        (0, Decimal("10.00"), Decimal("0.00")),
        (1, Decimal("10.00"), Decimal("10.00")),
        (10, Decimal("5.50"), Decimal("55.00")),
    ])
    def test_calculate_subtotal(self, quantity, unit_price, expected):
        """Test subtotal calculation with various inputs."""
        item = OrderItem(product_id=1, quantity=quantity, unit_price=unit_price)
        assert calculate_subtotal(item) == expected
    
    def test_negative_quantity_raises_error(self):
        """Test that negative quantities are rejected."""
        item = OrderItem(product_id=1, quantity=-1, unit_price=Decimal("10.00"))
        
        with pytest.raises(ValueError, match="Quantity must be positive"):
            calculate_subtotal(item)
```

#### 2. API Endpoint Tests (Integration Tests)

**What to Test**:

- Request validation: Pydantic models, query parameters, headers
- Response format: status codes, JSON structure, error messages
- Authentication/Authorization: JWT tokens, permission checks
- Database operations: CRUD operations, transactions, cascades
- Error handling: 400/401/403/404/500 responses

**Technical Requirements**:

- Tools: pytest + httpx (FastAPI TestClient) + pytest-asyncio
- Test structure: Given-When-Then (GWT) pattern
- Test DB: SQLite in-memory or PostgreSQL with transactions rollback
- Fixtures: Database session, authenticated client, test data builders

**Example Pattern**:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.auth import create_access_token
from app.models.user import User

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def auth_headers(db_session: Session):
    """Create authenticated user and return auth headers."""
    user = User(email="test@example.com", role="user")
    db_session.add(user)
    db_session.commit()
    
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}

class TestUserAPI:
    """Test user management endpoints."""
    
    def test_create_user_success(self, client: TestClient):
        """Given valid user data, When POST /users, Then 201 with user data."""
        # Given
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "name": "John Doe"
        }
        
        # When
        response = client.post("/api/users", json=payload)
        
        # Then
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == payload["email"]
        assert data["name"] == payload["name"]
        assert "password" not in data  # Password should not be in response
        assert "id" in data
    
    def test_create_user_duplicate_email(self, client: TestClient, db_session: Session):
        """Given existing email, When POST /users, Then 409 conflict."""
        # Given
        existing_user = User(email="existing@example.com")
        db_session.add(existing_user)
        db_session.commit()
        
        payload = {"email": "existing@example.com", "password": "pass123"}
        
        # When
        response = client.post("/api/users", json=payload)
        
        # Then
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()
    
    def test_get_user_unauthorized(self, client: TestClient):
        """Given no auth token, When GET /users/me, Then 401."""
        response = client.get("/api/users/me")
        assert response.status_code == 401
    
    def test_get_user_authorized(self, client: TestClient, auth_headers: dict):
        """Given valid auth token, When GET /users/me, Then 200 with user data."""
        response = client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "id" in data
```

#### 3. Database Layer Tests

**What to Test**:

- Model validations: constraints, defaults, relationships
- Repository methods: CRUD operations, complex queries, filtering
- Transactions: rollback on error, isolation levels
- Data integrity: foreign keys, unique constraints, cascades

**Technical Requirements**:

- Use transactions that rollback after each test
- Fixtures for database session and test data
- Test both happy and error paths

**Example Pattern**:

```python
import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.repositories.user_repository import UserRepository

@pytest.fixture
def user_repo(db_session: Session):
    """Create user repository instance."""
    return UserRepository(db_session)

class TestUserRepository:
    """Test user repository database operations."""
    
    def test_create_user(self, user_repo: UserRepository):
        """Test creating a new user."""
        user = user_repo.create(
            email="test@example.com",
            hashed_password="hashed_pw",
            name="Test User"
        )
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.name == "Test User"
    
    def test_create_user_duplicate_email_fails(self, user_repo: UserRepository):
        """Test that duplicate emails are rejected."""
        user_repo.create(email="duplicate@example.com", hashed_password="pw")
        
        with pytest.raises(IntegrityError):
            user_repo.create(email="duplicate@example.com", hashed_password="pw")
    
    def test_get_by_email(self, user_repo: UserRepository):
        """Test retrieving user by email."""
        created_user = user_repo.create(
            email="find@example.com",
            hashed_password="pw"
        )
        
        found_user = user_repo.get_by_email("find@example.com")
        
        assert found_user is not None
        assert found_user.id == created_user.id
        assert found_user.email == "find@example.com"
    
    def test_get_by_email_not_found(self, user_repo: UserRepository):
        """Test that non-existent email returns None."""
        user = user_repo.get_by_email("nonexistent@example.com")
        assert user is None
```

#### 4. Security Tests

**What to Test**:

- Password hashing: bcrypt/argon2 strength, salt generation
- JWT tokens: expiration, signature validation, claims
- SQL injection: parameterized queries, ORM usage
- Input validation: XSS prevention, command injection
- Rate limiting: endpoint throttling

**Example Pattern**:

```python
import pytest
from datetime import datetime, timedelta
from jose import jwt

from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings

class TestSecurity:
    """Test security utilities."""
    
    def test_password_hashing(self):
        """Test password is properly hashed and verified."""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        # Hash should not equal plain password
        assert hashed != password
        # Hash should be verifiable
        assert verify_password(password, hashed) is True
        # Wrong password should fail
        assert verify_password("WrongPassword", hashed) is False
    
    def test_jwt_token_creation(self):
        """Test JWT token contains correct claims."""
        user_id = "123"
        token = create_access_token(subject=user_id)
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == user_id
        assert "exp" in payload
        assert payload["exp"] > datetime.utcnow().timestamp()
    
    def test_jwt_token_expiration(self):
        """Test expired tokens are rejected."""
        # Create token that expired 1 hour ago
        expired_token = create_access_token(
            subject="123",
            expires_delta=timedelta(hours=-1)
        )
        
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(
                expired_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
    
    def test_sql_injection_prevention(self, client: TestClient):
        """Test that SQL injection attempts are safely handled."""
        # Attempt SQL injection in query parameter
        response = client.get("/api/users?email=test@example.com' OR '1'='1")
        
        # Should return empty or error, not all users
        assert response.status_code in [200, 400, 404]
        if response.status_code == 200:
            data = response.json()
            # Should not return multiple users due to injection
            assert len(data) <= 1
```

### Week-by-Week Roadmap

#### Week 1: Foundation

```bash
# Setup testing infrastructure
pip install pytest pytest-cov pytest-asyncio pytest-mock httpx

# Create test structure
tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── unit/
│   ├── test_services.py
│   ├── test_models.py
│   └── test_utils.py
├── integration/
│   ├── test_api.py
│   └── test_database.py
└── security/
    └── test_security.py
```

**Tasks**:

1. Configure pytest.ini with coverage settings
2. Setup database fixtures (in-memory SQLite for speed)
3. Create authenticated client fixtures
4. Write 5-10 critical business logic tests

#### Week 2: Critical Tests

1. Write unit tests for authentication/authorization logic
2. Add API endpoint tests for critical paths
3. Setup CI/CD pipeline with GitHub Actions
4. Aim for 60% coverage on critical modules

#### Week 3: Expand Coverage

1. Add integration tests for database operations
2. Write security tests (password hashing, JWT, SQL injection)
3. Add tests for error handling and edge cases
4. Target 70% overall coverage

#### Week 4: Monitoring & Polish

1. Setup coverage reports (Codecov/Coveralls)
2. Add mutation testing for critical functions (mutmut)
3. Document testing patterns in README
4. Review and refactor flaky tests

## File Structure

```text
src/backend/
├── app/
│   ├── main.py
│   ├── models/
│   ├── services/
│   ├── repositories/
│   └── api/
└── tests/
    ├── conftest.py              # Shared fixtures
    ├── unit/
    │   ├── test_services/
    │   ├── test_models/
    │   └── test_utils/
    ├── integration/
    │   ├── test_api/
    │   └── test_repositories/
    └── security/
        └── test_security/
```

## Testing Patterns

### Unit Test Pattern (pytest)

```python
import pytest
from decimal import Decimal
from app.services.order_service import OrderService

@pytest.fixture
def order_service():
    """Create order service instance with mocked dependencies."""
    return OrderService()

class TestOrderService:
    """Test order service business logic."""
    
    def test_calculate_order_total(self, order_service: OrderService):
        """Test order total calculation."""
        # Arrange
        items = [
            {"product_id": 1, "quantity": 2, "price": Decimal("10.00")},
            {"product_id": 2, "quantity": 1, "price": Decimal("15.00")},
        ]
        
        # Act
        total = order_service.calculate_total(items)
        
        # Assert
        assert total == Decimal("35.00")
    
    @pytest.mark.parametrize("quantity,price,expected", [
        (0, Decimal("10.00"), Decimal("0.00")),
        (1, Decimal("10.00"), Decimal("10.00")),
        (5, Decimal("2.50"), Decimal("12.50")),
    ])
    def test_calculate_line_total(self, order_service, quantity, price, expected):
        """Test line item total calculation with various inputs."""
        result = order_service.calculate_line_total(quantity, price)
        assert result == expected
```

### API Integration Test Pattern

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db

@pytest.fixture
def client(db_session: Session):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

class TestProductAPI:
    """Test product endpoints."""
    
    def test_list_products(self, client: TestClient, db_session: Session):
        """Given products in DB, When GET /products, Then return list."""
        # Given
        db_session.add_all([
            Product(name="Product 1", price=10.00),
            Product(name="Product 2", price=20.00),
        ])
        db_session.commit()
        
        # When
        response = client.get("/api/products")
        
        # Then
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Product 1"
```

### Database Test Pattern

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.database import Base

@pytest.fixture(scope="function")
def db_session():
    """Create test database session with transaction rollback."""
    # Create in-memory SQLite database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.rollback()
    session.close()

def test_user_creation(db_session: Session):
    """Test creating user in database."""
    user = User(email="test@example.com", name="Test")
    db_session.add(user)
    db_session.commit()
    
    assert user.id is not None
    
    # Verify user is in database
    found = db_session.query(User).filter_by(email="test@example.com").first()
    assert found is not None
    assert found.name == "Test"
```

## Metrics & Monitoring

### Essential Metrics

- **Test execution time**: <2min for unit/integration, <5min total
- **Code coverage**: 70-80% overall, 90%+ critical paths
- **Test reliability**: <1% flaky tests
- **Security**: Zero SQL injection vulnerabilities, 100% auth tests passing

### Simple Monitoring Setup

```python
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=70
    --strict-markers
    --tb=short
markers =
    unit: Unit tests
    integration: Integration tests
    security: Security tests
    slow: Slow tests (deselect with '-m "not slow"')
```

```bash
# Run tests with coverage
pytest --cov=app --cov-report=html

# Run only fast tests
pytest -m "not slow"

# Run specific test category
pytest -m unit
pytest -m integration
pytest -m security

# Run with detailed output
pytest -vv

# Run tests in parallel (requires pytest-xdist)
pytest -n auto
```

## Security Testing Checklist

### Authentication & Authorization

- [ ] Password hashing: bcrypt/argon2, >12 rounds
- [ ] JWT validation: signature, expiration, audience
- [ ] Token refresh: secure refresh token storage
- [ ] Session management: logout clears all tokens
- [ ] Password reset: secure token generation, time-limited

### Input Validation

- [ ] SQL injection: parameterized queries only
- [ ] XSS prevention: input sanitization, output encoding
- [ ] Command injection: no shell command execution with user input
- [ ] Path traversal: validate file paths
- [ ] SSRF prevention: whitelist allowed URLs

### API Security

- [ ] Rate limiting: per IP, per user, per endpoint
- [ ] CORS: strict origin validation
- [ ] CSRF protection: tokens for state-changing operations
- [ ] Content-Type validation: reject unexpected formats
- [ ] File upload: size limits, type validation, virus scanning

## Tools & Dependencies

```txt
# requirements-test.txt
pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1
pytest-mock==3.12.0
pytest-xdist==3.5.0              # Parallel execution
httpx==0.25.1                    # FastAPI TestClient
faker==20.0.0                    # Test data generation
factory-boy==3.3.0               # Model factories
freezegun==1.3.1                 # Time mocking
respx==0.20.2                    # HTTP mocking
mutmut==2.4.4                    # Mutation testing
```

## Common Patterns

### Test Data Builders (Factory Pattern)

```python
import factory
from faker import Faker
from app.models.user import User

fake = Faker()

class UserFactory(factory.Factory):
    """Factory for creating test users."""
    
    class Meta:
        model = User
    
    email = factory.LazyAttribute(lambda _: fake.email())
    name = factory.LazyAttribute(lambda _: fake.name())
    is_active = True
    role = "user"

# Usage
user = UserFactory()
admin = UserFactory(role="admin")
users = UserFactory.create_batch(5)
```

### Async Test Pattern

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_async_endpoint():
    """Test asynchronous endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/async-data")
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
```

### Mock External Services

```python
import pytest
from unittest.mock import Mock, patch
from app.services.email_service import EmailService

@pytest.fixture
def mock_smtp():
    """Mock SMTP server."""
    with patch("smtplib.SMTP") as mock:
        yield mock

def test_send_email(mock_smtp):
    """Test email sending without actual SMTP connection."""
    service = EmailService()
    
    result = service.send_email(
        to="user@example.com",
        subject="Test",
        body="Test message"
    )
    
    assert result is True
    assert mock_smtp.called
```

## Investment vs Return

**Investment** (First month):

- Time: 30-40 hours setup + ongoing test writing
- Learning curve: pytest, fixtures, mocking patterns
- Infrastructure: CI/CD pipeline, coverage reporting

**Return**:

- 70% reduction in production bugs
- 50% faster debugging (isolated test failures)
- 80% confident refactoring (tests catch regressions)
- 90% faster onboarding (tests as documentation)
- Peace of mind for deployments

## Next Steps

1. **Week 1**: Setup testing infrastructure, write critical business logic tests
2. **Week 2**: Add API endpoint tests, integrate with CI/CD
3. **Week 3**: Expand coverage with DB and security tests
4. **Week 4**: Polish, document, and review test quality

**Remember**: Start small, iterate quickly, focus on business-critical paths first!
