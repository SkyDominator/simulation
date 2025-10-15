import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, fireEvent, waitFor } from "../../utils/renderWithProviders";
import "@testing-library/jest-dom";
import LoginPage from "../../../pages/LoginPage";
import * as browserDetection from "../../../utils/browserDetection";

// Integration test with real component interactions
describe("Embedded Browser Detection - Integration", () => {
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
    
    // Set up embedded browser environment
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
      writable: true,
      configurable: true,
    });
  });

  it("completes full detection → modal → redirect flow", async () => {
    const openInExternalBrowserSpy = vi
      .spyOn(browserDetection, "openInExternalBrowser")
      .mockResolvedValue(true);

    renderWithProviders(<LoginPage />, { withAuth: false });

    // Step 1: Verify detection
    expect(browserDetection.isEmbeddedBrowser()).toBe(true);

    // Step 2: Click Google login
    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    // Step 3: Modal appears
    await waitFor(() => {
      expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
      expect(
        screen.getByText(/KakaoTalk 앱 내부 브라우저/)
      ).toBeInTheDocument();
    });

    // Step 4: Click open in browser
    const openBrowserButton = screen.getByText("브라우저에서 열기");
    fireEvent.click(openBrowserButton);

    // Step 5: Verify redirect attempt
    await waitFor(() => {
      expect(openInExternalBrowserSpy).toHaveBeenCalled();
    });
  });

  it("handles user dismissal and retry", async () => {
    renderWithProviders(<LoginPage />, { withAuth: false });

    // Click Google login - modal appears
    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
    });

    // User dismisses modal
    fireEvent.click(screen.getByText("취소"));

    await waitFor(() => {
      expect(
        screen.queryByText("브라우저에서 열어주세요")
      ).not.toBeInTheDocument();
    });

    // User can retry
    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
    });
  });

  it("shows manual instructions when auto-redirect fails", async () => {
    vi.spyOn(browserDetection, "openInExternalBrowser").mockResolvedValue(
      false
    );

    renderWithProviders(<LoginPage />, { withAuth: false });

    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText(/수동으로 여는 방법/)).toBeInTheDocument();
      expect(screen.getByText(/메뉴\(⋮\) 버튼을 누르세요/)).toBeInTheDocument();
    });
  });
});
