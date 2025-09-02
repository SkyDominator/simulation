import { useState, useEffect } from "react";
import { getJSON, setJSON } from "../utils/persist";
import type { SortSpec } from "../components/MainPage/SimulationTable";

// Constants for storage keys
export const MAIN_SORT_KEY = "ui.main.sortOrders" as const;
export const VALID_SORT_KEYS = [
  "plan_id",
  "starting_company_round",
  "simulation_rounds",
  "created_at",
] as const;
export const DEFAULT_SORT_ORDERS: SortSpec[] = [
  { key: "created_at", dir: "desc" },
];

// Type guard for sort spec array
export function isSortSpecArray(val: unknown): val is SortSpec[] {
  if (!Array.isArray(val)) return false;
  return val.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    const key = o.key;
    const dir = o.dir;
    return (
      typeof key === "string" &&
      (VALID_SORT_KEYS as readonly string[]).includes(key) &&
      (dir === "asc" || dir === "desc")
    );
  });
}

export const useSortState = () => {
  const [sortOrders, setSortOrders] = useState<SortSpec[]>(() => {
    const persisted = getJSON<unknown>(MAIN_SORT_KEY, DEFAULT_SORT_ORDERS);
    return isSortSpecArray(persisted) ? persisted : DEFAULT_SORT_ORDERS;
  });

  // Persist sort order on change
  useEffect(() => {
    setJSON(MAIN_SORT_KEY, sortOrders);
  }, [sortOrders]);

  const toggleDir = (dir: "asc" | "desc"): "asc" | "desc" =>
    dir === "asc" ? "desc" : "asc";

  const handleHeaderClick = (
    key: SortSpec["key"],
    e: React.MouseEvent<HTMLTableCellElement>
  ) => {
    const isMulti = e.shiftKey; // shift-click adds to multi sort
    setSortOrders((prev: SortSpec[]) => {
      // find existing
      const existingIndex = prev.findIndex((s: SortSpec) => s.key === key);
      if (!isMulti) {
        // single column mode
        if (existingIndex === 0 && prev.length === 1) {
          // toggle primary
          const cur = prev[0];
          return [{ key, dir: toggleDir(cur.dir) }];
        }
        // set as new primary ascending
        return [{ key, dir: "asc" }];
      } else {
        // multi-column mode
        if (existingIndex === -1) {
          // append new with asc
          return [...prev, { key, dir: "asc" }];
        }
        // toggle direction in place
        const next: SortSpec[] = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          dir: toggleDir(next[existingIndex].dir),
        };
        return next;
      }
    });
  };

  return { sortOrders, setSortOrders, handleHeaderClick };
};

export const useSelectedSimulations = () => {
  const [selectedSimulations, setSelectedSimulations] = useState<string[]>(
    () => {
      // Try to load selected simulations from localStorage
      try {
        const saved = localStorage.getItem("ui.main.selectedSimulations");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  );

  // Persist selected simulations when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "ui.main.selectedSimulations",
        JSON.stringify(selectedSimulations)
      );
    } catch {
      void 0; // no-op
    }
  }, [selectedSimulations]);

  return { selectedSimulations, setSelectedSimulations };
};

export interface SummaryReportItem {
  plan_id: string;
  starting_company_round: number;
  current_company_round?: number;
  simulation_rounds: number;
  history: Array<Record<string, unknown>>;
  requiredFunds: number | string;
}

export interface SummaryReportData {
  totalRequiredFunds: number;
  [planId: string]: SummaryReportItem | number;
}

export const useSummaryReportState = () => {
  const [showSummaryReport, setShowSummaryReport] = useState(() => {
    // Try to load report visibility state from localStorage
    try {
      return localStorage.getItem("ui.main.showSummaryReport") === "true";
    } catch {
      return false;
    }
  });

  const [summaryReportData, setSummaryReportData] =
    useState<SummaryReportData | null>(() => {
      // Try to load report data from localStorage
      try {
        const saved = localStorage.getItem("ui.main.summaryReportData");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });

  // Persist summary report visibility
  useEffect(() => {
    try {
      localStorage.setItem(
        "ui.main.showSummaryReport",
        String(showSummaryReport)
      );
    } catch {
      void 0; // no-op
    }
  }, [showSummaryReport]);

  // Persist summary report data
  useEffect(() => {
    try {
      if (summaryReportData) {
        localStorage.setItem(
          "ui.main.summaryReportData",
          JSON.stringify(summaryReportData)
        );
      }
    } catch {
      void 0; // no-op
    }
  }, [summaryReportData]);

  return {
    showSummaryReport,
    setShowSummaryReport,
    summaryReportData,
    setSummaryReportData,
  };
};
