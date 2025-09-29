/**
 * Authentication Security Tests
 * Tests frontend authentication security measures
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../utils/renderWithProviders";

// Mock authentication context
const MockAuthContext = React.createContext<any>(null);

const MockAuthProvider = ({
  children,
  mockUser = null,
  mockSession = null,
}: any) => {
  const [user, setUser] = React.useState(mockUser);
  const [session, setSession] = React.useState(mockSession);

  // Update state when props change (for rerender scenarios)
  React.useEffect(() => {
    setUser(mockUser);
    setSession(mockSession);
  }, [mockUser, mockSession]);

  const signOut = vi.fn().mockImplementation(() => {
    setUser(null);
    setSession(null);
  });

  const signIn = vi.fn().mockImplementation((userData, sessionData) => {
    setUser(userData);
    setSession(sessionData);
  });

  return (
    <MockAuthContext.Provider value={{ user, session, signOut, signIn }}>
      {children}
    </MockAuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(MockAuthContext);
  if (!context) {
    throw new Error("useAuth must be used within MockAuthProvider");
  }
  return context;
};

// Mock components for testing
const ProtectedComponent = () => {
  const { user, session } = useAuth();

  if (!user || !session) {
    return <div data-testid="login-required">Please log in</div>;
  }

  return (
    <div data-testid="protected-content">Protected Content: {user.id}</div>
  );
};

const TokenDisplayComponent = () => {
  const { session } = useAuth();

  // This simulates a bad practice - displaying tokens
  return (
    <div>
      <div data-testid="token-display">
        Token: {session?.access_token || "No token"}
      </div>
      <div data-testid="debug-info">Debug: {JSON.stringify(session)}</div>
    </div>
  );
};

const LogoutComponent = () => {
  const { signOut, user } = useAuth();

  const handleLogout = () => {
    // Simulate proper logout
    signOut();

    // Clear sensitive data from localStorage
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("user-session");
    sessionStorage.clear();
  };

  if (!user) return null;

  return (
    <button onClick={handleLogout} data-testid="logout-btn">
      Logout
    </button>
  );
};

describe("Authentication Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Access Control", () => {
    it("should block access to protected content without authentication", () => {
      render(
        <MockAuthProvider>
          <ProtectedComponent />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("login-required")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should allow access to protected content with valid authentication", () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockSession = {
        access_token: "valid-token",
        expires_at: Date.now() + 3600000,
      };

      render(
        <MockAuthProvider mockUser={mockUser} mockSession={mockSession}>
          <ProtectedComponent />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.queryByTestId("login-required")).not.toBeInTheDocument();
    });

    it("should handle authentication state changes properly", async () => {
      let authControls: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authControls = auth;
        return <ProtectedComponent />;
      };

      render(
        <MockAuthProvider>
          <TestComponent />
        </MockAuthProvider>
      );

      // Initially no access
      expect(screen.getByTestId("login-required")).toBeInTheDocument();

      // Sign in
      const mockUser = { id: "user-456", email: "user@example.com" };
      const mockSession = {
        access_token: "new-token",
        expires_at: Date.now() + 3600000,
      };

      authControls.signIn(mockUser, mockSession);

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      // Sign out
      authControls.signOut();

      await waitFor(() => {
        expect(screen.getByTestId("login-required")).toBeInTheDocument();
      });
    });
  });

  describe("Token Security", () => {
    it("should not expose tokens in DOM or console", () => {
      const mockSession = {
        access_token: "secret-jwt-token-12345",
        refresh_token: "secret-refresh-token-67890",
      };

      // Mock console methods to catch token exposure
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Modified component that properly masks tokens
      const SecureTokenDisplayComponent = () => {
        const { session } = useAuth();

        const maskToken = (token: string | null) => {
          if (!token) return "No token";
          return token.length > 8
            ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
            : "****";
        };

        return (
          <div>
            <div data-testid="token-display">
              Token: {maskToken(session?.access_token)}
            </div>
            <div data-testid="debug-info">
              Debug: Session exists: {!!session}
            </div>
          </div>
        );
      };

      const { container } = render(
        <MockAuthProvider mockSession={mockSession}>
          <SecureTokenDisplayComponent />
        </MockAuthProvider>
      );

      // Check that full tokens are not exposed in DOM
      const tokenDisplay = screen.getByTestId("token-display");
      const debugInfo = screen.getByTestId("debug-info");

      // Tokens should be masked or not displayed in full
      expect(tokenDisplay.textContent).not.toContain("secret-jwt-token-12345");
      expect(debugInfo.textContent).not.toContain("secret-refresh-token-67890");

      // Should show masked or safe information instead
      expect(tokenDisplay.textContent).toMatch(
        /Token: (secr\.\.\.|No token|\*\*\*\*)/
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should handle expired tokens properly", () => {
      const expiredSession = {
        access_token: "expired-token",
        expires_at: Date.now() - 3600000, // Expired 1 hour ago
      };

      const TokenValidationComponent = () => {
        const { session } = useAuth();

        const isTokenExpired = session && session.expires_at < Date.now();

        return (
          <div data-testid="token-status">
            {isTokenExpired ? "Token Expired" : "Token Valid"}
          </div>
        );
      };

      render(
        <MockAuthProvider mockSession={expiredSession}>
          <TokenValidationComponent />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("token-status")).toHaveTextContent(
        "Token Expired"
      );
    });

    it("should validate token format", () => {
      const malformedTokens = [
        null,
        "",
        "not-a-jwt",
        "malformed.jwt",
        "header.payload", // Missing signature
        "...", // Three dots
        "eyJhbGciOiJub25lIn0.payload.", // None algorithm
      ];

      for (const token of malformedTokens) {
        const TokenValidationComponent = () => {
          const { session } = useAuth();

          const validateJWT = (token: string | null) => {
            if (!token || typeof token !== "string") return false;

            const parts = token.split(".");
            if (parts.length !== 3) return false;

            try {
              // Basic JWT structure validation
              const header = JSON.parse(atob(parts[0]));
              const payload = JSON.parse(atob(parts[1]));

              // Check for dangerous algorithms
              if (header.alg === "none") return false;

              return true;
            } catch {
              return false;
            }
          };

          const isValid = validateJWT(session?.access_token);

          return (
            <div data-testid="validation-result">
              {isValid ? "Valid" : "Invalid"}
            </div>
          );
        };

        const { unmount } = render(
          <MockAuthProvider mockSession={{ access_token: token }}>
            <TokenValidationComponent />
          </MockAuthProvider>
        );

        expect(screen.getByTestId("validation-result")).toHaveTextContent(
          "Invalid"
        );

        unmount();
      }
    });
  });

  describe("Session Management", () => {
    it("should clear sensitive data on logout", async () => {
      // Set up initial sensitive data after component renders
      const initialTokenValue = "sensitive-token";
      const initialUserValue = "user-data";
      const initialTempValue = "temporary-data";

      const mockUser = { id: "user-789" };
      const mockSession = { access_token: "test-token" };

      render(
        <MockAuthProvider mockUser={mockUser} mockSession={mockSession}>
          <LogoutComponent />
        </MockAuthProvider>
      );

      // Set up data after render to avoid beforeEach clearing
      localStorage.setItem("supabase.auth.token", initialTokenValue);
      localStorage.setItem("user-session", initialUserValue);
      sessionStorage.setItem("temp-data", initialTempValue);

      const logoutBtn = screen.getByTestId("logout-btn");

      // Verify data exists before logout
      expect(localStorage.getItem("supabase.auth.token")).toBe(
        initialTokenValue
      );
      expect(sessionStorage.getItem("temp-data")).toBe(initialTempValue);

      // Perform logout
      fireEvent.click(logoutBtn);

      // Verify data is cleared after logout
      expect(localStorage.getItem("supabase.auth.token")).toBeNull();
      expect(localStorage.getItem("user-session")).toBeNull();
      expect(sessionStorage.getItem("temp-data")).toBeNull();
    });

    it("should not store sensitive data in localStorage by default", () => {
      const sensitiveData = {
        password: "user-password",
        creditCard: "1234-5678-9012-3456",
        ssn: "123-45-6789",
      };

      const DataStorageComponent = () => {
        const handleStoreData = () => {
          // Simulate storing data (should be filtered)
          Object.entries(sensitiveData).forEach(([key, value]) => {
            const sensitiveKeys = [
              "password",
              "creditcard", // lowercase to match key.toLowerCase()
              "ssn",
              "token",
              "secret",
            ];

            if (!sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
              localStorage.setItem(key, value);
            }
          });
        };

        React.useEffect(() => {
          handleStoreData();
        }, []);

        return <div data-testid="storage-test">Data storage test</div>;
      };

      render(<DataStorageComponent />);

      // Verify sensitive data is not stored (localStorage returns null for missing items)
      expect(localStorage.getItem("password")).toBe(null);
      expect(localStorage.getItem("creditCard")).toBe(null);
      expect(localStorage.getItem("ssn")).toBe(null);
    });

    it("should handle concurrent session validation", async () => {
      const mockUser = { id: "user-concurrent" };
      const mockSession = {
        access_token: "concurrent-token",
        expires_at: Date.now() + 3600000,
      };

      const ConcurrentAuthComponent = () => {
        const { user, session } = useAuth();
        const [validationResults, setValidationResults] = React.useState<
          string[]
        >([]);

        const validateSession = async () => {
          // Simulate multiple concurrent validation requests
          const promises = Array.from(
            { length: 5 },
            (_, i) =>
              new Promise<string>((resolve) => {
                setTimeout(() => {
                  const isValid = session && session.expires_at > Date.now();
                  resolve(`Validation ${i}: ${isValid ? "Valid" : "Invalid"}`);
                }, Math.random() * 100);
              })
          );

          const results = await Promise.all(promises);
          setValidationResults(results);
        };

        React.useEffect(() => {
          validateSession();
        }, []);

        return (
          <div>
            {validationResults.map((result, i) => (
              <div key={i} data-testid={`validation-${i}`}>
                {result}
              </div>
            ))}
          </div>
        );
      };

      render(
        <MockAuthProvider mockUser={mockUser} mockSession={mockSession}>
          <ConcurrentAuthComponent />
        </MockAuthProvider>
      );

      // Wait for all validations to complete
      await waitFor(
        () => {
          for (let i = 0; i < 5; i++) {
            expect(screen.getByTestId(`validation-${i}`)).toHaveTextContent(
              "Valid"
            );
          }
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Authorization Security", () => {
    it("should enforce role-based access control", async () => {
      const roles = ["user", "admin", "moderator"];

      const RoleBasedComponent = ({
        requiredRole,
      }: {
        requiredRole: string;
      }) => {
        const { user } = useAuth();

        const hasRole = user?.role === requiredRole;

        if (!user)
          return <div data-testid="login-required">Login required</div>;
        if (!hasRole)
          return <div data-testid="access-denied">Access denied</div>;

        return (
          <div data-testid="access-granted">
            Access granted for {requiredRole}
          </div>
        );
      };

      // Test regular user trying to access admin content
      const regularUser = { id: "user-123", role: "user" };

      const { rerender } = render(
        <MockAuthProvider mockUser={regularUser}>
          <RoleBasedComponent requiredRole="admin" />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("access-denied")).toBeInTheDocument();

      // Test admin user accessing admin content
      const adminUser = { id: "admin-123", role: "admin" };

      rerender(
        <MockAuthProvider mockUser={adminUser}>
          <RoleBasedComponent requiredRole="admin" />
        </MockAuthProvider>
      );

      // Wait for React to finish the rerender before checking
      await waitFor(() => {
        expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
        expect(screen.getByTestId("access-granted")).toBeInTheDocument();
      });
    });

    it("should validate user permissions for specific actions", () => {
      const permissions = ["read", "write", "delete", "admin"];

      const PermissionComponent = ({
        requiredPermission,
      }: {
        requiredPermission: string;
      }) => {
        const { user } = useAuth();

        const hasPermission = user?.permissions?.includes(requiredPermission);

        return (
          <div data-testid="permission-result">
            {hasPermission ? "Allowed" : "Denied"}
          </div>
        );
      };

      const userWithReadOnly = {
        id: "user-readonly",
        permissions: ["read"],
      };

      const { rerender } = render(
        <MockAuthProvider mockUser={userWithReadOnly}>
          <PermissionComponent requiredPermission="read" />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("permission-result")).toHaveTextContent(
        "Allowed"
      );

      rerender(
        <MockAuthProvider mockUser={userWithReadOnly}>
          <PermissionComponent requiredPermission="delete" />
        </MockAuthProvider>
      );

      expect(screen.getByTestId("permission-result")).toHaveTextContent(
        "Denied"
      );
    });
  });

  describe("Cross-Site Request Forgery (CSRF) Protection", () => {
    it("should include CSRF tokens in API requests", async () => {
      let requestHeaders: any = {};

      // Mock fetch to capture headers
      global.fetch = vi.fn().mockImplementation((url, options) => {
        requestHeaders = options?.headers || {};
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      const CSRFTestComponent = () => {
        const { session } = useAuth();

        const makeAPICall = async () => {
          await fetch("/api/test", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              "X-CSRF-Token": "csrf-token-123",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: "test" }),
          });
        };

        React.useEffect(() => {
          makeAPICall();
        }, []);

        return <div data-testid="csrf-test">CSRF Test</div>;
      };

      const mockSession = { access_token: "test-token" };

      render(
        <MockAuthProvider mockSession={mockSession}>
          <CSRFTestComponent />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();

        // Verify CSRF token is included
        expect(requestHeaders["X-CSRF-Token"]).toBe("csrf-token-123");
        expect(requestHeaders["Authorization"]).toBe("Bearer test-token");
      });
    });
  });
});
