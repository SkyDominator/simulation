export interface Plan {
  simulation_id: string;
  starting_company_round: number;
  current_company_round: number;
  investments?: Investment[];
  simulation_rounds: number;
  created_at?: string;
  updated_at?: string;
  plan_id: string;
  memo?: string | null;
  sales_achievement_rates?: Record<string, number>; // normalized top-level map
}

export interface Investment {
  round: number;
  amount: number;
}

// Response from POST /api/simulation/run
export interface SimulationRunResponse {
  simulation_id: string;
  plan_id: string;
  starting_company_round: number;
  current_company_round: number; // added new field
  simulation_rounds: number; // added to mirror backend SimulationResponse
  scheduled_payment: Record<string, number>; // added to mirror backend SimulationResponse
  sales_achievement_rates?: Record<string, number>; // user-provided achievement rates
  history: Array<Record<string, unknown>>;
  message: string;
  success: boolean;
}

export interface WhitelistCheckResponse {
  success: boolean;
  message: string;
  is_whitelisted: boolean;
  detail?: string;
  user_hash?: string;
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  expires_in_seconds?: number;
  user_hash?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  remaining_attempts?: number;
}

// Response from POST /api/simulation/create
export interface SimulationCreateResponse {
  simulation_id: string;
  plan_id: string;
  message: string;
  success: boolean;
}

export interface SimulationMemoUpdateResponse {
  simulation_id: string;
  memo?: string | null;
  message: string;
  success: boolean;
}

// Notice board types
export interface Notice {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  pinned?: boolean;
  published?: boolean;
}

export interface NoticeListResponse {
  notices: Notice[];
  success: boolean;
}

export interface NoticeDetailResponse {
  notice: Notice;
  success: boolean;
}

// Admin notice responses
export interface NoticeCreateResponse {
  id: string;
  message: string;
  success: boolean;
}

export interface NoticeUpdateResponse {
  id: string;
  message: string;
  success: boolean;
}

export interface NoticeDeleteResponse {
  id: string;
  message: string;
  success: boolean;
}

export interface AdminMeResponse {
  is_admin: boolean;
  success: boolean;
}

// Consent related types
export interface ConsentRecordRequest {
  user_hash: string;
  consent_type: string;
  consent_version: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ConsentRecordResponse {
  user_hash: string;
  consent_type: string;
  consent_version: string;
  consent_given_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PrivacyPolicyResponse {
  version: string;
  last_updated: string;
  content: string;
  success: boolean;
}

// Define a type for the page navigation
export type Page =
  | "whitelist"
  | "login"
  | "consent"
  | "main"
  | "plan-editor"
  | "results";
