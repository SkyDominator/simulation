export interface Plan {
  id?: string;
  user_id?: string;
  plan_type: string;
  company_round: number;
  simulation_rounds: number;
  investments?: Investment[];
  created_at?: string;
  updated_at?: string;
}

export interface Investment {
  round: number;
  amount: number;
}

export interface SimulationResults {
  input: {
    plan_type: string;
    max_rounds: number;
    scheduled_payment: Record<string, number>;
  };
  output: any; // You can define a more specific type based on your actual response structure
}

export interface WhitelistCheckResponse {
  success: boolean;
  message: string;
  is_whitelisted: boolean;
  detail?: string;
}

// Define a type for the page navigation
export type Page = 'whitelist' | 'login' | 'main' | 'plan-editor' | 'results';
