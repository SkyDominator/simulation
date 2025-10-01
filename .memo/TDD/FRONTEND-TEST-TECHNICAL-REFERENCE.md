# Frontend Testing Technical Reference

**Purpose**: Machine-friendly comprehensive testing guidelines with technical specifications

## Test Layer Specifications

### Unit Tests

**Scope**: Individual functions, classes, hooks in isolation  
**Coverage Target**: 70-90% (Small: 60-70%, Medium: 80%, Enterprise: 90%+)  
**Execution Time**: <2 seconds for 100 tests  
**Tools**: Vitest, Jest, React Testing Library

**What to Test**:
- Pure functions: Given X, returns Y
- Business logic: calculations, validations, transformations
- Custom hooks: state management, side effects
- Utility functions: 100% coverage required
- Redux/Zustand: actions, reducers, selectors

**What NOT to Test**:
- Trivial getters/setters
- Third-party library internals
- Framework-provided functionality
- Implementation details (private methods, internal state)

**Test Structure** (Arrange-Act-Assert):

```typescript
describe('calculateTax', () => {
  // Arrange
  const amount = 100;
  const rate = 0.08;
  
  // Act
  const result = calculateTax(amount, rate);
  
  // Assert
  expect(result).toBe(108);
});
```

**Mocking Strategy**:
- Mock external dependencies (APIs, timers, localStorage)
- Use test doubles: Stubs (return values), Spies (track calls), Mocks (full replacement)
- Prefer sociable tests over solitary when dependencies are fast

**Performance Requirements**:
- Unit test suite: <30s for 1000 tests
- Individual test: <10ms average
- Fail fast: Stop on first failure in CI

---

### Integration Tests

**Scope**: Component + immediate dependencies (APIs, state, routing)  
**Coverage Target**: 25-30% of total test suite  
**Execution Time**: <2 minutes for full suite  
**Tools**: MSW (Mock Service Worker), React Testing Library

**What to Test**:
- Component + API: fetch → display/error handling
- Component + State: Redux/Context providers
- Component + Router: navigation, route params
- Form submission: validation → API → success/error
- Data flow: parent ↔ child communication

**Mock Boundaries**:
- Mock at network layer (MSW), not component level
- Use real Redux/Context providers
- Use real routing (MemoryRouter in tests)
- Mock timers, dates, random values

**Example Pattern**:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ name: 'John' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('loads and displays user', async () => {
  render(<UserProfile />);
  expect(await screen.findByText('John')).toBeInTheDocument();
});

test('handles API errors', async () => {
  server.use(
    rest.get('/api/user', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  render(<UserProfile />);
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

---

### E2E Tests

**Scope**: Full user journeys across entire application  
**Coverage Target**: 5-10% of total tests, critical paths only  
**Execution Time**: <10 minutes for smoke suite, <30 minutes for full  
**Tools**: Playwright, Cypress

**What to Test**:
- Core user journeys: signup → login → primary action → logout
- Payment flows: cart → checkout → payment → confirmation
- Critical business workflows (3-5 max)

**What NOT to Test**:
- Edge cases (covered in unit/integration)
- UI styling details (use visual regression)
- Third-party services (mock or use test accounts)

**Best Practices**:
- Use Page Object Model for maintainability
- Run against test database with seed data
- Parallelize execution (--workers=4)
- Retry flaky tests (max 2 retries)
- Use data-testid for stable selectors

**Example Pattern**:

```typescript
// Page Object
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}

// Test
test('complete purchase flow', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password');
  
  await page.click('[data-testid="product-1"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

---

## Security Testing Specifications

### XSS Prevention

**Test Vectors** (Minimum required):

```typescript
const XSS_VECTORS = [
  // Script injection
  '<script>alert(1)</script>',
  '<script src="evil.com/xss.js"></script>',
  
  // Event handlers
  '<img src=x onerror=alert(1)>',
  '<body onload=alert(1)>',
  '<svg onload=alert(1)>',
  
  // JavaScript protocols
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  
  // HTML entities
  '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  
  // Encoded attacks
  '%3Cscript%3Ealert(1)%3C/script%3E',
  '\x3Cscript\x3Ealert(1)\x3C/script\x3E',
];
```

**Testing Strategy**:

```typescript
describe('XSS Protection', () => {
  test.each(XSS_VECTORS)('sanitizes: %s', (vector) => {
    const { container } = render(<UserContent content={vector} />);
    
    // Verify no script execution
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('onerror=');
    expect(container.innerHTML).not.toContain('onload=');
  });
  
  test('uses DOMPurify for rich content', () => {
    const html = '<b>Safe</b><script>alert(1)</script>';
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: []
    });
    
    render(<div dangerouslySetInnerHTML={{ __html: clean }} />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
```

**React-Specific Protections**:
- Default JSX escaping: `<div>{userInput}</div>` is safe
- Dangerous patterns: `dangerouslySetInnerHTML`, `href="javascript:"`, `<iframe src={userInput}>`
- Safe alternatives: `textContent`, `setAttribute`, URL validation

---

### CSRF Protection

**Requirements**:
- All state-changing requests (POST, PUT, DELETE) must include CSRF token
- Token format: 64-character hex string
- Token rotation: After sensitive operations
- Token validation: Server-side required

**Testing Pattern**:

```typescript
describe('CSRF Protection', () => {
  test('includes token in mutations', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    await api.updateProfile({ name: 'John' });
    
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': expect.stringMatching(/^[a-f0-9]{64}$/)
        })
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
    
    await expect(api.updateProfile({ name: 'John' })).rejects.toThrow();
  });
  
  test('rotates token after sensitive operations', async () => {
    const initialToken = getCSRFToken();
    await api.changePassword({ old: 'x', new: 'y' });
    const newToken = getCSRFToken();
    
    expect(newToken).not.toBe(initialToken);
  });
});
```

---

### Authentication Security

**Session Management Tests**:

```typescript
describe('Session Security', () => {
  test('clears sensitive data on logout', () => {
    localStorage.setItem('token', 'abc123');
    localStorage.setItem('refreshToken', 'xyz789');
    sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
    
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });
  
  test('redirects to login when token expired', async () => {
    vi.spyOn(jwt, 'decode').mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 100 // Expired 100s ago
    });
    
    render(<App />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });
  
  test('auto-refreshes token before expiry', async () => {
    vi.useFakeTimers();
    const refreshSpy = vi.spyOn(auth, 'refreshToken');
    const expiryTime = Math.floor(Date.now() / 1000) + 900; // 15min
    
    vi.spyOn(jwt, 'decode').mockReturnValue({ exp: expiryTime });
    render(<App />);
    
    // Advance to 5 minutes before expiry
    vi.advanceTimersByTime(10 * 60 * 1000);
    
    await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
    vi.useRealTimers();
  });
  
  test('locks account after failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await api.login({ email: 'user@test.com', password: 'wrong' });
    }
    
    await expect(api.login({ email: 'user@test.com', password: 'correct' }))
      .rejects.toThrow('Account locked');
  });
});
```

---

### Content Security Policy (CSP)

**Required Headers**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**E2E Test**:

```typescript
test('enforces strict CSP', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  
  // Required directives
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  
  // Forbidden directives
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("*"); // Wildcard
  
  // Test violation reporting
  const violations: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('CSP')) {
      violations.push(msg.text());
    }
  });
  
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'alert(1)';
    document.body.appendChild(script);
  });
  
  expect(violations.length).toBeGreaterThan(0);
});
```

---

## Performance Testing

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 2.5-4.0s | > 4.0s |
| FID (First Input Delay) | ≤ 100ms | 100-300ms | > 300ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | 0.1-0.25 | > 0.25 |

**Testing Pattern**:

```typescript
import { getCLS, getFID, getLCP } from 'web-vitals';

test('meets Core Web Vitals thresholds', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = { lcp: 0, fid: 0, cls: 0 };
      
      getCLS((metric) => vitals.cls = metric.value);
      getFID((metric) => vitals.fid = metric.value);
      getLCP((metric) => {
        vitals.lcp = metric.value;
        resolve(vitals);
      });
    });
  });
  
  expect(metrics.lcp).toBeLessThan(2500);
  expect(metrics.fid).toBeLessThan(100);
  expect(metrics.cls).toBeLessThan(0.1);
});
```

### Load Testing

**K6 Script Example**:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    errors: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://app.example.com/api/products');
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  sleep(1);
}
```

---

## Accessibility Testing

### Required Tests

**Automated** (vitest-axe):

```typescript
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(<App />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Keyboard Navigation**:

```typescript
test('keyboard navigation works', async () => {
  render(<Form />);
  const inputs = screen.getAllByRole('textbox');
  
  inputs[0].focus();
  userEvent.tab();
  expect(inputs[1]).toHaveFocus();
  
  userEvent.keyboard('{Enter}');
  expect(screen.getByText(/submitted/i)).toBeInTheDocument();
});
```

**Screen Reader**:

```typescript
test('screen reader announces form errors', () => {
  render(<Form />);
  
  fireEvent.submit(screen.getByRole('form'));
  
  const errorAlert = screen.getByRole('alert');
  expect(errorAlert).toHaveTextContent('Email is required');
  expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
  
  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
  
  e2e-tests:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - run: npm run test -- --grep "XSS|CSRF|Auth"
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
```

### Quality Gates

**Required for PR Merge**:
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage ≥ 80% (Small: 60%, Medium: 80%, Enterprise: 90%)
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Security tests pass (XSS, CSRF, Auth)
- [ ] Bundle size increase < 10KB
- [ ] Performance budgets met (LCP, FID, CLS)
- [ ] At least 1 approving review

---

## Test Data Management

### Test Builders

```typescript
import { build, sequence, fake, oneOf } from '@jackfranklin/test-data-bot';

export const userBuilder = build('User', {
  fields: {
    id: sequence(),
    email: fake(f => f.internet.email()),
    name: fake(f => f.name.fullName()),
    role: oneOf('admin', 'user', 'guest'),
    createdAt: fake(f => f.date.past()),
  },
});

export const orderBuilder = build('Order', {
  fields: {
    id: sequence(n => `ORD-${n.toString().padStart(6, '0')}`),
    userId: sequence(),
    items: [],
    total: 0,
    status: oneOf('pending', 'paid', 'shipped', 'delivered'),
  },
  postBuild: (order) => ({
    ...order,
    total: order.items.reduce((sum, item) => sum + item.price, 0),
  }),
});

// Usage
const user = userBuilder();
const admin = userBuilder({ overrides: { role: 'admin' } });
const users = userBuilder({ count: 10 });
```

### Fixtures

```typescript
// fixtures/users.ts
export const fixtures = {
  users: {
    admin: {
      id: 1,
      email: 'admin@test.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    },
    regular: {
      id: 2,
      email: 'user@test.com',
      role: 'user',
      permissions: ['read'],
    },
  },
  products: {
    laptop: {
      id: 1,
      name: 'MacBook Pro',
      price: 2499,
      inStock: true,
    },
  },
};

// Usage in tests
import { fixtures } from './fixtures';

test('admin can delete products', () => {
  login(fixtures.users.admin);
  // ...
});
```

---

## Debugging & Troubleshooting

### Common Issues

**Flaky Tests**:
- Root cause: Race conditions, timing issues, external dependencies
- Solution: Use `waitFor`, `findBy` queries, mock time with `vi.useFakeTimers()`

**Slow Tests**:
- Root cause: Real API calls, large data sets, unnecessary renders
- Solution: Mock network with MSW, use minimal fixtures, optimize component rendering

**False Positives/Negatives**:
- Root cause: Testing implementation details, weak assertions
- Solution: Test user behavior, use specific matchers (`toHaveTextContent` vs `toBeInTheDocument`)

### Debug Techniques

**Vitest UI**:

```bash
npm run test:unit -- --ui
```

**Playwright Debug Mode**:

```bash
npx playwright test --debug
```

**React Testing Library Debug**:

```typescript
import { screen } from '@testing-library/react';

test('debug example', () => {
  render(<App />);
  screen.debug(); // Prints DOM tree
  screen.logTestingPlaygroundURL(); // Interactive query builder
});
```

---

## Metrics & Reporting

### Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | 70-90% | Vitest/Jest coverage report |
| Test Execution Time | <10min CI | Pipeline duration |
| Flaky Test Rate | <1% | Test retries / total tests |
| Defect Escape Rate | <0.5% | Production bugs / releases |
| MTTR (Mean Time To Repair) | <2h | Incident tracking |
| Test Automation ROI | >300% | (Bugs prevented × cost) / test investment |

### Dashboard Example

```typescript
// test-metrics.ts
export interface TestMetrics {
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance: {
    unitTests: number;      // Execution time in ms
    integrationTests: number;
    e2eTests: number;
    total: number;
  };
  reliability: {
    passRate: number;       // Percentage
    flakyRate: number;
    failureRate: number;
  };
  security: {
    xssTests: number;
    csrfTests: number;
    authTests: number;
    vulnerabilities: number;
  };
}
```

---

## Tool Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Conclusion

This technical reference provides machine-parsable specifications for implementing comprehensive frontend testing. All code examples are production-ready and follow industry best practices from OWASP, Playwright, Testing Library, and Martin Fowler's test pyramid principles.
