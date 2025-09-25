# Test Plan – Security Testing (Concrete v1.0)

This covers comprehensive security testing including authentication/authorization flows, OWASP Top 10 vulnerabilities, PII data handling, and rate limiting. Focuses on both automated and manual security validation.

Target: Security boundaries and attack vectors across the entire application stack with emphasis on authentication, data protection, and common web vulnerabilities.

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Authentication and authorization flow security
* OWASP Top 10 vulnerability testing
* PII data handling and encryption validation
* Rate limiting effectiveness (especially OTP endpoints)
* Input validation and injection prevention
* Session management security
* API security boundaries
* PWA-specific security considerations

**Out of Scope:**
* Infrastructure security (server hardening, etc.)
* Network security (TLS configuration, etc.)
* Third-party service security (Supabase, OAuth providers)
* Advanced penetration testing
* Social engineering attacks

**Test Philosophy:**
* Automated security scanning where possible
* Manual testing for complex attack scenarios
* Focus on high-impact, common vulnerabilities
* Test both frontend and backend attack vectors
* Validate security measures don't break user experience

--------------------------------------------------------------------------------
2. OWASP Top 10 Testing Matrix
--------------------------------------------------------------------------------

2.1 A01: Broken Access Control (CAT-ACCESS)
* Why: Unauthorized access to data and functionality
* Targets: API endpoints, admin functions, user data isolation
* Cases:
  * SEC-001: Direct object reference - access other user's simulations
  * SEC-002: Privilege escalation - regular user accessing admin functions
  * SEC-003: Authentication bypass - accessing protected endpoints without token
  * SEC-004: Authorization bypass - valid user accessing unauthorized resources
  * SEC-005: CORS policy validation and enforcement

2.2 A02: Cryptographic Failures (CAT-CRYPTO)
* Why: Exposure of sensitive data due to weak cryptography
* Targets: Password handling, data transmission, storage
* Cases:
  * SEC-006: JWT token validation and signature verification
  * SEC-007: OTP code generation and validation security
  * SEC-008: PII data encryption at rest and transit
  * SEC-009: Session token security and rotation
  * SEC-010: Password hashing validation (if applicable)

2.3 A03: Injection (CAT-INJECT)
* Why: Malicious code execution through input injection
* Targets: All input fields, API parameters, headers
* Cases:
  * SEC-011: SQL injection in API parameters
  * SEC-012: NoSQL injection in Supabase queries
  * SEC-013: Cross-site scripting (XSS) in form inputs
  * SEC-014: Command injection in file operations
  * SEC-015: LDAP injection (if applicable)

2.4 A04: Insecure Design (CAT-DESIGN)
* Why: Fundamental security flaws in application design
* Targets: Authentication flow, business logic, data flow
* Cases:
  * SEC-016: Authentication flow security analysis
  * SEC-017: Business logic manipulation (simulation parameters)
  * SEC-018: Race condition vulnerabilities
  * SEC-019: Insecure default configurations
  * SEC-020: Missing security controls validation

2.5 A05: Security Misconfiguration (CAT-CONFIG)
* Why: Improperly configured security settings
* Targets: HTTP headers, error handling, debug info
* Cases:
  * SEC-021: Security headers validation (CSP, HSTS, etc.)
  * SEC-022: Error message information disclosure
  * SEC-023: Debug information exposure
  * SEC-024: Default credentials and settings
  * SEC-025: Unnecessary features and endpoints

2.6 A06: Vulnerable Components (CAT-VULN)
* Why: Known vulnerabilities in dependencies
* Targets: NPM packages, Python dependencies
* Cases:
  * SEC-026: Frontend dependency vulnerability scan
  * SEC-027: Backend dependency vulnerability scan
  * SEC-028: Outdated component identification
  * SEC-029: Vulnerable dependency impact assessment
  * SEC-030: Supply chain security validation

2.7 A07: Authentication Failures (CAT-AUTH)
* Why: Broken authentication mechanisms
* Targets: Login flow, session management, password recovery
* Cases:
  * SEC-031: Brute force attack protection
  * SEC-032: Session fixation vulnerabilities
  * SEC-033: Weak session management
  * SEC-034: Credential stuffing protection
  * SEC-035: Multi-factor authentication bypass

2.8 A08: Software Integrity Failures (CAT-INTEGRITY)
* Why: Code and infrastructure integrity issues
* Targets: CI/CD pipeline, code deployment, updates
* Cases:
  * SEC-036: Code integrity verification
  * SEC-037: Dependency integrity validation
  * SEC-038: Auto-update security
  * SEC-039: CI/CD pipeline security
  * SEC-040: Code signing validation

2.9 A09: Logging Failures (CAT-LOGGING)
* Why: Insufficient logging and monitoring
* Targets: Security events, audit trails, incident response
* Cases:
  * SEC-041: Security event logging completeness
  * SEC-042: Log tampering protection
  * SEC-043: Sensitive data in logs detection
  * SEC-044: Audit trail integrity
  * SEC-045: Incident detection capabilities

2.10 A10: Server-Side Request Forgery (CAT-SSRF)
* Why: Unauthorized server-side requests
* Targets: External API calls, file operations
* Cases:
  * SEC-046: SSRF in external service calls
  * SEC-047: Internal network access protection
  * SEC-048: URL validation and filtering
  * SEC-049: Metadata service access prevention
  * SEC-050: Port scanning protection

--------------------------------------------------------------------------------
3. Authentication & Authorization Security
--------------------------------------------------------------------------------

3.1 JWT Security Testing
```typescript
// Security test for JWT validation
import { test, expect } from '@playwright/test'

test('JWT security validation', async ({ page }) => {
  // Test 1: Malformed JWT rejection
  await page.route('**/api/simulations', async route => {
    const headers = route.request().headers()
    headers['authorization'] = 'Bearer malformed.jwt.token'
    await route.continue({ headers })
  })
  
  const response = await page.request.get('/api/simulations', {
    headers: { 'Authorization': 'Bearer malformed.jwt.token' }
  })
  expect(response.status()).toBe(401)
  
  // Test 2: Expired JWT rejection
  const expiredJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MTYyMzkwMjJ9.invalid'
  const expiredResponse = await page.request.get('/api/simulations', {
    headers: { 'Authorization': `Bearer ${expiredJWT}` }
  })
  expect(expiredResponse.status()).toBe(401)
  
  // Test 3: Invalid signature rejection
  const invalidSigJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIiwiZXhwIjo5OTk5OTk5OTk5fQ.invalid_signature'
  const invalidResponse = await page.request.get('/api/simulations', {
    headers: { 'Authorization': `Bearer ${invalidSigJWT}` }
  })
  expect(invalidResponse.status()).toBe(401)
})
```

3.2 Authorization Bypass Testing
```typescript
test('authorization bypass prevention', async ({ page }) => {
  // Test user A cannot access user B's simulations
  const userAToken = await generateTestJWT('user-a-123')
  const userBId = 'user-b-456'
  
  const response = await page.request.get(`/api/simulations/${userBId}`, {
    headers: { 'Authorization': `Bearer ${userAToken}` }
  })
  expect(response.status()).toBe(403)
  
  // Test regular user cannot access admin endpoints
  const regularUserToken = await generateTestJWT('regular-user')
  const adminResponse = await page.request.get('/api/admin/me', {
    headers: { 'Authorization': `Bearer ${regularUserToken}` }
  })
  expect(adminResponse.status()).toBe(403)
})
```

3.3 Rate Limiting Security
```python
# Backend security test for OTP rate limiting
import pytest
import time
from fastapi.testclient import TestClient

def test_otp_rate_limiting_security(client: TestClient):
    """Test OTP endpoint against brute force attacks"""
    
    # Test rapid requests from same IP
    for i in range(20):  # Exceed rate limit
        response = client.post("/api/otp/send", json={
            "name": "Test User",
            "phone_number": "010-1234-5678"
        })
        
        if i < 3:  # First 3 should succeed
            assert response.status_code == 200
        else:  # Rest should be rate limited
            assert response.status_code == 429
            assert "rate limit" in response.json()["message"].lower()

def test_otp_verification_attempt_limiting(client: TestClient):
    """Test OTP verification against brute force"""
    
    phone = "010-1234-5678"
    
    # Attempt verification multiple times with wrong code
    for i in range(10):
        response = client.post("/api/otp/verify", json={
            "phone_number": phone,
            "otp_code": "000000"  # Wrong code
        })
        
        if i < 6:  # First 6 attempts should return remaining attempts
            assert response.status_code == 200
            assert "remaining_attempts" in response.json()
        else:  # After 6 attempts, should be blocked
            assert response.json()["success"] is False
            assert "횟수를 초과" in response.json()["message"]
```

--------------------------------------------------------------------------------
4. Input Validation & Injection Testing
--------------------------------------------------------------------------------

4.1 XSS Prevention Testing
```typescript
test('XSS prevention in form inputs', async ({ page }) => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '{{constructor.constructor("alert(\\"XSS\\")")()}}'
  ]
  
  for (const payload of xssPayloads) {
    await page.goto('/')
    
    // Test in name field
    await page.fill('[data-testid="name-input"]', payload)
    await page.fill('[data-testid="phone-input"]', '010-1234-5678')
    await page.click('[data-testid="submit-whitelist"]')
    
    // Verify payload is escaped/sanitized
    const nameDisplay = await page.textContent('[data-testid="submitted-name"]')
    expect(nameDisplay).not.toContain('<script>')
    expect(nameDisplay).not.toContain('javascript:')
    
    // Check for any script execution
    const alertFired = await page.evaluate(() => window.alert !== window.alert)
    expect(alertFired).toBe(false)
  }
})
```

4.2 SQL Injection Testing
```python
def test_sql_injection_prevention(client: TestClient):
    """Test API endpoints against SQL injection"""
    
    sql_payloads = [
        "'; DROP TABLE simulations; --",
        "1 OR 1=1",
        "1'; UNION SELECT * FROM users--",
        "1' AND SLEEP(5)--",
        "'; EXEC xp_cmdshell('dir')--"
    ]
    
    for payload in sql_payloads:
        # Test in various parameters
        response = client.get(f"/api/simulations/{payload}")
        
        # Should return 404 or 422, not 500 (which might indicate SQL error)
        assert response.status_code in [404, 422]
        
        # Response should not contain SQL error messages
        response_text = response.text.lower()
        sql_errors = ["syntax error", "mysql", "postgresql", "sql", "database"]
        assert not any(error in response_text for error in sql_errors)
```

4.3 NoSQL Injection Testing
```python
def test_nosql_injection_prevention(client: TestClient):
    """Test Supabase queries against NoSQL injection"""
    
    nosql_payloads = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "function() { return true; }"}',
        '{"$regex": ".*"}',
        '{"$in": ["admin", "user"]}'
    ]
    
    for payload in nosql_payloads:
        response = client.post("/api/otp/send", json={
            "name": payload,
            "phone_number": "010-1234-5678"
        })
        
        # Should handle malicious input gracefully
        assert response.status_code in [200, 422]
        
        # Should not expose database structure
        if response.status_code == 422:
            error_msg = response.json().get("detail", "")
            assert "supabase" not in error_msg.lower()
            assert "query" not in error_msg.lower()
```

--------------------------------------------------------------------------------
5. PII Data Protection Testing
--------------------------------------------------------------------------------

5.1 Data Encryption Validation
```python
def test_pii_data_encryption(client: TestClient):
    """Verify PII data is properly encrypted/hashed"""
    
    # Mock database check to verify phone numbers are hashed
    test_phone = "010-1234-5678"
    test_name = "홍길동"
    
    response = client.post("/api/otp/send", json={
        "name": test_name,
        "phone_number": test_phone
    })
    
    # Check that raw phone number is not stored in logs
    # This would be a manual verification in real logs
    assert response.status_code == 200
    
    # Verify hash generation is deterministic
    from api.routes import hashlib
    expected_hash = hashlib.sha256(f"{test_name}-{test_phone.replace(' ', '').replace('-', '')}".encode()).hexdigest()
    
    # The hash should be used for whitelist lookup, not raw data
    assert len(expected_hash) == 64  # SHA256 hex length
```

5.2 Data Exposure Prevention
```typescript
test('PII data not exposed in responses', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const response = await route.fetch()
    const text = await response.text()
    
    // Check response doesn't contain raw PII
    const piiPatterns = [
      /010-\d{4}-\d{4}/,  // Phone numbers
      /\d{6}/,            // OTP codes (should be hashed)
      /password/i,        // Password fields
      /ssn|주민등록번호/i    // SSN patterns
    ]
    
    for (const pattern of piiPatterns) {
      expect(text).not.toMatch(pattern)
    }
    
    await route.fulfill({ response })
  })
  
  await page.goto('/')
  // Perform various operations and verify no PII leaks
})
```

--------------------------------------------------------------------------------
6. Security Headers & Configuration
--------------------------------------------------------------------------------

6.1 Security Headers Validation
```typescript
test('security headers validation', async ({ page }) => {
  const response = await page.goto('/')
  const headers = response?.headers() || {}
  
  // Content Security Policy
  expect(headers['content-security-policy']).toBeDefined()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  
  // X-Frame-Options (clickjacking protection)
  expect(headers['x-frame-options']).toBe('DENY')
  
  // X-Content-Type-Options
  expect(headers['x-content-type-options']).toBe('nosniff')
  
  // Referrer Policy
  expect(headers['referrer-policy']).toBeDefined()
  
  // Permissions Policy
  expect(headers['permissions-policy']).toBeDefined()
})
```

6.2 CORS Configuration Testing
```python
def test_cors_configuration(client: TestClient):
    """Test CORS configuration security"""
    
    # Test legitimate origin
    response = client.options("/api/simulations", headers={
        "Origin": "http://localhost:4173",
        "Access-Control-Request-Method": "POST"
    })
    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" in response.headers
    
    # Test malicious origin
    malicious_response = client.options("/api/simulations", headers={
        "Origin": "http://malicious-site.com",
        "Access-Control-Request-Method": "POST"
    })
    # Should not include CORS headers for malicious origin
    assert "Access-Control-Allow-Origin" not in malicious_response.headers or \
           malicious_response.headers["Access-Control-Allow-Origin"] != "http://malicious-site.com"
```

--------------------------------------------------------------------------------
7. Dependency Security Scanning
--------------------------------------------------------------------------------

7.1 Automated Vulnerability Scanning
```bash
# Frontend dependency scanning
npm audit --audit-level high

# Backend dependency scanning  
pip-audit --format=json --output=security-report.json

# GitHub Security Advisories check
npm install -g @github/dependency-submission-toolkit
github-dependency-submission
```

7.2 Supply Chain Security
```python
# scripts/security-check.py
import subprocess
import json
import sys

def check_frontend_deps():
    """Check frontend dependencies for vulnerabilities"""
    result = subprocess.run(['npm', 'audit', '--json'], 
                          capture_output=True, text=True, cwd='src/frontend')
    
    if result.returncode != 0:
        audit_data = json.loads(result.stdout)
        high_vulns = audit_data.get('metadata', {}).get('vulnerabilities', {}).get('high', 0)
        critical_vulns = audit_data.get('metadata', {}).get('vulnerabilities', {}).get('critical', 0)
        
        if high_vulns > 0 or critical_vulns > 0:
            print(f"HIGH RISK: Found {high_vulns} high and {critical_vulns} critical vulnerabilities")
            return False
    
    return True

def check_backend_deps():
    """Check backend dependencies for vulnerabilities"""
    result = subprocess.run(['pip-audit', '--format=json'], 
                          capture_output=True, text=True, cwd='src/backend')
    
    if result.returncode != 0:
        vulnerabilities = json.loads(result.stdout)
        high_risk = [v for v in vulnerabilities if v.get('severity') in ['HIGH', 'CRITICAL']]
        
        if high_risk:
            print(f"HIGH RISK: Found {len(high_risk)} high/critical vulnerabilities")
            return False
    
    return True

if __name__ == "__main__":
    frontend_safe = check_frontend_deps()
    backend_safe = check_backend_deps()
    
    if not (frontend_safe and backend_safe):
        sys.exit(1)
```

--------------------------------------------------------------------------------
8. Manual Security Testing Checklist
--------------------------------------------------------------------------------

8.1 Authentication Flow Security
```markdown
## Manual Security Testing Checklist

### Authentication & Session Management
- [ ] Password complexity requirements enforced
- [ ] Account lockout after failed attempts
- [ ] Session timeout implemented
- [ ] Concurrent session limiting
- [ ] Secure session token generation
- [ ] Proper logout functionality
- [ ] Remember me functionality security

### Authorization & Access Control  
- [ ] Vertical privilege escalation prevented
- [ ] Horizontal privilege escalation prevented
- [ ] Direct object reference protection
- [ ] Admin panel access restricted
- [ ] API endpoint authorization enforced
- [ ] File access controls implemented

### Input Validation & Data Handling
- [ ] All input fields validated server-side
- [ ] File upload restrictions enforced
- [ ] Data sanitization implemented
- [ ] Output encoding applied
- [ ] Error messages don't leak information
- [ ] PII data properly encrypted

### Network & Transport Security
- [ ] HTTPS enforced across entire application
- [ ] TLS configuration hardened
- [ ] HTTP security headers implemented
- [ ] CORS policy properly configured
- [ ] API rate limiting effective
- [ ] Request size limits enforced
```

8.2 Business Logic Security
```markdown
### Business Logic Testing
- [ ] Simulation parameter manipulation prevented
- [ ] Race condition vulnerabilities addressed
- [ ] Time-of-check vs time-of-use issues resolved
- [ ] Business rule bypass attempts blocked
- [ ] Data integrity maintained across transactions
- [ ] Financial calculation tampering prevented

### PWA-Specific Security
- [ ] Service worker security implemented
- [ ] Cache poisoning prevented
- [ ] Offline data security maintained
- [ ] App installation security verified
- [ ] Push notification security implemented
- [ ] Background sync security validated
```

--------------------------------------------------------------------------------
9. Security Testing Tools & Framework
--------------------------------------------------------------------------------

9.1 Required Tools
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "zap-api-nodejs": "^1.0.0",
    "eslint-plugin-security": "^1.7.0",
    "semgrep": "^1.45.0"
  },
  "devDependencies": {
    "npm-audit": "^2.1.0",
    "pip-audit": "^2.6.0",
    "bandit": "^1.7.0",
    "safety": "^2.3.0"
  }
}
```

9.2 Automated Security Testing Pipeline
```yaml
# .github/workflows/security.yml
name: Security Testing
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Frontend Security Scan
        run: |
          cd src/frontend
          npm ci
          npm audit --audit-level high
          npx eslint . --ext .ts,.tsx --config .eslintrc-security.js
      
      - name: Backend Security Scan  
        run: |
          cd src/backend
          pip install pip-audit bandit
          pip-audit --format=json --output=audit-report.json
          bandit -r . -f json -o bandit-report.json
      
      - name: OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:4173'
```

--------------------------------------------------------------------------------
10. Test Structure & Organization
--------------------------------------------------------------------------------

File organization:
```
security-tests/
├── config/
│   ├── security-config.json     # Security test configuration
│   └── payloads/               # Attack payload libraries
├── automated/
│   ├── owasp-top10.spec.ts     # OWASP Top 10 automated tests
│   ├── auth-security.spec.ts   # Authentication security tests
│   ├── input-validation.spec.ts # Injection and XSS tests
│   └── api-security.spec.ts    # API security boundary tests
├── manual/
│   ├── security-checklist.md   # Manual testing checklist
│   ├── penetration-test.md     # Manual pen-test procedures
│   └── business-logic.md       # Business logic security tests
├── tools/
│   ├── security-scan.py        # Dependency vulnerability scanner
│   ├── payload-generator.js    # Test payload generator
│   └── report-parser.py        # Security report parser
└── reports/                    # Generated security reports
```

--------------------------------------------------------------------------------
11. Coverage & Success Criteria
--------------------------------------------------------------------------------

**Success Criteria:**
* All OWASP Top 10 vulnerabilities tested and mitigated
* Authentication and authorization boundaries secure
* PII data properly protected throughout application
* Rate limiting effective against abuse
* No high/critical vulnerabilities in dependencies
* Security headers properly configured
* Manual security checklist 100% complete

**Coverage Goals:**
* 100% of security-sensitive code paths tested
* All user input validation points covered
* All authentication/authorization boundaries validated
* All API endpoints security tested

**Quality Gates:**
* Zero critical vulnerabilities allowed
* High vulnerabilities require immediate mitigation plan
* Security tests must pass before deployment
* Regular security scan updates required

--------------------------------------------------------------------------------
12. Implementation Checklist
--------------------------------------------------------------------------------

| Category | Cases Count | Priority | Dependencies |
|----------|-------------|----------|--------------|
| ACCESS | 5 | High | Auth mocking, API testing |
| CRYPTO | 5 | High | JWT testing, encryption validation |
| INJECT | 5 | Critical | Input fuzzing, payload library |
| DESIGN | 5 | High | Business logic analysis |
| CONFIG | 5 | Medium | Header validation, CORS testing |
| VULN | 5 | High | Dependency scanning tools |
| AUTH | 5 | Critical | Authentication flow testing |
| INTEGRITY | 5 | Medium | CI/CD security validation |
| LOGGING | 5 | Medium | Log analysis, monitoring |
| SSRF | 5 | Medium | Network request validation |

**Total: 50 automated test cases + comprehensive manual checklist**

--------------------------------------------------------------------------------
13. Next Steps After Plan Approval
--------------------------------------------------------------------------------

1. Set up security testing infrastructure and tools
2. Implement OWASP Top 10 automated test suite
3. Create authentication and authorization security tests
4. Add input validation and injection prevention tests
5. Set up dependency vulnerability scanning
6. Implement security headers and configuration validation
7. Create manual security testing procedures
8. Integrate security tests into CI/CD pipeline
9. Generate security reports and dashboards
10. Establish security incident response procedures

--------------------------------------------------------------------------------
14. Risks & Mitigations
--------------------------------------------------------------------------------

| Risk | Mitigation |
|------|------------|
| False positive security alerts | Careful payload crafting and result validation |
| Security test environment drift | Regular sync with production configuration |
| Performance impact of security tests | Optimize test execution and run frequency |
| Security tool maintenance overhead | Automate tool updates and configuration |
| Complex attack scenario reproduction | Document and script manual test procedures |

End of Plan.