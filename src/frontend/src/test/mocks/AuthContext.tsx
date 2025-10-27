import React, { createContext } from "react";
import { vi } from "vitest";
import { createMemberAuthToken } from "../../../test/shared/fixtures";

type MockUser = {
  id: string;
  email: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
};

type MockSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: MockUser;
};

interface MockAuthContextType {
  user: MockUser | null;
  session: MockSession | null;
  loading: boolean;
  signOut: ReturnType<typeof vi.fn>;
}

const memberToken = createMemberAuthToken();

const mockUser: MockUser = {
  id: memberToken.user.id,
  email: memberToken.user.email,
  app_metadata: {},
  user_metadata: memberToken.user.user_metadata ?? {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

const mockSession: MockSession = {
  access_token: memberToken.access_token,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: memberToken.expires_at,
  refresh_token: memberToken.refresh_token,
  user: mockUser,
};

export const mockAuthContext: MockAuthContextType = {
  user: mockUser,
  session: mockSession,
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
