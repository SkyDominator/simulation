import React from "react";
import type { SimulationRunResponse, Page } from "../types/types";
import {
  injectDerivedHistory,
  findMaxNegativeDeepIndex,
} from "../utils/simulation";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Divider,
  Tooltip,
} from "@mui/material";

// Column header display labels
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

// Column configuration: reorder by editing this array (unknown keys are ignored)
const COLUMN_ORDER: readonly string[] = [
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

// Append unlisted keys discovered in data (alphabetically)
const SHOW_UNLISTED_COLUMNS = true as const;

interface ResultsPageProps {
  setPage: (page: Page) => void;
  result: SimulationRunResponse | null;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ setPage, result }) => {
  // Enriched history with derived fields
  const history: Array<Record<string, unknown>> = React.useMemo(
    () => (result ? injectDerivedHistory(result) : []),
    [result]
  );

  // First index where cumulative profit starts increasing toward positive
  const maximumNegativeDeepIndex = React.useMemo(
    () => findMaxNegativeDeepIndex(history),
    [history]
  );

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

  // Build columns from history entries: prefer COLUMN_ORDER
  const columns = React.useMemo(() => {
    const set = new Set<string>();
    for (const row of history) {
      Object.keys(row).forEach((k) => set.add(k));
    }
    const presentOrdered = COLUMN_ORDER.filter((k) => set.has(k));
    const rest = Array.from(set)
      .filter((k) => !presentOrdered.includes(k))
      .sort();
    return (
      SHOW_UNLISTED_COLUMNS ? [...presentOrdered, ...rest] : presentOrdered
    ) as string[];
  }, [history]);

  const headerLabel = (key: string) =>
    columnLabelMap[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Compute dynamic widths (in ch) based on header + cell content lengths
  const columnCharWidths = React.useMemo(() => {
    const map: Record<string, number> = {};
    const computeHeaderLabel = (key: string) =>
      columnLabelMap[key] ??
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    for (const col of columns) {
      map[col] = computeHeaderLabel(col).length; // start with header length
    }
    for (const row of history) {
      for (const col of columns) {
        const raw = formatValue(row[col]);
        const len = raw.length;
        if (len > map[col]) map[col] = len;
      }
    }
    return map;
  }, [columns, history]);

  // Build style map; use minWidth so columns can still expand if needed
  const colStyles = React.useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    const WIDE_COLS = new Set(["company_round", "investor_count", "amount"]);
    for (const col of columns) {
      let ch = Math.min(Math.max((columnCharWidths[col] ?? 0) + 2, 6), 80); // clamp
      if (WIDE_COLS.has(col)) {
        ch = Math.min(ch + 6, 90); // give extra breathing room for key columns
      }
      styles[col] = { minWidth: `${ch}ch` };
    }
    return styles;
  }, [columns, columnCharWidths]);

  // Numeric columns for right alignment
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
    <Box
      sx={{
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 2, md: 3 },
        width: "100%",
      }}
    >
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
          <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
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
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          ...(idx === maximumNegativeDeepIndex && {
                            backgroundColor: "rgba(255, 100, 100, 0.12)", // Light red background
                            "&:hover": {
                              backgroundColor: "rgba(255, 100, 100, 0.2)", // Darker red on hover
                            },
                          }),
                        }}
                      >
                        {columns.map((col) => {
                          const isNumeric = NUMERIC_COLUMNS.has(col);
                          const rawVal = row[col];
                          let display: React.ReactNode = formatValue(rawVal);
                          if (
                            col === "sales_achievement_rate" &&
                            display !== ""
                          ) {
                            // Hide for rounds 1~3 (personal rounds index 0..2)
                            if (idx <= 2) {
                              display = "";
                            } else {
                              display = `${display}%`;
                            }
                          }
                          if (col === "cumulative_net_profit") {
                            const numericVal =
                              typeof rawVal === "number"
                                ? rawVal
                                : parseFloat(String(rawVal));
                            const positive =
                              !isNaN(numericVal) && numericVal >= 0;
                            // Force no decimals for '총 이익' column
                            const rounded = Number.isFinite(numericVal)
                              ? Math.round(numericVal)
                              : numericVal;
                            const formatted = Number.isFinite(rounded as number)
                              ? (rounded as number).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : display;

                            // Apply tooltip to the cell if it's the first profit increase row
                            const content = (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 700,
                                  color: positive
                                    ? "success.main"
                                    : "error.main",
                                }}
                              >
                                {formatted}
                              </Box>
                            );

                            display =
                              idx === maximumNegativeDeepIndex ? (
                                <Tooltip
                                  title="이 회차에서 총 이익이 처음으로 증가하기 시작합니다"
                                  arrow
                                  placement="top"
                                >
                                  {content}
                                </Tooltip>
                              ) : (
                                content
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
