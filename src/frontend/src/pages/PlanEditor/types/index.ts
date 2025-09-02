import { type Plan } from '../../../types/types';

export interface PlanEditorPageProps {
  setPage: (page: string) => void;
  editingPlan: Plan | null;
}

export interface Investment {
  round: number;
  amount: number;
}

export interface ValidationData {
  value: number;
  min: number;
  max: number;
  field: keyof Plan;
}

export interface InvestmentValidationResult {
  hasInvalidInvestments: boolean;
  correctedInvestments: Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }>;
  updatedInvestments?: Array<{ round: number; amount: number }>;
}

export interface PlanLimits {
  min: number;
  max: number;
}
