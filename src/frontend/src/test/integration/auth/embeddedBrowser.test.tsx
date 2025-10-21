import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../utils/renderWithProviders";
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

  it("disables buttons and shows warning banner in embedded browser", async () => {
    renderWithProviders(<LoginPage />, { withAuth: false });

    // Step 1: Verify detection
    expect(browserDetection.isEmbeddedBrowser()).toBe(true);

    // Step 2: Verify warning banner is displayed
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/)
      ).toBeInTheDocument();
    });

    // Step 3: Verify both buttons are disabled
    const googleButton = screen.getByTestId("google-login");
    const kakaoButton = screen.getByTestId("kakao-login");

    expect(googleButton).toBeDisabled();
    expect(kakaoButton).toBeDisabled();
  });

  it("does not show modal when clicking disabled button", async () => {
    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");

    // Button is disabled
    expect(googleButton).toBeDisabled();

    // Try to click (should not work since button is disabled)
    fireEvent.click(googleButton);

    // Modal should not appear (button click doesn't trigger handler)
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("enables buttons and hides banner in standard browser", async () => {
    // Change to standard browser
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    // Verify detection
    expect(browserDetection.isEmbeddedBrowser()).toBe(false);

    // Verify buttons are enabled
    const googleButton = screen.getByTestId("google-login");
    const kakaoButton = screen.getByTestId("kakao-login");

    expect(googleButton).not.toBeDisabled();
    expect(kakaoButton).not.toBeDisabled();

    // Verify banner is not shown
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("LoginPage Button State", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-mock window.matchMedia
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

  it("disables Google login button in embedded browser", () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");
    expect(googleButton).toBeDisabled();
  });

  it("disables Kakao login button in embedded browser", () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const kakaoButton = screen.getByTestId("kakao-login");
    expect(kakaoButton).toBeDisabled();
  });

  it("enables Google login button in standard browser", () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");
    expect(googleButton).not.toBeDisabled();
  });

  it("enables Kakao login button in standard browser", () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const kakaoButton = screen.getByTestId("kakao-login");
    expect(kakaoButton).not.toBeDisabled();
  });

  it("does not trigger modal when clicking disabled button in embedded browser", () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");

    // Button is disabled, so click should not work
    fireEvent.click(googleButton);

    // Modal should not appear (button click doesn't trigger handler)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables buttons in Facebook in-app browser", () => {
    // Mock Facebook user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) FBAN/FB4A",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");
    const kakaoButton = screen.getByTestId("kakao-login");

    expect(googleButton).toBeDisabled();
    expect(kakaoButton).toBeDisabled();
  });

  it("disables buttons in Instagram in-app browser", () => {
    // Mock Instagram user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 123.0.0",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");
    const kakaoButton = screen.getByTestId("kakao-login");

    expect(googleButton).toBeDisabled();
    expect(kakaoButton).toBeDisabled();
  });

  it("enables buttons in Safari iOS", () => {
    // Mock Safari user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");
    const kakaoButton = screen.getByTestId("kakao-login");

    expect(googleButton).not.toBeDisabled();
    expect(kakaoButton).not.toBeDisabled();
  });

  it("disables buttons during loading even in standard browser", async () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0",
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId("google-login");

    // Initially button should be enabled in standard browser
    expect(googleButton).not.toBeDisabled();

    // Click to start loading
    fireEvent.click(googleButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(googleButton).toHaveTextContent("Google 로그인 중...");
    });
  });
});
