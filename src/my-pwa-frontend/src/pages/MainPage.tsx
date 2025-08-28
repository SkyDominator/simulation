import React, { useState, useEffect } from "react";
import { Button } from "../components/Button"; // wrapper around MUI Button keeping prior API
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { MemoModal } from "../components/MemoModal";
import { ContactModal } from "../components/ContactModal";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";
import type { Plan, Page } from "../types/types";
import type { SimulationRunResponse } from "../types/types";
// MUI imports for redesigned layout
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Divider,
  LinearProgress,
  Checkbox,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { getJSON, setJSON } from "../utils/persist";

// Types for sorting (module scope so they are available everywhere below)
type SortKey =
  | "plan_id"
  | "starting_company_round"
  | "simulation_rounds"
  | "created_at";
interface SortSpec {
  key: SortKey;
  dir: "asc" | "desc";
}

// Stable keys and validator for persisted sort state
const MAIN_SORT_KEY = "ui.main.sortOrders" as const;
const VALID_SORT_KEYS = [
  "plan_id",
  "starting_company_round",
  "simulation_rounds",
  "created_at",
] as const;
const DEFAULT_SORT_ORDERS: SortSpec[] = [{ key: "created_at", dir: "desc" }];

function isSortSpecArray(val: unknown): val is SortSpec[] {
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

interface MainPageProps {
  setPage: (page: Page) => void;
  setEditingPlan: (plan: Plan | null) => void;
  // Opens global notice board modal
  openNotice?: () => void;
  setSimulationResult: (result: SimulationRunResponse | null) => void;
}

const MainPage: React.FC<MainPageProps> = (props: MainPageProps) => {
  const { setPage, setEditingPlan, openNotice, setSimulationResult } = props;
  const { user, session, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
  const [targetOrdinal, setTargetOrdinal] = useState<number | null>(null);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoTarget, setMemoTarget] = useState<Plan | null>(null);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  // State for selected simulations
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
  const [showSummaryReport, setShowSummaryReport] = useState(() => {
    // Try to load report visibility state from localStorage
    try {
      return localStorage.getItem("ui.main.showSummaryReport") === "true";
    } catch {
      return false;
    }
  });
  const [summaryReportData, setSummaryReportData] = useState<Record<
    string,
    any
  > | null>(() => {
    // Try to load report data from localStorage
    try {
      const saved = localStorage.getItem("ui.main.summaryReportData");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // draft stored inside MemoModal, keep minimal state here
  const [sortOrders, setSortOrders] = useState<SortSpec[]>(() => {
    const persisted = getJSON<unknown>(MAIN_SORT_KEY, DEFAULT_SORT_ORDERS);
    return isSortSpecArray(persisted) ? persisted : DEFAULT_SORT_ORDERS;
  });

  // Persist sort order on change
  useEffect(() => {
    setJSON(MAIN_SORT_KEY, sortOrders);
  }, [sortOrders]);

  // Persist selected simulations when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "ui.main.selectedSimulations",
        JSON.stringify(selectedSimulations)
      );
    } catch {
      /* Ignore storage errors */
    }
  }, [selectedSimulations]);

  // Persist summary report visibility
  useEffect(() => {
    try {
      localStorage.setItem(
        "ui.main.showSummaryReport",
        String(showSummaryReport)
      );
    } catch {
      /* Ignore storage errors */
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
      /* Ignore storage errors */
    }
  }, [summaryReportData]);

  const toggleDir = (dir: "asc" | "desc"): "asc" | "desc" =>
    dir === "asc" ? "desc" : "asc";

  const handleHeaderClick = (
    key: SortKey,
    e: React.MouseEvent<HTMLTableHeaderCellElement>
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

  const sortedPlans = React.useMemo(() => {
    const copy = [...plans];
    copy.sort((a, b) => {
      for (const spec of sortOrders) {
        let av: number | string = "";
        let bv: number | string = "";
        switch (spec.key) {
          case "plan_id":
            av = a.plan_id || "";
            bv = b.plan_id || "";
            break;
          case "starting_company_round":
            av = a.starting_company_round;
            bv = b.starting_company_round;
            break;
          case "simulation_rounds":
            av = a.simulation_rounds;
            bv = b.simulation_rounds;
            break;
          case "created_at":
          default:
            av = a.created_at ? new Date(a.created_at).getTime() : 0;
            bv = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
        }
        if (av < bv) return spec.dir === "asc" ? -1 : 1;
        if (av > bv) return spec.dir === "asc" ? 1 : -1;
        // equal -> move to next spec
      }
      return 0;
    });
    return copy;
  }, [plans, sortOrders]);

  const sortIndicator = (key: SortKey) => {
    const idx = sortOrders.findIndex((s: SortSpec) => s.key === key);
    if (idx === -1) return null;
    const arrow = sortOrders[idx].dir === "asc" ? "▲" : "▼";
    return (
      <span className="ml-1 text-[10px] font-semibold text-gray-600">
        {idx + 1}
        {arrow}
      </span>
    );
  };

  // 시뮬레이션 데이터 로드
  useEffect(() => {
    const loadPlans = async () => {
      if (!user || !session) return;

      setLoading(true);
      try {
        const data = await api.getSimulations(session.access_token);
        setPlans(data);
      } catch (error) {
        console.error("Error loading plans:", error);
        alert("플랜 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [user, session]);

  const refreshPlans = async () => {
    if (!session) return;
    try {
      const data = await api.getSimulations(session.access_token);
      setPlans(data);
    } catch (error) {
      console.error("Error refreshing plans:", error);
    }
  };

  const handleNewPlan = () => {
    // Ensure any old PlanEditor draft/step is cleared before creating new
    try {
      localStorage.removeItem("ui.planEditor.step");
      localStorage.removeItem("ui.planEditor.plan");
    } catch {
      /* ignore */
    }
    setEditingPlan(null); // 새 플랜이므로 기존 데이터 없음
    setPage("plan-editor");
  };

  // Run simulation for a specific plan and navigate to results
  const handleViewResults = async (plan: Plan) => {
    if (!session) return;
    const simId = plan.simulation_id;

    try {
      setRunningId(simId);
      const data = await api.runSimulation(simId, session.access_token);
      setSimulationResult(data);
      setPage("results");
    } catch (e) {
      console.error("Run simulation error:", e);
      alert("시뮬레이션 실행에 실패했습니다.");
    } finally {
      setRunningId("");
    }
  };

  const openDeleteConfirm = (plan: Plan, ordinal?: number) => {
    setTargetPlan(plan);
    setTargetOrdinal(ordinal ?? null);
    setConfirmOpen(true);
  };

  const openMemo = (plan: Plan) => {
    setMemoTarget(plan);
    setMemoModalOpen(true);
  };

  const handleSaveMemo = async (text: string | null) => {
    if (!session || !memoTarget) return;
    try {
      await api.updateSimulationMemo(
        session.access_token,
        memoTarget.simulation_id,
        text
      );
      // optimistic update local state
      setPlans((prev: Plan[]) =>
        prev.map((p: Plan) =>
          p.simulation_id === memoTarget.simulation_id
            ? { ...p, memo: text || null }
            : p
        )
      );
      setMemoTarget((prev: Plan | null) =>
        prev ? { ...prev, memo: text || null } : prev
      );
    } catch (e) {
      console.error("Memo save error:", e);
      alert("메모 저장에 실패했습니다.");
    }
  };

  // Validate if a simulation can be selected
  const canSelectSimulation = (simulation: Plan): boolean => {
    // If this simulation is already selected, allow toggling it off
    if (selectedSimulations.includes(simulation.simulation_id)) {
      return true;
    }

    // Check if we already have a simulation with the same plan type
    const selectedPlanTypes = plans
      .filter((p) => selectedSimulations.includes(p.simulation_id))
      .map((p) => p.plan_id);

    return !selectedPlanTypes.includes(simulation.plan_id);
  };

  // Handle checkbox selection
  const handleSimulationSelection = (simulationId: string) => {
    setSelectedSimulations((prev) => {
      if (prev.includes(simulationId)) {
        // Remove if already selected
        return prev.filter((id) => id !== simulationId);
      } else {
        // Add if not already selected
        return [...prev, simulationId];
      }
    });
  };

  // Generate summary report data
  const generateSummaryReport = async () => {
    if (!session || selectedSimulations.length === 0) return;

    try {
      // Create a placeholder for our report data
      const reportData: Record<string, any> = {};
      let totalRequiredFunds = 0;

      // For each selected simulation
      for (const simId of selectedSimulations) {
        const plan = plans.find((p) => p.simulation_id === simId);
        if (!plan) continue;

        // Run the simulation to get the results
        const result = await api.runSimulation(simId, session.access_token);

        // Process the history data like ResultsPage does
        const historyRaw = result.history || [];
        let history = historyRaw.map((e) =>
          e && typeof e === "object" ? (e as Record<string, unknown>) : {}
        );

        // Apply the same logic from ResultsPage to inject correct company_round and amount
        const scheduled = result.scheduled_payment || {};
        const base = result.starting_company_round || 0; // This is the starting company round
        history = history.map((row, idx) => {
          const companyRound = base + idx; // First row = base, then increment
          const newRow: Record<string, unknown> = {
            ...row,
            company_round: companyRound,
          };

          // Get amount from scheduled_payment (indexed by personal round idx+1)
          const amt = scheduled[idx + 1];
          if (amt !== undefined) newRow.amount = amt;

          return newRow;
        });

        // Calculate the maximum negative deep index
        let maxNegativeDeepIndex = -1;
        let prevValue = Number(history[0]?.cumulative_net_profit || 0);

        for (let i = 1; i < history.length; i++) {
          const currentValue = Number(history[i]?.cumulative_net_profit || 0);
          if (!isNaN(currentValue) && currentValue > prevValue) {
            maxNegativeDeepIndex = i - 1;
            break;
          }
          prevValue = currentValue;
        }

        // If we didn't find a point where profit starts increasing, use the last point
        if (maxNegativeDeepIndex === -1 && history.length > 0) {
          maxNegativeDeepIndex = history.length - 1;
        }

        // Extract needed data - store the full history up to maxNegativeDeepIndex
        const planData = {
          plan_id: plan.plan_id,
          starting_company_round: plan.starting_company_round, // This is the base company round
          current_company_round: plan.current_company_round, // This is the current company round
          simulation_rounds: plan.simulation_rounds,
          history: history.slice(0, maxNegativeDeepIndex + 1),
          requiredFunds:
            history[maxNegativeDeepIndex]?.cumulative_net_profit || 0,
        };

        // Add the required funds to total
        totalRequiredFunds += Number(planData.requiredFunds);

        reportData[plan.plan_id] = planData;
      }

      // Add total required funds
      reportData.totalRequiredFunds = totalRequiredFunds;

      setSummaryReportData(reportData);
      setShowSummaryReport(true);
    } catch (error) {
      console.error("Error generating summary report:", error);
      alert("종합 결과 생성에 실패했습니다.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!session || !targetPlan) return;
    try {
      setDeletingId(targetPlan.simulation_id);
      await api.deleteSimulation(
        targetPlan.simulation_id,
        session.access_token
      );
      setConfirmOpen(false);
      setTargetPlan(null);
      await refreshPlans();
    } catch (e) {
      console.error("Delete simulation error:", e);
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ py: 2.5, px: { xs: 1, sm: 1.5, md: 2 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={4}
        >
          {/* <Typography variant="h4" fontWeight={700}>
            시뮬레이션
          </Typography> */}
          <Stack direction="row" spacing={1}>
            {openNotice && (
              <Button onClick={openNotice} variant="contained" color="warning">
                공지사항
              </Button>
            )}
            <Button
              onClick={() => setContactModalOpen(true)}
              variant="contained"
              color="info"
              startIcon={<HelpOutlineIcon />}
            >
              문의하기
            </Button>
            <Button
              onClick={async () => {
                if (signOutLoading) return;
                try {
                  setSignOutLoading(true);
                  await signOut();
                } finally {
                  setSignOutLoading(false);
                }
              }}
              variant="outlined"
              color="inherit"
              disabled={signOutLoading}
            >
              <LogoutIcon sx={{ mr: 0.5 }} fontSize="small" />{" "}
              {signOutLoading ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={3} sx={{ p: 2.5, mb: 4 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            mb={2}
          >
            <Typography variant="h6" fontWeight={600}>
              내 시뮬레이션
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                onClick={generateSummaryReport}
                variant="contained"
                color="primary"
                disabled={selectedSimulations.length === 0}
              >
                종합 결과
              </Button>
              <Button
                onClick={handleNewPlan}
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
              >
                새 시뮬레이션
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          {!loading && plans.length === 0 && (
            <Box py={4} textAlign="center" color="text.secondary">
              아직 생성된 플랜이 없습니다. '새 시뮬레이션' 버튼을 눌러
              시작하세요.
            </Box>
          )}
          {!loading && plans.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Tooltip
                        title="종합 결과를 위해 시뮬레이션을 선택하세요. 각 플랜 타입당 하나의 시뮬레이션만 선택 가능합니다."
                        arrow
                      >
                        <span>선택</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ width: 40 }}>번호</TableCell>
                    <TableCell
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                        handleHeaderClick("plan_id", e)
                      }
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <Tooltip
                        title="Click to sort. Shift+Click for secondary sort"
                        arrow
                      >
                        <Box display="inline-flex" alignItems="center">
                          플랜 타입 {sortIndicator("plan_id")}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                        handleHeaderClick("starting_company_round", e)
                      }
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <Tooltip
                        title="Click to sort. Shift+Click for secondary sort"
                        arrow
                      >
                        <Box display="inline-flex" alignItems="center">
                          시작 회차 {sortIndicator("starting_company_round")}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                        handleHeaderClick("simulation_rounds", e)
                      }
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <Tooltip
                        title="Click to sort. Shift+Click for secondary sort"
                        arrow
                      >
                        <Box display="inline-flex" alignItems="center">
                          총 회차 {sortIndicator("simulation_rounds")}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                        handleHeaderClick("created_at", e)
                      }
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <Tooltip
                        title="Click to sort. Shift+Click for secondary sort"
                        arrow
                      >
                        <Box display="inline-flex" alignItems="center">
                          생성일 {sortIndicator("created_at")}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>메모</TableCell>
                    <TableCell align="right">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPlans.map((plan: Plan, idx: number) => {
                    const isRunning = runningId === plan.simulation_id;
                    const isDeleting = deletingId === plan.simulation_id;
                    const memoDisplay = plan.memo || "메모 없음";
                    const isSelected = selectedSimulations.includes(
                      plan.simulation_id
                    );
                    const canSelect = canSelectSimulation(plan);
                    const truncated =
                      memoDisplay.length > 20
                        ? `${memoDisplay.slice(0, 20)}…`
                        : memoDisplay;
                    return (
                      <TableRow
                        key={plan.simulation_id}
                        hover
                        selected={isSelected}
                      >
                        <TableCell padding="checkbox">
                          <Tooltip
                            title={
                              !canSelect && !isSelected
                                ? "이미 동일한 플랜 타입의 시뮬레이션이 선택되었습니다"
                                : ""
                            }
                            arrow
                          >
                            <span>
                              <Checkbox
                                color="primary"
                                checked={isSelected}
                                onChange={() =>
                                  handleSimulationSelection(plan.simulation_id)
                                }
                                disabled={!canSelect && !isSelected}
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{plan.plan_id} 플랜</TableCell>
                        <TableCell>{plan.starting_company_round}</TableCell>
                        <TableCell>{plan.simulation_rounds}</TableCell>
                        <TableCell>
                          {plan.created_at &&
                            new Date(plan.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Tooltip
                            title={memoDisplay}
                            arrow
                            disableHoverListener={memoDisplay === "메모 없음"}
                          >
                            <Chip
                              icon={<NoteAltIcon />}
                              label={truncated}
                              size="small"
                              onClick={() => openMemo(plan)}
                              variant={plan.memo ? "filled" : "outlined"}
                              color={plan.memo ? "primary" : "default"}
                              sx={{ maxWidth: 200 }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Tooltip title="편집" arrow>
                              <span>
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => {
                                    setEditingPlan(plan);
                                    setPage("plan-editor");
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={isRunning ? "실행 중" : "결과 보기"}
                              arrow
                            >
                              <span>
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleViewResults(plan)}
                                  disabled={isRunning}
                                >
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={isDeleting ? "삭제 중" : "삭제"}
                              arrow
                            >
                              <span>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() =>
                                    openDeleteConfirm(plan, idx + 1)
                                  }
                                  disabled={isDeleting}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Summary Report */}
          {showSummaryReport && summaryReportData && (
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
                  onClick={() => {
                    setShowSummaryReport(false);
                    // We don't clear the data so it can be shown again if needed
                    // Just update localStorage to reflect the visibility change
                    try {
                      localStorage.setItem(
                        "ui.main.showSummaryReport",
                        "false"
                      );
                    } catch {
                      /* Ignore storage errors */
                    }
                  }}
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
                    {Number(
                      summaryReportData.totalRequiredFunds
                    ).toLocaleString()}{" "}
                    원
                  </Typography>
                </Paper>
              </Box>

              <Grid container spacing={3}>
                {Object.keys(summaryReportData)
                  .filter((key) => key !== "totalRequiredFunds")
                  .map((planId) => {
                    const planData = summaryReportData[planId];
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
                                divider={
                                  <Divider orientation="vertical" flexItem />
                                }
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  시작 회차: {planData.starting_company_round}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
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
                                {Number(
                                  planData.requiredFunds
                                ).toLocaleString()}{" "}
                                원
                              </Typography>
                            </Box>

                            <Divider />

                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                회차별 데이터 (순수하게 내 돈이 들어가는
                                시점까지)
                              </Typography>
                              <Box
                                sx={{
                                  maxHeight: "180px",
                                  overflowY: "auto",
                                  mt: 1,
                                }}
                              >
                                <Table
                                  size="small"
                                  sx={{ tableLayout: "fixed" }}
                                >
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ width: "30%" }}>
                                        회사 회차
                                      </TableCell>
                                      <TableCell align="right">
                                        회차 매출액
                                      </TableCell>
                                      <TableCell align="right">
                                        누적 수익
                                      </TableCell>
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
                                              ? Number(
                                                  item.amount
                                                ).toLocaleString()
                                              : "-"}
                                          </TableCell>
                                          <TableCell
                                            align="right"
                                            sx={{
                                              color:
                                                Number(
                                                  item.cumulative_net_profit ||
                                                    0
                                                ) >= 0
                                                  ? "success.main"
                                                  : "error.main",
                                            }}
                                          >
                                            {item.cumulative_net_profit !==
                                            undefined
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
          )}
        </Paper>
      </Container>
      <DeleteConfirmModal
        isOpen={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetOrdinal(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deletingId === targetPlan?.simulation_id}
        ordinal={targetOrdinal}
        targetLabel={
          targetPlan
            ? `${targetPlan.plan_id} / ${targetPlan.simulation_id}`
            : null
        }
        message="선택한 시뮬레이션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      />
      <MemoModal
        isOpen={memoModalOpen}
        initialMemo={memoTarget?.memo || ""}
        onClose={() => {
          setMemoModalOpen(false);
          setMemoTarget(null);
        }}
        onSave={handleSaveMemo}
      />
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </>
  );
};

export default MainPage;
