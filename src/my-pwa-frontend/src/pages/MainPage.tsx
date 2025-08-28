import React from "react";
import { Button } from "../components/Button";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { MemoModal } from "../components/MemoModal";
import { ContactModal } from "../components/ContactModal";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";
import type { Plan, Page, SimulationRunResponse } from "../types/types";
import { Container, Paper, Typography, Stack, Divider } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// Import the extracted components
import SimulationTable, {
  type SortSpec,
} from "../components/MainPage/SimulationTable";
import SummaryReport from "../components/MainPage/SummaryReport";

// Import custom hooks
import {
  useSortState,
  useSelectedSimulations,
  useSummaryReportState,
  type SummaryReportData,
} from "../hooks/useMainPageState";
import { useSimulationActions } from "../hooks/useSimulationActions";

interface MainPageProps {
  setPage: (page: Page) => void;
  setEditingPlan: (plan: Plan | null) => void;
  // Opens global notice board modal
  openNotice?: () => void;
  setSimulationResult: (result: SimulationRunResponse | null) => void;
}

const MainPage: React.FC<MainPageProps> = ({
  setPage,
  setEditingPlan,
  openNotice,
  setSimulationResult,
}) => {
  const { user, session, signOut } = useAuth();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [signOutLoading, setSignOutLoading] = React.useState(false);
  const [contactModalOpen, setContactModalOpen] = React.useState(false);

  // Use custom hooks for state management
  const { sortOrders, handleHeaderClick } = useSortState();
  const { selectedSimulations, setSelectedSimulations } =
    useSelectedSimulations();
  const {
    showSummaryReport,
    setShowSummaryReport,
    summaryReportData,
    setSummaryReportData,
  } = useSummaryReportState();

  // Load simulations data
  const refreshPlans = React.useCallback(async () => {
    if (!session) return;
    try {
      const data = await api.getSimulations(session.access_token);
      setPlans(data);
    } catch (error) {
      console.error("Error refreshing plans:", error);
    }
  }, [session]);

  // Use the simulation actions hook
  const {
    runningId,
    deletingId,
    confirmOpen,
    targetPlan,
    targetOrdinal,
    memoModalOpen,
    memoTarget,
    setConfirmOpen,
    setTargetOrdinal,
    setMemoModalOpen,
    setMemoTarget,
    handleViewResults: viewResults,
    openDeleteConfirm,
    openMemo,
    handleSaveMemo: saveMemo,
    handleConfirmDelete,
  } = useSimulationActions(session, refreshPlans);

  // Handle view results with proper navigation
  const handleViewResults = (plan: Plan) => {
    viewResults(
      plan,
      (result: SimulationRunResponse | null) => setSimulationResult(result),
      () => setPage("results")
    );
  };

  // Handle memo saving with plans update
  const handleSaveMemo = (text: string | null) => {
    saveMemo(text, setPlans);
  };

  // Generate the sortIndicator for the table headers
  const sortIndicator = (key: SortSpec["key"]) => {
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

  // Sort plans based on sortOrders
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

  // 시뮬레이션 데이터 로드
  React.useEffect(() => {
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
      const reportData: Record<string, unknown> = {};
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
          starting_company_round: plan.starting_company_round,
          current_company_round: plan.current_company_round,
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

      setSummaryReportData(reportData as SummaryReportData);
      setShowSummaryReport(true);
    } catch (error) {
      console.error("Error generating summary report:", error);
      alert("종합 결과 생성에 실패했습니다.");
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPage("plan-editor");
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

          {/* Simulation table component */}
          <SimulationTable
            plans={plans}
            loading={loading}
            sortedPlans={sortedPlans}
            sortOrders={sortOrders}
            handleHeaderClick={handleHeaderClick}
            sortIndicator={sortIndicator}
            runningId={runningId}
            deletingId={deletingId}
            selectedSimulations={selectedSimulations}
            canSelectSimulation={canSelectSimulation}
            handleSimulationSelection={handleSimulationSelection}
            openMemo={openMemo}
            openDeleteConfirm={openDeleteConfirm}
            handleViewResults={handleViewResults}
            onEditPlan={handleEditPlan}
          />

          {/* Summary Report component */}
          <SummaryReport
            showSummaryReport={showSummaryReport}
            summaryReportData={summaryReportData}
            onClose={() => {
              setShowSummaryReport(false);
              // We don't clear the data so it can be shown again if needed
              // Just update localStorage to reflect the visibility change
              try {
                localStorage.setItem("ui.main.showSummaryReport", "false");
              } catch {
                /* Ignore storage errors */
              }
            }}
          />
        </Paper>
      </Container>

      {/* Modals */}
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
