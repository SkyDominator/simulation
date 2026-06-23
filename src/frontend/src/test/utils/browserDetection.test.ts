import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isEmbeddedBrowser,
  getBrowserType,
  getBrowserName,
  getExternalBrowserUrl,
} from "../../utils/browserDetection";

describe("browserDetection", () => {
  beforeEach(() => {
    // Reset window.navigator mock
    vi.resetAllMocks();
  });

  describe("isEmbeddedBrowser", () => {
    it("returns true for KakaoTalk browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
        writable: true,
        configurable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns true for Android WebView", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36",
        writable: true,
        configurable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns true for Facebook in-app browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) FBAN/FB4A",
        writable: true,
        configurable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns false for Chrome browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0",
        writable: true,
        configurable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });

    it("returns false for Safari browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15",
        writable: true,
        configurable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });
  });

  describe("getBrowserType", () => {
    it('returns "embedded" for KakaoTalk', () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "KAKAOTALK",
        writable: true,
        configurable: true,
      });
      expect(getBrowserType()).toBe("embedded");
    });

    it('returns "standard" for Chrome', () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Chrome/120.0.0.0",
        writable: true,
        configurable: true,
      });
      expect(getBrowserType()).toBe("standard");
    });
  });

  describe("getBrowserName", () => {
    it("identifies KakaoTalk", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "KAKAOTALK",
        writable: true,
        configurable: true,
      });
      expect(getBrowserName()).toBe("KakaoTalk");
    });

    it("identifies Chrome", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Chrome/120.0.0.0 Safari/537.36",
        writable: true,
        configurable: true,
      });
      expect(getBrowserName()).toBe("Chrome");
    });

    it("identifies Samsung Internet", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "SamsungBrowser/23.0",
        writable: true,
        configurable: true,
      });
      expect(getBrowserName()).toBe("Samsung Internet");
    });
  });

  describe("getExternalBrowserUrl", () => {
    it("generates Android intent URL", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Android",
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, "location", {
        value: {
          href: "https://app.example.com/login",
          host: "app.example.com",
          pathname: "/login",
          search: "",
          hash: "",
        },
        writable: true,
        configurable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toContain("intent://");
      expect(result).toContain("app.example.com/login");
      expect(result).toContain("#Intent;scheme=https;end");
    });

    it("returns direct URL for iOS", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "iPhone",
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, "location", {
        value: {
          href: "https://app.example.com/login",
        },
        writable: true,
        configurable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toBe("https://app.example.com/login");
    });
  });
});
