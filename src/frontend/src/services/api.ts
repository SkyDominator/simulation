// Legacy API object - kept for backward compatibility
// New code should use the injected ApiService instead
import { defaultApiService } from "./ApiService";

export const API_BASE_URL = (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "https://simulation.lightoflifeclub.com/api";

// Backward compatibility - delegate to the default service instance
export const api = {
  deleteSimulation: (simulation_id: string, token: string) => 
    defaultApiService.deleteSimulation(simulation_id, token),
  runSimulation: (simulation_id: string, token: string, expectedUpdatedAt?: string) =>
    defaultApiService.runSimulation(simulation_id, token, expectedUpdatedAt),
  getSimulations: (token: string) => defaultApiService.getSimulations(token),
  getSimulationDetails: (simulationId: string, token: string) =>
    defaultApiService.getSimulationDetails(simulationId, token),
  createSimulation: (
    token: string,
    plan_id: string,
    starting_company_round: number = 1,
    current_company_round: number = 1,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ) => defaultApiService.createSimulation(
    token, plan_id, starting_company_round, current_company_round, 
    simulation_rounds, scheduled_payment, sales_achievement_rates
  ),
  updateSimulation: (
    token: string,
    simulation_id: string,
    plan_id: string,
    starting_company_round: number,
    current_company_round: number,
    simulation_rounds: number,
    scheduled_payment: Record<string, number>,
    sales_achievement_rates?: Record<string, number>
  ) => defaultApiService.updateSimulation(
    token, simulation_id, plan_id, starting_company_round, current_company_round,
    simulation_rounds, scheduled_payment, sales_achievement_rates
  ),
  updateSimulationMemo: (token: string, simulation_id: string, memo: string | null) =>
    defaultApiService.updateSimulationMemo(token, simulation_id, memo),
  adminMe: (token: string) => defaultApiService.adminMe(token),
  listNotices: () => defaultApiService.listNotices(),
  getNotice: (notice_id: string) => defaultApiService.getNotice(notice_id),
  createNotice: (token: string, payload: any) => defaultApiService.createNotice(token, payload),
  updateNotice: (token: string, notice_id: string, payload: any) =>
    defaultApiService.updateNotice(token, notice_id, payload),
  deleteNotice: (token: string, notice_id: string) =>
    defaultApiService.deleteNotice(token, notice_id),
  getPrivacyPolicy: (params?: any) => defaultApiService.getPrivacyPolicy(params),
  createPrivacyPolicy: (token: string, payload: any) =>
    defaultApiService.createPrivacyPolicy(token, payload),
  updatePrivacyPolicy: (token: string, policy_id: string, payload: any) =>
    defaultApiService.updatePrivacyPolicy(token, policy_id, payload),
  publishPrivacyPolicy: (token: string, policy_id: string) =>
    defaultApiService.publishPrivacyPolicy(token, policy_id),
  listPrivacyPolicies: (token: string) => defaultApiService.listPrivacyPolicies(token),
  getPrivacyPolicyAdmin: (token: string, policy_id: string) =>
    defaultApiService.getPrivacyPolicyAdmin(token, policy_id),
  deletePrivacyPolicy: (token: string, policy_id: string) =>
    defaultApiService.deletePrivacyPolicy(token, policy_id),
  recordConsent: (user_hash: string, consent_type?: string, consent_version?: string) =>
    defaultApiService.recordConsent(user_hash, consent_type, consent_version),
  getUserConsents: (user_hash: string) => defaultApiService.getUserConsents(user_hash),
  sendOtp: (name: string, phone_number: string) => defaultApiService.sendOtp(name, phone_number),
  verifyOtp: (phone_number: string, otp_code: string, user_hash?: string) =>
    defaultApiService.verifyOtp(phone_number, otp_code, user_hash),
};
