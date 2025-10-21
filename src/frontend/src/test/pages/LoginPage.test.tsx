import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../utils/renderWithProviders";
import "@testing-library/jest-dom";
import LoginPage from "../../pages/LoginPage";
import * as browserDetection from "../../utils/browserDetection";
import { supabase } from "../../supabaseClient";

// Mock dependencies
vi.mock("../../utils/browserDetection");
vi.mock("../../supabaseClient");

describe("LoginPage - Embedded Browser Detection", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-mock window.matchMedia after resetAllMocks
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("disables Google login button and shows banner in embedded browser", async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(browserDetection.getBrowserName).mockReturnValue("KakaoTalk");

    renderWithProviders(<LoginPage />, { withAuth: false });

    // Check button is disabled
    const googleButton = screen.getByTestId("google-login");
    expect(googleButton).toBeDisabled();

    // Try to click (should not work)
    fireEvent.click(googleButton);

    // Modal should NOT appear because button is disabled
    await waitFor(
      () => {
        expect(
          screen.queryByText("브라우저에서 열어주세요")
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // OAuth should NOT be called
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("proceeds with OAuth when Google login clicked in standard browser", async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(false);
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: "google" as const, url: "https://accounts.google.com" },
      error: null,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");

    // Button should be enabled
    expect(googleButton).not.toBeDisabled();

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: expect.any(String) },
      });
    });

    // Modal should NOT appear
    expect(
      screen.queryByText("브라우저에서 열어주세요")
    ).not.toBeInTheDocument();
  });

  it("button remains disabled even if OAuth error occurs in embedded browser", async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(
      new Error("403: disallowed_useragent")
    );

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");

    // Button should be disabled, preventing any click
    expect(googleButton).toBeDisabled();

    // Try to click (should not work)
    fireEvent.click(googleButton);

    // Modal should NOT appear because button is disabled
    await waitFor(
      () => {
        expect(
          screen.queryByText("브라우저에서 열어주세요")
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("displays warning banner on mount in embedded browser", () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);

    renderWithProviders(<LoginPage />, { withAuth: false });

    // Banner should be displayed
    expect(
      screen.queryByText(/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/)
    ).toBeInTheDocument();

    // Both buttons should be disabled
    expect(screen.getByTestId("google-login")).toBeDisabled();
    expect(screen.getByTestId("kakao-login")).toBeDisabled();
  });
});
