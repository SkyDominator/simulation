# Frontend Test Strategy - Enterprise Scale Apps

## Overview
**Target**: Enterprise production apps, 50+ developers, 1M+ users  
**Goal**: Industrial-strength testing with governance, compliance, and scalability  
**Time Budget**: 40-50% of development time on testing and quality

## Core Principles

1. **Zero-Defect Mindset**: Bugs are unacceptable in production
2. **Compliance First**: Meet regulatory requirements (GDPR, HIPAA, SOC2)
3. **Platform Engineering**: Testing as a service for all teams
4. **Continuous Verification**: Every commit is production-ready
5. **Testability Architecture**: Add `data-testid` to ALL components organization-wide
6. **Dependency Injection Standard**: Mandate DI patterns and interfaces for testability
7. **Mock-First Development**: Use MSW for all API mocking, zero real network calls
8. **CI Performance**: Disable video/traces/screenshots in CI, enable only for debugging

## Enterprise Test Pyramid

```
        Monitoring (5%)
       /              \
      E2E (10%)        
     /         \       
   Integration (20%)   
   /              \    
  Unit Tests (40%)     
 /                 \   
Static Analysis (15%)  
/                    \ 
Security & Compliance (10%)
```

## Comprehensive Test Matrix

### Level 1: Pre-Commit (< 1 minute)
```typescript
// Enforced via husky
- TypeScript compilation
- ESLint + Prettier
- Unit tests for changed files
- Secrets scanning
- Commit message validation
```

### Level 2: PR Pipeline (< 10 minutes)
```typescript
// GitHub Actions / Jenkins
- Full unit test suite
- Integration tests
- Code coverage (90% minimum)
- Bundle size analysis
- Dependency vulnerability scan
- SAST (Static Application Security Testing)
```

### Level 3: Merge Pipeline (< 30 minutes)
```typescript
// Post-merge to main/develop
- Full E2E smoke tests
- Visual regression tests
- Performance benchmarks
- Accessibility audit (WCAG 2.1 AA)
- Cross-browser matrix tests
```

### Level 4: Release Pipeline (< 2 hours)
```typescript
// Pre-production deployment
- Full E2E regression suite
- Load testing (expected traffic x3)
- Security penetration testing
- Chaos engineering tests
- Compliance validation
- Multi-region testing
```

### Level 5: Production Monitoring (Continuous)
```typescript
// Real-time verification
- Synthetic monitoring
- Real User Monitoring (RUM)
- Error tracking
- Performance monitoring
- Business metrics validation
- A/B test analysis
```

## Organizational Structure

### Testing Center of Excellence (CoE)
```
Testing CoE/
├── Platform Team/
│   ├── Test Infrastructure
│   ├── CI/CD Pipeline
│   └── Tooling & Frameworks
├── Quality Engineering/
│   ├── Test Automation
│   ├── Performance Testing
│   └── Security Testing
├── Governance/
│   ├── Standards & Guidelines
│   ├── Metrics & Reporting
│   └── Training & Support
└── Domain Teams/
    ├── Feature Team A (embedded QE)
    ├── Feature Team B (embedded QE)
    └── Feature Team C (embedded QE)
```

### RACI Matrix
| Activity | Dev Team | QE Team | Platform | Management |
|----------|----------|---------|----------|------------|
| Unit Tests | R,A | C | I | I |
| Integration | R | R,A | C | I |
| E2E Tests | C | R,A | C | I |
| Performance | C | R,A | C | I |
| Security | C | R | R,A | I |
| Monitoring | I | C | R,A | I |

## Testability Standards (Organization-wide MANDATORY)

### 1. Test ID Convention

**Rule**: Every interactive element MUST have a `data-testid` attribute.

```typescript
// ✅ REQUIRED
<button data-testid="auth-login-button">Login</button>
<input data-testid="auth-email-input" />
<form data-testid="checkout-form">...</form>

// ❌ PROHIBITED - Fails PR checks
<button>Submit</button>
<input type="email" />
```

**Enforcement**: ESLint rule + PR checklist + code review automation

### 2. Dependency Injection

**Rule**: All dependencies injected, never imported directly.

```typescript
// ✅ CORRECT
export const UserService = ({ apiClient }: { apiClient: IApiClient }) => {
  return { fetchUser: () => apiClient.get('/users') };
};

// ❌ PROHIBITED
import { apiClient } from './api';  // Can't mock
```

### 3. MSW for API Mocking

**Rule**: Use MSW for ALL API mocking, no axios-mock-adapter.

### 4. CI-Optimized E2E

**Rule**: Disable video/traces/screenshots in CI.

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: process.env.CI ? 'off' : 'on-first-retry',      // 30% faster
    video: process.env.CI ? 'off' : 'on-first-retry',      // 50% faster
    screenshot: process.env.CI ? 'off' : 'only-on-failure', // 10% faster
  },
});
```

## Test Implementation Standards

### 1. Code Organization
```typescript
src/
├── domains/                 # Domain-driven design
│   ├── trading/
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   └── __tests__/
│   │       ├── unit/
│   │       ├── integration/
│   │       ├── contracts/
│   │       └── fixtures/
│   └── accounts/
├── shared/                  # Shared libraries
│   ├── ui-kit/
│   │   └── __tests__/
│   └── utils/
│       └── __tests__/
├── platform/               # Platform capabilities
│   ├── auth/
│   ├── monitoring/
│   └── testing/
│       ├── builders/
│       ├── fixtures/
│       └── utils/
tests/
├── e2e/
│   ├── smoke/
│   ├── regression/
│   ├── performance/
│   └── security/
├── contracts/
├── accessibility/
└── visual/
```

### 2. Test Data Management
```typescript
// Centralized test data service
export class TestDataService {
  private readonly environments = {
    development: 'https://test-data-dev.company.com',
    staging: 'https://test-data-staging.company.com',
    production: 'https://test-data-prod.company.com'
  };
  
  async createUser(template: UserTemplate): Promise<User> {
    // Creates isolated test user with cleanup
  }
  
  async createScenario(scenario: ScenarioType): Promise<TestContext> {
    // Sets up complex test scenarios
  }
  
  async cleanup(context: TestContext): Promise<void> {
    // Ensures test isolation
  }
}

// Test data builders with faker
export const builders = {
  user: createBuilder<User>({
    id: faker.datatype.uuid,
    email: faker.internet.email,
    role: oneOf(['admin', 'user', 'guest']),
    preferences: nested(preferencesBuilder),
  }),
  
  order: createBuilder<Order>({
    id: sequence(),
    userId: relation('user'),
    items: array(itemBuilder, { min: 1, max: 5 }),
    total: computed((order) => calculateTotal(order.items)),
  }),
};
```

### 3. Advanced Mocking Strategy
```typescript
// Service virtualization for external dependencies
export class ServiceVirtualization {
  private readonly stubs = new Map<string, MockService>();
  
  register(service: string, mock: MockService): void {
    this.stubs.set(service, mock);
  }
  
  async intercept(request: Request): Promise<Response> {
    const service = this.identifyService(request);
    const mock = this.stubs.get(service);
    
    if (mock) {
      return mock.handle(request);
    }
    
    return fetch(request);
  }
}

// Contract-based mocking
export class ContractMockService {
  constructor(private contracts: OpenAPISpec) {}
  
  generateMock(endpoint: string, scenario?: string): MockResponse {
    const contract = this.contracts.getEndpoint(endpoint);
    return this.generateFromSchema(contract.response, scenario);
  }
  
  validateRequest(endpoint: string, request: Request): ValidationResult {
    const contract = this.contracts.getEndpoint(endpoint);
    return this.validateAgainstSchema(request, contract.request);
  }
}
```

## Quality Gates & Governance

### Automated Quality Gates
```yaml
# .github/workflows/quality-gates.yml
quality-checks:
  rules:
    - code-coverage:
        minimum: 90%
        exclude: ['*.stories.tsx', '*.mock.ts']
    
    - performance:
        LCP: < 2500ms
        FID: < 100ms
        CLS: < 0.1
        bundle-size: < 1MB
    
    - security:
        vulnerabilities: 0 high, 0 critical
        secrets: none
        headers: CSP, X-Frame-Options, etc.
    
    - accessibility:
        wcag-level: AA
        axe-violations: 0
    
    - code-quality:
        complexity: < 10
        duplication: < 3%
        maintainability: > B
```

### Compliance Testing
```typescript
// GDPR Compliance
describe('GDPR Compliance', () => {
  test('user can request data deletion', async () => {
    const user = await createUser();
    await requestDataDeletion(user.id);
    
    // Verify all PII is removed
    await expectNoTraces(user.id, [
      'database',
      'logs',
      'analytics',
      'backups'
    ]);
  });
  
  test('consent is required for tracking', async () => {
    const { page } = await newIncognitoContext();
    await page.goto('/');
    
    // No tracking before consent
    expect(await getTrackedEvents()).toHaveLength(0);
    
    await page.click('[data-testid="accept-cookies"]');
    
    // Tracking enabled after consent
    expect(await getTrackedEvents()).not.toHaveLength(0);
  });
});

// SOC2 Compliance
describe('SOC2 Security Controls', () => {
  test('encryption in transit', async () => {
    const response = await fetch('/api/sensitive-data');
    expect(response.headers.get('strict-transport-security')).toBeDefined();
  });
  
  test('audit logging', async () => {
    const action = await performSensitiveAction();
    const logs = await getAuditLogs(action.id);
    
    expect(logs).toContainEqual(
      expect.objectContaining({
        userId: expect.any(String),
        timestamp: expect.any(Date),
        action: action.type,
        ip: expect.any(String),
      })
    );
  });
});
```

## Performance Testing at Scale

### Load Testing Framework
```typescript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '10m', target: 1000 },  // Stay at 1000 users
    { duration: '5m', target: 5000 },   // Spike to 5000
    { duration: '10m', target: 1000 },  // Back to normal
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],              // Error rate under 1%
  },
};

export default function () {
  const response = http.get('https://api.company.com/endpoint');
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  sleep(1);
}
```

### Client-Side Performance Monitoring
```typescript
// Performance budgets
export const performanceBudgets = {
  'time-to-interactive': 3500,
  'first-contentful-paint': 1500,
  'largest-contentful-paint': 2500,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,
  'javascript-bundle': 500 * 1024,  // 500KB
  'css-bundle': 100 * 1024,         // 100KB
  'image-total': 1000 * 1024,       // 1MB
};

// Runtime monitoring
class PerformanceMonitor {
  private metrics = new Map<string, number>();
  
  initialize(): void {
    // Web Vitals
    getCLS(this.recordMetric('CLS'));
    getFID(this.recordMetric('FID'));
    getLCP(this.recordMetric('LCP'));
    getTTFB(this.recordMetric('TTFB'));
    getFCP(this.recordMetric('FCP'));
    
    // Custom metrics
    this.measureJSExecutionTime();
    this.measureMemoryUsage();
    this.measureNetworkRequests();
  }
  
  private recordMetric(name: string) {
    return (metric: Metric) => {
      this.metrics.set(name, metric.value);
      this.reportToAnalytics(name, metric);
    };
  }
}
```

## Security Testing Framework

### 1. XSS Prevention Suite

**Attack Vectors** (OWASP Top 10 coverage):

```typescript
const XSS_ATTACK_VECTORS = {
  scriptInjection: [
    '<script>alert(1)</script>',
    '<script src="evil.com/xss.js"></script>',
    '<script>document.cookie</script>',
  ],
  eventHandlers: [
    '<img src=x onerror=alert(1)>',
    '<body onload=alert(1)>',
    '<svg onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
  ],
  javascriptProtocol: [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ],
  htmlEntities: [
    '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;',
  ],
  encodedPayloads: [
    '%3Cscript%3Ealert(1)%3C/script%3E',
    '\\x3Cscript\\x3Ealert(1)\\x3C/script\\x3E',
    '\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E',
  ],
  domXss: [
    '<iframe src=javascript:alert(1)>',
    '<embed src=javascript:alert(1)>',
    '<object data=javascript:alert(1)>',
  ],
};

describe('XSS Protection', () => {
  Object.entries(XSS_ATTACK_VECTORS).forEach(([category, vectors]) => {
    describe(category, () => {
      test.each(vectors)('blocks: %s', async (vector) => {
        const { container } = render(<UserContent content={vector} />);
        
        // Verify sanitization
        expect(container.querySelector('script')).toBeNull();
        expect(container.innerHTML).not.toContain('javascript:');
        expect(container.innerHTML).not.toMatch(/on\w+=/);
        
        // Verify no script execution
        const scriptExecuted = await page.evaluate(() => window.xssTriggered);
        expect(scriptExecuted).toBeUndefined();
      });
    });
  });
  
  test('DOMPurify configuration', () => {
    const html = '<b>Safe</b><script>alert(1)</script><img src=x onerror=alert(1)>';
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOWED_URI_REGEXP: /^https?:\/\/(www\.)?example\.com/,
    });
    
    expect(clean).toContain('<b>Safe</b>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
  });
});
```

### 2. CSRF Protection

**Requirements**:

- Token: 64-char hex (SHA256), rotated every 1h
- Header: `X-CSRF-Token` for all mutations
- Cookie: `SameSite=Strict; Secure; HttpOnly`
- Validation: Server-side with timing-safe comparison

```typescript
describe('CSRF Protection', () => {
  test('includes valid token in mutations', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    await api.updateProfile({ name: 'John' });
    
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        credentials: 'same-origin',
      })
    );
  });
  
  test('rejects requests without token', async () => {
    server.use(
      rest.post('/api/profile', (req, res, ctx) => {
        if (!req.headers.get('X-CSRF-Token')) {
          return res(ctx.status(403), ctx.json({ error: 'CSRF token required' }));
        }
      })
    );
    
    await expect(api.updateProfile({ name: 'John' })).rejects.toThrow(/403|CSRF/);
  });
  
  test('token rotation after sensitive operations', async () => {
    const initialToken = getCSRFToken();
    await api.changePassword({ old: 'x', new: 'y' });
    const newToken = getCSRFToken();
    
    expect(newToken).not.toBe(initialToken);
    expect(newToken).toMatch(/^[a-f0-9]{64}$/);
  });
  
  test('SameSite cookie configuration', async ({ page }) => {
    await page.goto('/');
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === 'csrf_token');
    
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie.sameSite).toBe('Strict');
    expect(csrfCookie.secure).toBe(true);
    expect(csrfCookie.httpOnly).toBe(true);
  });
});
```

### 3. Authentication & Session Management

```typescript
describe('Authentication Security', () => {
  test('JWT expiry enforced (15min access, 7d refresh)', async () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const token = generateToken({ exp: Math.floor(Date.now() / 1000) + 900 });
    
    vi.setSystemTime(new Date('2025-01-01T00:16:00Z')); // 16 minutes later
    
    const response = await makeAuthenticatedRequest(token);
    expect(response.status).toBe(401);
    expect(response.data.error).toBe('Token expired');
  });
  
  test('auto-refresh before expiry (2min buffer)', async () => {
    vi.useFakeTimers();
    const refreshSpy = vi.spyOn(auth, 'refreshToken');
    const expiryTime = Math.floor(Date.now() / 1000) + 900; // 15min
    
    vi.spyOn(jwt, 'decode').mockReturnValue({ exp: expiryTime });
    render(<App />);
    
    // Advance to 13 minutes (2min before expiry)
    vi.advanceTimersByTime(13 * 60 * 1000);
    
    await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
    vi.useRealTimers();
  });
  
  test('secure logout (clears all session data)', async () => {
    localStorage.setItem('accessToken', 'abc123');
    localStorage.setItem('refreshToken', 'xyz789');
    sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
    document.cookie = 'session=active; path=/';
    
    await auth.logout();
    
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(document.cookie).not.toContain('session=active');
  });
  
  test('account lockout after 5 failed attempts', async () => {
    const email = 'user@test.com';
    
    for (let i = 0; i < 5; i++) {
      await expect(api.login({ email, password: 'wrong' })).rejects.toThrow();
    }
    
    await expect(api.login({ email, password: 'correct' }))
      .rejects.toThrow(/locked|temporarily disabled/i);
    
    // Verify lockout duration (15 minutes)
    vi.advanceTimersByTime(14 * 60 * 1000);
    await expect(api.login({ email, password: 'correct' })).rejects.toThrow();
    
    vi.advanceTimersByTime(1 * 60 * 1000);
    await expect(api.login({ email, password: 'correct' })).resolves.toBeDefined();
  });
  
  test('session timeout after inactivity (30min)', async () => {
    vi.useFakeTimers();
    render(<App />);
    
    // Simulate inactivity
    vi.advanceTimersByTime(30 * 60 * 1000);
    
    await waitFor(() => {
      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
    });
    
    vi.useRealTimers();
  });
});
```

### 4. Sensitive Data Protection

```typescript
describe('Sensitive Data Protection', () => {
  test('masks credit card numbers', () => {
    const creditCard = '4532-1234-5678-9010';
    render(<PaymentForm initialCard={creditCard} />);
    
    expect(screen.getByDisplayValue('****-****-****-9010')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(creditCard)).not.toBeInTheDocument();
  });
  
  test('no sensitive data in localStorage', () => {
    const sensitiveKeys = ['password', 'creditCard', 'ssn', 'apiKey', 'secret'];
    const stored = Object.keys(localStorage);
    
    sensitiveKeys.forEach(key => {
      expect(stored.some(k => k.toLowerCase().includes(key))).toBe(false);
    });
  });
  
  test('no sensitive data in console logs', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const password = 'SecretPassword123!';
    
    await auth.login({ email: 'user@test.com', password });
    
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(password)
    );
  });
  
  test('HTTPS enforced for sensitive operations', async ({ page }) => {
    await page.goto('http://example.com/login');
    
    // Should redirect to HTTPS
    expect(page.url()).toMatch(/^https:/);
  });
});
```

### 5. Content Security Policy (CSP)

```typescript
describe('CSP Headers', () => {
  test('strict CSP configuration', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'];
    
    // Required directives
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self' https:");
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    
    // Forbidden directives
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("* http:");
  });
  
  test('CSP violation reporting', async ({ page }) => {
    const violations: any[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSP')) {
        violations.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Attempt inline script injection
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'alert(1)';
      document.body.appendChild(script);
    });
    
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/Content Security Policy|CSP/i);
  });
  
  test('nonce-based script execution', async ({ page }) => {
    await page.goto('/');
    
    // Valid nonce should work
    const validScript = await page.evaluate(() => {
      const script = document.createElement('script');
      script.nonce = document.querySelector('meta[property="csp-nonce"]')?.getAttribute('content');
      script.textContent = 'window.validScript = true';
      document.body.appendChild(script);
      return window.validScript;
    });
    
    expect(validScript).toBe(true);
    
    // Invalid nonce should be blocked
    const invalidScript = await page.evaluate(() => {
      const script = document.createElement('script');
      script.nonce = 'invalid-nonce';
      script.textContent = 'window.invalidScript = true';
      document.body.appendChild(script);
      return window.invalidScript;
    });
    
    expect(invalidScript).toBeUndefined();
  });
});
```

### 6. Dependency Security

```typescript
describe('Dependency Security', () => {
  test('no high/critical vulnerabilities', async () => {
    const { execSync } = await import('child_process');
    const audit = JSON.parse(execSync('npm audit --json').toString());
    
    expect(audit.metadata.vulnerabilities.high).toBe(0);
    expect(audit.metadata.vulnerabilities.critical).toBe(0);
  });
  
  test('license compliance', async () => {
    const { execSync } = await import('child_process');
    const licenses = JSON.parse(
      execSync('npx license-checker --json').toString()
    );
    
    const bannedLicenses = ['GPL', 'AGPL', 'LGPL'];
    const violations = Object.entries(licenses).filter(([pkg, info]: any) =>
      bannedLicenses.some(banned => info.licenses.includes(banned))
    );
    
    expect(violations).toHaveLength(0);
  });
  
  test('subresource integrity (SRI)', async ({ page }) => {
    await page.goto('/');
    
    const externalScripts = await page.$$eval('script[src^="https://"]', scripts =>
      scripts.map(s => ({
        src: s.getAttribute('src'),
        integrity: s.getAttribute('integrity'),
        crossOrigin: s.getAttribute('crossorigin'),
      }))
    );
    
    externalScripts.forEach(script => {
      expect(script.integrity).toMatch(/^sha(256|384|512)-/);
      expect(script.crossOrigin).toBe('anonymous');
    });
  });
});
```

### 7. Security Testing CI/CD Integration

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Dependency scanning
      - name: NPM Audit
        run: npm audit --audit-level=high
      
      # Secret scanning
      - name: TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
      
      # SAST
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      
      # OWASP Dependency Check
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'frontend'
          path: '.'
          format: 'ALL'
      
      # Run security tests
      - name: Security Test Suite
        run: npm run test -- --grep "XSS|CSRF|Auth|CSP|Security"
      
      # Upload results
      - name: Upload Security Report
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: dependency-check-report.sarif
```

## Contract Testing

### 1. API Contract Testing with Pact

**Consumer Side** (Frontend):

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
const { eachLike, like, string, integer } = MatchersV3;

describe('User API Contract', () => {
  const provider = new PactV3({
    consumer: 'FrontendApp',
    provider: 'UserAPI',
    dir: './pacts',
  });
  
  test('get user by id', async () => {
    await provider
      .given('user exists with id 123')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/api/users/123',
        headers: {
          'Authorization': like('Bearer token123'),
          'Accept': 'application/json',
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: integer(123),
          name: string('John Doe'),
          email: string('john@example.com'),
          roles: eachLike('user'),
          createdAt: string('2025-01-01T00:00:00Z'),
        },
      })
      .executeTest(async (mockServer) => {
        const api = new UserAPI(mockServer.url);
        const user = await api.getUser(123);
        
        expect(user.id).toBe(123);
        expect(user.name).toBe('John Doe');
        expect(user.email).toBe('john@example.com');
      });
  });
  
  test('create new user', async () => {
    await provider
      .given('user does not exist')
      .uponReceiving('a request to create user')
      .withRequest({
        method: 'POST',
        path: '/api/users',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': like('Bearer token123'),
        },
        body: {
          name: string('Jane Doe'),
          email: string('jane@example.com'),
          password: string('SecurePass123!'),
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: integer(124),
          name: string('Jane Doe'),
          email: string('jane@example.com'),
          roles: eachLike('user'),
          createdAt: like('2025-01-01T00:00:00Z'),
        },
      })
      .executeTest(async (mockServer) => {
        const api = new UserAPI(mockServer.url);
        const user = await api.createUser({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'SecurePass123!',
        });
        
        expect(user.id).toBeDefined();
        expect(user.name).toBe('Jane Doe');
      });
  });
  
  test('handles validation errors', async () => {
    await provider
      .uponReceiving('a request with invalid email')
      .withRequest({
        method: 'POST',
        path: '/api/users',
        body: {
          name: string('Invalid User'),
          email: string('not-an-email'),
          password: string('pass'),
        },
      })
      .willRespondWith({
        status: 400,
        body: {
          error: string('Validation failed'),
          details: eachLike({
            field: string('email'),
            message: string('Invalid email format'),
          }),
        },
      })
      .executeTest(async (mockServer) => {
        const api = new UserAPI(mockServer.url);
        
        await expect(api.createUser({
          name: 'Invalid User',
          email: 'not-an-email',
          password: 'pass',
        })).rejects.toMatchObject({
          status: 400,
          error: 'Validation failed',
        });
      });
  });
});
```

### 2. OpenAPI Schema Validation

```typescript
import SwaggerParser from '@apidevtools/swagger-parser';
import { validateAgainstSchema } from 'openapi-validator';

describe('OpenAPI Contract Compliance', () => {
  let apiSpec: any;
  
  beforeAll(async () => {
    apiSpec = await SwaggerParser.validate('./openapi.yaml');
  });
  
  test('API matches OpenAPI specification', async () => {
    const response = await fetch('/api/users/123');
    const data = await response.json();
    
    const validation = validateAgainstSchema(
      data,
      apiSpec.paths['/users/{id}'].get.responses['200'].content['application/json'].schema
    );
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
  
  test('error responses match specification', async () => {
    const response = await fetch('/api/users/999999');
    const error = await response.json();
    
    expect(response.status).toBe(404);
    
    const validation = validateAgainstSchema(
      error,
      apiSpec.paths['/users/{id}'].get.responses['404'].content['application/json'].schema
    );
    
    expect(validation.valid).toBe(true);
  });
});
```

### 3. GraphQL Contract Testing

```typescript
import { buildSchema, validate } from 'graphql';
import { gql } from '@apollo/client';

describe('GraphQL Schema Contracts', () => {
  const schema = buildSchema(`
    type User {
      id: ID!
      name: String!
      email: String!
      posts: [Post!]!
    }
    
    type Post {
      id: ID!
      title: String!
      content: String!
      author: User!
    }
    
    type Query {
      user(id: ID!): User
      users: [User!]!
    }
    
    type Mutation {
      createUser(name: String!, email: String!): User!
    }
  `);
  
  test('query matches schema', () => {
    const query = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
          posts {
            id
            title
          }
        }
      }
    `;
    
    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });
  
  test('mutation matches schema', () => {
    const mutation = gql`
      mutation CreateUser($name: String!, $email: String!) {
        createUser(name: $name, email: $email) {
          id
          name
          email
        }
      }
    `;
    
    const errors = validate(schema, mutation);
    expect(errors).toHaveLength(0);
  });
  
  test('invalid query detected', () => {
    const invalidQuery = gql`
      query {
        user(id: "123") {
          id
          invalidField
        }
      }
    `;
    
    const errors = validate(schema, invalidQuery);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('invalidField');
  });
});
```

### 4. Contract Testing CI/CD Pipeline

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Pact tests (consumer)
        run: npm run test:pact
      
      - name: Publish pacts
        if: success()
        run: |
          npx pact-broker publish ./pacts \
            --consumer-app-version=${{ github.sha }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
  
  can-i-deploy:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - name: Check deployment compatibility
        run: |
          npx pact-broker can-i-deploy \
            --pacticipant=FrontendApp \
            --version=${{ github.sha }} \
            --to-environment=production \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

### 5. Consumer-Driven Contract Testing Workflow

```typescript
// 1. Consumer defines expectations
export class UserAPIConsumer {
  async testGetUser() {
    return pact
      .given('user exists')
      .uponReceiving('get user request')
      .withRequest({ method: 'GET', path: '/users/1' })
      .willRespondWith({
        status: 200,
        body: { id: 1, name: 'John' },
      });
  }
}

// 2. Provider verifies contract
describe('Provider Verification', () => {
  test('satisfies consumer contract', async () => {
    const verifier = new Verifier({
      provider: 'UserAPI',
      providerBaseUrl: 'http://localhost:8000',
      pactUrls: ['./pacts/frontendapp-userapi.json'],
    });
    
    const output = await verifier.verifyProvider();
    expect(output).toContain('0 failures');
  });
});

// 3. Pact Broker for contract sharing
export const publishPact = async () => {
  const publisher = new Publisher({
    pactBroker: process.env.PACT_BROKER_URL,
    pactBrokerToken: process.env.PACT_BROKER_TOKEN,
    pactFilesOrDirs: ['./pacts'],
    consumerVersion: process.env.GIT_SHA,
    tags: ['main', 'production'],
  });
  
  await publisher.publishPacts();
};
```

### 6. Breaking Change Detection

```typescript
describe('API Versioning & Compatibility', () => {
  test('detects breaking changes', async () => {
    const oldSchema = await loadSchema('./schemas/v1.json');
    const newSchema = await loadSchema('./schemas/v2.json');
    
    const changes = detectBreakingChanges(oldSchema, newSchema);
    
    // Allowed changes
    expect(changes.addedFields).toBeDefined();
    expect(changes.deprecatedFields).toBeDefined();
    
    // Breaking changes should fail
    expect(changes.removedFields).toHaveLength(0);
    expect(changes.changedFieldTypes).toHaveLength(0);
    expect(changes.removedEndpoints).toHaveLength(0);
  });
  
  test('enforces semantic versioning', () => {
    const currentVersion = '1.2.3';
    const nextVersion = '1.3.0';
    
    // Minor version bump for new features
    expect(hasNewFeatures(oldAPI, newAPI)).toBe(true);
    expect(hasBreakingChanges(oldAPI, newAPI)).toBe(false);
    
    // Would require major version bump
    if (hasBreakingChanges(oldAPI, newAPI)) {
      expect(nextVersion.startsWith('2.')).toBe(true);
    }
  });
});
```

## Monitoring & Observability

### Multi-Layer Monitoring
```typescript
// 1. Synthetic Monitoring
export const syntheticTests = {
  'user-login-flow': {
    frequency: '5m',
    locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    script: async (page: Page) => {
      await page.goto('/login');
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password');
      await page.click('#submit');
      await page.waitForSelector('#dashboard');
    },
  },
};

// 2. Real User Monitoring (RUM)
export class RealUserMonitoring {
  constructor(private analytics: AnalyticsService) {}
  
  trackUserJourney(userId: string): void {
    // Session recording
    this.analytics.startRecording(userId);
    
    // Performance metrics
    this.analytics.track('page_load', {
      userId,
      url: window.location.href,
      loadTime: performance.timing.loadEventEnd - performance.timing.fetchStart,
      ...this.getWebVitals(),
    });
    
    // Error tracking
    window.addEventListener('error', (event) => {
      this.analytics.track('javascript_error', {
        userId,
        error: event.error.message,
        stack: event.error.stack,
        url: window.location.href,
      });
    });
  }
}

// 3. Business Metrics Monitoring
export const businessMetrics = {
  'conversion-rate': {
    query: 'SELECT COUNT(DISTINCT user_id) FROM conversions / COUNT(DISTINCT user_id) FROM visits',
    threshold: 0.02,  // Alert if drops below 2%
    window: '1h',
  },
  'checkout-abandonment': {
    query: 'SELECT COUNT(*) FROM checkout_started - COUNT(*) FROM checkout_completed',
    threshold: 0.3,   // Alert if above 30%
    window: '15m',
  },
};
```

### Distributed Tracing
```typescript
// OpenTelemetry setup
import { trace } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const tracer = trace.getTracer('frontend-app');

export function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage in components
export function UserDashboard() {
  useEffect(() => {
    traceAsync('fetch-user-data', async () => {
      const data = await fetchUserData();
      setState(data);
    }, {
      userId: currentUser.id,
      component: 'UserDashboard',
    });
  }, []);
}
```

## Disaster Recovery Testing

### Chaos Engineering
```typescript
// Frontend chaos testing
export class ChaosTester {
  async injectLatency(ms: number): Promise<void> {
    // Slow down all network requests
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), ms);
    });
  }
  
  async simulateNetworkFailure(): Promise<void> {
    await page.context().setOffline(true);
  }
  
  async corruptLocalStorage(): Promise<void> {
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        localStorage.setItem(key, 'CORRUPTED_DATA');
      });
    });
  }
  
  async fillMemory(): Promise<void> {
    await page.evaluate(() => {
      const arrays = [];
      while (true) {
        arrays.push(new Array(1000000).fill('memory leak'));
      }
    });
  }
}

// Test resilience
describe('Resilience Tests', () => {
  test('handles API timeout gracefully', async () => {
    await chaosTester.injectLatency(10000);
    await page.goto('/dashboard');
    
    await expect(page.locator('.error-message')).toContainText(
      'Loading is taking longer than expected'
    );
    await expect(page.locator('.retry-button')).toBeVisible();
  });
  
  test('works offline for cached content', async () => {
    await page.goto('/dashboard');
    await chaosTester.simulateNetworkFailure();
    await page.reload();
    
    await expect(page.locator('.offline-banner')).toBeVisible();
    await expect(page.locator('.cached-content')).toBeVisible();
  });
});
```

## Testing Metrics & KPIs

### Team Performance Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >90% | SonarQube |
| Test Execution Time | <15min | CI/CD Pipeline |
| Flaky Test Rate | <1% | Test Analytics |
| Defect Escape Rate | <0.1% | Production Bugs |
| MTTR (Mean Time To Repair) | <2 hours | Incident Tracking |
| Test Automation ROI | >300% | Cost Analysis |

### Quality Metrics Dashboard
```typescript
export interface QualityDashboard {
  coverage: {
    unit: number;
    integration: number;
    e2e: number;
    overall: number;
  };
  reliability: {
    passRate: number;
    flakyTests: string[];
    failureReasons: Map<string, number>;
  };
  performance: {
    avgExecutionTime: number;
    slowestTests: TestExecution[];
    parallelization: number;
  };
  security: {
    vulnerabilities: SecurityVulnerability[];
    lastPenTest: Date;
    complianceScore: number;
  };
}
```

## Cost-Benefit Analysis

### Investment (Annual)
- **People**: 10-15 QE engineers ($1.5M-$2.5M)
- **Tools**: Enterprise licenses ($100K-$200K)
- **Infrastructure**: Test environments ($50K-$100K)
- **Training**: Continuous education ($50K)
- **Total**: ~$2M-$3M

### Returns (Annual)
- **Defect Prevention**: $5M-$10M saved
- **Faster Releases**: 30% productivity gain
- **Reduced Downtime**: 99.99% availability
- **Compliance**: Avoid penalties ($1M+)
- **Brand Protection**: Invaluable
- **Total ROI**: 300-500%

## Implementation Roadmap

### Year 1: Foundation
- Q1: Establish Testing CoE
- Q2: Implement core test automation
- Q3: Deploy monitoring & observability
- Q4: Achieve 80% coverage

### Year 2: Maturation
- Q1: Full security testing suite
- Q2: Performance testing at scale
- Q3: Chaos engineering
- Q4: 90% automation

### Year 3: Excellence
- Q1: AI-powered testing
- Q2: Predictive quality analytics
- Q3: Zero-defect achievement
- Q4: Industry leadership

## Governance & Compliance

### Regulatory Requirements
- **GDPR**: Data privacy tests
- **HIPAA**: Healthcare data protection
- **PCI DSS**: Payment card security
- **SOC2**: Security controls
- **ISO 27001**: Information security
- **WCAG 2.1**: Accessibility standards

### Audit Trail
```typescript
export interface TestAudit {
  testId: string;
  executionId: string;
  timestamp: Date;
  environment: string;
  executor: string;
  result: TestResult;
  artifacts: {
    screenshots: string[];
    videos: string[];
    logs: string[];
    traces: string[];
  };
  compliance: {
    standards: string[];
    violations: ComplianceViolation[];
    attestation: string;
  };
}
```

## Future-Proofing

### AI-Powered Testing
- Self-healing tests
- Intelligent test generation
- Predictive test selection
- Automated root cause analysis

### Emerging Technologies
- WebAssembly testing
- Micro-frontend testing
- Edge computing verification
- Quantum-safe cryptography testing

### Continuous Innovation
- Regular tool evaluation
- Industry benchmarking
- Academic partnerships
- Open source contributions
