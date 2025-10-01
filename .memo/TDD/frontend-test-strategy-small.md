# Frontend Test Strategy - Small Scale Apps

## Overview
**Target**: MVP to small production apps, 1-10 developers, <100k users  
**Goal**: Maximum confidence with minimum maintenance overhead  
**Time Budget**: 20-30% of development time on testing

## Core Principles

1. **Test the Critical Path First**: Focus on user journeys that directly impact revenue or core functionality
2. **Manual Testing is Valid**: For rarely-used features, manual testing may be more cost-effective
3. **Pragmatic Coverage**: Aim for 60-70% code coverage, 100% critical path coverage
4. **Fast Feedback Loop**: Tests should run in <2 minutes locally

## Test Pyramid for Small Apps

```
         E2E (5%)
        /        \
    Integration (25%)
   /                \
  Unit Tests (70%)
```

## Priority Matrix

### P0 - MUST HAVE (Week 1)
Focus on what breaks the business if it fails.

#### 1. Critical Business Logic (Unit Tests)
```typescript
// Examples to test:
- Authentication/authorization logic
- Payment calculations
- Data validation/sanitization
- Core business rules (e.g., pricing, permissions)

// Tools: Vitest + React Testing Library
// Target: 90% coverage of critical functions
```

#### 2. Happy Path E2E (1-3 tests)
```typescript
// Core user journeys:
test('User can complete purchase', async ({ page }) => {
  // Login → Browse → Add to Cart → Checkout → Confirm
});

test('User can sign up and access dashboard', async ({ page }) => {
  // Register → Verify Email → Login → See Dashboard
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
```typescript
// Mock backend responses, test error handling
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

## Checklist for New Features

- [ ] Unit tests for business logic (Vitest)
- [ ] Component renders without errors (Vitest + RTL)
- [ ] Happy path works (manual test if not critical)
- [ ] Error states handled gracefully
- [ ] Accessibility: keyboard navigation works
- [ ] No console errors in development
- [ ] Works on mobile viewport

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
