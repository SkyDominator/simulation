# Backend Test Strategy - Enterprise Scale Apps

## Overview

**Target**: Enterprise production apps, 50+ developers, 1M+ users  
**Goal**: Industrial-strength testing with governance, compliance, and zero-defect mindset  
**Time Budget**: 40-50% of development time on testing and quality assurance

## Core Principles

1. **Zero-Defect Mindset**: Bugs are unacceptable in production, prevention over detection
2. **Compliance First**: Meet regulatory requirements (GDPR, HIPAA, SOC2, PCI-DSS)
3. **Platform Engineering**: Testing as a service for all teams, shared infrastructure
4. **Continuous Verification**: Every commit is production-ready, automated quality gates
5. **Dependency Injection Standard**: Mandate DI patterns organization-wide for testability
6. **Interface-Driven Design**: All service boundaries defined by protocols/ABCs
7. **Mock-First Development**: Use pytest-mock/respx for all external dependencies
8. **Observability Built-In**: Structured logging, distributed tracing, metrics in tests
9. **Performance as Requirement**: API latency, throughput, resource usage in test suite

## Enterprise Test Pyramid

```text
        Monitoring (5%)          # Synthetic monitoring, RUM
       /              \
      E2E (10%)                  # Critical API journeys
     /         \       
   Integration (20%)             # DB + external services + message queues
   /              \    
  Unit Tests (40%)               # Business logic + pure functions
 /                 \   
Static Analysis (15%)            # Type checking + linting + security
/                    \ 
Security & Compliance (10%)     # Penetration tests + audit compliance
```

## Comprehensive Test Matrix

### Level 1: Pre-Commit (< 1 minute)

**Enforced via pre-commit hooks**:

```python
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
        additional_dependencies: [types-all]
  
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: [-ll]
  
  - repo: local
    hooks:
      - id: pytest-changed
        name: Run tests for changed files
        entry: pytest --co -q
        language: system
        pass_filenames: false
        always_run: true
  
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

**Actions**:
- TypeScript compilation (strict mode)
- Linting (ruff) with auto-fix
- Formatting (black)
- Type checking (mypy strict)
- Security scanning (bandit)
- Secrets detection
- Unit tests for changed files

### Level 2: PR Pipeline (< 15 minutes)

**GitHub Actions / Jenkins**:

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements-dev.txt
      - name: Run ruff
        run: ruff check . --output-format=github
      - name: Run black
        run: black --check .
      - name: Run mypy
        run: mypy src/ --strict
      - name: Run bandit
        run: bandit -r src/ -f json -o bandit-report.json
  
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt
      
      - name: Run unit tests
        run: pytest tests/unit -n auto --cov=src --cov-report=xml
      
      - name: Run integration tests
        run: pytest tests/integration -n auto
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379/0
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
          flags: unittests
          name: codecov-${{ matrix.python-version }}
  
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run Safety
        run: |
          pip install safety
          safety check --json
      
      - name: SAST with Semgrep
        uses: returntocorp/semgrep-action@v1
```

**Actions**:
- Full unit test suite with parallel execution
- Integration tests with real services (PostgreSQL, Redis)
- Code coverage (90% minimum)
- Security scanning (Snyk, Safety, Semgrep)
- Dependency vulnerability checks
- Multiple Python versions testing

### Level 3: Merge Pipeline (< 30 minutes)

**Post-merge to main/develop**:

```yaml
name: Post-Merge Tests

on:
  push:
    branches: [main, develop]

jobs:
  full-test-suite:
    runs-on: ubuntu-latest
    steps:
      - name: Run full E2E tests
        run: pytest tests/e2e --slow
      
      - name: Run mutation tests
        run: mutmut run --paths-to-mutate=src/
      
      - name: Run contract tests
        run: pytest tests/contracts
      
      - name: Performance benchmarks
        run: pytest tests/performance --benchmark-only
      
      - name: Load testing
        run: locust -f tests/load/locustfile.py --headless -u 1000 -r 100 --run-time 10m
```

**Actions**:
- Full E2E API test suite
- Mutation testing with mutmut
- Contract tests (Pact provider verification)
- Performance benchmarks
- Load testing (expected traffic x3)
- Database migration tests

### Level 4: Release Pipeline (< 2 hours)

**Pre-production deployment**:

```yaml
name: Release Tests

on:
  push:
    tags: ['v*']

jobs:
  comprehensive-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Full regression suite
        run: pytest tests/ --slow --comprehensive
      
      - name: Security penetration tests
        run: |
          zap-cli quick-scan --self-contained --start-options '-config api.disablekey=true' http://staging-api.example.com
          zap-cli report -o zap-report.html -f html
      
      - name: Compliance validation
        run: |
          pytest tests/compliance/gdpr
          pytest tests/compliance/hipaa
          pytest tests/compliance/sox
      
      - name: Chaos engineering
        run: |
          chaos run experiments/kill-random-pod.yaml
          chaos run experiments/network-delay.yaml
      
      - name: Multi-region smoke tests
        run: |
          pytest tests/e2e --region=us-east-1
          pytest tests/e2e --region=eu-west-1
          pytest tests/e2e --region=ap-southeast-1
```

**Actions**:
- Full regression test suite
- Security penetration testing (OWASP ZAP)
- Compliance validation (GDPR, HIPAA, SOX)
- Chaos engineering tests
- Multi-region deployment verification
- Disaster recovery tests

### Level 5: Production Monitoring (Continuous)

**Real-time verification**:

```python
# Synthetic monitoring with pytest
import pytest
from playwright.sync_api import sync_playwright

@pytest.mark.monitor
@pytest.mark.repeat(every="5m")
def test_api_health_check():
    """Continuous health check"""
    response = requests.get("https://api.example.com/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.elapsed.total_seconds() < 0.5  # <500ms

@pytest.mark.monitor
@pytest.mark.repeat(every="15m")
def test_critical_user_journey():
    """Synthetic user journey"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Login
        page.goto("https://app.example.com/login")
        page.fill('[data-testid="email"]', 'monitor@example.com')
        page.fill('[data-testid="password"]', os.getenv('MONITOR_PASSWORD'))
        page.click('[data-testid="login-button"]')
        
        # Critical action
        page.wait_for_selector('[data-testid="dashboard"]')
        page.click('[data-testid="create-order"]')
        
        browser.close()
```

## Testability Standards (Organization-wide MANDATORY)

### 1. Dependency Injection Architecture

**Enforcement**: Architecture Decision Record (ADR) + code review automation

```python
# ✅ REQUIRED - All services use DI
from typing import Protocol
from dataclasses import dataclass

class IUserRepository(Protocol):
    def find_by_id(self, id: int) -> User | None: ...
    def create(self, user: User) -> User: ...
    def update(self, user: User) -> User: ...
    def delete(self, id: int) -> None: ...

class IEmailService(Protocol):
    def send(self, to: str, subject: str, body: str) -> bool: ...

class IPaymentGateway(Protocol):
    def charge(self, amount: Decimal, token: str) -> str: ...

@dataclass
class UserService:
    """Service with injected dependencies - STANDARD PATTERN"""
    user_repo: IUserRepository
    email_service: IEmailService
    logger: ILogger
    
    def register_user(self, email: str, password: str) -> User:
        # Validate
        if self.user_repo.find_by_email(email):
            raise UserExistsError(f"User {email} already exists")
        
        # Create
        user = User(email=email, hashed_password=hash_password(password))
        user = self.user_repo.create(user)
        
        # Notify
        self.email_service.send(email, "Welcome", "Thanks for signing up!")
        self.logger.info(f"User {user.id} registered", extra={"user_id": user.id})
        
        return user

# ❌ PROHIBITED - Direct imports, global state
from app.database import db  # FAIL code review
from app.email import send_email  # FAIL code review

class UserService:
    def register_user(self, email: str, password: str):
        user = db.query(User).filter_by(email=email).first()  # Tightly coupled
        send_email(email, "Welcome", "...")  # Can't mock
```

### 2. Interface-Driven Design Standard

**Enforcement**: Custom mypy plugin to enforce Protocol usage

```python
# ✅ REQUIRED - All repositories implement IRepository
from typing import Protocol, TypeVar, Generic
from abc import abstractmethod

T = TypeVar('T')

class IRepository(Protocol, Generic[T]):
    """Base repository interface"""
    @abstractmethod
    def find_by_id(self, id: int) -> T | None: ...
    
    @abstractmethod
    def find_all(self) -> list[T]: ...
    
    @abstractmethod
    def create(self, entity: T) -> T: ...
    
    @abstractmethod
    def update(self, entity: T) -> T: ...
    
    @abstractmethod
    def delete(self, id: int) -> None: ...

class UserRepository:
    """Concrete implementation"""
    def __init__(self, session: Session):
        self.session = session
    
    def find_by_id(self, id: int) -> User | None:
        return self.session.query(User).filter(User.id == id).first()
    
    # ... implement all methods

# In tests: Mock implementation
class MockUserRepository:
    def __init__(self):
        self.users: dict[int, User] = {}
    
    def find_by_id(self, id: int) -> User | None:
        return self.users.get(id)
    
    # ... implement all methods

# Type checking ensures compatibility
def process_user(repo: IRepository[User], user_id: int):
    user = repo.find_by_id(user_id)  # Works with any IRepository implementation
```

### 3. Mock-First Development Standard

**Enforcement**: pytest plugin to detect real network calls

```python
# pytest-block-network plugin (custom)
# conftest.py
import pytest
import socket

@pytest.fixture(autouse=True)
def block_network():
    """Block all real network calls in tests"""
    original_socket = socket.socket
    
    def guard(*args, **kwargs):
        raise RuntimeError(
            "Network call blocked! Use pytest-mock, respx, or responses to mock."
        )
    
    socket.socket = guard
    yield
    socket.socket = original_socket

# ✅ REQUIRED - All external calls mocked
import respx
import httpx

@pytest.mark.asyncio
@respx.mock
async def test_fetch_user_data():
    """Mock external API call"""
    route = respx.get("https://api.example.com/users/123").mock(
        return_value=httpx.Response(
            200,
            json={"id": 123, "name": "John Doe"}
        )
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/users/123")
    
    assert response.status_code == 200
    assert route.called

# For synchronous requests: use responses library
import responses

@responses.activate
def test_sync_api_call():
    """Mock synchronous API call"""
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"status": "ok"},
        status=200
    )
    
    response = requests.get("https://api.example.com/data")
    assert response.json() == {"status": "ok"}
```

### 4. Observability in Tests

**Requirement**: All services emit structured logs, metrics, traces

```python
# ✅ REQUIRED - Structured logging with context
import structlog
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

logger = structlog.get_logger()
tracer = trace.get_tracer(__name__)

class OrderService:
    def __init__(
        self,
        order_repo: IOrderRepository,
        payment_gateway: IPaymentGateway,
        metrics: IMetrics
    ):
        self.order_repo = order_repo
        self.payment_gateway = payment_gateway
        self.metrics = metrics
    
    def process_order(self, order: Order) -> ProcessResult:
        with tracer.start_as_current_span("process_order") as span:
            span.set_attribute("order.id", order.id)
            span.set_attribute("order.total", float(order.total))
            
            try:
                # Log with context
                logger.info(
                    "processing_order",
                    order_id=order.id,
                    total=float(order.total),
                    customer_id=order.customer_id
                )
                
                # Business logic
                charge_id = self.payment_gateway.charge(
                    order.total,
                    order.payment_token
                )
                
                # Record metric
                self.metrics.increment(
                    "orders.processed",
                    tags={"status": "success"}
                )
                self.metrics.histogram(
                    "orders.total",
                    float(order.total)
                )
                
                span.set_status(Status(StatusCode.OK))
                return ProcessResult(success=True, charge_id=charge_id)
            
            except Exception as e:
                logger.error(
                    "order_processing_failed",
                    order_id=order.id,
                    error=str(e),
                    exc_info=True
                )
                span.set_status(Status(StatusCode.ERROR))
                span.record_exception(e)
                raise

# Testing observability
def test_order_processing_emits_metrics(mocker):
    """Verify metrics are emitted"""
    mock_metrics = mocker.Mock(spec=IMetrics)
    service = OrderService(
        order_repo=MockOrderRepository(),
        payment_gateway=MockPaymentGateway(),
        metrics=mock_metrics
    )
    
    order = Order(id=1, total=Decimal("100.00"))
    service.process_order(order)
    
    # Verify metrics
    mock_metrics.increment.assert_called_with(
        "orders.processed",
        tags={"status": "success"}
    )
    mock_metrics.histogram.assert_called_with(
        "orders.total",
        100.0
    )

def test_order_processing_traces(mocker, tracer):
    """Verify distributed tracing"""
    with tracer.start_as_current_span("test") as parent_span:
        service = OrderService(...)
        service.process_order(order)
        
        # Verify span created
        spans = tracer.get_finished_spans()
        assert len(spans) == 1
        assert spans[0].name == "process_order"
        assert spans[0].attributes["order.id"] == 1
```

## Testing Architecture & Organization

### 1. Monorepo Structure

```text
enterprise-app/
├── services/                        # Microservices
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── domain/             # Domain models (DDD)
│   │   │   ├── application/        # Use cases
│   │   │   ├── infrastructure/     # Adapters (DB, API, etc.)
│   │   │   └── interfaces/         # API/CLI/Event handlers
│   │   └── tests/
│   │       ├── unit/               # 60% - Pure domain logic
│   │       ├── integration/        # 25% - Adapters + real DB
│   │       ├── e2e/               # 10% - Full service tests
│   │       ├── contracts/          # 5% - Provider contracts
│   │       ├── fixtures/           # Test data builders
│   │       └── conftest.py
│   ├── order-service/
│   └── payment-service/
├── shared/                          # Shared libraries
│   ├── testing-framework/          # Custom test utilities
│   ├── observability/              # Logging, tracing, metrics
│   └── contracts/                  # Pact contracts
├── platform/                        # Platform services
│   ├── api-gateway/
│   ├── message-broker/
│   └── service-mesh/
└── tests/                          # Cross-service tests
    ├── e2e/                        # Multi-service journeys
    ├── load/                       # Load testing
    ├── chaos/                      # Chaos engineering
    └── security/                   # Penetration tests
```

### 2. Domain-Driven Design with Testing

```python
# Domain layer - Pure business logic, 100% test coverage
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

class OrderStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

@dataclass
class Order:
    """Domain model - pure business logic"""
    id: int
    customer_id: int
    items: list[OrderItem]
    status: OrderStatus
    total: Decimal
    
    def add_item(self, item: OrderItem) -> None:
        """Add item to order"""
        if self.status != OrderStatus.PENDING:
            raise OrderNotModifiableError("Cannot modify non-pending order")
        
        self.items.append(item)
        self.total += item.subtotal
    
    def cancel(self) -> None:
        """Cancel order"""
        if self.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise OrderNotCancellableError("Cannot cancel shipped/delivered order")
        
        self.status = OrderStatus.CANCELLED
    
    def mark_as_paid(self, payment_id: str) -> None:
        """Mark order as paid"""
        if self.status != OrderStatus.PENDING:
            raise InvalidOrderStateError("Order must be pending")
        
        self.status = OrderStatus.PAID
        self.payment_id = payment_id

# Application layer - Use cases with DI
class PlaceOrderUseCase:
    """Application use case with injected dependencies"""
    
    def __init__(
        self,
        order_repo: IOrderRepository,
        payment_gateway: IPaymentGateway,
        event_bus: IEventBus,
        logger: ILogger
    ):
        self.order_repo = order_repo
        self.payment_gateway = payment_gateway
        self.event_bus = event_bus
        self.logger = logger
    
    def execute(self, command: PlaceOrderCommand) -> Order:
        """Execute place order use case"""
        # Create domain object
        order = Order(
            customer_id=command.customer_id,
            items=command.items,
            status=OrderStatus.PENDING,
            total=sum(item.subtotal for item in command.items)
        )
        
        # Validate business rules
        if order.total < Decimal("10.00"):
            raise MinimumOrderAmountError("Order must be at least $10")
        
        # Save to repository
        order = self.order_repo.create(order)
        
        # Process payment
        payment_id = self.payment_gateway.charge(
            amount=order.total,
            token=command.payment_token
        )
        order.mark_as_paid(payment_id)
        self.order_repo.update(order)
        
        # Publish event
        self.event_bus.publish(OrderPlacedEvent(order_id=order.id))
        
        self.logger.info("order_placed", order_id=order.id)
        return order

# Testing domain logic (no mocks needed)
class TestOrder:
    """Test pure domain logic"""
    
    def test_add_item_to_pending_order(self):
        """Can add item to pending order"""
        order = Order(
            id=1,
            customer_id=1,
            items=[],
            status=OrderStatus.PENDING,
            total=Decimal("0")
        )
        
        item = OrderItem(product_id=1, quantity=1, price=Decimal("10"))
        order.add_item(item)
        
        assert len(order.items) == 1
        assert order.total == Decimal("10")
    
    def test_cannot_add_item_to_paid_order(self):
        """Cannot add item to paid order"""
        order = Order(
            id=1,
            customer_id=1,
            items=[],
            status=OrderStatus.PAID,
            total=Decimal("0")
        )
        
        item = OrderItem(product_id=1, quantity=1, price=Decimal("10"))
        
        with pytest.raises(OrderNotModifiableError):
            order.add_item(item)

# Testing use case (with mocks)
class TestPlaceOrderUseCase:
    """Test application use case"""
    
    @pytest.fixture
    def use_case(self, mocker):
        """Create use case with mocked dependencies"""
        return PlaceOrderUseCase(
            order_repo=mocker.Mock(spec=IOrderRepository),
            payment_gateway=mocker.Mock(spec=IPaymentGateway),
            event_bus=mocker.Mock(spec=IEventBus),
            logger=mocker.Mock(spec=ILogger)
        )
    
    def test_place_order_success(self, use_case, mocker):
        """Successfully place order"""
        # Arrange
        command = PlaceOrderCommand(
            customer_id=1,
            items=[OrderItem(product_id=1, quantity=1, price=Decimal("50"))],
            payment_token="tok_123"
        )
        
        use_case.order_repo.create.return_value = Order(
            id=1,
            customer_id=1,
            items=command.items,
            status=OrderStatus.PENDING,
            total=Decimal("50")
        )
        use_case.payment_gateway.charge.return_value = "ch_123"
        
        # Act
        order = use_case.execute(command)
        
        # Assert
        assert order.status == OrderStatus.PAID
        use_case.payment_gateway.charge.assert_called_once()
        use_case.event_bus.publish.assert_called_once()
```

### 3. Advanced Testing Patterns

#### Contract Testing with Pact

```python
# Provider verification (order-service verifies contracts)
import pytest
from pact import Verifier

def test_provider_honors_contract():
    """Verify order-service honors contracts"""
    verifier = Verifier(
        provider='OrderService',
        provider_base_url='http://localhost:8000'
    )
    
    # Provider states
    @verifier.state('order 123 exists')
    def order_exists():
        """Setup: Create test order"""
        db.session.add(Order(id=123, status='pending'))
        db.session.commit()
    
    @verifier.state('order 456 does not exist')
    def order_not_exists():
        """Setup: Ensure order doesn't exist"""
        db.session.query(Order).filter_by(id=456).delete()
        db.session.commit()
    
    # Verify contracts
    output, logs = verifier.verify_with_broker(
        broker_url='https://pact-broker.example.com',
        publish_version='1.0.0',
        publish_verification_results=True
    )
    
    assert output == 0, "Contract verification failed"
```

#### Property-Based Testing

```python
from hypothesis import given, strategies as st, assume
from decimal import Decimal

@given(
    price=st.decimals(min_value=0, max_value=10000, places=2),
    quantity=st.integers(min_value=0, max_value=1000),
    discount=st.decimals(min_value=0, max_value=1, places=2)
)
def test_order_total_properties(price: Decimal, quantity: int, discount: Decimal):
    """Test order total calculation properties"""
    # Arrange
    item = OrderItem(product_id=1, price=price, quantity=quantity)
    order = Order(items=[item])
    
    # Act
    subtotal = order.calculate_subtotal()
    discount_amount = order.apply_discount(discount)
    total = order.calculate_total()
    
    # Assert properties
    assert subtotal >= 0, "Subtotal cannot be negative"
    assert discount_amount >= 0, "Discount cannot be negative"
    assert discount_amount <= subtotal, "Discount cannot exceed subtotal"
    assert total == subtotal - discount_amount, "Total = Subtotal - Discount"
    assert total >= 0, "Total cannot be negative"
```

#### Chaos Engineering Tests

```python
import chaos
from chaos.experiment import Experiment
from chaos.hypothesis import Hypothesis
from chaos.rollbacks import rollback

@pytest.mark.chaos
def test_service_resilience_under_network_delay():
    """Test service handles network delays gracefully"""
    # Define steady state
    steady_state = Hypothesis(
        title="Order API responds within 2s",
        probes=[
            {
                "type": "http",
                "url": "http://order-service/health",
                "timeout": 2.0,
                "expected_status": 200
            }
        ]
    )
    
    # Define experiment
    experiment = Experiment(
        title="Network delay tolerance",
        description="Verify service handles 500ms network delay",
        steady_state_hypothesis=steady_state,
        method=[
            {
                "type": "action",
                "name": "inject_network_delay",
                "provider": {
                    "type": "process",
                    "path": "tc",
                    "arguments": "qdisc add dev eth0 root netem delay 500ms"
                }
            }
        ],
        rollbacks=[
            {
                "type": "action",
                "name": "remove_network_delay",
                "provider": {
                    "type": "process",
                    "path": "tc",
                    "arguments": "qdisc del dev eth0 root"
                }
            }
        ]
    )
    
    # Run experiment
    result = chaos.run(experiment)
    assert result["steady_states"]["after"]["probes_succeeded"], \
        "Service did not maintain steady state under network delay"
```

## Advanced Monitoring & Observability

### 1. Distributed Tracing

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Setup tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Export to Jaeger/Tempo
otlp_exporter = OTLPSpanExporter(endpoint="http://tempo:4317")
span_processor = BatchSpanProcessor(otlp_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

class OrderService:
    @trace_decorator("process_order")
    def process_order(self, order: Order) -> ProcessResult:
        with tracer.start_as_current_span("validate_order") as span:
            span.set_attribute("order.id", order.id)
            span.set_attribute("order.total", float(order.total))
            self._validate_order(order)
        
        with tracer.start_as_current_span("charge_payment") as span:
            charge_id = self.payment_gateway.charge(order.total, order.token)
            span.set_attribute("charge.id", charge_id)
        
        return ProcessResult(success=True, charge_id=charge_id)

# Testing with tracing
def test_order_processing_creates_spans():
    """Verify distributed tracing spans"""
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    
    memory_exporter = InMemorySpanExporter()
    span_processor = BatchSpanProcessor(memory_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    service = OrderService(...)
    service.process_order(order)
    
    # Verify spans
    spans = memory_exporter.get_finished_spans()
    assert len(spans) == 3  # process_order, validate_order, charge_payment
    
    root_span = [s for s in spans if s.name == "process_order"][0]
    assert root_span.attributes["order.id"] == order.id
```

### 2. Metrics and SLOs

```python
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
order_counter = Counter(
    'orders_total',
    'Total number of orders',
    ['status']
)

order_processing_duration = Histogram(
    'order_processing_duration_seconds',
    'Order processing duration',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

class OrderService:
    def process_order(self, order: Order) -> ProcessResult:
        start_time = time.time()
        
        try:
            result = self._process_order_internal(order)
            order_counter.labels(status='success').inc()
            return result
        except Exception as e:
            order_counter.labels(status='error').inc()
            raise
        finally:
            duration = time.time() - start_time
            order_processing_duration.observe(duration)

# SLO testing
def test_order_processing_meets_slo():
    """Verify 99% of orders process in <2s"""
    results = []
    
    for _ in range(100):
        start = time.time()
        service.process_order(create_test_order())
        duration = time.time() - start
        results.append(duration)
    
    # Calculate p99
    results.sort()
    p99 = results[98]  # 99th percentile
    
    assert p99 < 2.0, f"P99 latency {p99}s exceeds SLO of 2s"
```

## Security & Compliance Testing

### 1. OWASP API Top 10

```python
# API1: Broken Object Level Authorization
def test_user_cannot_access_others_orders(client, auth_headers):
    """Test BOLA prevention"""
    # User 1 creates order
    response = client.post("/orders", json=order_data, headers=auth_headers_user1)
    order_id = response.json()["id"]
    
    # User 2 tries to access User 1's order
    response = client.get(f"/orders/{order_id}", headers=auth_headers_user2)
    assert response.status_code == 403

# API2: Broken Authentication
def test_jwt_token_expiration():
    """Test JWT tokens expire"""
    token = create_token(expires_in_seconds=1)
    time.sleep(2)
    
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401

# API3: Broken Object Property Level Authorization
def test_user_cannot_update_admin_fields(client, auth_headers):
    """Test users cannot update restricted fields"""
    response = client.patch(
        "/users/me",
        json={"name": "New Name", "is_admin": True},  # Try to make self admin
        headers=auth_headers
    )
    
    assert response.status_code == 200
    user = response.json()
    assert user["name"] == "New Name"
    assert user["is_admin"] is False  # Should not be updated

# API4: Unrestricted Resource Consumption
def test_rate_limiting():
    """Test rate limiting prevents abuse"""
    responses = []
    
    for _ in range(101):
        responses.append(client.get("/api/data"))
    
    # First 100 should succeed
    assert all(r.status_code == 200 for r in responses[:100])
    
    # 101st should be rate limited
    assert responses[100].status_code == 429

# API8: Security Misconfiguration
def test_security_headers():
    """Test security headers are set"""
    response = client.get("/")
    
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"
    
    assert "Strict-Transport-Security" in response.headers
```

### 2. GDPR Compliance Testing

```python
# Right to be forgotten
def test_gdpr_right_to_be_forgotten(client, auth_headers, db_session):
    """Test user data can be completely deleted"""
    user_id = auth_headers["user_id"]
    
    # User requests deletion
    response = client.delete("/users/me/gdpr-delete", headers=auth_headers)
    assert response.status_code == 204
    
    # Verify all user data deleted
    assert db_session.query(User).filter_by(id=user_id).first() is None
    assert db_session.query(Order).filter_by(customer_id=user_id).count() == 0
    assert db_session.query(Address).filter_by(user_id=user_id).count() == 0

# Data portability
def test_gdpr_data_export(client, auth_headers):
    """Test user can export their data"""
    response = client.get("/users/me/export", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/json"
    
    data = response.json()
    assert "personal_info" in data
    assert "orders" in data
    assert "addresses" in data
```

## Performance & Load Testing

### 1. Performance Benchmarks

```python
import pytest

@pytest.mark.benchmark
def test_order_processing_performance(benchmark):
    """Benchmark order processing"""
    result = benchmark(service.process_order, test_order)
    
    # Assert performance SLO
    assert result < 0.5  # <500ms

@pytest.mark.benchmark(group="database")
def test_user_repository_find_by_email(benchmark, db_session):
    """Benchmark database queries"""
    repo = UserRepository(db_session)
    
    result = benchmark(repo.find_by_email, "test@example.com")
    
    # Assert query performance
    assert result < 0.05  # <50ms
```

### 2. Load Testing

```python
# locustfile.py - Enterprise load testing
from locust import HttpUser, task, between, events
import json

class EnterpriseAPIUser(HttpUser):
    wait_time = between(0.5, 2)
    
    def on_start(self):
        """Authenticate before starting"""
        response = self.client.post("/auth/login", json={
            "email": f"loadtest-{self._greenlet.gr_frame.f_locals['_user_id']}@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(10)
    def get_orders(self):
        """Frequent: Get user orders"""
        self.client.get("/orders", headers=self.headers)
    
    @task(5)
    def get_order_detail(self):
        """Medium: Get order details"""
        self.client.get("/orders/123", headers=self.headers)
    
    @task(2)
    def create_order(self):
        """Rare: Create new order"""
        self.client.post("/orders", json={
            "items": [{"product_id": 1, "quantity": 1}]
        }, headers=self.headers)
    
    @task(1)
    def update_profile(self):
        """Rare: Update user profile"""
        self.client.patch("/users/me", json={
            "name": "Load Test User"
        }, headers=self.headers)

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Setup before load test"""
    print("Starting load test...")
    # Create test data
    create_test_users(count=1000)

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Cleanup after load test"""
    print("Load test completed!")
    # Cleanup test data
    delete_test_users()

# Run with:
# locust -f locustfile.py --headless -u 10000 -r 100 --run-time 30m --host=https://api.example.com
```

## Tools & Infrastructure

```txt
# requirements-enterprise.txt

# Core Testing
pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1
pytest-mock==3.12.0
pytest-xdist==3.5.0
pytest-benchmark==4.0.0
pytest-timeout==2.2.0

# HTTP Mocking
respx==0.20.2
responses==0.24.1
httpx==0.25.1

# Test Data
faker==20.0.0
factory-boy==3.3.0
freezegun==1.3.1

# Advanced Testing
hypothesis==6.92.1          # Property-based
mutmut==2.4.4              # Mutation testing
locust==2.17.0             # Load testing
pact-python==2.1.1         # Contract testing

# Security
bandit==1.7.5              # Security linting
safety==3.0.1              # Dependency security
semgrep==1.45.0            # SAST

# Quality
ruff==0.1.6                # Linting
black==23.11.0             # Formatting
mypy==1.7.1                # Type checking
pylint==3.0.2              # Code quality

# Observability
opentelemetry-api==1.21.0
opentelemetry-sdk==1.21.0
opentelemetry-instrumentation-fastapi==0.42b0
structlog==23.2.0
prometheus-client==0.19.0

# Chaos Engineering
chaostoolkit==1.16.0
chaostoolkit-kubernetes==0.30.0

# Database
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9

# Reporting
pytest-html==4.1.1
allure-pytest==2.13.2
```

## ROI & Business Impact

**Investment** (First 6 months):
- Time: 200-300 hours setup + infrastructure
- Personnel: 2-3 dedicated QE engineers
- Infrastructure: CI/CD, monitoring, observability stack
- Training: Team education on patterns and tools

**Return** (Annual):
- **90% reduction in production incidents**: $500K-$1M saved in incident response
- **50% reduction in mean time to recovery (MTTR)**: From 4h to 2h
- **80% faster feature delivery**: Ship with confidence, no manual QA bottleneck
- **Compliance audit pass**: First-time SOC2/HIPAA compliance
- **Customer trust**: 99.9% uptime SLA maintained
- **Engineer satisfaction**: 40% reduction in on-call incidents

**Net ROI**: 5-10x return on investment within first year

## Conclusion

Enterprise testing is not just about catching bugs—it's about building a culture of quality, enabling teams to move fast with confidence, and ensuring business continuity at scale.

**Key Success Factors**:
1. Executive sponsorship and investment
2. Platform engineering team for shared infrastructure
3. Clear ownership and accountability (RACI matrix)
4. Automated quality gates at every level
5. Continuous improvement and measurement
