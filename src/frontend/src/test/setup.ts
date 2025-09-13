import "@testing-library/jest-dom";
import { beforeAll, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("../supabaseClient", () => ({
  default: mockSupabase,
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

beforeAll(() => {
  // Mock environment variables
  vi.mock("../constants", () => ({
    API_BASE_URL: "http://localhost:8000",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-key",
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
