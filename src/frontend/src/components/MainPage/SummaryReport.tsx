import React from "react";
import {
  Paper,
  Typography,
  Box,
  Stack,
  Grid,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";

import type {
  SummaryReportData,
  SummaryReportItem,
} from "../../hooks/useMainPageState";

interface SummaryReportProps {
  showSummaryReport: boolean;
  summaryReportData: SummaryReportData | null;
  onClose: () => void;
}

const SummaryReport: React.FC<SummaryReportProps> = ({
  showSummaryReport,
  summaryReportData,
  onClose,
}) => {
  if (!showSummaryReport || !summaryReportData) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ p: 2.5, mt: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight={600}>
          종합 결과 보고서
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={onClose}
        >
          닫기
        </Button>
      </Stack>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          총 필요 준비금
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            borderColor:
              Number(summaryReportData.totalRequiredFunds) >= 0
                ? "success.main"
                : "error.main",
            borderWidth: 2,
          }}
        >
          <Typography
            variant="h5"
            fontWeight={700}
            align="center"
            sx={{
              color:
                Number(summaryReportData.totalRequiredFunds) >= 0
                  ? "success.main"
                  : "error.main",
            }}
          >
            {Number(summaryReportData.totalRequiredFunds).toLocaleString()} 원
          </Typography>
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {Object.keys(summaryReportData)
          .filter((key) => key !== "totalRequiredFunds")
          .map((planId) => {
            const planData = summaryReportData[planId] as SummaryReportItem;
            const history = planData.history || [];

            return (
              <Grid item xs={12} md={6} key={planId}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    height: "100%",
                    borderLeft: 4,
                    borderColor:
                      Number(planData.requiredFunds) >= 0
                        ? "success.main"
                        : "error.main",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {planId} 플랜
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={2}
                        divider={<Divider orientation="vertical" flexItem />}
                      >
                        <Typography variant="body2" color="text.secondary">
                          시작 회차: {planData.starting_company_round}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          총 회차: {planData.simulation_rounds}
                        </Typography>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        필요 준비금
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        sx={{
                          color:
                            Number(planData.requiredFunds) >= 0
                              ? "success.main"
                              : "error.main",
                        }}
                      >
                        {Number(planData.requiredFunds).toLocaleString()} 원
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        회차별 데이터 (순수하게 내 돈이 들어가는 시점까지)
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: "180px",
                          overflowY: "auto",
                          mt: 1,
                        }}
                      >
                        <Table size="small" sx={{ tableLayout: "fixed" }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ width: "30%" }}>
                                회사 회차
                              </TableCell>
                              <TableCell align="right">회차 매출액</TableCell>
                              <TableCell align="right">누적 수익</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {history.map(
                              (
                                item: Record<string, unknown>,
                                index: number
                              ) => (
                                <TableRow
                                  key={index}
                                  sx={{
                                    backgroundColor:
                                      index === history.length - 1
                                        ? "rgba(0, 0, 0, 0.04)"
                                        : "inherit",
                                    "&:last-child td": {
                                      fontWeight: "bold",
                                    },
                                  }}
                                >
                                  <TableCell>
                                    {item.company_round !== undefined
                                      ? String(item.company_round)
                                      : "-"}
                                  </TableCell>
                                  <TableCell align="right">
                                    {item.amount !== undefined
                                      ? Number(item.amount).toLocaleString()
                                      : "-"}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{
                                      color:
                                        Number(
                                          item.cumulative_net_profit || 0
                                        ) >= 0
                                          ? "success.main"
                                          : "error.main",
                                    }}
                                  >
                                    {item.cumulative_net_profit !== undefined
                                      ? Number(
                                          item.cumulative_net_profit
                                        ).toLocaleString()
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
      </Grid>
    </Paper>
  );
};

export default React.memo(SummaryReport);
