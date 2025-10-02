# Frontend Test Strategy - Small Scale Apps

## Overview
**Target**: MVP to small production apps, 1-10 developers, <100k users  
**Goal**: Maximum confidence with minimum maintenance overhead  
**Time Budget**: 20-30% of development time on testing

## Core Principles

1. **Test User-Visible Behavior**: Avoid implementation details, test what users see/interact with
2. **Test Isolation**: Each test independent with own storage/session/data/cookies
3. **Fast Feedback**: Tests run <2min locally, fail fast on errors
4. **Pragmatic Coverage**: 60-70% overall, 90%+ critical paths, skip trivial code (getters/setters)
5. **Testability First**: Add `data-testid` to ALL components for reliable E2E/integration tests
6. **Dependency Injection**: Use DI patterns and decoupled code for easy mocking
7. **Mock External Dependencies**: Use MSW for API mocking, avoid real network calls in tests
8. **CI Optimized**: Disable video recording, traces, and screenshots in CI for faster execution

## Testability Architecture

### 1. Add Test IDs to ALL Components

**Rule**: Every interactive element MUST have a `data-testid` attribute.

```typescript
// ✅ Good - All elements have test IDs
<button data-testid="submit-button" onClick={handleSubmit}>
  Submit
</button>

<input 
  data-testid="email-input"
  type="email" 
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<form data-testid="login-form" onSubmit={handleLogin}>
  <input data-testid="username-input" />
  <input data-testid="password-input" />
  <button data-testid="login-submit">Login</button>
</form>

// ❌ Bad - No test IDs
<button onClick={handleSubmit}>Submit</button>
<input type="email" value={email} />
```

### 2. Dependency Injection for Testability

**Rule**: Inject dependencies via props/context, not import directly.

```typescript
// ✅ Good - Injectable API client
interface UserServiceProps {
  apiClient: ApiClient;
}

export const UserService = ({ apiClient }: UserServiceProps) => {
  const fetchUsers = () => apiClient.get('/users');
  return { fetchUsers };
};

// In tests: mock the apiClient
const mockClient = { get: vi.fn() };
const service = UserService({ apiClient: mockClient });

// ❌ Bad - Hard-coded dependency
import { apiClient } from './api';
export const UserService = () => {
  const fetchUsers = () => apiClient.get('/users'); // Can't mock in tests
};
```

### 3. Decoupled Code for Mocking

**Rule**: Separate concerns, use interfaces, avoid tight coupling.

```typescript
// ✅ Good - Decoupled, testable
interface IAuthService {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
}

interface Props {
  authService: IAuthService;
}

export const LoginForm = ({ authService }: Props) => {
  const handleSubmit = async () => {
    await authService.login(email, password);
  };
};

// In tests: provide mock implementation
const mockAuthService: IAuthService = {
  login: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  logout: vi.fn().mockResolvedValue(undefined),
};

// ❌ Bad - Tightly coupled
import { login } from './auth'; // Can't easily mock

export const LoginForm = () => {
  const handleSubmit = async () => {
    await login(email, password); // Direct function call
  };
};
```

## Test Pyramid for Small Apps

```text
         E2E (5%)        # Critical user journeys only
        /        \
    Integration (25%)    # API + component interactions
   /                \
  Unit Tests (70%)       # Business logic + utilities
```

**Rationale**: More unit tests = faster execution, easier debugging, better regression safety

## Priority Matrix

### P0 - MUST HAVE (Week 1)
Focus on what breaks the business if it fails.

#### 1. Critical Business Logic (Unit Tests)

**What to Test**:
- Auth/authorization logic: token validation, role checks, session handling
- Payment calculations: pricing, discounts, tax, currency conversion
- Data validation: input sanitization (XSS prevention), format checks, range validation
- Business rules: state machines, permissions, workflow logic

**Technical Requirements**:
- Tools: Vitest + React Testing Library
- Coverage: 90%+ for critical functions, 100% for security-sensitive code
- Test structure: Arrange-Act-Assert pattern
- Mocking: Mock external dependencies (APIs, localStorage, timers)
- Assertions: Test return values + side effects (state changes, function calls)

**Example Pattern**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { validatePayment, calculateTax } from './payment';

describe('Payment Logic', () => {
  it('rejects negative amounts', () => {
    expect(() => validatePayment(-100)).toThrow('Amount must be positive');
  });
  
  it('calculates tax correctly for US', () => {
    expect(calculateTax(100, 'US', 'CA')).toBe(107.25); // 7.25% CA sales tax
  });
});
```

#### 2. Happy Path E2E (1-3 tests)

**Testability Requirements**:

- **Add `data-testid` to ALL interactive elements**: buttons, inputs, forms, links
- **Use semantic selectors first**: `getByRole`, `getByLabelText`, then fall back to `data-testid`
- **CI Configuration**: Disable video, traces, and screenshots for faster execution

```typescript
// playwright.config.ts - CI optimized
export default defineConfig({
  use: {
    trace: 'off',          // Disabled for CI speed
    video: 'off',          // Disabled for CI speed
    screenshot: 'off',     // Disabled for CI speed
  },
});

// Core user journeys using data-testid:
test('User can complete purchase', async ({ page }) => {
  // Use data-testid for reliable selectors
  await page.click('[data-testid="login-button"]');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="submit-button"]');
  
  // Navigate and interact
  await page.click('[data-testid="product-card-1"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout-button"]');
  await page.click('[data-testid="confirm-order"]');
  
  // Assert success
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});

// Tool: Playwright
// Frequency: Run on every PR
```

#### 3. Component Smoke Tests
```typescript
// Test that key components render without crashing
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('App Components', () => {
  it('App renders without crashing', () => {
    render(<App />);
  });
  
  it('Critical forms accept input', () => {
    // Login form, checkout form, etc.
  });
});
```

### P1 - SHOULD HAVE (Month 1)

#### 4. API Integration Tests

**Dependency Injection & Mocking**:

- **Use MSW (Mock Service Worker)** for all API mocking
- **No real network calls** in tests
- **Inject API clients** via props/context for testability

```typescript
// Setup MSW handlers
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json({ users: [{ id: 1, name: 'John' }] }));
  }),
  rest.post('/api/login', (req, res, ctx) => {
    return res(ctx.status(401), ctx.json({ error: 'Invalid credentials' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test with mocked API
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

it('handles API errors gracefully', async () => {
  server.use(
    rest.get('/api/user', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  render(<UserProfile />);
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});

// Tool: MSW (Mock Service Worker) with Vitest
```

#### 5. Critical Component Unit Tests
```typescript
// Test components with complex logic
- Forms with validation
- Data tables with sorting/filtering
- Components with significant state management
```

#### 6. Accessibility Basics
```typescript
// Automated a11y checks
import { it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<App />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### P2 - NICE TO HAVE (Month 2+)

- Visual regression tests (key pages only)
- Performance monitoring (manual checks)
- Cross-browser testing (manual on 2 main browsers)
- PWA-specific tests (if applicable)

## Implementation Guide

### Week 1: Foundation
```bash
# 1. Setup testing infrastructure
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
npm install --save-dev msw vitest-axe

# 2. Configure test scripts
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:ci": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}

# 3. Add vitest.config.ts
# 4. Add CI pipeline (.github/workflows/test.yml)
```

### Week 2: Critical Tests
1. Write unit tests for authentication logic
2. Write unit tests for core business logic
3. Create 1-2 E2E tests for main user flow
4. Set up basic error boundary tests

### Week 3: Expand Coverage
1. Add integration tests for API calls
2. Test error states and edge cases
3. Add accessibility tests for key forms
4. Document test patterns for team

### Week 4: Monitoring
1. Set up coverage reports
2. Add test status badges to README
3. Configure Sentry for production error tracking
4. Create testing checklist for new features

## File Structure
```
src/
├── __tests__/
│   ├── unit/           # Pure logic tests
│   ├── integration/    # Component + API tests
│   └── utils/          # Test helpers
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx  # Co-located tests
e2e/
├── fixtures/           # Test data
├── pages/             # Page objects
└── specs/             # E2E test specs
```

## Test Patterns

### Component Testing Pattern (Vitest)
```typescript
// Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### API Mocking Pattern (Vitest + MSW)
```typescript
// setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// mocks/handlers.ts
export const handlers = [
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ name: 'John Doe' }));
  }),
];
```

### E2E Page Object Pattern (Playwright)
```typescript
// e2e/pages/LoginPage.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}
```

## Common Pitfalls to Avoid

1. **Over-testing**: Don't test implementation details, test behavior
2. **Flaky tests**: Avoid arbitrary waits, use proper assertions
3. **Slow tests**: Mock external dependencies, use test data builders
4. **Brittle selectors**: Use data-testid, not CSS classes
5. **Testing framework code**: Don't test React/library internals

## Monitoring & Metrics

### Essential Metrics
- **Test execution time**: Should be <2 min for unit/integration
- **Test reliability**: >99% pass rate when code is working
- **Coverage**: 60-70% overall, 90% for critical paths
- **Error rate**: Track via Sentry, aim for <0.1% of sessions

### Simple Monitoring Setup
```javascript
// Basic error tracking
window.addEventListener('error', (event) => {
  // Send to your analytics or logging service
  console.error('Global error:', event.error);
});

// Performance monitoring
if (performance.mark) {
  performance.mark('app-interactive');
  // Log to analytics
}
```

## Security Testing Essentials

### P0 Security Tests (Required for All Apps)

**XSS Prevention**:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DOMPurify from 'dompurify';

describe('XSS Protection', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
  ];

  it.each(xssPayloads)('sanitizes user input: %s', (payload) => {
    const { container } = render(<UserComment comment={payload} />);
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).not.toContain('onerror=');
    expect(container.innerHTML).not.toContain('javascript:');
  });
});
```

**CSRF Token Validation**:

```typescript
describe('CSRF Protection', () => {
  it('includes CSRF token in state-changing requests', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    await submitForm({ data: 'test' });
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': expect.any(String)
        })
      })
    );
  });
});
```

**Authentication State**:

```typescript
describe('Auth Protection', () => {
  it('redirects to login when token expired', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    render(<ProtectedRoute><Dashboard /></ProtectedRoute>);
    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });
  
  it('clears sensitive data on logout', () => {
    const clearSpy = vi.spyOn(Storage.prototype, 'clear');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(clearSpy).toHaveBeenCalled();
  });
});
```

**Safe Rendering**:

```typescript
describe('Safe DOM Manipulation', () => {
  it('uses textContent instead of innerHTML for user data', () => {
    const userName = '<script>alert(1)</script>';
    const { container } = render(<UserProfile name={userName} />);
    
    // Verify React escapes by default
    expect(container.textContent).toContain('<script>');
    expect(container.querySelector('script')).toBeNull();
  });
  
  it('sanitizes HTML if dangerouslySetInnerHTML is required', () => {
    const userHTML = '<b>Hello</b><script>alert(1)</script>';
    const clean = DOMPurify.sanitize(userHTML);
    
    render(<div dangerouslySetInnerHTML={{ __html: clean }} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
```

### Security Headers Validation

**CSP Enforcement** (E2E test):

```typescript
test('enforces Content Security Policy', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain("'unsafe-inline'"); // Avoid unless absolutely necessary
  expect(csp).not.toContain("'unsafe-eval'");
});
```

### Input Validation Tests

```typescript
describe('Input Sanitization', () => {
  it('rejects malicious file uploads', async () => {
    const maliciousFile = new File(['<script>alert(1)</script>'], 'evil.html', {
      type: 'text/html'
    });
    
    await expect(uploadFile(maliciousFile)).rejects.toThrow('Invalid file type');
  });
  
  it('validates email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('<script>@test.com')).toBe(false);
  });
});
```

## Checklist for New Features

- [ ] Unit tests for business logic (Vitest)
- [ ] Component renders without errors (Vitest + RTL)
- [ ] Happy path works (manual test if not critical)
- [ ] Error states handled gracefully
- [ ] Security: XSS protection verified
- [ ] Security: CSRF tokens included in mutations
- [ ] Security: No sensitive data in URLs/localStorage
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: ARIA labels present
- [ ] No console errors in development
- [ ] Works on mobile viewport (320px+)

## Tools Summary

| Category | Tool | Why |
|----------|------|-----|
| Unit/Integration | Vitest + RTL | Fast, Vite-native, excellent DX |
| E2E | Playwright | Fast, reliable, great debugging |
| API Mocking | MSW | Works in tests and dev |
| Accessibility | vitest-axe | Automated a11y checks for Vitest |
| Coverage | Vitest c8 | Built-in coverage support |
| Monitoring | Sentry | Free tier sufficient |

## Vitest Configuration Example

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
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

## Cost-Benefit Analysis

**Investment**: ~20-30% of dev time  
**Return**: 
- 70% reduction in production bugs
- 50% faster feature development (less manual testing)
- 90% reduction in regression bugs
- Confidence to refactor and upgrade dependencies

## Next Steps

1. Start with one critical Playwright E2E test
2. Add Vitest unit tests for new features going forward
3. Gradually increase coverage of existing code
4. Add monitoring before adding more tests
5. Review and adjust strategy quarterly
