import {
  type Plan,
  type SimulationCreateResponse,
  type SimulationRunResponse,
  type SimulationMemoUpdateResponse,
  type NoticeListResponse,
  type NoticeDetailResponse,
  type NoticeCreateResponse,
  type NoticeUpdateResponse,
  type NoticeDeleteResponse,
  type AdminMeResponse,
  type ConsentRecordResponse,
  type PrivacyPolicyResponse,
  type OTPSendResponse,
  type OTPVerifyResponse,
  type AdminPrivacyPolicyListResponse,
  type AdminPrivacyPolicyDetailResponse,
} from "../types/types";

// Prefer Vite-provided env var; fall back to the deployed backend URL
export const API_BASE_URL: string =
  // (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  // "https://simulation.lightoflifeclub.com/api";
  (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "http://localhost:8000/api";

const url = (path: string) => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const rel = path.replace(/^\/+/, "");
  return `${base}/${rel}`;
};

export const api = {
  deleteSimulation: async (
    simulation_id: string,
    token: string
  ): Promise<{ simulation_id: string; message: string; success: boolean }> => {
    const response = await fetch(url(`/simulations/${simulation_id}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.message || "삭제에 실패했습니다.");
    }
    return data;
  },

  runSimulation: async (
    simulation_id: string,
    token: string
  ): Promise<SimulationRunResponse> => {
    const response = await fetch(url("/simulation/run"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ simulation_id }),
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data: SimulationRunResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "시뮬레이션 실행에 실패했습니다.");
    }
    return data;
  },

  getSimulations: async (token: string): Promise<Plan[]> => {
    try {
      const response = await fetch(url("/simulations"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((item: { [key: string]: unknown }) => {
          if (item && typeof item === "object" && "id" in item) {
            item.simulation_id = item.id;
            delete item.id;
          }
        });
      }
      return data;
    } catch (error) {
      console.error("Get simulations error:", error);
      return [];
    }
  },

  getSimulationDetails: async (
    simulationId: string,
    token: string
  ): Promise<Plan> => {
    try {
      const response = await fetch(url(`/simulations/${simulationId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      if (data && typeof data === "object" && "id" in data) {
        data.simulation_id = data.id;
        delete data.id;
      }
      return data;
    } catch (error) {
      console.error("Get plan details error:", error);
      throw error;
    }
  },

  createSimulation: async (
    token: string,
    plan_id: string,
    starting_company_round: number = 1,
    current_company_round: number = 1,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<SimulationCreateResponse> => {
    const response = await fetch(url("/simulation/create"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id,
        starting_company_round,
        current_company_round,
        simulation_rounds,
        scheduled_payment,
        sales_achievement_rates,
      }),
    });
    if (!response.ok) {
      // Try to surface backend error message if available
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data: SimulationCreateResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "시뮬레이션 생성 요청에 실패했습니다.");
    }
    return data;
  },

  updateSimulation: async (
    token: string,
    simulation_id: string,
    plan_id: string,
    starting_company_round: number,
    current_company_round: number,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<{
    simulation_id: string;
    plan_id: string;
    message: string;
    success: boolean;
  }> => {
    const response = await fetch(url(`/simulations/${simulation_id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id,
        simulation_rounds,
        starting_company_round,
        current_company_round,
        scheduled_payment,
        sales_achievement_rates,
      }),
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.message || "시뮬레이션 업데이트에 실패했습니다.");
    }
    return data;
  },

  updateSimulationMemo: async (
    token: string,
    simulation_id: string,
    memo: string | null
  ): Promise<SimulationMemoUpdateResponse> => {
    const response = await fetch(url(`/simulations/${simulation_id}/memo`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ memo }),
    });
    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }
    const data: SimulationMemoUpdateResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "메모 업데이트 실패");
    }
    return data;
  },

  // Admin self-check
  adminMe: async (token: string): Promise<AdminMeResponse> => {
    const response = await fetch(url("/admin/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      // Non-admin will likely get 403
      throw new Error(String(response.status));
    }
    return await response.json();
  },

  // Notices (public - no auth required to read)
  listNotices: async (): Promise<NoticeListResponse> => {
    const response = await fetch(url("/notices"));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  },
  getNotice: async (notice_id: string): Promise<NoticeDetailResponse> => {
    const response = await fetch(url(`/notices/${notice_id}`));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  },

  // Admin Notice CRUD (auth required; server enforces admin)
  createNotice: async (
    token: string,
    payload: {
      title: string;
      content: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeCreateResponse> => {
    const response = await fetch(url("/admin/notices"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        pinned: !!payload.pinned,
        published: payload.published !== false, // default true
      }),
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0; // no-op
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  updateNotice: async (
    token: string,
    notice_id: string,
    payload: {
      title?: string;
      content?: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeUpdateResponse> => {
    const response = await fetch(url(`/admin/notices/${notice_id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0; // no-op
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  deleteNotice: async (
    token: string,
    notice_id: string
  ): Promise<NoticeDeleteResponse> => {
    const response = await fetch(url(`/admin/notices/${notice_id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0; // no-op
      }

      throw new Error(msg);
    }
    return await response.json();
  },

  // Consent related API methods
  getPrivacyPolicy: async (params?: {
    version?: string;
    locale?: string;
  }): Promise<PrivacyPolicyResponse> => {
    try {
      const qs = new URLSearchParams();
      if (params?.version) qs.set("version", params.version);
      if (params?.locale) qs.set("locale", params.locale);
      const path = qs.toString()
        ? `/privacy-policy?${qs.toString()}`
        : "/privacy-policy";
      const response = await fetch(url(path));

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Privacy policy fetch error:", error);
      throw error;
    }
  },

  // ---------------- Admin Privacy Policies ----------------
  createPrivacyPolicy: async (
    token: string,
    payload: {
      version: string;
      content: string;
      locale?: string;
      effective_date?: string; // YYYY-MM-DD
      last_updated?: string; // YYYY-MM-DD
    }
  ): Promise<{ id: string; message: string; success: boolean }> => {
    const response = await fetch(url("/admin/privacy-policies"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0;
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  updatePrivacyPolicy: async (
    token: string,
    policy_id: string,
    payload: {
      version?: string;
      content?: string;
      locale?: string;
      effective_date?: string; // YYYY-MM-DD
      last_updated?: string; // YYYY-MM-DD
    }
  ): Promise<{ id: string; message: string; success: boolean }> => {
    const response = await fetch(url(`/admin/privacy-policies/${policy_id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0;
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  publishPrivacyPolicy: async (
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }> => {
    const response = await fetch(
      url(`/admin/privacy-policies/${policy_id}/publish`),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0;
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  listPrivacyPolicies: async (
    token: string
  ): Promise<AdminPrivacyPolicyListResponse> => {
    const response = await fetch(url("/admin/privacy-policies"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        /* no-op */
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  getPrivacyPolicyAdmin: async (
    token: string,
    policy_id: string
  ): Promise<AdminPrivacyPolicyDetailResponse> => {
    const response = await fetch(url(`/admin/privacy-policies/${policy_id}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        /* no-op */
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  deletePrivacyPolicy: async (
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }> => {
    const response = await fetch(url(`/admin/privacy-policies/${policy_id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        void 0;
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  recordConsent: async (
    user_hash: string,
    consent_type: string = "privacy_policy",
    consent_version: string = "1.0"
  ): Promise<ConsentRecordResponse> => {
    try {
      const data = {
        user_hash,
        consent_type,
        consent_version,
        user_agent: navigator.userAgent,
      };

      const response = await fetch(url("/consents"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Record consent error:", error);
      throw error;
    }
  },

  getUserConsents: async (
    user_hash: string
  ): Promise<{ consents: ConsentRecordResponse[]; success: boolean }> => {
    try {
      const response = await fetch(url(`/consents/${user_hash}`), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get user consents error:", error);
      throw error;
    }
  },

  sendOtp: async (
    name: string,
    phone_number: string
  ): Promise<OTPSendResponse> => {
    try {
      const response = await fetch(url("/otp/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phone_number }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("OTP send error:", error);
      return { success: false, message: String(error) };
    }
  },

  verifyOtp: async (
    phone_number: string,
    otp_code: string,
    user_hash?: string
  ): Promise<OTPVerifyResponse> => {
    try {
      const response = await fetch(url("/otp/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number,
          otp_code,
          user_hash,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: String(error),
      };
    }
  },
};
