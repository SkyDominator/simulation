import React from "react";
import type { SimulationRunResponse, Page } from "../types/types";
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
} from "@mui/material";

interface OfflineResultsPageProps {
  setPage: (page: Page) => void;
  result: SimulationRunResponse | null;
}

interface InvestorDetail {
  investor_start_round: number;
  investor_internal_round: number;
  payment: number;
  revenue: number;
  investor_type: string;
}

interface ProcessedRoundData {
  company_round: number;
  total_payment: number;
  total_revenue_before_tax: number;
  net_profit_after_tax: number;
  investor_details: InvestorDetail[]; // raw details for cell-level rendering
}

const OfflineResultsPage: React.FC<OfflineResultsPageProps> = ({
  setPage,
  result,
}) => {
  // Normalize scheduled_payment keys to numbers for reliable access
  const scheduledPaymentByRound = React.useMemo((): Record<number, number> => {
    const out: Record<number, number> = {};
    const sp = result?.scheduled_payment;
    if (!sp) return out;
    Object.entries(sp).forEach(([k, v]) => {
      const nk = Number(k);
      if (!Number.isNaN(nk)) out[nk] = Number(v);
    });
    return out;
  }, [result]);
  const processedData = React.useMemo(() => {
    if (!result?.history) return [];

    const data: ProcessedRoundData[] = [];

    for (const round of result.history) {
      const roundData: ProcessedRoundData = {
        company_round: round.company_round as number,
        total_payment: round.total_payment as number,
        total_revenue_before_tax: round.total_revenue_before_tax as number,
        net_profit_after_tax: round.net_profit_after_tax as number,
        investor_details: [],
      };

      // Process investor details if available
      if (round.investor_details && Array.isArray(round.investor_details)) {
        roundData.investor_details =
          (round.investor_details as InvestorDetail[]) || [];
      }

      data.push(roundData);
    }

    return data;
  }, [result]);

  // Get all unique investor start rounds (columns)
  const investorColumns = React.useMemo(() => {
    const columns = new Set<number>();
    // Prefer scheduled_payment keys to ensure columns are visible even if some rounds have no investor data yet
    Object.keys(scheduledPaymentByRound).forEach((k) => columns.add(Number(k)));
    // Also include any columns discovered from investor revenues (defensive)
    for (const round of processedData) {
      for (const d of round.investor_details) {
        columns.add(Number(d.investor_start_round));
      }
    }
    return Array.from(columns).sort((a, b) => a - b);
  }, [processedData, scheduledPaymentByRound]);

  // Calculate totals for each column
  const columnTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    let totalPayment = 0;
    let totalRevenue = 0;
    let sumNetProfit = 0;

    for (const round of processedData) {
      totalPayment += round.total_payment;
      totalRevenue += round.total_revenue_before_tax;
      sumNetProfit += round.net_profit_after_tax; // Sum across all rounds
      for (const d of round.investor_details) {
        const key = Number(d.investor_start_round);
        totals[key] = (totals[key] || 0) + Number(d.revenue);
      }
    }

    return { totals, totalPayment, totalRevenue, sumNetProfit };
  }, [processedData]);

  const formatValue = (val: number): string => {
    return val.toLocaleString();
  };

  const getColumnHeader = (startRound: number): string => {
    if (startRound === 1) {
      return "1회차(본코드)";
    }
    return `${startRound}회차`;
  };

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
            수당표 보기
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => setPage("results")}
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
        <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
          {processedData.length === 0 ? (
            <Typography textAlign="center" color="text.secondary" py={6}>
              히스토리가 없습니다.
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: "80vh", overflowX: "auto" }}>
              <Table size="small" stickyHeader sx={{ minWidth: "max-content" }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        top: 0,
                        backgroundColor: "background.paper",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        minWidth: "80px",
                        position: "sticky",
                        left: 0,
                        zIndex: 6,
                        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.12)",
                      }}
                    >
                      회차
                    </TableCell>
                    {investorColumns.map((startRound) => (
                      <TableCell
                        key={startRound}
                        sx={{
                          top: 0,
                          backgroundColor: "background.paper",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          minWidth: "120px",
                        }}
                      >
                        {getColumnHeader(startRound)}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        top: 0,
                        backgroundColor: "background.paper",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        minWidth: "120px",
                      }}
                    >
                      매출계
                    </TableCell>
                    <TableCell
                      sx={{
                        top: 0,
                        backgroundColor: "background.paper",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        minWidth: "120px",
                      }}
                    >
                      수당계(세전)
                    </TableCell>
                    <TableCell
                      sx={{
                        top: 0,
                        backgroundColor: "background.paper",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        minWidth: "120px",
                      }}
                    >
                      실납입(세후)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Header row with payment amounts */}
                  <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.04)" }}>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        textAlign: "center",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "background.paper",
                        zIndex: 4,
                        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.12)",
                      }}
                    >
                      매출액
                    </TableCell>
                    {investorColumns.map((startRound) => {
                      const amt = scheduledPaymentByRound[startRound];
                      return (
                        <TableCell
                          key={startRound}
                          sx={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 500,
                          }}
                        >
                          {amt !== undefined ? formatValue(amt) : ""}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    ></TableCell>
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    ></TableCell>
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    ></TableCell>
                  </TableRow>

                  {/* Data rows */}
                  {processedData.map((round, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          textAlign: "center",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "background.paper",
                          zIndex: 5,
                          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.12)",
                        }}
                      >
                        {round.company_round}회
                      </TableCell>
                      {investorColumns.map((startRound) => {
                        const match = round.investor_details.find(
                          (d) => d.investor_start_round === startRound
                        );
                        const v = match?.revenue;
                        return (
                          <TableCell
                            key={startRound}
                            sx={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {v !== undefined ? formatValue(v) : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell
                        sx={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                        }}
                      >
                        {formatValue(round.total_payment)}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                        }}
                      >
                        {formatValue(round.total_revenue_before_tax)}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                        }}
                      >
                        {formatValue(round.net_profit_after_tax)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  <TableRow
                    sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)" }}
                  >
                      <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        position: "sticky",
                        left: 0,
                          backgroundColor: "background.paper",
                          zIndex: 4,
                          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.12)",
                      }}
                    >
                      합계
                    </TableCell>
                    {investorColumns.map((startRound) => {
                      const total = columnTotals.totals[startRound];
                      return (
                        <TableCell
                          key={startRound}
                          sx={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                          }}
                        >
                          {total !== undefined ? formatValue(total) : ""}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                      }}
                    >
                      {formatValue(columnTotals.totalPayment)}
                    </TableCell>
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                      }}
                    >
                      {formatValue(columnTotals.totalRevenue)}
                    </TableCell>
                    <TableCell
                      sx={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                      }}
                    >
                      {formatValue(columnTotals.sumNetProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default OfflineResultsPage;
