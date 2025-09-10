import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  mockAuthContextValue,
  mockAuthenticatedContextValue,
} from "../../test/test-utils";
import { useAuth } from "../useAuth";

// Test component to access auth context
function TestComponent() {
  const { user, session, signOut } = useAuth();

  const userEmail =
    user && typeof user === "object" && "email" in user
      ? (user.email as string)
      : "no-email";

  return (
    <div>
      <div data-testid="user-status">
        {user ? "authenticated" : "not-authenticated"}
      </div>
      <div data-testid="user-email">{userEmail}</div>
      <div data-testid="session-status">
        {session ? "has-session" : "no-session"}
      </div>
      <button onClick={signOut} data-testid="signout-button">
        Sign Out
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with unauthenticated state", () => {
    renderWithProviders(<TestComponent />, {
      authContextValue: mockAuthContextValue,
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent(
      "not-authenticated"
    );
    expect(screen.getByTestId("user-email")).toHaveTextContent("no-email");
    expect(screen.getByTestId("session-status")).toHaveTextContent(
      "no-session"
    );
  });

  it("should show authenticated state when user is logged in", () => {
    renderWithProviders(<TestComponent />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent(
      "authenticated"
    );
    expect(screen.getByTestId("user-email")).toHaveTextContent(
      "test@example.com"
    );
    expect(screen.getByTestId("session-status")).toHaveTextContent(
      "has-session"
    );
  });

  it("should call signOut when signout button is clicked", async () => {
    const mockSignOut = vi.fn();
    const authContextValue = {
      ...mockAuthenticatedContextValue,
      signOut: mockSignOut,
    };

    renderWithProviders(<TestComponent />, {
      authContextValue,
    });

    const signOutButton = screen.getByTestId("signout-button");
    signOutButton.click();

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("should handle auth context error gracefully", () => {
    // Test with minimal auth context to ensure graceful handling
    const minimalAuthContext = {
      user: null,
      session: null,
      signOut: vi.fn(),
    };

    renderWithProviders(<TestComponent />, {
      authContextValue: minimalAuthContext,
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent(
      "not-authenticated"
    );
  });
});
