import type { SimulationRunResponse } from "../types/types";

export type HistoryRow = Record<string, unknown>;

// Normalize a raw history entry into a plain object
function toRow(entry: unknown): HistoryRow {
  return entry && typeof entry === "object" ? (entry as HistoryRow) : {};
}

// Safely read a possibly number- or string-keyed map
function readByRound<T = unknown>(
  map: unknown,
  roundIndex1Based: number
): T | undefined {
  if (!map || typeof map !== "object") return undefined;
  const numMap = map as Record<number, T>;
  const strMap = map as Record<string, T>;
  return numMap[roundIndex1Based] ?? strMap[String(roundIndex1Based)];
}

/**
 * Build processed history by injecting derived fields:
 * - company_round: starting_company_round + index
 * - amount: from scheduled_payment keyed by personal round (idx+1)
 * - sales_achievement_rate: from sales_achievement_rates keyed by personal round (idx+1), default 100
 */
export function injectDerivedHistory(
  result: SimulationRunResponse
): HistoryRow[] {
  const raw = (result?.history ?? []) as unknown[];
  const scheduled = result?.scheduled_payment ?? {};
  const salesRates = result?.sales_achievement_rates ?? {};
  const base = result?.starting_company_round ?? 0;

  return raw.map((entry, idx) => {
    const row = toRow(entry);
    const companyRound = base + idx; // first row = base, then increment

    const amount = readByRound<number>(scheduled, idx + 1);
    const rate = readByRound<number>(salesRates, idx + 1);

    return {
      ...row,
      company_round: companyRound,
      ...(amount !== undefined ? { amount } : {}),
      sales_achievement_rate: rate !== undefined ? rate : 100,
    };
  });
}

/**
 * Find the index where cumulative_net_profit reaches its most negative point
 * just before it starts increasing (turning point). Returns -1 if not found
 * or history is empty.
 */
export function findMaxNegativeDeepIndex(history: HistoryRow[]): number {
  if (!history.length) return -1;

  let prevValue = Number(history[0]?.cumulative_net_profit ?? 0);
  for (let i = 1; i < history.length; i++) {
    const currentValue = Number(history[i]?.cumulative_net_profit ?? 0);
    if (!Number.isNaN(currentValue) && currentValue > prevValue) {
      return i - 1;
    }
    prevValue = currentValue;
  }
  return -1;
}
