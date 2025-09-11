import { DEFAULT_INVESTMENT_AMOUNTS } from "../../../constants";
import type { Investment } from "../types/index";

/**
 * Gets default investment amount for a plan type and round
 */
export const getDefaultInvestmentAmount = (
  planType: string,
  round: number
): number => {
  try {
    const planData =
      DEFAULT_INVESTMENT_AMOUNTS[
        planType as keyof typeof DEFAULT_INVESTMENT_AMOUNTS
      ];
    if (planData?.min_payment_new) {
      const minPayments = planData.min_payment_new as Record<
        string | number,
        number
      >;
      if (round in minPayments) {
        return minPayments[round];
      } else {
        const maxMinPaymentRound = 19;
        return minPayments[maxMinPaymentRound]; // Use the last defined round for this plan type
      }
    }
  } catch (error) {
    console.error("Error getting default investment amount:", error);
  }
  return 0;
};

/**
 * Gets the min and max simulation round limits for a plan type
 */
export const getSimulationRoundLimits = (planType: string) => {
  // const isABC = ["A", "B", "C"].includes(planType);
  return {
    // min: isABC ? 15 : 18,
    // max: isABC ? 150 : 180,
    min: 1,
    max: 100,
  };
};

/**
 * Generates investment rounds based on simulation rounds and plan type
 */
export const generateInvestments = (
  simulationRounds: number,
  planType: string,
  existingInvestments: Investment[] = []
): Investment[] => {
  return Array.from({ length: simulationRounds }, (_, i) => {
    const round = i + 1;
    const existing = existingInvestments.find((inv) => inv.round === round);

    if (existing) {
      return existing;
    } else {
      const defaultAmount = getDefaultInvestmentAmount(planType, round);
      return { round, amount: defaultAmount };
    }
  });
};
