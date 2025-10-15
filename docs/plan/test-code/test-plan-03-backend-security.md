# Test Plan – Backend Security Tests (Concrete v1.0)

This covers security-focused unit tests for cryptographic functions, input sanitization, and security constants validation. These tests ensure that security-critical code paths work correctly in isolation.

Target: Security-related unit tests in `src/backend/tests/unit/security/test_cryptography.py` with focus on cryptographic integrity, token security, and input validation.

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Cryptographic function correctness (OTP HMAC, phone hashing)
* JWT token validation and security
* Input sanitization and validation
* Security constants verification
* Hash function determinism and collision resistance

**Out of Scope:**
* End-to-end security workflows (covered in integration tests)
* Network-level security (SSL/TLS)
* Database security policies (RLS)
* Rate limiting logic (covered in unit OTP tests)

**Test Philosophy:**
* Pure unit tests with no external dependencies
* Focus on cryptographic correctness and determinism
* Validate security assumptions and invariants
* Test negative cases and edge conditions

--------------------------------------------------------------------------------
2. Test Category Matrix
--------------------------------------------------------------------------------

2.1 Cryptographic Functions (CAT-CRYPTO)
* Why: Ensure cryptographic operations are correct and deterministic
* Targets: `services/otp/utils.py` - hash_otp, verify_otp_hash functions
* Cases:
    - CRYPTO-001: OTP HMAC generation is deterministic
    - CRYPTO-002: OTP HMAC validation with correct code returns True
    - CRYPTO-003: OTP HMAC validation with incorrect code returns False
    - CRYPTO-004: OTP HMAC is sensitive to phone number changes
    - CRYPTO-005: Phone number hashing uses SHA256 correctly
    - CRYPTO-006: Phone normalization consistency across hashing operations
    - CRYPTO-007: Hash output length and format validation (64 hex chars for SHA256)

2.2 JWT Security Functions (CAT-JWT-SEC)
* Why: Validate JWT token structure and security properties
* Targets: `auth/jwt.py` - JWT validation and JWKS handling
* Cases:
    - JWT-SEC-001: JWT token structure validation (header.payload.signature)
    - JWT-SEC-002: JWT expiration time validation
    - JWT-SEC-003: JWT audience claim validation
    - JWT-SEC-004: JWT issuer claim validation
    - JWT-SEC-005: Missing or malformed JWT headers rejected
    - JWT-SEC-006: Invalid JWT signatures detected
    - JWT-SEC-007: JWT replay attack prevention (jti claim checking)
    - JWT-SEC-008: Algorithm confusion attack prevention (only RS256 allowed)

2.3 Input Sanitization (CAT-SANITIZE)
* Why: Ensure user inputs are properly validated and sanitized
* Targets: Input validation logic across services
* Cases:
    - SAN-SEC-001: SQL injection patterns detected and rejected
    - SAN-SEC-002: XSS payloads in text fields sanitized
    - SAN-SEC-003: Path traversal attempts blocked
    - SAN-SEC-004: Special characters in phone numbers handled correctly
    - SAN-SEC-005: Unicode normalization for security-sensitive inputs
    - SAN-SEC-006: Email address format validation
    - SAN-SEC-007: UUID format validation
    - SAN-SEC-008: Numeric input boundary validation

2.4 Security Constants (CAT-SEC-CONST)
* Why: Validate security configuration and constants
* Targets: Security-related constants and configuration
* Cases:
    - CONST-SEC-001: OTP length meets minimum security requirements (≥6 digits)
    - CONST-SEC-002: OTP validity duration is reasonable (not too long)
    - CONST-SEC-003: JWT timeout values are appropriate
    - CONST-SEC-004: Password/secret minimum length requirements
    - CONST-SEC-005: Rate limit values are security-appropriate
    - CONST-SEC-006: Hash algorithm constants are current best practices

2.5 Phone Number Security (CAT-PHONE-SEC)
* Why: Ensure phone number handling doesn't leak information
* Targets: `services/otp/utils.py` - normalize_phone, phone hashing
* Cases:
    - PHONE-SEC-001: Phone hashing is one-way (original not recoverable)
    - PHONE-SEC-002: Same phone always produces same hash
    - PHONE-SEC-003: Similar phones produce different hashes
    - PHONE-SEC-004: Phone normalization removes formatting consistently
    - PHONE-SEC-005: Invalid phone formats rejected safely
    - PHONE-SEC-006: International format handling security

--------------------------------------------------------------------------------
3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

3.1 Security Test Fixtures
```python
import pytest
from datetime import datetime, timedelta

@pytest.fixture
def valid_phone_numbers():
    """Valid phone numbers for testing"""
    return [
        "010-1234-5678",
        "01012345678",
        "+821012345678",
        "010 1234 5678"
    ]

@pytest.fixture
def invalid_phone_numbers():
    """Invalid phone numbers for security testing"""
    return [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
        "' OR '1'='1",
        "%00",
        "\x00\x00\x00"
    ]

@pytest.fixture
def xss_payloads():
    """Common XSS attack payloads"""
    return [
        "<script>alert('xss')</script>",
        '"><script>alert("xss")</script>',
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>"
    ]

@pytest.fixture
def sql_injection_payloads():
    """Common SQL injection attack patterns"""
    return [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "1' AND '1'='1"
    ]
```

3.2 Mock Security Context
```python
@pytest.fixture
def mock_jwt_token():
    """Mock JWT token structure"""
    import base64
    import json
    
    header = {"alg": "RS256", "typ": "JWT", "kid": "test-key-id"}
    payload = {
        "sub": "test-user-123",
        "aud": "authenticated",
        "exp": int(datetime.utcnow().timestamp()) + 3600,
        "iat": int(datetime.utcnow().timestamp()),
        "jti": "unique-token-id"
    }
    
    # Create mock token structure (not cryptographically valid)
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode()
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    
    return f"{header_b64}.{payload_b64}.mock-signature"

@pytest.fixture
def expired_jwt_token():
    """Mock expired JWT token"""
    import base64
    import json
    
    payload = {
        "sub": "test-user-123",
        "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
        "iat": int((datetime.utcnow() - timedelta(hours=2)).timestamp())
    }
    
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    return f"header.{payload_b64}.signature"
```

--------------------------------------------------------------------------------
4. Representative Test Snippets
--------------------------------------------------------------------------------

4.1 CRYPTO-001: OTP HMAC Determinism
```python
def test_otp_hmac_generation_deterministic():
    """Test that OTP HMAC generation is deterministic."""
    phone = "01012345678"
    code = "123456" 
    
    # Same inputs should produce same hash
    hash1 = hash_otp(phone, code)
    hash2 = hash_otp(phone, code)
    
    assert hash1 == hash2
    assert isinstance(hash1, str)
    assert len(hash1) > 0
```

4.2 JWT-SEC-008: Algorithm Confusion Prevention
```python
def test_jwt_algorithm_confusion_prevention():
    """Test that only RS256 algorithm is accepted"""
    import jwt
    
    # Mock JWT with HS256 algorithm (should be rejected)
    malicious_token = jwt.encode(
        {"sub": "attacker"},
        "secret",
        algorithm="HS256",
        headers={"alg": "HS256", "kid": "test-key"}
    )
    
    # Should reject non-RS256 algorithms
    with pytest.raises(HTTPException) as exc_info:
        authenticate_jwt_token(
            HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=malicious_token
            )
        )
    
    assert exc_info.value.status_code == 401
    assert "algorithm" in str(exc_info.value.detail).lower()
```

4.3 SAN-SEC-001: SQL Injection Prevention
```python
def test_sql_injection_patterns_detected(sql_injection_payloads):
    """Test that SQL injection patterns are detected and rejected"""
    from services.otp.utils import normalize_phone
    
    for payload in sql_injection_payloads:
        # Normalization should handle malicious input safely
        # Should either raise exception or sanitize completely
        try:
            result = normalize_phone(payload)
            # If it doesn't raise, result should not contain SQL keywords
            assert "DROP" not in result.upper()
            assert "SELECT" not in result.upper()
            assert "UNION" not in result.upper()
        except (ValueError, TypeError):
            # Raising exception is acceptable for invalid input
            pass
```

4.4 PHONE-SEC-001: Phone Hash One-Way Property
```python
def test_phone_hashing_is_one_way():
    """Test that phone number hashing is one-way (original not recoverable)"""
    import hashlib
    
    name = "테스트사용자"
    phone = "010-1234-5678"
    
    # Normalize phone (remove hyphens)
    normalized = phone.replace('-', '')
    combined = f"{name}-{normalized}"
    
    # Generate hash
    hash_value = hashlib.sha256(combined.encode('utf-8')).hexdigest()
    
    # Verify properties
    assert len(hash_value) == 64  # SHA256 produces 64 hex chars
    assert isinstance(hash_value, str)
    assert phone not in hash_value  # Original phone not in hash
    assert name not in hash_value   # Original name not in hash
    assert normalized not in hash_value  # Even normalized phone not in hash
    
    # Verify it's hexadecimal
    int(hash_value, 16)  # Should not raise exception
```

--------------------------------------------------------------------------------
5. Test Execution
--------------------------------------------------------------------------------

**Location**: `src/backend/tests/unit/security/test_cryptography.py`

**Run Command**:
```bash
# Run all security unit tests
python -m pytest tests/unit/security/test_cryptography.py -v

# Run specific category
python -m pytest tests/unit/security/test_cryptography.py::TestCryptographicFunctions -v
python -m pytest tests/unit/security/test_cryptography.py::TestJWTSecurityFunctions -v
```

**VS Code Debug**: Use launch configuration "Security Test: Backend"

--------------------------------------------------------------------------------
6. Coverage Requirements
--------------------------------------------------------------------------------

* **Target Coverage**: ≥90% for security-critical functions
* **Critical Paths**: 100% coverage for cryptographic operations
* **Branch Coverage**: All security validation branches must be tested

--------------------------------------------------------------------------------
7. Test Data & Test Cases Summary
--------------------------------------------------------------------------------

| Category | Test Cases | Priority | Dependencies |
|----------|-----------|----------|--------------|
| CRYPTO | 7 | Critical | None |
| JWT-SEC | 8 | Critical | jwt library |
| SANITIZE | 8 | High | None |
| SEC-CONST | 6 | Medium | settings |
| PHONE-SEC | 6 | High | hashlib |

**Total: 35 test cases**

--------------------------------------------------------------------------------
8. Security Testing Principles
--------------------------------------------------------------------------------

1. **Determinism**: Cryptographic operations must be deterministic for same inputs
2. **Collision Resistance**: Different inputs must produce different hashes
3. **One-Way Property**: Hashes must not reveal original input
4. **Input Validation**: All user inputs must be validated before processing
5. **Algorithm Security**: Only approved cryptographic algorithms allowed
6. **Constant Time**: Security-sensitive comparisons should be constant-time
7. **Defense in Depth**: Multiple layers of security validation

--------------------------------------------------------------------------------
9. Maintenance Notes
--------------------------------------------------------------------------------

* Update test cases when cryptographic algorithms change
* Review security constants quarterly
* Add new attack patterns as they emerge
* Keep XSS and SQL injection payloads updated
* Document any security exceptions or deviations
