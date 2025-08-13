export interface Plan {
  simulation_id: string;
  company_round: number;
  investments?: Investment[];
  simulation_rounds: number;
  created_at?: string;
  updated_at?: string;
  plan_id: string;
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

// Define a type for the page navigation
export type Page = 'whitelist' | 'login' | 'main' | 'plan-editor' | 'results';
