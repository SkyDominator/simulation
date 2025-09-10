import { ReactElement } from "react";
import {
  render,
  RenderOptions,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { AuthContext, type AuthContextType } from "../context/AuthContextBase";
import { theme } from "../theme";
import type { Session } from "@supabase/supabase-js";

// Mock user data for testing
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    name: "테스트 사용자",
    provider: "google",
  },
};

// Mock simulation data
export const mockSimulation = {
  id: "test-simulation-id",
  user_id: "test-user-id",
  plan_id: "A",
  starting_company_round: 1,
  current_company_round: 1,
  investments: {
    scheduled_payment: 100000,
    sales_achievement_rates: [1.0, 1.0, 1.0],
  },
  simulation_results: null,
  memo: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock auth context value
export const mockAuthContextValue: AuthContextType = {
  user: null,
  session: null,
  signOut: async () => {},
};

// Mock authenticated auth context value
export const mockAuthenticatedContextValue: AuthContextType = {
  user: mockUser,
  session: {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "test-user-id",
      email: "test@example.com",
      aud: "authenticated",
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        name: "테스트 사용자",
        provider: "google",
      },
    },
  } as unknown as Session,
  signOut: async () => {},
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  authContextValue?: AuthContextType;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authContextValue = mockAuthContextValue, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={authContextValue}>
          {children}
        </AuthContext.Provider>
      </ThemeProvider>
    </BrowserRouter>
  );

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

// Common test helpers
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const createMockResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

// Re-export specific testing utilities for convenience
export { screen, fireEvent, waitFor, act };
