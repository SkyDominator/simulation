import "@testing-library/jest-dom";
import { vi } from "vitest";
import { webcrypto } from "crypto";

// Initialize crypto polyfill before jsdom accesses it
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

// Polyfill SharedArrayBuffer for testing environment
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer =
    ArrayBuffer as unknown as typeof globalThis.SharedArrayBuffer;
}

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.VITE_API_BASE_URL = "http://localhost:8001/api";

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock window.matchMedia for MUI useMediaQuery compatibility
// MUI's useMediaQuery expects window.matchMedia to return a MediaQueryList object
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn() as unknown as (
      callback: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown
    ) => void, // Deprecated
    removeListener: vi.fn() as unknown as (
      callback: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown
    ) => void, // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn() as unknown as (event: Event) => boolean,
  }),
});

// Mock localStorage that behaves like the real one
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();
global.localStorage = localStorageMock;

// Mock sessionStorage similarly
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();
global.sessionStorage = sessionStorageMock;
