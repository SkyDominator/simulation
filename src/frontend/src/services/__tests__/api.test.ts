import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, API_BASE_URL } from "../api";
import { createMockResponse } from "../../test/test-utils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OTP Service", () => {
    it("should send OTP successfully", async () => {
      const mockResponse = {
        success: true,
        message: "OTP sent successfully",
        expires_in_seconds: 300,
        user_hash: "test-hash",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.sendOtp("김테스트", "01012345678");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/otp/send"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "김테스트",
            phone_number: "01012345678",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should verify OTP successfully", async () => {
      const mockResponse = {
        success: true,
        message: "OTP verified successfully",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.verifyOtp("01012345678", "123456");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/otp/verify"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone_number: "01012345678",
            otp_code: "123456",
            user_hash: undefined,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle OTP send failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ detail: "Rate limit exceeded" }),
      });

      // Since the API catches errors and returns { success: false, message: ... }
      const result = await api.sendOtp("김테스트", "01012345678");
      expect(result.success).toBe(false);
      expect(result.message).toContain("API error: 429");
    });
  });

  describe("Simulation Service", () => {
    const mockToken = "test-bearer-token";

    it("should create simulation successfully", async () => {
      const mockResponse = {
        simulation_id: "test-sim-id",
        plan_id: "A",
        message: "Simulation created successfully",
        success: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.createSimulation(
        mockToken,
        "A",
        1,
        1,
        10,
        { monthly: 100000 },
        { round1: 1.0 }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/simulation/create"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockToken}`,
          },
          body: expect.stringContaining('"plan_id":"A"'),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should run simulation successfully", async () => {
      const mockResponse = {
        simulation_id: "test-sim-id",
        message: "Simulation executed successfully",
        success: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.runSimulation("test-sim-id", mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/simulation/run"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            simulation_id: "test-sim-id",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delete simulation successfully", async () => {
      const mockResponse = {
        simulation_id: "test-sim-id",
        message: "Simulation deleted successfully",
        success: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.deleteSimulation("test-sim-id", mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/simulations/test-sim-id"),
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle simulation API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Unauthorized" }),
      });

      await expect(
        api.createSimulation(mockToken, "A", 1, 1, 10, { monthly: 100000 })
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("Privacy Policy Service", () => {
    it("should get privacy policy successfully", async () => {
      const mockResponse = {
        version: "1.0",
        updated_at: "2025-01-01T00:00:00Z",
        content: "Privacy policy content",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.getPrivacyPolicy({
        version: "1.0",
        locale: "ko-KR",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/privacy-policy?version=1.0&locale=ko-KR")
      );
      expect(result).toEqual(mockResponse);
    });

    it("should record consent successfully", async () => {
      const mockResponse = {
        id: "consent-id",
        success: true,
        message: "Consent recorded successfully",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.recordConsent(
        "user-hash",
        "privacy_policy",
        "1.0"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/consents"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"user_hash":"user-hash"'),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Authentication Service", () => {
    const mockToken = "test-bearer-token";

    it("should link onboarding successfully", async () => {
      const mockResponse = {
        user_id: "user-id",
        linked: true,
        message: "Onboarding linked successfully",
        success: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.linkOnboarding(mockToken, {
        whitelist_passed: true,
        otp_verified: true,
        consent_version: "1.0",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/link"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockToken}`,
          },
          body: expect.stringContaining('"whitelist_passed":true'),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get onboarding status successfully", async () => {
      const mockResponse = {
        user_id: "user-id",
        whitelist_passed: true,
        otp_verified: true,
        consent_version: "1.0",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await api.getOnboardingStatus(mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/onboarding/status"),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // OTP methods catch errors and return { success: false, message }
      const result = await api.sendOtp("김테스트", "01012345678");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Network error");
    });

    it("should handle non-JSON error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      // OTP methods catch errors and return { success: false, message }
      const result = await api.sendOtp("김테스트", "01012345678");
      expect(result.success).toBe(false);
      expect(result.message).toContain("API error: 500");
    });
  });

  describe("URL Construction", () => {
    it("should construct URLs correctly", () => {
      expect(API_BASE_URL).toBeDefined();
      // URL construction is tested implicitly in the API calls above
    });
  });
});
