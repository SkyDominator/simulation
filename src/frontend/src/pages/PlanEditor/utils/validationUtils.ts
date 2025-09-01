import type { Plan } from '../../../types/types';
import type { ValidationData } from '../types/index';

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
