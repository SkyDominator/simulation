# Test Plan – Frontend Security Tests (Concrete v1.0)

This covers security-focused tests for the frontend application, including authentication security, XSS prevention, and PWA security features.

Target: Security tests in `src/frontend/src/test/security/` focusing on authentication, XSS prevention, and PWA security.

---

## 1. Scope & Principles

---

**In Scope:**

- Authentication and authorization security
- Token security and session management
- XSS (Cross-Site Scripting) prevention
- PWA (Progressive Web App) security features
- Service worker security
- Cache security
- Input sanitization

**Out of Scope:**

- Backend API security (covered in backend security tests)
- Network-level security (SSL/TLS)
- Browser security features
- Third-party library vulnerabilities

**Test Philosophy:**

- Test security at the UI layer
- Validate input sanitization before API calls
- Ensure tokens are not exposed in DOM or logs
- Verify secure session management
- Test against common attack vectors

---

## 2. Test Category Matrix

---

### 2.1 Authentication Security (CAT-AUTH-SEC)

**Why**: Ensure authentication mechanisms are secure  
**Location**: `src/test/security/auth-security.test.tsx`  
**Cases**:

- AUTH-SEC-001: Block access to protected content without authentication
- AUTH-SEC-002: Allow access to protected content with valid authentication
- AUTH-SEC-003: Handle authentication state changes properly
- AUTH-SEC-004: Not expose tokens in DOM or console
- AUTH-SEC-005: Handle expired tokens properly
- AUTH-SEC-006: Validate token format
- AUTH-SEC-007: Clear sensitive data on logout
- AUTH-SEC-008: Not store sensitive data in localStorage by default
- AUTH-SEC-009: Handle concurrent session validation
- AUTH-SEC-010: Enforce role-based access control
- AUTH-SEC-011: Validate user permissions for specific actions
- AUTH-SEC-012: Include CSRF tokens in API requests

### 2.2 XSS Prevention (CAT-XSS)

**Why**: Prevent Cross-Site Scripting attacks  
**Location**: `src/test/security/xss-prevention.test.tsx`  
**Cases**:

- XSS-001: Escape XSS payloads in React text content
- XSS-002: Safely handle XSS in form inputs
- XSS-003: Prevent XSS in dynamic content rendering
- XSS-004: Safely handle XSS in API responses
- XSS-005: Sanitize user input before API submission
- XSS-006: Prevent javascript: URLs
- XSS-007: Safely handle malicious query parameters
- XSS-008: Handle event handlers safely
- XSS-009: Reject string onClick handlers
- XSS-010: Safely handle dynamic DOM updates
- XSS-011: Prevent prototype pollution in form data

### 2.3 PWA Security (CAT-PWA-SEC)

**Why**: Ensure Progressive Web App features are secure  
**Location**: `src/test/security/pwa-security.test.tsx`  
**Cases**:

- PWA-SEC-001: Register service worker from secure origin only
- PWA-SEC-002: Validate service worker script integrity
- PWA-SEC-003: Handle service worker update securely
- PWA-SEC-004: Prevent service worker privilege escalation
- PWA-SEC-005: Validate cached resource origins
- PWA-SEC-006: Sanitize cache keys
- PWA-SEC-007: Implement cache quota management
- PWA-SEC-008: Prevent cache poisoning attacks
- PWA-SEC-009: Validate PWA manifest security
- PWA-SEC-010: Handle offline data securely
- PWA-SEC-011: Validate offline request integrity

---

## 3. Fixtures & Infrastructure

---

### 3.1 XSS Test Payloads

```typescript
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src=x onerror=alert("xss")>',
  '<svg onload=alert("xss")>',
  '<iframe src=javascript:alert("xss")></iframe>',
  '<body onload=alert("xss")>',
  '<input type=image src=x:x onerror=alert("xss")>',
  '<marquee onstart=alert("xss")>',
  '</script><script>alert("xss")</script>',
  '{{constructor.constructor("alert(\\"xss\\")")()}}',
  '<details open ontoggle=alert("xss")>',
  '"-alert("xss")-"',
  '\\"><svg onload=alert("xss")>',
];
```

### 3.2 Mock Service Worker

```typescript
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: "https://simulation.LOLCLUB.com/",
  update: vi.fn(),
  unregister: vi.fn(),
};

Object.defineProperty(navigator, "serviceWorker", {
  value: {
    register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});
```

### 3.3 Mock Authentication Context

```typescript
const MockAuthContext = React.createContext<any>(null)

const MockAuthProvider = ({
  children,
  mockUser = null,
  mockSession = null
}: any) => {
  const [user, setUser] = React.useState(mockUser)
  const [session, setSession] = React.useState(mockSession)

  const signOut = vi.fn().mockImplementation(() => {
    setUser(null)
    setSession(null)
    // Clear sensitive data
    localStorage.removeItem("supabase.auth.token")
    localStorage.removeItem("user-session")
    sessionStorage.clear()
  })

  return (
    <MockAuthContext.Provider value={{ user, session, signOut }}>
      {children}
    </MockAuthContext.Provider>
  )
}
```

---

## 4. Representative Test Snippets

---

### 4.1 AUTH-SEC-004: Token Exposure Prevention

```typescript
it("should not expose tokens in DOM or console", () => {
  const mockSession = {
    access_token: "secret-token-12345",
    refresh_token: "refresh-token-67890"
  }

  // Spy on console methods
  const consoleSpies = {
    log: vi.spyOn(console, "log"),
    warn: vi.spyOn(console, "warn"),
    error: vi.spyOn(console, "error"),
    info: vi.spyOn(console, "info")
  }

  render(
    <MockAuthProvider mockSession={mockSession}>
      <TokenDisplayComponent />
    </MockAuthProvider>
  )

  // Get all DOM content
  const bodyText = document.body.textContent || ""
  const bodyHTML = document.body.innerHTML

  // Verify tokens are NOT in DOM
  expect(bodyText).not.toContain("secret-token-12345")
  expect(bodyText).not.toContain("refresh-token-67890")
  expect(bodyHTML).not.toContain("secret-token-12345")
  expect(bodyHTML).not.toContain("refresh-token-67890")

  // Verify tokens are NOT logged to console
  for (const [method, spy] of Object.entries(consoleSpies)) {
    const calls = spy.mock.calls.flat().join(" ")
    expect(calls).not.toContain("secret-token-12345")
    expect(calls).not.toContain("refresh-token-67890")
  }
})
```

### 4.2 XSS-001: React JSX Escaping

```typescript
it('should escape XSS payloads in React text content', () => {
  for (const payload of XSS_PAYLOADS) {
    const { unmount } = render(<MockNoticeComponent content={payload} />)

    const content = screen.getByTestId('notice-content')

    // React should escape the content, so script tags should appear as text
    expect(content.textContent).toBe(payload)

    // The HTML should NOT contain unescaped script elements that could execute
    expect(content.innerHTML).not.toContain('<script>alert')

    unmount()
  }
})
```

### 4.3 XSS-005: Input Sanitization Before API

```typescript
it('should sanitize user input before API submission', async () => {
  const user = userEvent.setup()
  const mockSubmit = vi.fn()

  render(<MockFormComponent onSubmit={mockSubmit} />)

  const input = screen.getByTestId('user-input')
  const submitBtn = screen.getByRole('button', { name: /submit/i })

  // Try to input XSS payload
  await user.type(input, '<script>alert("xss")</script>')
  await user.click(submitBtn)

  // Verify submission sanitizes the input
  expect(mockSubmit).toHaveBeenCalled()
  const submittedData = mockSubmit.mock.calls[0][0]

  // Should not contain script tags
  expect(submittedData).not.toContain('<script>')
  expect(submittedData).not.toContain('</script>')
})
```

### 4.4 PWA-SEC-001: Secure Origin Enforcement

```typescript
it("should register service worker from secure origin only", async () => {
  const originalLocation = window.location;

  // Mock HTTPS location
  Object.defineProperty(window, "location", {
    value: {
      ...originalLocation,
      protocol: "https:",
      hostname: "simulation.LOLCLUB.com",
    },
    writable: true,
  });

  const registration = await navigator.serviceWorker.register("/sw.js");

  expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  expect(registration.scope).toContain("https://");

  // Restore original location
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
  });
});
```

### 4.5 AUTH-SEC-007: Clear Sensitive Data on Logout

```typescript
it("should clear sensitive data on logout", async () => {
  const mockUser = { id: "user-123" }
  const mockSession = { access_token: "token-123" }

  // Set some sensitive data in storage
  localStorage.setItem("supabase.auth.token", "token-123")
  localStorage.setItem("user-session", JSON.stringify(mockSession))
  sessionStorage.setItem("temp-data", "sensitive")

  render(
    <MockAuthProvider mockUser={mockUser} mockSession={mockSession}>
      <LogoutComponent />
    </MockAuthProvider>
  )

  const logoutBtn = screen.getByTestId("logout-btn")
  await userEvent.click(logoutBtn)

  await waitFor(() => {
    // Verify sensitive data is cleared
    expect(localStorage.getItem("supabase.auth.token")).toBeNull()
    expect(localStorage.getItem("user-session")).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })
})
```

---

## 5. Test Execution

---

**Location**: `src/frontend/src/test/security/`

**Run Commands**:

```bash
# Run all security tests
cd src/frontend
npm run test -- src/test/security

# Run specific security test file
npm run test -- src/test/security/auth-security.test.tsx
npm run test -- src/test/security/xss-prevention.test.tsx
npm run test -- src/test/security/pwa-security.test.tsx

# Run with verbose output
npm run test -- src/test/security --reporter=verbose
```

**VS Code Debug**: Use launch configuration "Security Test: Frontend"

---

## 6. Coverage Requirements

---

- **Target Coverage**: ≥90% for security-critical functions
- **Authentication**: 100% coverage for auth flows
- **XSS Prevention**: 100% coverage for input sanitization
- **PWA Security**: ≥80% coverage for service worker security

---

## 7. Test Summary

---

| Category | Test Cases | Priority | Dependencies         |
| -------- | ---------- | -------- | -------------------- |
| AUTH-SEC | 12         | Critical | MockAuthProvider     |
| XSS      | 11         | Critical | XSS payloads         |
| PWA-SEC  | 11         | High     | Service Worker mocks |

**Total: 34 test cases**

---

## 8. Security Testing Principles

---

1. **Defense in Depth**: Multiple layers of security validation
2. **Input Validation**: All user inputs must be validated and sanitized
3. **Output Encoding**: Properly encode all dynamic content
4. **Secure Defaults**: Use secure configurations by default
5. **Least Privilege**: Components should have minimum required permissions
6. **Token Security**: Never expose authentication tokens
7. **Session Management**: Secure session handling and cleanup
8. **XSS Prevention**: React's built-in escaping + additional sanitization

---

## 9. Maintenance Notes

---

- Update XSS payloads quarterly with new attack patterns
- Review authentication flows when Supabase updates
- Test PWA security after service worker changes
- Document any security exceptions or deviations
- Keep security test dependencies up to date
- Review security findings from penetration tests
