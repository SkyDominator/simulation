# Frontend Test Templates

**Purpose**: Copy-paste ready test templates for common testing scenarios

## Unit Test Templates

### 1. Pure Function Test

```typescript
import { describe, test, expect } from 'vitest';
import { calculateTax } from './utils';

describe('calculateTax', () => {
  test('calculates tax correctly', () => {
    // Arrange
    const amount = 100;
    const rate = 0.08;
    
    // Act
    const result = calculateTax(amount, rate);
    
    // Assert
    expect(result).toBe(108);
  });
  
  test('handles zero tax rate', () => {
    expect(calculateTax(100, 0)).toBe(100);
  });
  
  test('handles negative amounts', () => {
    expect(() => calculateTax(-100, 0.08)).toThrow('Amount must be positive');
  });
  
  test.each([
    [100, 0.08, 108],
    [200, 0.10, 220],
    [50, 0.05, 52.5],
  ])('calculateTax(%i, %f) = %f', (amount, rate, expected) => {
    expect(calculateTax(amount, rate)).toBe(expected);
  });
});
```

### 2. React Component Test (Basic)

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  test('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  test('applies variant styles', () => {
    const { container } = render(<Button variant="primary">Click me</Button>);
    expect(container.firstChild).toHaveClass('btn-primary');
  });
});
```

### 3. Custom Hook Test

```typescript
import { describe, test, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  test('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });
  
  test('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });
  
  test('increments counter', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
  
  test('decrements counter', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });
  
  test('resets counter', () => {
    const { result } = renderHook(() => useCounter(10));
    
    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });
    
    expect(result.current.count).toBe(10);
  });
});
```

### 4. Async Function Test

```typescript
import { describe, test, expect, vi } from 'vitest';
import { fetchUserData } from './api';

describe('fetchUserData', () => {
  test('fetches user data successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'John' }),
    });
    global.fetch = mockFetch;
    
    const result = await fetchUserData(1);
    
    expect(result).toEqual({ id: 1, name: 'John' });
    expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
  });
  
  test('handles fetch errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    await expect(fetchUserData(1)).rejects.toThrow('Network error');
  });
  
  test('handles HTTP errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    
    await expect(fetchUserData(999)).rejects.toThrow('404: Not Found');
  });
});
```

## Integration Test Templates

### 5. Component with API Integration

```typescript
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { UserProfile } from './UserProfile';

const server = setupServer(
  rest.get('/api/user/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserProfile Integration', () => {
  test('loads and displays user data', async () => {
    render(<UserProfile userId="123" />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });
  
  test('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/user/:id', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading user/i)).toBeInTheDocument();
    });
  });
  
  test('displays retry button on error', async () => {
    server.use(
      rest.get('/api/user/:id', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

### 6. Form with Validation Integration

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm Integration', () => {
  test('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
  });
  
  test('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
  
  test('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    
    render(<LoginForm onSubmit={onSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });
});
```

## E2E Test Templates

### 7. Basic E2E Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Login Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="submit-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toContainText('John Doe');
  });
  
  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    await expect(page).toHaveURL('/login');
  });
});
```

### 8. E2E with Page Object Model

```typescript
import { test, expect, Page } from '@playwright/test';

class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit-button"]');
  }
  
  async getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]');
  }
}

class DashboardPage {
  constructor(private page: Page) {}
  
  async getUserName() {
    return this.page.locator('[data-testid="user-name"]');
  }
  
  async logout() {
    await this.page.click('[data-testid="logout-button"]');
  }
}

test.describe('Login Flow with POM', () => {
  test('successful login and logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(await dashboardPage.getUserName()).toContainText('John Doe');
    
    await dashboardPage.logout();
    await expect(page).toHaveURL('/login');
  });
});
```

## Security Test Templates

### 9. XSS Prevention Test

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserComment } from './UserComment';

describe('XSS Prevention', () => {
  const XSS_PAYLOADS = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
  ];
  
  test.each(XSS_PAYLOADS)('sanitizes XSS payload: %s', (payload) => {
    const { container } = render(<UserComment content={payload} />);
    
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('onerror=');
    expect(container.innerHTML).not.toContain('onload=');
  });
  
  test('allows safe HTML tags', () => {
    const safeHTML = '<b>Bold</b> and <i>italic</i> text';
    render(<UserComment content={safeHTML} />);
    
    expect(screen.getByText(/Bold/)).toBeInTheDocument();
    expect(screen.getByText(/italic/)).toBeInTheDocument();
  });
});
```

### 10. CSRF Protection Test

```typescript
import { describe, test, expect, vi } from 'vitest';
import { updateUserProfile } from './api';

describe('CSRF Protection', () => {
  test('includes CSRF token in mutations', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    
    await updateUserProfile({ name: 'John Doe' });
    
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
  });
  
  test('rejects requests without CSRF token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'CSRF token required' }),
    });
    
    await expect(updateUserProfile({ name: 'John' })).rejects.toThrow();
  });
});
```

### 11. Authentication Test

```typescript
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';

describe('Authentication', () => {
  test('redirects to login when not authenticated', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));
    
    render(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
  
  test('clears session data on logout', async () => {
    localStorage.setItem('token', 'abc123');
    sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
    
    const { getByRole } = render(<App />);
    fireEvent.click(getByRole('button', { name: /logout/i }));
    
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });
  
  test('handles token expiry', async () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    
    const expiredToken = generateToken({ exp: Math.floor(Date.now() / 1000) - 100 });
    
    const response = await makeAuthenticatedRequest(expiredToken);
    
    expect(response.status).toBe(401);
  });
});
```

## Accessibility Test Templates

### 12. Basic Accessibility Test

```typescript
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { LoginForm } from './LoginForm';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  test('form inputs have labels', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
  
  test('error messages are announced to screen readers', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
  });
});
```

### 13. Keyboard Navigation Test

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationMenu } from './NavigationMenu';

describe('Keyboard Navigation', () => {
  test('navigates through menu items with Tab', async () => {
    const user = userEvent.setup();
    render(<NavigationMenu />);
    
    const items = screen.getAllByRole('menuitem');
    
    items[0].focus();
    expect(items[0]).toHaveFocus();
    
    await user.tab();
    expect(items[1]).toHaveFocus();
    
    await user.tab();
    expect(items[2]).toHaveFocus();
  });
  
  test('activates menu item with Enter key', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    
    render(<NavigationMenu onItemClick={onClick} />);
    
    const item = screen.getByRole('menuitem', { name: /home/i });
    item.focus();
    
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
  
  test('closes modal with Escape key', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    
    render(<Modal isOpen onClose={onClose}>Content</Modal>);
    
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

## Contract Test Templates

### 14. Pact Consumer Test

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, string, integer } = MatchersV3;

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
        headers: { 'Accept': 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: integer(123),
          name: string('John Doe'),
          email: string('john@example.com'),
          roles: eachLike('user'),
        },
      })
      .executeTest(async (mockServer) => {
        const api = new UserAPI(mockServer.url);
        const user = await api.getUser(123);
        
        expect(user.id).toBe(123);
        expect(user.name).toBe('John Doe');
      });
  });
});
```

### 15. OpenAPI Schema Validation

```typescript
import { describe, test, expect } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';

describe('OpenAPI Contract', () => {
  let apiSpec: any;
  
  beforeAll(async () => {
    apiSpec = await SwaggerParser.validate('./openapi.yaml');
  });
  
  test('response matches schema', async () => {
    const response = await fetch('/api/users/123');
    const data = await response.json();
    
    const schema = apiSpec.paths['/users/{id}'].get.responses['200']
      .content['application/json'].schema;
    
    const validation = validateAgainstSchema(data, schema);
    expect(validation.valid).toBe(true);
  });
});
```

## Performance Test Templates

### 16. Core Web Vitals Test

```typescript
import { test, expect } from '@playwright/test';
import { getCLS, getFID, getLCP } from 'web-vitals';

test('meets Core Web Vitals thresholds', async ({ page }) => {
  await page.goto('/');
  
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
  
  expect(metrics.lcp).toBeLessThan(2500); // 2.5s
  expect(metrics.fid).toBeLessThan(100);   // 100ms
  expect(metrics.cls).toBeLessThan(0.1);   // 0.1
});
```

### 17. Bundle Size Test

```typescript
import { describe, test, expect } from 'vitest';
import { stat } from 'fs/promises';
import { gzipSize } from 'gzip-size';

describe('Bundle Size', () => {
  test('main bundle is under 500KB', async () => {
    const bundlePath = './dist/assets/index.js';
    const stats = await stat(bundlePath);
    
    expect(stats.size).toBeLessThan(500 * 1024);
  });
  
  test('gzipped bundle is under 150KB', async () => {
    const bundlePath = './dist/assets/index.js';
    const size = await gzipSize.file(bundlePath);
    
    expect(size).toBeLessThan(150 * 1024);
  });
});
```

## Mock Data Templates

### 18. Test Data Builder

```typescript
import { build, sequence, fake, oneOf } from '@jackfranklin/test-data-bot';

export const userBuilder = build('User', {
  fields: {
    id: sequence(),
    email: fake(f => f.internet.email()),
    name: fake(f => f.name.fullName()),
    role: oneOf('admin', 'user', 'guest'),
    createdAt: fake(f => f.date.past()),
    isActive: true,
  },
});

export const productBuilder = build('Product', {
  fields: {
    id: sequence(n => `PROD-${n.toString().padStart(6, '0')}`),
    name: fake(f => f.commerce.productName()),
    price: fake(f => parseFloat(f.commerce.price())),
    inStock: true,
    category: oneOf('electronics', 'clothing', 'books'),
  },
});

// Usage
const user = userBuilder();
const admin = userBuilder({ overrides: { role: 'admin' } });
const users = userBuilder({ count: 10 });
```

### 19. MSW Handler Template

```typescript
import { rest } from 'msw';

export const handlers = [
  // Success case
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: req.params.id,
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  }),
  
  // Error case
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ error: 'User not found' })
    );
  }),
  
  // Network delay
  rest.get('/api/slow', (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.json({ message: 'Slow response' })
    );
  }),
  
  // Mutation
  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 123,
        ...body,
        createdAt: new Date().toISOString(),
      })
    );
  }),
];
```

## Tips for Using Templates

1. **Replace placeholders**: Update component names, API paths, and test data
2. **Add context**: Include describe blocks with clear test categories
3. **Use meaningful names**: Test names should describe expected behavior
4. **Keep DRY**: Extract common setup to beforeEach/beforeAll
5. **Test behavior, not implementation**: Focus on user-visible outcomes
6. **Use data-testid**: For stable selectors in E2E tests
7. **Mock at boundaries**: Network layer for integration, component level for unit
8. **Clean up**: Use afterEach/afterAll for cleanup to prevent test pollution
