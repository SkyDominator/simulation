# Frontend Testing Quick Reference

**Updated**: 2025-10-01

## File Guide

```text
.memo/TDD/
├── frontend-test-strategy-small.md         # 1-10 devs, <100k users
├── frontend-test-strategy-medium.md        # 10-50 devs, 100k-1M users
├── frontend-test-strategy-enterprise.md    # 50+ devs, 1M+ users
├── FRONTEND-TEST-TECHNICAL-REFERENCE.md    # Comprehensive technical specs
├── test-templates.md                       # 19 copy-paste test templates
├── fix-markdown-lint.ps1                   # Linting automation
└── IMPLEMENTATION-SUMMARY.md               # This summary
```

## Quick Start

### 1. Choose Your Scale

- **Small** (MVP, <10 devs): 60-70% coverage, focus on critical paths
- **Medium** (Growing, 10-50 devs): 80% coverage, full test layers
- **Enterprise** (50+ devs): 90% coverage, compliance, monitoring

### 2. Setup Testing Environment

```bash
# Install dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event
npm install -D @playwright/test msw
npm install -D @pact-foundation/pact vitest-axe

# Configure Vitest
# See: FRONTEND-TEST-TECHNICAL-REFERENCE.md > Tool Configuration

# Configure Playwright
npx playwright install
```

### 3. Start With Templates

Open `test-templates.md` and copy the template that matches your needs:

- **Unit Test**: Template #1-4
- **Integration Test**: Template #5-6
- **E2E Test**: Template #7-8
- **Security Test**: Template #9-11
- **Accessibility Test**: Template #12-13
- **Contract Test**: Template #14-15
- **Performance Test**: Template #16-17

### 4. Follow Security Checklist

From enterprise strategy file:

- [ ] XSS: Test 20+ attack vectors
- [ ] CSRF: Validate 64-char tokens
- [ ] Auth: JWT expiry + auto-refresh
- [ ] CSP: Strict policy with nonce
- [ ] Deps: npm audit (zero high/critical)
- [ ] Sensitive data: No localStorage storage

## Test Patterns by Type

### Unit Test Pattern

```typescript
import { describe, test, expect } from 'vitest';

describe('ComponentName', () => {
  test('does expected behavior', () => {
    // Arrange: Setup
    const input = 'test';
    
    // Act: Execute
    const result = functionUnderTest(input);
    
    // Assert: Verify
    expect(result).toBe('expected');
  });
});
```

### Integration Test Pattern (MSW)

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: 'mocked' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can complete flow', async ({ page }) => {
  await page.goto('/start');
  await page.click('[data-testid="next-button"]');
  await expect(page).toHaveURL('/complete');
});
```

### Security Test Pattern

```typescript
const XSS_VECTORS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
];

test.each(XSS_VECTORS)('blocks XSS: %s', (vector) => {
  const { container } = render(<Component input={vector} />);
  expect(container.querySelector('script')).toBeNull();
});
```

## Coverage Targets

| Scale | Overall | Critical Paths | Security | Accessibility |
|-------|---------|----------------|----------|---------------|
| Small | 60-70% | 90%+ | 100% | WCAG AA |
| Medium | 80% | 95%+ | 100% | WCAG AA |
| Enterprise | 90% | 100% | 100% | WCAG AAA |

## Performance Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP | <2.5s | 2.5-4s | >4s |
| FID | <100ms | 100-300ms | >300ms |
| CLS | <0.1 | 0.1-0.25 | >0.25 |
| Test Execution | <2min | 2-10min | >10min |
| Bundle Size | <500KB | 500KB-1MB | >1MB |

## Security Test Checklist

### XSS Prevention

```typescript
✓ Script injection: <script>alert(1)</script>
✓ Event handlers: <img src=x onerror=alert(1)>
✓ JavaScript protocol: javascript:alert(1)
✓ HTML entities: &#x3C;script&#x3E;
✓ URL encoding: %3Cscript%3E
✓ DOMPurify config with ALLOWED_TAGS
```

### CSRF Protection

```typescript
✓ Token format: 64-char hex
✓ Token in X-CSRF-Token header
✓ Token rotation after sensitive ops
✓ SameSite=Strict cookies
✓ Reject requests without token
```

### Authentication

```typescript
✓ JWT expiry (15min access, 7d refresh)
✓ Auto-refresh (2min before expiry)
✓ Session timeout (30min inactivity)
✓ Account lockout (5 failed attempts)
✓ Secure logout (clear all data)
```

### Content Security Policy

```typescript
✓ default-src 'self'
✓ script-src 'self' 'nonce-{random}'
✓ No 'unsafe-inline' or 'unsafe-eval'
✓ frame-ancestors 'none'
✓ CSP violation reporting
```

## Contract Testing Workflow

```typescript
// 1. Consumer defines expectations
pact
  .given('user exists')
  .uponReceiving('get user request')
  .withRequest({ method: 'GET', path: '/users/1' })
  .willRespondWith({ status: 200, body: { id: 1 } })

// 2. Generate pact file
await pact.executeTest(async (mockServer) => {
  const api = new UserAPI(mockServer.url);
  const user = await api.getUser(1);
  expect(user.id).toBe(1);
});

// 3. Publish to Pact Broker
npx pact-broker publish ./pacts

// 4. Provider verifies
npx pact-broker can-i-deploy --pacticipant=FrontendApp
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      # Unit + Integration
      - run: npm ci
      - run: npm run test -- --coverage
      
      # E2E
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      # Security
      - run: npm audit --audit-level=high
      - run: npm run test -- --grep "XSS|CSRF|Auth"
      
      # Coverage
      - uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true
```

## Common Patterns

### Test Data Builder

```typescript
export const userBuilder = build('User', {
  fields: {
    id: sequence(),
    email: fake(f => f.internet.email()),
    name: fake(f => f.name.fullName()),
  },
});

const user = userBuilder();
const admin = userBuilder({ overrides: { role: 'admin' } });
```

### Page Object Model

```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }
}

// Usage
const login = new LoginPage(page);
await login.login('user@test.com', 'pass');
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

test('no a11y violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Troubleshooting

### Flaky Tests

**Cause**: Race conditions, timing issues  
**Fix**: Use `waitFor`, `findBy` queries, `vi.useFakeTimers()`

### Slow Tests

**Cause**: Real API calls, large data sets  
**Fix**: Mock network with MSW, use minimal fixtures

### False Positives

**Cause**: Testing implementation details  
**Fix**: Test user behavior, use specific matchers

## Resources

### Documentation

- **Small Scale**: `.memo/TDD/frontend-test-strategy-small.md`
- **Medium Scale**: `.memo/TDD/frontend-test-strategy-medium.md`
- **Enterprise**: `.memo/TDD/frontend-test-strategy-enterprise.md`
- **Technical Ref**: `.memo/TDD/FRONTEND-TEST-TECHNICAL-REFERENCE.md`
- **Templates**: `.memo/TDD/test-templates.md`

### Tools

- **Unit/Integration**: Vitest, Jest, React Testing Library
- **E2E**: Playwright, Cypress
- **Security**: OWASP Dependency Check, npm audit
- **Accessibility**: vitest-axe, axe-core
- **Performance**: Lighthouse, Web Vitals
- **Contract**: Pact, OpenAPI Validator

### External References

- Martin Fowler: https://martinfowler.com/testing/
- Playwright: https://playwright.dev/docs/best-practices
- Testing Library: https://testing-library.com/docs/
- OWASP: https://owasp.org/www-project-web-security-testing-guide/
- Pact: https://docs.pact.io/

## Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test path/to/test.spec.ts

# Run tests matching pattern
npm test -- --grep "XSS|CSRF"

# Run E2E tests
npm run test:e2e

# Run E2E in debug mode
npx playwright test --debug

# Check bundle size
npm run build
ls -lh dist/assets/*.js

# Audit dependencies
npm audit
npm audit --audit-level=high

# Fix markdown linting
.\.memo\TDD\fix-markdown-lint.ps1
```

## Keyboard Shortcuts (Vitest UI)

```text
npm run test:ui

Then in browser:
- r: Re-run tests
- f: Filter by file name
- t: Filter by test name
- c: Clear console
- w: Watch mode
```

## Next Steps

1. ✅ Read this quick reference
2. ✅ Choose your scale (small/medium/enterprise)
3. ✅ Setup testing environment
4. ✅ Copy template from `test-templates.md`
5. ✅ Write first test
6. ✅ Run tests locally
7. ✅ Setup CI/CD
8. ✅ Achieve coverage targets
9. ✅ Add security tests
10. ✅ Setup contract testing

## Questions?

Refer to:

- **How to write tests?** → `test-templates.md`
- **What to test?** → Strategy files (small/medium/enterprise)
- **Technical details?** → `FRONTEND-TEST-TECHNICAL-REFERENCE.md`
- **Security patterns?** → Enterprise strategy > Security Testing Framework
- **Contract testing?** → Enterprise strategy > Contract Testing

---

**Remember**: Test user-visible behavior, not implementation details. Focus on critical paths. Keep tests fast and maintainable. Security is non-negotiable.
