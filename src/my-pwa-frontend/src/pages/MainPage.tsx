import React, { useState, useEffect } from "react";
import { Button } from "../components/Button"; // wrapper around MUI Button keeping prior API
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { MemoModal } from "../components/MemoModal";
import { useAuth } from "../context/AuthContext";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";

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
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoTarget, setMemoTarget] = useState<Plan | null>(null);
  // draft stored inside MemoModal, keep minimal state here
  type SortKey =
    | "plan_id"
    | "company_round"
    | "simulation_rounds"
    | "created_at";
  interface SortSpec {
    key: SortKey;
    dir: "asc" | "desc";
  }
  const [sortOrders, setSortOrders] = useState<SortSpec[]>([
    { key: "created_at", dir: "desc" },
  ]);

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
          case "company_round":
            av = a.company_round;
            bv = b.company_round;
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

  const openDeleteConfirm = (plan: Plan) => {
    setTargetPlan(plan);
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={4}
        >
          <Typography variant="h4" fontWeight={700}>
            시뮬레이션
          </Typography>
          <Stack direction="row" spacing={1}>
            {openNotice && (
              <Button onClick={openNotice} variant="contained" color="warning">
                공지사항
              </Button>
            )}
            <Button
              onClick={() => signOut()}
              variant="outlined"
              color="inherit"
            >
              <LogoutIcon sx={{ mr: 0.5 }} fontSize="small" /> 로그아웃
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
            <Button
              onClick={handleNewPlan}
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
            >
              새 시뮬레이션
            </Button>
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
                        handleHeaderClick("company_round", e)
                      }
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <Tooltip
                        title="Click to sort. Shift+Click for secondary sort"
                        arrow
                      >
                        <Box display="inline-flex" alignItems="center">
                          회사 회차 {sortIndicator("company_round")}
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
                  {sortedPlans.map((plan: Plan) => {
                    const isRunning = runningId === plan.simulation_id;
                    const isDeleting = deletingId === plan.simulation_id;
                    const memoDisplay = plan.memo || "메모 없음";
                    const truncated =
                      memoDisplay.length > 20
                        ? `${memoDisplay.slice(0, 20)}…`
                        : memoDisplay;
                    return (
                      <TableRow key={plan.simulation_id} hover>
                        <TableCell>{plan.plan_id} 플랜</TableCell>
                        <TableCell>{plan.company_round}</TableCell>
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
                                  onClick={() => openDeleteConfirm(plan)}
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
        </Paper>
      </Container>
      <DeleteConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deletingId === targetPlan?.simulation_id}
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
    </>
  );
};

export default MainPage;
