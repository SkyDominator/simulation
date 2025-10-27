import { vi } from "vitest";
import type { ApiServiceInterface } from "../../services/ApiService";
import type {
  Plan,
  SimulationRunResponse,
  OTPSendResponse,
  OTPVerifyResponse,
} from "../../types/types";
import {
  createSimulationResults,
  createSimulationData,
  createSimulationListResponse,
  createSimulationCreateResponse,
  createNoticeListResponse,
  createNotice,
  createPrivacyPolicyResponse,
  createPrivacyPolicyListResponse,
  createConsentRecord,
  createOTPSendSuccessResponse,
  createOTPVerifySuccessResponse,
} from "../../../test/shared/fixtures";
import type { SimulationData } from "../../../test/shared/types";

export const mapSimulationDataToPlan = (data: SimulationData): Plan => ({
  simulation_id: data.id,
  plan_id: data.plan_id,
  memo: data.memo ?? null,
  created_at: data.created_at,
  updated_at: data.updated_at,
  starting_company_round: data.starting_company_round,
  current_company_round: data.current_company_round,
  simulation_rounds: data.simulation_rounds,
  investments: data.investments
    ? Object.entries(data.investments).map(([round, amount]) => ({
        round: Number(round),
        amount,
      }))
    : [],
  sales_achievement_rates: undefined,
});

const defaultPlan = mapSimulationDataToPlan(createSimulationData());

const createRunResponse = (plan: Plan = defaultPlan): SimulationRunResponse => {
  const results = createSimulationResults(1);
  return {
    simulation_id: plan.simulation_id,
    plan_id: plan.plan_id,
    starting_company_round: plan.starting_company_round,
    current_company_round: plan.current_company_round,
    simulation_rounds: results.summary.total_rounds,
    scheduled_payment: {},
    sales_achievement_rates: {},
    history: results.history.map((round) => ({
      company_round: round.company_round,
      investor_count: round.investor_count,
      total_payment: round.total_payment,
      total_revenue_after_tax: round.total_revenue_after_tax,
      cumulative_net_profit: round.cumulative_net_profit,
      round_bonus: round.round_bonus,
      settlement_bonus: round.settlement_bonus,
    })),
    message: "Simulation completed",
    success: true,
  };
};

export const createMockApiService = (
  overrides?: Partial<ApiServiceInterface>
): ApiServiceInterface => {
  const simulationList = createSimulationListResponse();
  const plans = (simulationList.data ?? [createSimulationData()]).map(
    mapSimulationDataToPlan
  );

  const mockService: ApiServiceInterface = {
    deleteSimulation: vi.fn().mockResolvedValue({
      simulation_id: defaultPlan.simulation_id,
      message: "Deleted",
      success: true,
    }),

    runSimulation: vi.fn().mockResolvedValue(createRunResponse()),

    getSimulations: vi.fn().mockResolvedValue(plans),

    getSimulationDetails: vi
      .fn()
      .mockResolvedValue(mapSimulationDataToPlan(createSimulationData())),

    createSimulation: vi.fn().mockImplementation(async () => {
      const response = createSimulationCreateResponse();
      const data = response.data ?? createSimulationData();
      return {
        simulation_id: data.id,
        plan_id: data.plan_id,
        message: response.message ?? "Created",
        success: response.success,
      };
    }),

    updateSimulation: vi.fn().mockResolvedValue({
      simulation_id: defaultPlan.simulation_id,
      plan_id: defaultPlan.plan_id,
      message: "Updated",
      success: true,
    }),

    updateSimulationMemo: vi.fn().mockResolvedValue({
      success: true,
      message: "Memo updated",
      simulation_id: defaultPlan.simulation_id,
      memo: "Updated memo",
    }),

    adminMe: vi.fn().mockResolvedValue({
      is_admin: true,
      success: true,
    }),

    listNotices: vi.fn().mockResolvedValue(createNoticeListResponse(2)),

    getNotice: vi.fn().mockResolvedValue({
      notice: createNotice(),
      success: true,
    }),

    createNotice: vi.fn().mockResolvedValue({
      id: "new-notice-id",
      message: "Notice created",
      success: true,
    }),

    updateNotice: vi.fn().mockResolvedValue({
      id: "notice-id",
      message: "Notice updated",
      success: true,
    }),

    deleteNotice: vi.fn().mockResolvedValue({
      id: "notice-id",
      message: "Notice deleted",
      success: true,
    }),

    getPrivacyPolicy: vi.fn().mockResolvedValue(createPrivacyPolicyResponse()),

    createPrivacyPolicy: vi.fn().mockResolvedValue({
      id: "new-policy-id",
      message: "Policy created",
      success: true,
    }),

    updatePrivacyPolicy: vi.fn().mockResolvedValue({
      id: "policy-id",
      message: "Policy updated",
      success: true,
    }),

    publishPrivacyPolicy: vi.fn().mockResolvedValue({
      id: "policy-id",
      message: "Policy published",
      success: true,
    }),

    listPrivacyPolicies: vi
      .fn()
      .mockResolvedValue(createPrivacyPolicyListResponse(2)),

    getPrivacyPolicyAdmin: vi.fn().mockResolvedValue({
      policy: {
        id: "policy-id",
        version: "v1",
        content: "<p>Privacy policy content</p>",
        locale: "ko-KR",
        published: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      success: true,
    }),

    deletePrivacyPolicy: vi.fn().mockResolvedValue({
      id: "policy-id",
      message: "Policy deleted",
      success: true,
    }),

    recordConsent: vi
      .fn()
      .mockResolvedValue(
        createConsentRecord({ consent_given_at: "2024-01-01T00:00:00Z" })
      ),

    getUserConsents: vi.fn().mockResolvedValue({
      consents: [createConsentRecord()],
      success: true,
    }),

    sendOtp: vi
      .fn()
      .mockResolvedValue(createOTPSendSuccessResponse() as OTPSendResponse),

    verifyOtp: vi
      .fn()
      .mockResolvedValue(createOTPVerifySuccessResponse() as OTPVerifyResponse),
  };

  return { ...mockService, ...overrides };
};

export const createFailingApiService = (
  errorMessage = "Network error"
): ApiServiceInterface => {
  const error = new Error(errorMessage);

  return createMockApiService({
    getSimulations: vi.fn().mockRejectedValue(error),
    runSimulation: vi.fn().mockRejectedValue(error),
    deleteSimulation: vi.fn().mockRejectedValue(error),
    updateSimulationMemo: vi.fn().mockRejectedValue(error),
  });
};

export const createApiServiceWithSimulations = (
  simulations: Plan[]
): ApiServiceInterface => {
  return createMockApiService({
    getSimulations: vi.fn().mockResolvedValue(simulations),
    getSimulationDetails: vi.fn().mockImplementation(async (id: string) => {
      return (
        simulations.find((sim) => sim.simulation_id === id) ??
        simulations[0] ??
        defaultPlan
      );
    }),
  });
};

export const createUnauthorizedApiService = (): ApiServiceInterface => {
  const authError = new Error("401 Unauthorized");

  return createMockApiService({
    getSimulations: vi.fn().mockRejectedValue(authError),
    runSimulation: vi.fn().mockRejectedValue(authError),
    deleteSimulation: vi.fn().mockRejectedValue(authError),
    adminMe: vi.fn().mockRejectedValue(authError),
  });
};
