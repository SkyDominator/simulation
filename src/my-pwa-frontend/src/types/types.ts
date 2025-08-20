export interface Plan {
  simulation_id: string;
  company_round: number;
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

export interface SimulationResults {
  input: {
    plan_type: string;
    max_rounds: number;
    company_round: number;
    scheduled_payment: Record<string, number>;
  };
  output: unknown; // You can define a more specific type based on your actual response structure
}

// Response from POST /api/simulation/run
export interface SimulationRunResponse {
  simulation_id: string;
  plan_id: string;
  company_round: number; // added to mirror backend SimulationResponse
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

// Define a type for the page navigation
export type Page = "whitelist" | "login" | "main" | "plan-editor" | "results";
