import type { Plan } from '../../../types/types';
import type { ValidationData, InvestmentValidationResult } from '../types/index';
import { getDefaultInvestmentAmount } from './investmentUtils';

/**
 * Validates a numeric value against min/max constraints
 */
export const validateNumericValue = (
  value: number, 
  min: number, 
  max: number, 
  field: keyof Plan
): ValidationData | null => {
  if (value < min || value > max) {
    return { value, min, max, field };
  }
  return null;
};

/**
 * Validates all investment amounts and returns corrected values if any issues found
 */
export const validateInvestmentAmounts = (
  investments: Array<{ round: number; amount: number; }>, 
  planType: string
): InvestmentValidationResult => {
  const correctedInvestments: Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }> = [];
  
  // Create a copy of investments to modify
  const updatedInvestments = investments.map(inv => ({ ...inv }));
  
  // Check each investment
  updatedInvestments.forEach((inv, index) => {
    const defaultAmount = getDefaultInvestmentAmount(planType, inv.round);
    
    // Check if the amount is NaN, less than default, or less than or equal to 0
    if (isNaN(inv.amount) || inv.amount < defaultAmount || inv.amount <= 0) {
      // Store the original value for reporting
      const oldAmount = inv.amount;
      
      // Update to default amount
      updatedInvestments[index] = {
        ...inv,
        amount: defaultAmount
      };
      
      // Add to list of corrected investments
      correctedInvestments.push({
        round: inv.round,
        oldAmount,
        newAmount: defaultAmount
      });
    }
  });
  
  return {
    hasInvalidInvestments: correctedInvestments.length > 0,
    correctedInvestments,
    updatedInvestments
  };
};

// Validate sales achievement rates map and return corrected copy + list of corrected rounds
export const validateSalesAchievementRates = (
  rates: Record<string, number | undefined>,
  rounds: number[],
  min = 50,
  max = 100,
  defaultValue = 100
): { corrected: Record<string, number>; correctedRounds: number[] } => {
  const corrected: Record<string, number> = {};
  const correctedRounds: number[] = [];
  rounds.forEach(r => {
    const key = r.toString();
    const raw = rates[key];
    let val: number;
    if (raw === undefined || raw === null || isNaN(raw) || raw < min || raw > max) {
      val = defaultValue;
      correctedRounds.push(r);
    } else {
      val = raw;
    }
    corrected[key] = val;
  });
  return { corrected, correctedRounds };
};
