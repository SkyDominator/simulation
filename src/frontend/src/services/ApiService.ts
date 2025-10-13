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

export interface ApiServiceInterface {
  deleteSimulation(
    simulation_id: string,
    token: string
  ): Promise<{ simulation_id: string; message: string; success: boolean }>;
  runSimulation(
    simulation_id: string,
    token: string,
    expectedUpdatedAt?: string
  ): Promise<SimulationRunResponse>;
  getSimulations(token: string): Promise<Plan[]>;
  getSimulationDetails(simulationId: string, token: string): Promise<Plan>;
  createSimulation(
    token: string,
    plan_id: string,
    starting_company_round: number,
    current_company_round: number,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<SimulationCreateResponse>;
  updateSimulation(
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
  }>;
  updateSimulationMemo(
    token: string,
    simulation_id: string,
    memo: string | null
  ): Promise<SimulationMemoUpdateResponse>;
  adminMe(token: string): Promise<AdminMeResponse>;
  listNotices(): Promise<NoticeListResponse>;
  getNotice(notice_id: string): Promise<NoticeDetailResponse>;
  createNotice(
    token: string,
    payload: {
      title: string;
      content: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeCreateResponse>;
  updateNotice(
    token: string,
    notice_id: string,
    payload: {
      title?: string;
      content?: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeUpdateResponse>;
  deleteNotice(token: string, notice_id: string): Promise<NoticeDeleteResponse>;
  getPrivacyPolicy(params?: {
    version?: string;
    locale?: string;
  }): Promise<PrivacyPolicyResponse>;
  createPrivacyPolicy(
    token: string,
    payload: {
      version: string;
      content: string;
      locale?: string;
      effective_date?: string;
      last_updated?: string;
    }
  ): Promise<{ id: string; message: string; success: boolean }>;
  updatePrivacyPolicy(
    token: string,
    policy_id: string,
    payload: {
      version?: string;
      content?: string;
      locale?: string;
      effective_date?: string;
      last_updated?: string;
    }
  ): Promise<{ id: string; message: string; success: boolean }>;
  publishPrivacyPolicy(
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }>;
  listPrivacyPolicies(token: string): Promise<AdminPrivacyPolicyListResponse>;
  getPrivacyPolicyAdmin(
    token: string,
    policy_id: string
  ): Promise<AdminPrivacyPolicyDetailResponse>;
  deletePrivacyPolicy(
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }>;
  recordConsent(
    user_hash: string,
    consent_type?: string,
    consent_version?: string
  ): Promise<ConsentRecordResponse>;
  getUserConsents(
    user_hash: string
  ): Promise<{ consents: ConsentRecordResponse[]; success: boolean }>;
  sendOtp(name: string, phone_number: string): Promise<OTPSendResponse>;
  verifyOtp(
    phone_number: string,
    otp_code: string,
    user_hash?: string
  ): Promise<OTPVerifyResponse>;
}

export class ApiService implements ApiServiceInterface {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private url(path: string): string {
    const base = this.baseUrl.replace(/\/+$/, "");
    const rel = path.replace(/^\/+/, "");
    return `${base}/${rel}`;
  }

  async deleteSimulation(
    simulation_id: string,
    token: string
  ): Promise<{ simulation_id: string; message: string; success: boolean }> {
    const response = await fetch(this.url(`/simulations/${simulation_id}`), {
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
  }

  async runSimulation(
    simulation_id: string,
    token: string,
    expectedUpdatedAt?: string
  ): Promise<SimulationRunResponse> {
    const response = await fetch(this.url("/simulation/run"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        simulation_id,
        expected_updated_at: expectedUpdatedAt,
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

    const data: SimulationRunResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "시뮬레이션 실행에 실패했습니다.");
    }
    return data;
  }

  async getSimulations(token: string): Promise<Plan[]> {
    try {
      const response = await fetch(this.url("/simulations"), {
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
  }

  async getSimulationDetails(
    simulationId: string,
    token: string
  ): Promise<Plan> {
    try {
      const response = await fetch(this.url(`/simulations/${simulationId}`), {
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
  }

  async createSimulation(
    token: string,
    plan_id: string,
    starting_company_round: number = 1,
    current_company_round: number = 1,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ): Promise<SimulationCreateResponse> {
    const response = await fetch(this.url("/simulation/create"), {
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
  }

  async updateSimulation(
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
  }> {
    const response = await fetch(this.url(`/simulations/${simulation_id}`), {
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
  }

  async updateSimulationMemo(
    token: string,
    simulation_id: string,
    memo: string | null
  ): Promise<SimulationMemoUpdateResponse> {
    const response = await fetch(
      this.url(`/simulations/${simulation_id}/memo`),
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
  }

  async adminMe(token: string): Promise<AdminMeResponse> {
    const response = await fetch(this.url("/admin/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    return await response.json();
  }

  async listNotices(): Promise<NoticeListResponse> {
    const response = await fetch(this.url("/notices"));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }

  async getNotice(notice_id: string): Promise<NoticeDetailResponse> {
    const response = await fetch(this.url(`/notices/${notice_id}`));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }

  async createNotice(
    token: string,
    payload: {
      title: string;
      content: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeCreateResponse> {
    const response = await fetch(this.url("/admin/notices"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        pinned: !!payload.pinned,
        published: payload.published !== false,
      }),
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
  }

  async updateNotice(
    token: string,
    notice_id: string,
    payload: {
      title?: string;
      content?: string;
      pinned?: boolean;
      published?: boolean;
    }
  ): Promise<NoticeUpdateResponse> {
    const response = await fetch(this.url(`/admin/notices/${notice_id}`), {
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
  }

  async deleteNotice(
    token: string,
    notice_id: string
  ): Promise<NoticeDeleteResponse> {
    const response = await fetch(this.url(`/admin/notices/${notice_id}`), {
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
  }

  async getPrivacyPolicy(params?: {
    version?: string;
    locale?: string;
  }): Promise<PrivacyPolicyResponse> {
    try {
      const qs = new URLSearchParams();
      if (params?.version) qs.set("version", params.version);
      if (params?.locale) qs.set("locale", params.locale);
      const path = qs.toString()
        ? `/privacy-policy?${qs.toString()}`
        : "/privacy-policy";
      const response = await fetch(this.url(path));

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Privacy policy fetch error:", error);
      throw error;
    }
  }

  async createPrivacyPolicy(
    token: string,
    payload: {
      version: string;
      content: string;
      locale?: string;
      effective_date?: string;
      last_updated?: string;
    }
  ): Promise<{ id: string; message: string; success: boolean }> {
    const response = await fetch(this.url("/admin/privacy-policies"), {
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
  }

  async updatePrivacyPolicy(
    token: string,
    policy_id: string,
    payload: {
      version?: string;
      content?: string;
      locale?: string;
      effective_date?: string;
      last_updated?: string;
    }
  ): Promise<{ id: string; message: string; success: boolean }> {
    const response = await fetch(
      this.url(`/admin/privacy-policies/${policy_id}`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
  }

  async publishPrivacyPolicy(
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }> {
    const response = await fetch(
      this.url(`/admin/privacy-policies/${policy_id}/publish`),
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
  }

  async listPrivacyPolicies(
    token: string
  ): Promise<AdminPrivacyPolicyListResponse> {
    const response = await fetch(this.url("/admin/privacy-policies"), {
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
  }

  async getPrivacyPolicyAdmin(
    token: string,
    policy_id: string
  ): Promise<AdminPrivacyPolicyDetailResponse> {
    const response = await fetch(
      this.url(`/admin/privacy-policies/${policy_id}`),
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
  }

  async deletePrivacyPolicy(
    token: string,
    policy_id: string
  ): Promise<{ id: string; message: string; success: boolean }> {
    const response = await fetch(
      this.url(`/admin/privacy-policies/${policy_id}`),
      {
        method: "DELETE",
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
  }

  async recordConsent(
    user_hash: string,
    consent_type: string = "privacy_policy",
    consent_version: string = "1.0"
  ): Promise<ConsentRecordResponse> {
    try {
      const data = {
        user_hash,
        consent_type,
        consent_version,
        user_agent: navigator.userAgent,
      };

      const response = await fetch(this.url("/consents"), {
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
  }

  async getUserConsents(
    user_hash: string
  ): Promise<{ consents: ConsentRecordResponse[]; success: boolean }> {
    try {
      const response = await fetch(this.url(`/consents/${user_hash}`), {
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
  }

  async sendOtp(name: string, phone_number: string): Promise<OTPSendResponse> {
    try {
      const response = await fetch(this.url("/otp/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phone_number }),
      });

      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody === "object") {
            const bodyRecord = errorBody as Record<string, unknown>;
            if (typeof bodyRecord.message === "string") {
              errorMessage = bodyRecord.message;
            } else if (typeof bodyRecord.detail === "string") {
              errorMessage = bodyRecord.detail;
            }
          }
        } catch {
          // ignore parsing errors
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      return (await response.json()) as OTPSendResponse;
    } catch (error) {
      console.error("OTP send error:", error);
      const message =
        "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      return { success: false, message };
    }
  }

  async verifyOtp(
    phone_number: string,
    otp_code: string,
    user_hash?: string
  ): Promise<OTPVerifyResponse> {
    try {
      const response = await fetch(this.url("/otp/verify"), {
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
        let errorMessage = `API error: ${response.status}`;
        let remainingAttempts: number | undefined;
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody === "object") {
            const bodyRecord = errorBody as Record<string, unknown>;
            if (typeof bodyRecord.message === "string") {
              errorMessage = bodyRecord.message;
            } else if (typeof bodyRecord.detail === "string") {
              errorMessage = bodyRecord.detail;
            }
            if (typeof bodyRecord.remaining_attempts === "number") {
              remainingAttempts = bodyRecord.remaining_attempts;
            }
          }
        } catch {
          // ignore parsing errors
        }

        return {
          success: false,
          message: errorMessage,
          ...(remainingAttempts !== undefined
            ? { remaining_attempts: remainingAttempts }
            : {}),
        };
      }

      return (await response.json()) as OTPVerifyResponse;
    } catch (error) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message:
          "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  }
}

// Default instance using environment URL
export const API_BASE_URL: string =
  (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "https://simulation.lightoflifeclub.com/api";
// "http://localhost:8001/api";

export const defaultApiService = new ApiService(API_BASE_URL);
// dummy comment
