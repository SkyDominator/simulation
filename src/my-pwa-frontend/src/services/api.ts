import {
  type Plan,
  type WhitelistCheckResponse,
  type SimulationCreateResponse,
  type SimulationRunResponse,
  type SimulationMemoUpdateResponse,
  type NoticeListResponse,
  type NoticeDetailResponse,
  type NoticeCreateResponse,
  type NoticeUpdateResponse,
  type NoticeDeleteResponse,
  type AdminMeResponse,
  type ConsentRecordRequest,
  type ConsentRecordResponse,
  type PrivacyPolicyResponse,
} from "../types/types";

// Prefer Vite-provided env var, fall back to the current local backend URL
const API_BASE_URL: string =
  (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "http://10.10.113.129:8000/api"; // 로컬 FastAPI 서버 주소
// (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
// "https://simulation.lightoflifeclub.com/api"; // 로컬 FastAPI 서버 주소

export const api = {
  checkWhitelist: async (
    name: string,
    phone_number: string
  ): Promise<WhitelistCheckResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-user`, {
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
      console.error("Whitelist check error:", error);
      return { success: false, message: String(error), is_whitelisted: false };
    }
  },

  deleteSimulation: async (
    simulation_id: string,
    token: string
  ): Promise<{ simulation_id: string; message: string; success: boolean }> => {
    const response = await fetch(
      `${API_BASE_URL}/simulations/${simulation_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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
    const response = await fetch(`${API_BASE_URL}/simulation/run`, {
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
      const response = await fetch(`${API_BASE_URL}/simulations`, {
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
      const response = await fetch(
        `${API_BASE_URL}/simulations/${simulationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
    company_round: number = 1,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<SimulationCreateResponse> => {
    const response = await fetch(`${API_BASE_URL}/simulation/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id,
        company_round,
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
    company_round: number,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<{
    simulation_id: string;
    plan_id: string;
    message: string;
    success: boolean;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/simulations/${simulation_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id,
          simulation_rounds,
          company_round,
          scheduled_payment,
          sales_achievement_rates,
        }),
      }
    );

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
    const response = await fetch(
      `${API_BASE_URL}/simulations/${simulation_id}/memo`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memo }),
      }
    );
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
    const response = await fetch(`${API_BASE_URL}/admin/me`, {
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
    const response = await fetch(`${API_BASE_URL}/notices`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  },
  getNotice: async (notice_id: string): Promise<NoticeDetailResponse> => {
    const response = await fetch(`${API_BASE_URL}/notices/${notice_id}`);
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
    const response = await fetch(`${API_BASE_URL}/admin/notices`, {
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
        /* ignore parse error */
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
    const response = await fetch(`${API_BASE_URL}/admin/notices/${notice_id}`, {
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
        /* ignore parse error */
      }
      throw new Error(msg);
    }
    return await response.json();
  },

  deleteNotice: async (
    token: string,
    notice_id: string
  ): Promise<NoticeDeleteResponse> => {
    const response = await fetch(`${API_BASE_URL}/admin/notices/${notice_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        msg = err?.detail || msg;
      } catch {
        /* ignore parse error */
      }

      throw new Error(msg);
    }
    return await response.json();
  },

  // Consent related API methods
  getPrivacyPolicy: async (): Promise<PrivacyPolicyResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/privacy-policy`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Privacy policy fetch error:", error);
      throw error;
    }
  },

  recordConsent: async (
    data: ConsentRecordRequest,
    token: string
  ): Promise<ConsentRecordResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/consents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    token: string
  ): Promise<{ consents: any[]; success: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/consents`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
};
