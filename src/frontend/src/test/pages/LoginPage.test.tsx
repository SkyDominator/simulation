import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, fireEvent, waitFor } from "../utils/renderWithProviders";
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

  it("shows warning modal when Google login clicked in embedded browser", async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(browserDetection.getBrowserName).mockReturnValue("KakaoTalk");

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
    });

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

    const googleButton = screen.getByText(/Google로 로그인/);
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

  it("shows warning modal on OAuth 403 error in embedded browser", async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(
      new Error("403: disallowed_useragent")
    );

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
    });
  });

  it("displays warning banner on mount in embedded browser", () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);

    renderWithProviders(<LoginPage />, { withAuth: false });

    // If optional banner enhancement is implemented
    expect(
      screen.queryByText(/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/)
    ).toBeInTheDocument();
  });
});
