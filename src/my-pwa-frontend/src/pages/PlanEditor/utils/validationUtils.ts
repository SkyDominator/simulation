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
  investments: Array<{ round: number; amount: number }>, 
  planType: string
): InvestmentValidationResult => {
  const correctedInvestments: Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }> = [];
  
  // Create a copy of investments to modify
  const updatedInvestments = [...investments];
  
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
