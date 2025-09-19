"""Global test configuration and fixtures for backend tests."""
import os
import pytest
import json
from pathlib import Path
from typing import Dict, Any, Optional
from unittest.mock import Mock, patch

try:
    from freezegun import freeze_time as _freeze
except ImportError:  # pragma: no cover
    _freeze = None

# Test constants
CANONICAL_SNAPSHOT_ROUNDS = 36  # Used for snapshot tests only, not production
TEST_MODE = "1"

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set global test environment variables."""
    os.environ["TEST_MODE"] = TEST_MODE
    yield
    # Cleanup if needed

@pytest.fixture
def freeze_jan_1_2025():
    """Fixture for freezing time to 2025-01-01 for deterministic tests."""
    if _freeze is None:
        pytest.skip('freezegun missing')
    with _freeze('2025-01-01T00:00:00Z'):
        yield

@pytest.fixture
def settings_override():
    """Override settings for testing."""
    test_settings = {
        "supabase_url": "https://test.supabase.co",
        "supabase_publishable_key": "test_publishable_key",
        "supabase_secret_key": "test_secret_key",
        "otp_secret_key": "test-secret-key",
        "otp_validity_minutes": 5,
        "otp_max_attempts": 6,  # Updated to match SSD §7.1 requirement  
        "otp_resend_limit_per_15min": 3,
        "cors_origins": ["http://localhost:5173"]
    }
    
    with patch('config.settings.settings') as mock_settings:
        for key, value in test_settings.items():
            setattr(mock_settings, key, value)
        yield mock_settings

@pytest.fixture
def fake_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = Mock()
    
    # Mock table responses
    mock_table = Mock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.execute.return_value = Mock(data=[])
    
    mock_client.table.return_value = mock_table
    return mock_client

@pytest.fixture
def jwks_keys():
    """Load JWKS keys from fixture file."""
    fixture_path = Path(__file__).parent / "fixtures" / "jwks.json"
    if not fixture_path.exists():
        # Return minimal test JWKS if file doesn't exist
        return {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "test-key-id",
                    "use": "sig",
                    "alg": "RS256",
                    "n": "test-n-value",
                    "e": "AQAB"
                }
            ]
        }
    
    with open(fixture_path) as f:
        return json.load(f)

@pytest.fixture
def jwks_keys_rotated(jwks_keys):
    """Variant fixture that rotates JWKS key order for testing robust selection logic."""
    keys = jwks_keys.get("keys", [])
    if len(keys) > 1:
        # Rotate the order
        rotated_keys = keys[1:] + keys[:1]
        return {"keys": rotated_keys}
    return jwks_keys

@pytest.fixture
def simulation_service_factory():
    """Factory fixture for creating FinancialSimulationService instances."""
    from simulation_service import FinancialSimulationService
    
    def _create_service(plan_id: str, overrides: Optional[Dict[str, Any]] = None):
        """Create a FinancialSimulationService instance with optional parameter overrides."""
        scheduled_payment = None
        sales_achievement_rates = None
        
        if overrides:
            scheduled_payment = overrides.get('scheduled_payment')
            sales_achievement_rates = overrides.get('sales_achievement_rates')
        
        return FinancialSimulationService(
            plan_id=plan_id,
            scheduled_payment=scheduled_payment,
            sales_achievement_rates=sales_achievement_rates
        )
    
    return _create_service

@pytest.fixture(params=["A", "B", "C", "D", "K", "P", "R", "F", "E"])
def plan_parameters(request):
    """Parametrize across plan IDs for comprehensive testing."""
    return request.param

# Determinism guard - patch random sources to ensure no RNG usage in simulation
@pytest.fixture
def determinism_guard():
    """Patch random sources to detect any unintended randomness in tests."""
    def _raise_if_called(*args, **kwargs):
        raise AssertionError("Random function called during simulation - determinism violated!")
    
    patches = [
        patch('random.random', side_effect=_raise_if_called),
        patch('random.randint', side_effect=_raise_if_called),
        patch('random.choice', side_effect=_raise_if_called),
        patch('random.uniform', side_effect=_raise_if_called),
    ]
    
    # Apply all patches
    for p in patches:
        p.start()
    
    yield
    
    # Stop all patches
    for p in patches:
        p.stop()

# Mock network access to prevent outbound calls during tests
@pytest.fixture(autouse=True)
def mock_network_access():
    """Prevent network calls during tests by patching socket creation."""
    import socket
    original_socket = socket.socket
    
    def mock_socket(*args, **kwargs):
        raise AssertionError("Network call attempted during unit tests! Use mocks instead.")
    
    with patch('socket.socket', side_effect=mock_socket):
        yield

@pytest.fixture
def build_error_helper():
    """Helper for testing structured error envelope builder."""
    def _build_error(code: str, message: str, details: Optional[Dict[str, Any]] = None):
        """Build standard error response structure."""
        error = {
            "success": False,
            "code": code,
            "message": message
        }
        if details:
            error["details"] = details
        return error
    
    return _build_error
