import React, { createContext } from "react";
import { vi } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

interface MockAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: ReturnType<typeof vi.fn>;
}

export const mockAuthContext: MockAuthContextType = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  } as User,
  session: {
    access_token: "mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Date.now() + 3600 * 1000,
    refresh_token: "mock-refresh-token",
    user: {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
    },
  } as Session,
  loading: false,
  signOut: vi.fn(),
};

const MockAuthContext = createContext(mockAuthContext);

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <MockAuthContext.Provider value={mockAuthContext}>
      <div data-testid="mock-auth-provider">{children}</div>
    </MockAuthContext.Provider>
  );
};

// Mock the actual context imports
vi.mock("../../context/useAuth", () => ({
  useAuth: () => mockAuthContext,
  default: () => mockAuthContext,
}));

vi.mock("../../context/AuthContext", () => ({
  AuthContext: MockAuthContext,
  AuthProvider: MockAuthProvider,
}));
