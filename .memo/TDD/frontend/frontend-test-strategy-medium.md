# Frontend Test Strategy - Medium Scale Apps

## Overview

**Target**: Growing production apps, 10-50 developers, 100k-1M users  
**Goal**: Scalable testing with team consistency and quality gates  
**Time Budget**: 30-40% of development time on testing

## Core Principles

1. **Shift-Left Testing**: Catch bugs early, automate in PR pipeline
2. **Test Ownership**: Each feature team owns their tests (CODEOWNERS enforced)
3. **Automated Quality Gates**: 80%+ coverage, zero errors to merge
4. **Performance Budget**: Tests <10min CI, app LCP <2.5s, FID <100ms
5. **Test Isolation**: Independent tests with own data/mocks/contexts
6. **User-Facing Tests**: Test behavior not implementation details
7. **Testability First**: Add `data-testid` to ALL components for reliable selectors
8. **Dependency Injection**: Use DI patterns and interfaces for easy mocking
9. **Mock External Dependencies**: Use MSW for API mocking, no real network calls
10. **CI Optimized E2E**: Disable video/traces/screenshots in CI for speed

## Enhanced Test Pyramid

```
      E2E (10%)
     /         \
   Integration (30%)
   /              \
  Unit Tests (50%)
 /                 \
Static Analysis (10%)
```

## Test Categories & Coverage Targets

### 1. Static Analysis (Immediate feedback)
```typescript
// Tools & Targets:
- TypeScript: Strict mode enabled
- ESLint: Zero errors, warnings reviewed
- Prettier: Enforced formatting
- Bundle size: Automated checks (<500KB gzipped)

// Pre-commit hooks (husky + lint-staged):
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.test.{ts,tsx}": ["jest --bail --findRelatedTests"]
}
```

### 2. Unit Tests (80% coverage target)
```typescript
// What to test:
- Utility functions: 100% coverage
- Custom hooks: All branches covered
- Redux/Zustand actions & reducers: 100%
- Complex components: Focus on logic, not UI

// Testing patterns:
- Use test.each for multiple scenarios
- Snapshot tests for stable components
- Test data builders for complex objects
```

### 3. Integration Tests (Critical user flows)
```typescript
// Scope: Component + its immediate dependencies
- Form submission with validation
- Data fetching with loading/error states
- Navigation between related pages
- State management integration

// Mock boundaries:
- Mock at the network layer (MSW)
- Real Redux/Context providers
- Real routing (MemoryRouter)
```

### 4. E2E Tests (Core journeys + edge cases)

**Testability & Performance**:

- **data-testid on ALL elements**: Consistent, reliable selectors
- **CI optimized**: No video/traces/screenshots for faster execution
- **Use MSW** for stable, fast API mocking

```typescript
// playwright.config.ts - CI optimized
export default defineConfig({
  use: {
    trace: 'off',          // ❌ Disabled for CI speed
    video: 'off',          // ❌ Disabled for CI speed  
    screenshot: 'off',     // ❌ Disabled for CI speed
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

// Critical paths (run on every PR) with data-testid:
test('Complete user registration', async ({ page }) => {
  await page.click('[data-testid="register-button"]');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'SecurePass123!');
  await page.click('[data-testid="submit-button"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});

// Extended suite (nightly):
- Cross-browser tests (Chrome, Safari, Firefox)
- Mobile responsive tests (iOS, Android viewports)
- Performance tests (Lighthouse CI)
- Accessibility full audit (axe-core)
```

## Team Organization

### Test Structure by Feature
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── __tests__/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   └── auth.e2e.ts
│   └── checkout/
│       └── [same structure]
├── shared/
│   ├── components/
│   └── __tests__/
e2e/
├── smoke/          # Quick critical tests
├── regression/     # Full suite
└── performance/    # Load tests
```

### Ownership Model
```yaml
# CODEOWNERS
/src/features/auth/        @auth-team
/src/features/checkout/    @payments-team
/e2e/                     @qa-team @dev-leads
/__tests__/               @respective-feature-teams
```

## Implementation Phases

### Phase 1: Foundation (Month 1)
1. **Testing Infrastructure**
   ```bash
   # Core dependencies
   npm install --save-dev jest @testing-library/react
   npm install --save-dev @playwright/test playwright
   npm install --save-dev msw @mswjs/data
   
   # Code quality
   npm install --save-dev eslint prettier husky lint-staged
   npm install --save-dev @typescript-eslint/parser
   ```

2. **CI/CD Pipeline**
   ```yaml
   # .github/workflows/ci.yml
   jobs:
     lint:
       runs-on: ubuntu-latest
       steps: [linting steps]
     
     unit-tests:
       runs-on: ubuntu-latest
       strategy:
         matrix:
           node: [16, 18]
       steps: [unit test steps]
     
     integration-tests:
       needs: [lint, unit-tests]
       steps: [integration test steps]
     
     e2e-smoke:
       needs: [integration-tests]
       steps: [e2e smoke test steps]
   ```

### Phase 2: Coverage Expansion (Month 2-3)
1. **Test Data Management**
   ```typescript
   // Test data builders
   export const userBuilder = build('User', {
     fields: {
       id: sequence(),
       email: fake(f => f.internet.email()),
       name: fake(f => f.name.findName()),
     }
   });
   
   // Fixtures
   export const fixtures = {
     users: {
       admin: userBuilder({ role: 'admin' }),
       customer: userBuilder({ role: 'customer' }),
     }
   };
   ```

2. **Parallel Testing**
   ```json
   // jest.config.js
   {
     "maxWorkers": "50%",
     "testMatch": ["**/__tests__/**/*.test.ts?(x)"],
     "projects": [
       {
         "displayName": "unit",
         "testMatch": ["<rootDir>/src/**/*.unit.test.ts"]
       },
       {
         "displayName": "integration",
         "testMatch": ["<rootDir>/src/**/*.integration.test.ts"]
       }
     ]
   }
   ```

### Phase 3: Advanced Testing (Month 4-6)
1. **Visual Regression Testing**
   ```typescript
   // Using Percy or Chromatic
   test('visual: dashboard layout', async ({ page }) => {
     await page.goto('/dashboard');
     await percySnapshot(page, 'Dashboard');
   });
   ```

2. **Performance Testing**
   ```typescript
   // Web Vitals monitoring
   test('performance: LCP < 2.5s', async ({ page }) => {
     const metrics = await page.evaluate(() => 
       performance.getEntriesByType('paint')
     );
     expect(metrics.lcp).toBeLessThan(2500);
   });
   ```

3. **Contract Testing**
   ```typescript
   // Using Pact or similar
   describe('API Contracts', () => {
     test('user endpoint contract', async () => {
       await pact.verify({
         provider: 'UserService',
         consumer: 'Frontend',
       });
     });
   });
   ```

## Advanced Patterns

### 1. Test Context Pattern
```typescript
// Reusable test contexts
export function setupAuthContext() {
  const user = userBuilder();
  const token = generateToken(user);
  
  beforeEach(() => {
    localStorage.setItem('token', token);
    server.use(
      rest.get('/api/user', (req, res, ctx) => {
        return res(ctx.json(user));
      })
    );
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  return { user, token };
}

// Usage
describe('Authenticated features', () => {
  const { user } = setupAuthContext();
  
  test('shows user name', () => {
    // Test implementation
  });
});
```

### 2. Custom Testing Utilities
```typescript
// test-utils.tsx
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }
  
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
```

### 3. Async Testing Patterns
```typescript
// Proper async handling
test('async operation', async () => {
  render(<AsyncComponent />);
  
  // Wait for specific element
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
  
  // Or use findBy (combines getBy + waitFor)
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});
```

## Quality Gates

### PR Requirements
- [ ] All tests pass (unit, integration, smoke E2E)
- [ ] Code coverage ≥80% for changed files
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size impact <10KB
- [ ] Performance metrics maintained
- [ ] At least one reviewer approval

### Deployment Gates
```yaml
# Staging deployment
- Run full E2E suite
- Run performance tests
- Run accessibility audit
- Security scan

# Production deployment
- All staging checks pass
- Visual regression approved
- Load test results acceptable
- Rollback plan documented
```

## Security Testing Framework

### Required Security Test Categories

**1. XSS Prevention Suite**:

```typescript
// Test all user input rendering points
describe('XSS Protection', () => {
  const xssVectors = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;', // HTML entities
  ];

  test.each(xssVectors)('sanitizes XSS vector: %s', (payload) => {
    const { container } = render(<UserContent content={payload} />);
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('onerror=');
    expect(container.querySelector('script')).toBeNull();
  });

  test('uses DOMPurify for rich content', () => {
    const richContent = '<b>Bold</b><script>alert(1)</script>';
    const { container } = render(<RichText html={richContent} />);
    expect(container.querySelector('b')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });
});
```

**2. CSRF Protection**:

```typescript
describe('CSRF Protection', () => {
  test('includes CSRF token in POST requests', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    await api.updateUser({ name: 'test' });
    
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': expect.stringMatching(/^[a-f0-9]{64}$/)
        })
      })
    );
  });

  test('rejects requests without CSRF token', async () => {
    server.use(
      rest.post('/api/user', (req, res, ctx) => {
        if (!req.headers.get('X-CSRF-Token')) {
          return res(ctx.status(403), ctx.json({ error: 'CSRF token missing' }));
        }
      })
    );

    await expect(api.updateUser({ name: 'test' })).rejects.toThrow();
  });
});
```

**3. Authentication & Session Management**:

```typescript
describe('Authentication Security', () => {
  test('clears all sensitive data on logout', () => {
    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    sessionStorage.setItem('tempData', 'xyz');

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('tempData')).toBeNull();
  });

  test('redirects to login when token expired', async () => {
    vi.spyOn(jwt, 'decode').mockReturnValue({ exp: Date.now() / 1000 - 1 });
    render(<App />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  test('auto-refreshes token before expiry', async () => {
    vi.useFakeTimers();
    const refreshSpy = vi.spyOn(auth, 'refreshToken');
    
    render(<App />);
    vi.advanceTimersByTime(14 * 60 * 1000); // 14 minutes
    
    await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
    vi.useRealTimers();
  });
});
```

**4. Sensitive Data Protection**:

```typescript
describe('Data Protection', () => {
  test('never stores passwords in localStorage', () => {
    const loginForm = render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' }
    });
    
    expect(localStorage.getItem('password')).toBeNull();
    expect(sessionStorage.getItem('password')).toBeNull();
  });

  test('masks credit card numbers', () => {
    render(<PaymentForm card="4111111111111111" />);
    expect(screen.queryByText('4111111111111111')).not.toBeInTheDocument();
    expect(screen.getByText('**** **** **** 1111')).toBeInTheDocument();
  });

  test('excludes sensitive data from URL parameters', () => {
    const navigate = vi.fn();
    render(<App navigate={navigate} />);
    
    fireEvent.submit(screen.getByRole('form'));
    
    expect(navigate).not.toHaveBeenCalledWith(
      expect.stringContaining('password=')
    );
    expect(navigate).not.toHaveBeenCalledWith(
      expect.stringContaining('token=')
    );
  });
});
```

**5. Content Security Policy (E2E)**:

```typescript
test('enforces strict CSP headers', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  
  // Test CSP violations are reported
  const violations: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('CSP')) violations.push(msg.text());
  });
  
  await page.evaluate(() => {
    // Attempt to execute inline script (should be blocked)
    const script = document.createElement('script');
    script.textContent = 'console.log("inline")';
    document.body.appendChild(script);
  });
  
  expect(violations.length).toBeGreaterThan(0);
});
```

**6. Dependency Security**:

```typescript
// In CI pipeline
describe('Dependency Security', () => {
  test('no high/critical vulnerabilities', async () => {
    const { stdout } = await execa('npm', ['audit', '--json']);
    const audit = JSON.parse(stdout);
    
    expect(audit.metadata.vulnerabilities.high).toBe(0);
    expect(audit.metadata.vulnerabilities.critical).toBe(0);
  });

  test('all dependencies have valid licenses', () => {
    const licenses = require('license-checker');
    const banned = ['GPL', 'AGPL', 'LGPL'];
    
    // Check no copyleft licenses in production deps
    expect(Object.values(licenses).every(
      pkg => !banned.some(b => pkg.licenses.includes(b))
    )).toBe(true);
  });
});
```

### Security Testing Integration

**Pre-commit Hooks**:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run security:check"
    }
  },
  "scripts": {
    "security:check": "npm audit --audit-level=high && eslint-plugin-security"
  }
}
```

**CI Security Gates**:

```yaml
# .github/workflows/security.yml
security-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Run OWASP Dependency Check
      run: npm audit --audit-level=high
      
    - name: Run XSS tests
      run: npm test -- --grep "XSS"
      
    - name: Run CSRF tests
      run: npm test -- --grep "CSRF"
      
    - name: Check CSP headers
      run: npm run test:e2e -- tests/security/csp.spec.ts
      
    - name: Scan for secrets
      uses: trufflesecurity/trufflehog@main
```

## Monitoring & Observability

### Development Metrics

```typescript
// Track test metrics
interface TestMetrics {
  executionTime: number;
  flakyTests: string[];
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  securityTests: {
    xss: number;
    csrf: number;
    auth: number;
    total: number;
  };
}
```

### Production Monitoring
```javascript
// Real User Monitoring (RUM)
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});

// Custom metrics
window.addEventListener('load', () => {
  // Track Core Web Vitals
  if (performance.getEntriesByType) {
    const navigationTiming = performance.getEntriesByType('navigation')[0];
    analytics.track('page_load_time', {
      duration: navigationTiming.loadEventEnd - navigationTiming.fetchStart
    });
  }
});
```

## Team Guidelines

### Code Review Checklist
- [ ] Tests cover happy path and error cases
- [ ] No hardcoded test data (use builders/fixtures)
- [ ] Tests are isolated (no interdependencies)
- [ ] Meaningful test descriptions
- [ ] No commented-out tests
- [ ] Performance impact considered

### Documentation Requirements
- README includes testing instructions
- Complex test utilities are documented
- Test strategy decisions are recorded in ADRs
- Flaky test investigations are documented

## Tooling Stack

| Category | Primary Tool | Alternative | When to Use |
|----------|-------------|-------------|-------------|
| Unit/Integration | Jest + RTL | Vitest | Vitest for Vite projects |
| E2E | Playwright | Cypress | Cypress for better DX |
| Visual Regression | Percy | Chromatic | Chromatic for Storybook |
| API Mocking | MSW | Mirage | Mirage for GraphQL |
| Performance | Lighthouse CI | WebPageTest | WPT for detailed analysis |
| Monitoring | Sentry | DataDog | DataDog for APM |
| Analytics | Mixpanel | Amplitude | Amplitude for cohorts |

## Cost-Benefit Analysis

### Investment
- 30-40% of development time
- 2-3 dedicated QA engineers
- $500-2000/month in tooling
- 1 week quarterly for test maintenance

### Returns
- 85% reduction in production bugs
- 60% faster release cycles
- 95% reduction in regression bugs
- 40% reduction in support tickets
- Ability to confidently refactor

## Migration from Small to Medium

1. **Month 1**: Add feature folders, introduce MSW
2. **Month 2**: Implement CI quality gates
3. **Month 3**: Add visual regression tests
4. **Month 4**: Introduce performance budgets
5. **Month 5**: Add contract testing
6. **Month 6**: Full monitoring suite

## Red Flags to Watch

- Test suite takes >10 minutes
- Flaky test rate >5%
- Coverage decreasing over time
- Teams skipping tests to meet deadlines
- E2E tests breaking frequently
- No one owns test infrastructure
