import React from "react";
import type { SimulationRunResponse, Page } from "../types/types";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Divider,
} from "@mui/material";

// ==== Column configuration ====
// Reorder columns by editing this array. Only keys present in history will be shown.
// You can add/remove keys freely; unknown keys are ignored.
const COLUMN_ORDER: string[] = [
  "company_round",
  "investor_count",
  "amount",
  "total_payment",
  "total_revenue_before_tax",
  "total_revenue_after_tax",
  "net_profit_after_tax",
  "cumulative_net_profit",
  "sales_achievement_rate",
];

// If true, any history fields not listed in COLUMN_ORDER will be appended (alphabetically)
const SHOW_UNLISTED_COLUMNS = true;

interface ResultsPageProps {
  setPage: (page: Page) => void;
  result: SimulationRunResponse | null;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ setPage, result }) => {
  const historyRaw = (result?.history ?? []) as unknown[];
  let history: Array<Record<string, unknown>> = historyRaw.map((e) =>
    e && typeof e === "object" ? (e as Record<string, unknown>) : {}
  );

  // Inject sequential company_round values and amount column.
  if (result) {
    const scheduled = result.scheduled_payment || {};
    const salesRates = result.sales_achievement_rates || {};
    const base = result.company_round || 0;
    history = history.map((row, idx) => {
      const companyRound = base + idx; // first row = base, then increment
      const newRow: Record<string, unknown> = {
        ...row,
        company_round: companyRound,
      };
      const amt = scheduled[idx + 1];
      if (amt !== undefined) newRow.amount = amt;
      // sales achievement rate mapped by personal round (idx+1) fallback 100
      const rate = salesRates[(idx + 1).toString()];
      newRow.sales_achievement_rate = rate !== undefined ? rate : 100;
      return newRow;
    });
  }

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return val.toLocaleString();
    if (typeof val === "string") return val;
    try {
      return JSON.stringify(val, null, 0);
    } catch {
      return String(val);
    }
  };

  // Build table columns from history entries: prefer common fields first
  const collectColumns = (): string[] => {
    const set = new Set<string>();
    for (const row of history) {
      Object.keys(row).forEach((k) => set.add(k));
    }
    const presentOrdered = COLUMN_ORDER.filter((k) => set.has(k));
    const rest = Array.from(set)
      .filter((k) => !presentOrdered.includes(k))
      .sort();
    return SHOW_UNLISTED_COLUMNS
      ? [...presentOrdered, ...rest]
      : presentOrdered;
  };

  const columnLabelMap: Record<string, string> = {
    company_round: "회사 회차",
    investor_count: "아바타 개수",
    cumulative_net_profit: "총 이익",
    amount: "회차 매출액",
    net_profit_after_tax: "회차 이익(세후)",
    total_payment: "총 매출액",
    total_revenue_after_tax: "수당(세후)",
    total_revenue_before_tax: "수당(세전)",
    sales_achievement_rate: "매출 달성율",
  };

  const headerLabel = (key: string) =>
    columnLabelMap[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const columns = collectColumns();
  // Compute dynamic widths (in ch) based on header + cell content lengths
  const columnCharWidths: Record<string, number> = {};
  for (const col of columns) {
    columnCharWidths[col] = headerLabel(col).length; // start with header length
  }
  history.forEach((row) => {
    columns.forEach((col) => {
      const raw = formatValue(row[col]);
      const len = raw.length;
      if (len > columnCharWidths[col]) columnCharWidths[col] = len;
    });
  });
  // Build style map (add a small buffer). Use minWidth so columns can still expand if needed.
  const colStyles: Record<string, React.CSSProperties> = {};
  const WIDE_COLS = new Set(["company_round", "investor_count", "amount"]);
  columns.forEach((col) => {
    let ch = Math.min(Math.max(columnCharWidths[col] + 2, 6), 80); // clamp
    if (WIDE_COLS.has(col)) {
      ch = Math.min(ch + 6, 90); // give extra breathing room for key columns
    }
    colStyles[col] = { minWidth: `${ch}ch` };
  });

  // Define numeric columns for right alignment
  const NUMERIC_COLUMNS = new Set([
    "company_round",
    "investor_count",
    "amount",
    "total_payment",
    "total_revenue_before_tax",
    "total_revenue_after_tax",
    "net_profit_after_tax",
    "cumulative_net_profit",
    "sales_achievement_rate",
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: "1280px", mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        mb={4}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: "1.75rem", md: "2.125rem" } }}
          >
            시뮬레이션 결과
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => setPage("main")}
          >
            돌아가기
          </Button>
        </Stack>
      </Stack>

      {!result ? (
        <Paper sx={{ p: 6, textAlign: "center", color: "text.secondary" }}>
          표시할 결과가 없습니다.
        </Paper>
      ) : (
        <Stack spacing={4}>
          {/* Summary */}
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              divider={
                <Divider
                  flexItem
                  orientation="vertical"
                  sx={{ display: { xs: "none", sm: "block" } }}
                />
              }
            >
              <Box>
                <Typography
                  variant="overline"
                  display="block"
                  color="text.secondary"
                  gutterBottom
                >
                  플랜
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {result.plan_id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  display="block"
                  color="text.secondary"
                  gutterBottom
                >
                  시뮬레이션 회차 개수
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {history.length.toLocaleString()} 개
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Table */}
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            {history.length === 0 ? (
              <Typography textAlign="center" color="text.secondary" py={6}>
                히스토리가 없습니다.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 560 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell
                          key={col}
                          sx={{
                            top: 0,
                            backgroundColor: "background.paper",
                            minWidth: colStyles[col]?.minWidth,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {headerLabel(col)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((row, idx) => (
                      <TableRow key={idx} hover>
                        {columns.map((col) => {
                          const isNumeric = NUMERIC_COLUMNS.has(col);
                          const rawVal = row[col];
                          let display: React.ReactNode = formatValue(rawVal);
                          if (
                            col === "sales_achievement_rate" &&
                            display !== ""
                          ) {
                            display = `${display}%`;
                          }
                          if (col === "cumulative_net_profit") {
                            const numericVal =
                              typeof rawVal === "number"
                                ? rawVal
                                : parseFloat(String(rawVal));
                            const positive =
                              !isNaN(numericVal) && numericVal >= 0;
                            display = (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 700,
                                  color: positive
                                    ? "success.main"
                                    : "error.main",
                                }}
                              >
                                {display}
                              </Box>
                            );
                          }
                          return (
                            <TableCell
                              key={col}
                              sx={{
                                minWidth: colStyles[col]?.minWidth,
                                typography: "body2",
                                textAlign: isNumeric ? "right" : "left",
                                fontVariantNumeric: isNumeric
                                  ? "tabular-nums"
                                  : undefined,
                              }}
                            >
                              {display}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default ResultsPage;
